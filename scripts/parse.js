// Run as: node validate.js
// params: -v for verbose
"use strict";
var fs = require('fs');
var ps = require('../parser.js');
var sz = require('../serialize.js');

// file?
var file = "";
if (process.argv.length > 2) {
  file = process.argv[2];
} else {
  console.log("Usage: " + process.argv[0] + " " + process.argv[1] + " VTT-filename");
  process.exit(1);
}

var printErrors = function (errors) {
  var errorsLength = errors.length;

  if (errorsLength > 0) {
    console.log(errorsLength + " errors found");

    for (var i = 0; i < errorsLength; i++) {
      var error = errors[i],
      message = "Line " + error.line,
      column = error.col;
      if (column) {
        message += ", column " + column;
      }
      console.log(message + ": " + error.message);
    }
  }
};

fs.readFile(file, 'utf8', function(err, data) {
  if (err) {
    return console.log(err);
  }

  // parse textarea as captions
  var parser = ps.WebVTTParser();
  var parsedData = parser.parse(data, 'captions');

  // print errors and WebVTT file as parsed
  printErrors(parsedData.errors);
  var s = sz.WebVTTSerializer();
  console.log(s.serialize(parsedData.cues, parsedData.metadatas));
});

