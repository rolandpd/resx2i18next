'use strict';

const Readable = require('stream').Readable;

class UnglobbedFiles extends Readable {
  constructor(globPaths = []) {
    super({objectMode: true});
    this.filePaths = globPaths;
  }

  _read() {
    let filePath = this.filePaths.length ? {path: this.filePaths.shift()} : null;
    this.push(filePath);
  }

}

exports.Transform = UnglobbedFiles;
