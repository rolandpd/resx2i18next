/*eslint-env node */
"use strict";

var vfs = require('vinyl-fs');
var File = require('vinyl');
var assign = require("object-assign");
var stream = require("stream");
var xml2js = require("xml2js");
var path = require("path");
var util = require("util");
var parser = new xml2js.Parser();

function filenameInfo(filename) {
  var filenameBase = path.basename(filename, path.extname(filename));
  var arr = filenameBase.split(".");
  return {
    language: arr[1] || "en",
    module: arr[0]
  };
}

function getJsonFile(name, content) {
  var jsonFile = new File();
  jsonFile.path = "./" + name + ".json";
  jsonFile.contents = new Buffer(JSON.stringify(content, null, 2));
  return jsonFile;
}

util.inherits(ResXConverter, stream.Transform);
function ResXConverter() {
  if (!(this instanceof ResXConverter)) {
    return new ResXConverter();
  }
  stream.Transform.call(this, {objectMode: true});
}


ResXConverter.prototype._flush = function (cb) {
  cb();
};

ResXConverter.prototype._transform = function (resxFile, encoding, cb) {
  var self = this;
  var info = filenameInfo(resxFile.path);
  var keyValues = {};
  parser.parseString(resxFile.contents, function (err, result) {
    if (err) {
      cb(err);
    }
    if (result.root.data) {
      result.root.data.forEach(function (item) {
        var key = item.$.name,
          val = item.value && item.value.length === 1 ? item.value[0] : item.value;

        keyValues[key] = val || "";
      });
    }
    //util.log("I18N locales processed '" + info.module + "' (" + info.language + ")");
    self.push(getJsonFile(info.module + "." + info.language, keyValues));
    cb();
  });
};

util.inherits(ResX2i18next, stream.Transform);
function ResX2i18next(filename, opts) {
  if (!(this instanceof ResX2i18next)) {
    return ResX2i18next.configure(opts)(filename);
  }
  this._data = {};
  this._filename = filename;
  this._opts = assign({filename: filename, filebase: "locales"}, opts);
  stream.Transform.call(this);
}

ResX2i18next.prototype._flush = function (cb) {
  try {
    this.emit("resX2i18next", this._data, this._filename);
    this.push("module.exports = " + JSON.stringify(this._data, null, 2));
  } catch (err) {
    this.emit("error", err);
    return;
  }
  cb();
};

ResX2i18next.prototype._transform = function (i18nConfig, encoding, cb) {
  var self = this;
  var config = assign({}, JSON.parse(i18nConfig));
  var ws = stream.Writable({objectMode: true});
  ws._write = function (jsonFile, enc, next) {
    if (jsonFile) {
      var info = filenameInfo(jsonFile.path);
      if (!self._data[info.language]) {
        self._data[info.language] = {"app": {}};
      }
      self._data[info.language]["app"][info.module] = JSON.parse(jsonFile.contents.toString());
    }
    next();
  };
  ws.on('finish', function () {
    cb();
  });
  vfs.src(config.path)
    .pipe(ResXConverter())
    .pipe(ws);
};

ResX2i18next.configure = function (opts) {
  opts = assign({}, opts);

  return function (filename) {
    if ((filename.split(".").pop() || "").toLowerCase() !== 'i18n') {
      return stream.PassThrough();
    }
    return new ResX2i18next(filename, opts);
  };
};

module.exports = ResX2i18next;