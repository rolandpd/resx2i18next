/*eslint-env node */
'use strict';
var path = require('path');
//var fs = require('fs');

//var mkdirp = require('mkdirp');

var FilePathsSource = require('./src/filePathsSource-compiled').Transform;
var UnglobbedFilePaths = require('./src/unglobbedFilePathsTransform-compiled').Transform;
var TransformResx2Json = require('./src/transformResx2Json-compiled').Transform;
var CollectOutputFiles = require('./src/collectOutputFiles-compiled').Transform;
var FilesSink = require('./src/filesSink-compiled').Transform;

function depth(string) {
  return path.normalize(string).split(path.sep).length - 1;
}

function dealWith(inPath, up) {
  if (!up) {
    return inPath;
  }
  if (up === true) {
    return path.basename(inPath);
  }
  if (depth(inPath) < up) {
    throw new Error('cant go up that far');
  }
  return path.join.apply(path, path.normalize(inPath).split(path.sep).slice(up));
}

function copyFiles(args, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts;
  }
  if (typeof callback !== 'function') {
    throw new Error('callback is not optional');
  }

  var input = args.slice();
  var outDir = input.pop();
  var transformResx2Json = new TransformResx2Json(args);
  var filePathsSource = new FilePathsSource(input);
  var unglobbedFilePaths = new UnglobbedFilePaths();
  var collectOutputFiles = new CollectOutputFiles({out: outDir});
  var filesSink = new FilesSink();

  filePathsSource
    .pipe(unglobbedFilePaths)
    .pipe(transformResx2Json)
    .pipe(collectOutputFiles)
    .pipe(filesSink)
    /*
    .pipe(through(function (pathName, _, next) {

      // Pfade anlegen mit mkdir

      fs.stat(pathName, function (err, pathStat) {
        if (err) {
          return next(err);
        }
        var outName = path.join(outDir, dealWith(pathName, opts));

        console.log(pathName + ' --> ' + outName);
        if (pathStat.isFile()) {
          mkdirp(path.dirname(outName), function (err) {
            if (err) {
              return next(err);
            }
            next(null, pathName);
          });
        } else if (pathStat.isDirectory()) {
          next();
        }
      });
    }))
    .pipe(through(function (pathName, _, next) {

      // durchstreamen

      var outName = path.join(outDir, dealWith(pathName, opts));
      fs.createReadStream(pathName)
        .pipe(fs.createWriteStream(outName))
        .on('error', next)
        .on('finish', next);
    }))*/
    .on('error', callback)
    .on('finish', callback);
}

module.exports = copyFiles;
