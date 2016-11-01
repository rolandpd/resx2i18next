'use strict';

const Transform = require('stream').Transform;
const path = require('path');

class CollectOutputFiles extends Transform {

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

exports.Transform = CollectOutputFiles;
