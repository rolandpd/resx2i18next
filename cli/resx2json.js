#!/usr/bin/env node
/*eslint-env node */
'use strict';
var resx2json = require('../index');
var pkg = require('../package.json');
var program = require('ltcdr');

program.version(pkg.version)
  .option('-u, --up [levels]', 'slice a path off the bottom of the paths', parseInt)
  .option('-f, --flat', 'flatten the output')
  .usage('[options] inFile [more files ...] outDirectory')
  .parse(process.argv);
if (program.flat) {
  program.up = true;
}
resx2json(program.args, program.up, function (err) {
  if (err) {
    console.error(err);
    process.exit(1);
  } else {
    process.exit(0);
  }
});