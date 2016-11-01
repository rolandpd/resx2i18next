#!/usr/bin/env node
/*eslint-env node */
'use strict';

var console = require('console');
var resx2json = require('../index');
var pkg = require('../package.json');
var program = require('ltcdr');

program.version(pkg.version)
  .option('-f, --file', 'target file pattern')
  .option('-s -- structure', 'target path to value within json file')
  .usage('[options] inFile [more files ...] outDirectory')
  .parse(process.argv);

resx2json(program.args, function (err) {
  if (err) {
    console.error(err);
    process.exit(1);
  } else {
    process.exit(0);
  }
});