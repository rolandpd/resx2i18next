/*eslint-env node */
'use strict';

var convert = require('./src/resx2json-compiled').convert;

function resx2json(args, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts;
  }
  if (typeof callback !== 'function') {
    throw new Error('callback is not optional');
  }

  var input = args.slice();
  var outDir = input.pop();

  return convert(input, outDir, callback);
}

module.exports = resx2json;
