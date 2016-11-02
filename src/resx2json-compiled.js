'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var stream = require('stream');
var glob = require('glob');
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var xml2js = require("xml2js-es6-promise");
var console = require('console');

/**
 *
 */

var ResxPathsSource = function (_stream$Readable) {
  _inherits(ResxPathsSource, _stream$Readable);

  function ResxPathsSource() {
    var globPaths = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

    _classCallCheck(this, ResxPathsSource);

    var _this = _possibleConstructorReturn(this, (ResxPathsSource.__proto__ || Object.getPrototypeOf(ResxPathsSource)).call(this, { objectMode: true }));

    _this.filePaths = globPaths;
    return _this;
  }

  _createClass(ResxPathsSource, [{
    key: '_read',
    value: function _read() {
      var filePath = this.filePaths.length ? { path: this.filePaths.shift() } : null;
      this.push(filePath);
    }
  }]);

  return ResxPathsSource;
}(stream.Readable);

exports.ResxPathsSource = ResxPathsSource;

/**
 *
 */

var ResolveResxFiles = function (_stream$Transform) {
  _inherits(ResolveResxFiles, _stream$Transform);

  function ResolveResxFiles() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, ResolveResxFiles);

    options.objectMode = true;
    return _possibleConstructorReturn(this, (ResolveResxFiles.__proto__ || Object.getPrototypeOf(ResolveResxFiles)).call(this, options));
  }

  _createClass(ResolveResxFiles, [{
    key: '_transform',
    value: function _transform(pathElement, encoding, next) {
      var _this3 = this;

      if (pathElement) {
        (function () {
          var self = _this3;
          glob(pathElement.path, function (err, paths) {
            if (err) {
              return next(err);
            }
            paths.forEach(function (unglobbedPath) {
              console.log('--> ' + unglobbedPath);
              self.push({ path: unglobbedPath });
            });
            next();
          });
        })();
      } else {
        next();
      }
    }
  }]);

  return ResolveResxFiles;
}(stream.Transform);

exports.ResolveResxFiles = ResolveResxFiles;

var TransformResx2Json = function (_stream$Transform2) {
  _inherits(TransformResx2Json, _stream$Transform2);

  function TransformResx2Json() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, TransformResx2Json);

    var _this4 = _possibleConstructorReturn(this, (TransformResx2Json.__proto__ || Object.getPrototypeOf(TransformResx2Json)).call(this, { objectMode: true }));

    _this4.filePattern = options.file || 'locales/{ns}.json';
    _this4.jsonPath = options.structure || '{module}/{key}/{lng}';
    return _this4;
  }

  _createClass(TransformResx2Json, [{
    key: '_transform',
    value: function _transform(resxFile, encoding, next) {
      var _this5 = this;

      if (resxFile && resxFile.path) {
        (function () {
          var self = _this5;
          var info = TransformResx2Json.filenameInfo(resxFile.path);
          fs.readFile(resxFile.path, 'utf8', function (err, data) {
            if (err) {
              next(err);
            }
            xml2js(data).then(function (xml) {
              if (xml.root.data) {
                xml.root.data.forEach(function (item) {
                  var translation = {
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
            }).catch(function () {
              console.log('Could not parse ' + resxFile.path);
              next(err);
            });
          });
        })();
      } else {
        next();
      }
    }
  }], [{
    key: 'filenameInfo',
    value: function filenameInfo(filename) {
      var ns = path.dirname(filename).split('/').pop();

      var _path$basename$split = path.basename(filename, path.extname(filename)).split('.'),
          _path$basename$split2 = _slicedToArray(_path$basename$split, 2),
          module = _path$basename$split2[0],
          lng = _path$basename$split2[1];

      return {
        ns: ns || 'app',
        lng: lng || 'en',
        module: module
      };
    }
  }, {
    key: 'replaceTemplate',
    value: function replaceTemplate(templateString, obj) {
      return templateString.replace(/{(\w+)}/g, function (_, k) {
        return obj[k];
      });
    }
  }]);

  return TransformResx2Json;
}(stream.Transform);

exports.TransformResx2Json = TransformResx2Json;

var CollectOutputFiles = function (_stream$Transform3) {
  _inherits(CollectOutputFiles, _stream$Transform3);

  function CollectOutputFiles() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, CollectOutputFiles);

    var _this6 = _possibleConstructorReturn(this, (CollectOutputFiles.__proto__ || Object.getPrototypeOf(CollectOutputFiles)).call(this, { objectMode: true }));

    _this6.outPath = options.out || '';
    _this6.result = {};
    return _this6;
  }

  _createClass(CollectOutputFiles, [{
    key: '_flush',
    value: function _flush(next) {
      var self = this;
      Object.keys(this.result).forEach(function (key) {
        var file = { path: path.join(self.outPath, key), contents: JSON.stringify(self.result[key], null, 2) };
        self.push(file);
      });
      next();
    }
  }, {
    key: '_transform',
    value: function _transform(translation, encoding, next) {
      if (translation) {
        if (!this.result[translation.file]) {
          this.result[translation.file] = {};
        }

        var currentPath = this.result[translation.file];
        var paths = translation.path.split('/');
        for (var i = 0; i < paths.length; i++) {
          if (!currentPath[paths[i]]) {
            currentPath[paths[i]] = i + 1 === paths.length ? translation.value : {};
          }
          currentPath = currentPath[paths[i]];
        }
        next();
      } else {
        next();
      }
    }
  }]);

  return CollectOutputFiles;
}(stream.Transform);

exports.CollectOutputFiles = CollectOutputFiles;

var OutputFiles = function (_stream$Writable) {
  _inherits(OutputFiles, _stream$Writable);

  function OutputFiles() {
    _classCallCheck(this, OutputFiles);

    return _possibleConstructorReturn(this, (OutputFiles.__proto__ || Object.getPrototypeOf(OutputFiles)).call(this, { objectMode: true }));
  }

  _createClass(OutputFiles, [{
    key: '_write',
    value: function _write(file, enc, next) {
      console.log('Write ' + file.path);
      mkdirp(path.dirname(file.path), function (err) {
        if (err) {
          return next(err);
        }
        var wstream = fs.createWriteStream(file.path);
        wstream.write(file.contents);
        wstream.end();
        wstream.on('error', next).on('finish', next);
      });
    }
  }]);

  return OutputFiles;
}(stream.Writable);

exports.OutputFiles = OutputFiles;

exports.convert = function (sources, target, callback) {
  var filePattern = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'app.json';
  var structure = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : '{lng}/app/{module}/{key}';

  var resxSourcePaths = new ResxPathsSource(sources);
  var resolveResxFiles = new ResolveResxFiles();
  var transformResx2Json = new TransformResx2Json({
    file: filePattern,
    structure: structure
  });
  var collectOutputFiles = new CollectOutputFiles({ out: target });
  var outputFiles = new OutputFiles();

  return resxSourcePaths.pipe(resolveResxFiles).pipe(transformResx2Json).pipe(collectOutputFiles).pipe(outputFiles).on('error', callback).on('finish', callback);
};

//# sourceMappingURL=resx2json-compiled.js.map