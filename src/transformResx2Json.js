'use strict';

const path = require('path');
const Transform = require('stream').Transform;
const xml2js = require("xml2js-es6-promise");
const console = require('console');
const fs = require('fs');

class TransformResx2Json extends Transform {

  constructor(options = {}) {
    super({objectMode : true});

    this.filePattern = options.file || 'locales/{ns}.json';
    this.jsonPath = options.structure || '{module}/{key}/{lng}';
  }

  static filenameInfo(filename) {
    let ns = path.dirname(filename).split('/').pop();
    let [module, lng] = path.basename(filename, path.extname(filename)).split('.');
    return {
      ns: ns || 'app',
      lng: lng || 'en',
      module: module
    };
  }

  static replaceTemplate(templateString, obj) {
    return templateString.replace(/{(\w+)}/g, function(_,k){
      return obj[k];
    });
  }

  _transform(resxFile, encoding, next) {
    if (resxFile && resxFile.path) {
      let self = this;
      let info = TransformResx2Json.filenameInfo(resxFile.path);
      fs.readFile(resxFile.path, 'utf8', function (err, data) {
        if (err) {
          next(err);
        }
        xml2js(data)
          .then(function (xml) {
            if (xml.root.data) {
              xml.root.data.forEach(function (item) {
                let translation = {
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
          })
          .catch(function () {
            console.log('Could not parse ' + resxFile.path);
            next(err);
          });
      });
    } else {
      next();
    }
  }

}

exports.Transform = TransformResx2Json;
