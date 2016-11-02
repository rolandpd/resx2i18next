'use strict';

const stream = require('stream');
const glob = require('glob');
const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const xml2js = require("xml2js-es6-promise");
const console = require('console');

/**
 *
 */
class ResxPathsSource extends stream.Readable {
  constructor(globPaths = []) {
    super({objectMode: true});
    this.filePaths = globPaths;
  }

  _read() {
    let filePath = this.filePaths.length ? {path: this.filePaths.shift()} : null;
    this.push(filePath);
  }
}

exports.ResxPathsSource = ResxPathsSource;

/**
 *
 */
class ResolveResxFiles extends stream.Transform {
  constructor(options = {}) {
    options.objectMode = true;
    super(options);
  }

  _transform(pathElement, encoding, next) {
    if (pathElement) {
      let self = this;
      glob(pathElement.path, function (err, paths) {
        if (err) {
          return next(err);
        }
        paths.forEach(function (unglobbedPath) {
          console.log('--> ' + unglobbedPath);
          self.push({path: unglobbedPath});
        });
        next();
      });
    } else {
      next();
    }
  }

}

exports.ResolveResxFiles = ResolveResxFiles;


class TransformResx2Json extends stream.Transform {

  constructor(options = {}) {
    super({objectMode: true});

    this.filePattern = options.file || 'locales/{ns}.json';
    this.jsonPath = options.structure || '{module}/{key}/{lng}';
  }

  static filenameInfo(filename) {
    let ns = path.dirname(filename).split('/').pop();
    let [module, lng] = path.basename(filename, path.extname(filename)).split('.');
    return {
      ns: ns || 'app',
      lng: lng || 'en',
      module: module
    };
  }

  static replaceTemplate(templateString, obj) {
    return templateString.replace(/{(\w+)}/g, function (_, k) {
      return obj[k];
    });
  }

  _transform(resxFile, encoding, next) {
    if (resxFile && resxFile.path) {
      let self = this;
      let info = TransformResx2Json.filenameInfo(resxFile.path);
      fs.readFile(resxFile.path, 'utf8', function (err, data) {
        if (err) {
          next(err);
        }
        xml2js(data)
          .then(function (xml) {
            if (xml.root.data) {
              xml.root.data.forEach(function (item) {
                let translation = {
                  ns: info.ns,
                  lng: info.lng,
                  module: info.module,
                  key: item.$.name,
                  value: item.value && item.value.length === 1 ? item.value[0] : item.value
                };
                translation.path = TransformResx2Json.replaceTemplate(self.jsonPath, translation);
                translation.file = TransformResx2Json.replaceTemplate(self.filePattern, translation);
                console.log(JSON.stringify(translation, null, 2));
                self.push(translation);
              });
            }
            next();
          })
          .catch(function () {
            console.log('Could not parse ' + resxFile.path);
            next(err);
          });
      });
    } else {
      next();
    }
  }
}

exports.TransformResx2Json = TransformResx2Json;

class CollectOutputFiles extends stream.Transform {

  constructor(options = {}) {
    super({objectMode: true});
    this.outPath = options.out || '';
    this.result = {};
  }

  _flush(next) {
    let self = this;
    Object.keys(this.result).forEach(function (key) {
      let file = {path: path.join(self.outPath, key), contents: JSON.stringify(self.result[key], null, 2)};
      self.push(file);
    });
    next();
  }

  _transform(translation, encoding, next) {
    if (translation) {
      if (!this.result[translation.file]) {
        this.result[translation.file] = {};
      }

      let currentPath = this.result[translation.file];
      let paths = translation.path.split('/');
      for (let i = 0; i < paths.length; i++) {
        if (!currentPath[paths[i]]) {
          currentPath[paths[i]] = (i + 1) === paths.length ? translation.value : {};
        }
        currentPath = currentPath[paths[i]];
      }
      next();
    } else {
      next();
    }
  }

}

exports.CollectOutputFiles = CollectOutputFiles;

class OutputFiles extends stream.Writable {
  constructor() {
    super({objectMode: true});
  }

  _write(file, enc, next) {
    console.log('Write ' + file.path);
    mkdirp(path.dirname(file.path), function (err) {
      if (err) {
        return next(err);
      }
      let wstream = fs.createWriteStream(file.path);
      wstream.write(file.contents);
      wstream.end();
      wstream.on('error', next)
        .on('finish', next);
    });

  }
}

exports.OutputFiles = OutputFiles;

exports.convert = function (sources, target, callback, filePattern = 'app.json', structure = '{lng}/app/{module}/{key}') {
  let resxSourcePaths = new ResxPathsSource(sources);
  let resolveResxFiles = new ResolveResxFiles();
  let transformResx2Json = new TransformResx2Json({
    file: filePattern,
    structure: structure
  });
  let collectOutputFiles = new CollectOutputFiles({out: target});
  let outputFiles = new OutputFiles();

  return resxSourcePaths
    .pipe(resolveResxFiles)
    .pipe(transformResx2Json)
    .pipe(collectOutputFiles)
    .pipe(outputFiles)
    .on('error', callback)
    .on('finish', callback);
};