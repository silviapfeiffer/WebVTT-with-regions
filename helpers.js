// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

"use strict";

var printErrors = function (errors, duration) {
  var ol = document.getElementsByTagName("ol")[0],
    p = document.getElementById("status"),
    errorsLength = errors.length;
    ol.textContent = "";

  if (errorsLength > 0) {
    if (errorsLength === 1) {
      p.textContent = "Almost there!";
    }
    else if (errorsLength < 5) {
      p.textContent = "Just a few more mistakes.";
    }
    else {
      p.textContent = "You are hopeless, RTFS.";
    }

    for (var i = 0; i < errorsLength; i++) {
      var error = errors[i],
      message = "Line " + error.line,
      li = document.createElement("li"),
      column = error.col;
      if (column) {
        message += ", column " + column;
      }

      li.textContent = message + ": " + error.message;
      ol.appendChild(li);
    }
  } else {
    p.textContent = "This is boring, your WebVTT is valid!";
  }
  p.textContent += " (" + duration + "ms)";
};

var debug = function (url) {
  var hmm = url.slice(url.indexOf("#")) == "#debug";
  document.getElementsByTagName("pre")[0].hidden = hmm ? false : true;
};

var printWebVTTFile = function (r) {
  var pre = document.getElementsByTagName("pre")[0];
  var s = new WebVTTSerializer();
  pre.textContent = s.serialize(r.cues, r.metadatas);
};

var toTimestamp = function (timestamp) {
  var seconds = 0,
  secondsFrac = 0,
  minutes = 0,
  hours = 0;

  secondsFrac = (timestamp%1).toFixed(3)*1000;
  seconds = Math.floor(timestamp);
  if (seconds > 59) {
    minutes = (seconds / 60).toFixed(0);
    seconds = (seconds % 60).toFixed(2);
  }
  if (minutes > 59) {
    hours = (minutes / 60).toFixed(0);
    minutes = (minutes % 60).toFixed(2);
  }
  return {
    hours: hours,
    minutes: minutes,
    seconds: seconds,
    secondsFrac: secondsFrac
  };
};

var printTimestamp = function (timestamp) {
  var components = toTimestamp(parseFloat(timestamp)),
  result = "";
  if (components.hours > 0) {
    if (components.hours < 10) {
      result += "0";
    }
    result += components.hours + ":";
  }
  if (components.minutes < 10) {
    result += "0";
  }
  result += components.minutes + ":";
  if (components.seconds < 10) {
    result += "0";
  }
  result += components.seconds + ".";
  if (components.secondsFrac < 100) {
    result += "0";
  }
  if (components.secondsFrac < 10) {
    result += "0";
  }
  result += components.secondsFrac;
  return result;
};

if (typeof module !== "undefined") {
  module.exports.printTimestamp = printTimestamp;
}