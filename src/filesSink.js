'use strict';

const Writable = require('stream').Writable;
const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');
const console = require('console');

class FilesSink extends Writable {
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

exports.Transform = FilesSink;
