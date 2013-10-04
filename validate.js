fs = require('fs');
ps = require('./parser.js');

"use strict";
var dir = "./tests/";

function validate(data, file) {
  var parser, parsedData;

  // parse textarea
  parser = ps.WebVTTParser();
  parsedData = parser.parse(data, 'captions');

  fs.readFile(dir+file+".txt", 'utf8', function (err, content) {
    if (err) {
      return console.log(err);
    }
    if (content !== JSON.stringify(parsedData.errors)) {
      console.log("Parse error for file " + file + ".vtt");
    }
  });
}

fs.readdir(dir, function(err, files) {
  if (err) {
    return console.log(err);
  }
  files.forEach(function(file) {
    // validate all vtt files in tests directory
    if (file.split('.').pop() === 'vtt') {
      fs.readFile(dir+file, 'utf8', function (err,data) {
        if (err) {
          return console.log(err);
        }
        validate(data, file.split('.').shift());
      });
    }
  });
});

