'use strict';

const Transform = require('stream').Transform;
const glob = require('glob');
const console = require('console');

class UnglobbedFilePathsTransform extends Transform {

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

exports.Transform = UnglobbedFilePathsTransform;
