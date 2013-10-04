fs = require('fs');
ps = require('./parser.js');

"use strict";
var dir = "./tests/";

function printErrors(errors, duration) {
  var errorsLength = errors.length;

  if (errorsLength > 0) {
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
  console.log("Validated in " + duration + "ms.");
  console.log("---");
};

function validate(data) {
  var parser, parsedData;

  // parse textarea
  parser = ps.WebVTTParser();
  parsedData = parser.parse(data, 'captions');

  // print errors and WebVTT file as parsed
  if (parsedData.errors.length > 0) {
    console.log(data);
  } else {
    console.log("!! VALID !!")
  }
  printErrors(parsedData.errors, parsedData.time);
}

fs.readdir(dir, function(err, files) {
  if (err) {
    return console.log(err);
  }
  files.forEach(function(file) {
    fs.readFile(dir+file, 'utf8', function (err,data) {
      if (err) {
        return console.log(err);
      }
      console.log(dir+file);
      validate(data);
    });
  });
});

