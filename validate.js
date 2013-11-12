// Run as: node validate.js
// params: -v for verbose
"use strict";
var fs = require('fs');
var ps = require('./parser.js');

// verbose?
var verbose = false;
if (process.argv.length > 2) {
  if (process.argv[2] == '-v') {
    verbose = true;
  }
}

// directory that contains tests
var dir = "./tests/";

// validate a WebVTT file
// data : WebVTT file data content
// file: stem filename that is analyzed
function validate(data, file) {
  var parser, parsedData;

  // parse textarea as captions
  parser = ps.WebVTTParser();
  parsedData = parser.parse(data, 'captions');

  // read txt file that has expected results
  fs.readFile(dir+file+".txt", 'utf8', function (err, content) {
    if (err) {
      return console.log(err);
    }
    if (content !== JSON.stringify(parsedData.errors)) {
      console.log("Parse error for file " + file + ".vtt");
    } else {
      if (verbose) {
        console.log("Success parsing " + dir+file+".vtt");
      }
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
      // read file as utf8: result will be in data
      fs.readFile(dir+file, 'utf8', function (err, data) {
        if (err) {
          return console.log(err);
        }
        validate(data, file.split('.').shift());
      });
    }
  });
});

