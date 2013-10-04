// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

// Not intended to be fast, but if you can make it faster, please help out!

"use strict";

function WebVTTParser() {
  var that = this;

  that.parse = function(input, mode) {
    //XXX need global search and replace for \0
    var NEWLINE = /\r\n|\r|\n/,
    startTime = Date.now(),
    linePos = 0,
    lines = input.split(NEWLINE),
    alreadyCollected = false,
    cues = [],
    metadatas = [],
    errors = [],
    err = function (message, col) {
      errors.push({
        message: message,
        line:    linePos+1,
        col:     col
      });
    };

    var line = lines[linePos],
    lineLength = line.length,
    signature = "WEBVTT",
    bom = 0,
    signature_length = signature.length;


    /* Byte order mark */
    if (line[0] === "\ufeff") {
      bom = 1;
      signature_length += 1;
    }
    /* SIGNATURE */
    if (
      lineLength < signature_length ||
      line.indexOf(signature) !== 0+bom ||
      lineLength > signature_length &&
      line[signature_length] !== " " &&
      line[signature_length] !== "\t"
    ) {
      err("No valid signature. (File needs to start with \"WEBVTT\".)");
    }

    line = lines[++linePos];

    /* HEADER LOOP */
    while(line !== undefined) {
      /* look-ahead */
      if (line === "") {
        if ((lines[linePos+1] && lines[linePos+1].indexOf("-->") !== -1 )||
        (lines[linePos+2] && lines[linePos+2].indexOf("-->") !== -1)) {
          break;
        } else {
          line = lines[++linePos];
          continue;
        }
      }

      var metadataParser = new WebVTTMetadataParser(err);
      var metadata = metadataParser.parse(line);
      if (metadata.name === "Region"){
        metadata.regionAttributes = metadataParser.parseRegion(metadata.value);
      }
      metadatas.push(metadata);

      line = lines[++linePos];
    }

    /* CUE LOOP */
    while(line !== undefined) {
      var cue;

      while(!alreadyCollected && line === "") {
        line = lines[++linePos];
      }
      if (!alreadyCollected && line === undefined) {
        break;
      }

      /* CUE CREATION */
      cue = {
        id:"",
        startTime:0,
        endTime:0,
        pauseOnExit:false,
        direction:"horizontal",
        snapToLines:true,
        linePosition:"auto",
        textPosition:50, /* % */
        size:100, /* % */
        alignment:"middle",
        region:"",
        text:"",
        tree:null
      };

      var parseTimings = true;

      if (line.indexOf("-->") === -1) {
        cue.id = line;


        /* COMMENTS
           Not part of the specification's parser as these would just be ignored. However,
           we want them to be conforming and not get "Cue identifier cannot be standalone".
         */
        if(/^NOTE($|[ \t])/.test(cue.id)) { // .startsWith fails in Chrome
          line = lines[++linePos];
          while(line !== "" && line !== undefined) {
            if(line.indexOf("-->") != -1) {
              err("Cannot have timestamp in a comment.");
            }
            line = lines[++linePos];
          }
          continue;
        }

        line = lines[++linePos];

        if (line === "" || line === undefined) {
          err("Cue identifier cannot be standalone.");
          continue;
        }

        if(line.indexOf("-->") === -1) {
          parseTimings = false;
          err("Cue identifier needs to be followed by timestamp.");
        }
      }

      /* TIMINGS */
      alreadyCollected = false;
      var timings = new WebVTTCueTimingsAndSettingsParser(line, err),
          previousCueStart = 0;
      if (cues.length > 0) {
        previousCueStart = cues[cues.length-1].startTime;
      }
      if(parseTimings && !timings.parse(cue, previousCueStart)) {
        /* BAD CUE */

        cue = null;
        line = lines[++linePos];

        /* BAD CUE LOOP */
        while(line !== "" && line !== undefined) {
          if (line.indexOf("-->") !== -1) {
            alreadyCollected = true;
            break;
          }
          line = lines[++linePos];
        }
        continue;
      }
      line = lines[++linePos];

      /* CUE TEXT LOOP */
      while(line !== "" && line !== undefined) {
        if (line.indexOf("-->") !== -1) {
          err("Blank line missing before cue.");
          alreadyCollected = true;
          break;
        }
        if (cue.text !== "") {
          cue.text += "\n";
        }
        cue.text += line;
        line = lines[++linePos];
      }

      /* CUE TEXT PROCESSING */
      var cuetextparser = new WebVTTCueTextParser(cue.text, err, mode);
      cue.tree = cuetextparser.parse(cue.startTime, cue.endTime);
      cues.push(cue);
    }
    cues.sort(function(a, b) {
      if (a.startTime < b.startTime) {
        return -1;
      }
      if (a.startTime > b.startTime) {
        return 1;
      }
      if (a.endTime > b.endTime) {
        return -1;
      }
      if (a.endTime < b.endTime) {
        return 1;
      }
      return 0;
    });
    /* END */
    return {
      cues:      cues,
      metadatas: metadatas,
      errors:    errors,
      time:      Date.now()-startTime
    };
  };

  return that;
};

var WebVTTMetadataParser = function(errorHandler) {
  var that = this,
  SPACE = /[\u0020\t\f]/,
  pos = 0,
  err = function(message) {
    errorHandler(message, pos+1);
  };

  /* NAME - VALUE CREATION */
  that.parse = function(line) {
    var metadata = {
      name:"",
      value:"",
      regionAttributes:null
    };

    if (line.indexOf(':') !== -1) {
      var index = line.indexOf(':');
      metadata.name = line.slice(0, index);
      metadata.value = line.slice(index + 1);
    } else {
      err("Metadata invalid.");
    }

    return metadata;
  };

  that.parseRegion = function(value) {
    /* parse region attributes */
    var attributes = value.split(SPACE),
    attributesLength = attributes.length,
    regionanchorIndex, regionanchorX, regionanchorY, lastregionanchorX, lastregionanchorY,
    anchorIndex, anchorX, anchorY, lastanchorX, lastanchorY,
    seen = [];

    var regionAttributes = {
      id:"",
      width:100, /* % */
      height:3,
      regionanchorX:0, /* % */
      regionanchorY:100, /* % */
      viewportanchorX:0, /* % */
      viewportanchorY:100, /* % */
      scroll:""                
    };

    for (var i=0; i < attributesLength; i++) {
      var attributeElement = attributes[i];

      if (attributeElement === "") {
        continue;
      }    

      var index = attributeElement.indexOf('='),
      attribute = attributeElement.slice(0, index),
      attributeValue = attributeElement.slice(index + 1),
      lastValueIndex = attributeValue.length - 1;


      if (seen.indexOf(attribute) !== -1) {
        err("Duplicate region attribute.");
      }
      seen.push(attribute);

      if (attributeValue === "") {
        err("No value for region attribute defined.");
        continue;
      }

      switch (attribute) {
        case ("id"): // id
          regionAttributes.id = attributeValue;
          break;

        case ("width"): // width
          if (attributeValue[lastValueIndex] !== "%") {
            err("Region width must be a percentage.");
            continue;
          }
          regionAttributes.width = parseInt(attributeValue, 10);
          if (regionAttributes.width > 100 || regionAttributes.width < 0) {
            err("Region width has to be between 0 and 100.");
            regionAttributes.width = 100;
            continue;
          }
          break;

        case ("height"): // height
          if (attributeValue[lastValueIndex] === "%") {
            err("Region height cannot be a percentage.");
            continue;
          }
          regionAttributes.height = parseInt(attributeValue, 10);
          break;

        case ("regionanchor"): // regionanchor
          regionanchorIndex = attributeValue.indexOf(','),
          regionanchorX = attributeValue.slice(0, regionanchorIndex),
          regionanchorY = attributeValue.slice(regionanchorIndex + 1),
          lastregionanchorX = regionanchorX.length - 1,
          lastregionanchorY = regionanchorY.length - 1;
          if (regionanchorX[lastregionanchorX] !== "%" || regionanchorY[lastregionanchorY] !== "%") {
            err("Region anchor points have to be a percentage.");
            continue;
          }
          regionAttributes.regionanchorX = parseInt(regionanchorX, 10);
          if (regionAttributes.regionanchorX > 100 || regionAttributes.regionanchorX < 0) {
            err("Region anchor point X has to be between 0 and 100.");
            regionAttributes.regionanchorX = 0;
            continue;
          }
          regionAttributes.regionanchorY = parseInt(regionanchorY, 10);
          if (regionAttributes.regionanchorY > 100 || regionAttributes.regionanchorY < 0) {
            err("Region anchor point Y has to be between 0 and 100.");
            regionAttributes.regionanchorX = 0;
            regionAttributes.regionanchorY = 100;
            continue;
          }
          break;

        case ("viewportanchor"): // viewportanchor
          anchorIndex = attributeValue.indexOf(','),
          anchorX = attributeValue.slice(0, anchorIndex),
          anchorY = attributeValue.slice(anchorIndex + 1),
          lastanchorX = anchorX.length - 1,
          lastanchorY = anchorY.length - 1;
          if (anchorX[lastanchorX] !== "%" || anchorY[lastanchorY] !== "%") {
            err("Region anchor positions have to be a percentage.");
            continue;
          }
          regionAttributes.viewportanchorX = parseInt(anchorX, 10);
          if (regionAttributes.viewportanchorX > 100 || regionAttributes.viewportanchorX < 0) {
            err("Region anchor position X has to be between 0 and 100.");
            regionAttributes.viewportanchorX = 0;
            continue;
          }
          regionAttributes.viewportanchorY = parseInt(anchorY, 10);
          if (regionAttributes.viewportanchorY > 100 || regionAttributes.viewportanchorY < 0) {
            err("Region anchor position Y has to be between 0 and 100.");
            regionAttributes.viewportanchorX = 0;
            regionAttributes.viewportanchorY = 100;
            continue;
          }
          break;

        case ("scroll"): // scroll
          if (attributeValue !== "up") {
            err("Region scroll can only be up.");
            continue;
          }
          regionAttributes.scroll = attributeValue;
          break;

        default:
          err("Invalid region attribute:" + attribute);
      }
    } // end for

    /* region has to have an id */
    if (seen.indexOf("id") === -1) {
      err("Missing id on Region.");
      return;
    }
    return regionAttributes;
  };

  return that;
};

var WebVTTCueTimingsAndSettingsParser = function(line, errorHandler) {
  var that = this,
  SPACE = /[\u0020\t\f]/,
  NOSPACE = /[^\u0020\t\f]/,
  line = line,
  pos = 0,
  err = function(message) {
    errorHandler(message, pos+1);
  },
  spaceBeforeSetting = true,

  skip = function (pattern) {
    while(
      line[pos] !== undefined &&
      pattern.test(line[pos])
    ) {
      pos++;
    }
  },

  collect = function (pattern) {
    var str = "";
    while(
      line[pos] !== undefined &&
      pattern.test(line[pos])
    ) {
      str += line[pos];
      pos++;
    }
    return str;
  },

  /* http://dev.w3.org/html5/webvtt/#collect-a-webvtt-timestamp */
  timestamp = function () {
    var units = "minutes",
    val1,
    val2,
    val3,
    val4;
    // 3
    if (line[pos] === undefined) {
      err("No timestamp found.");
      return;
    }
    // 4
    if (!/\d/.test(line[pos])) {
      err("Timestamp must start with a character in the range 0-9.");
      return;
    }
    // 5-7
    val1 = collect(/\d/);
    if (val1.length > 2 || parseInt(val1, 10) > 59) {
      units = "hours";
    }
    // 8
    if (line[pos] !== ":") {
      err("No time unit separator found.");
      return;
    }
    pos++;
    // 9-11
    val2 = collect(/\d/);
    if (val2.length !== 2) {
      err("Must be exactly two digits.");
      return;
    }
    // 12
    if (units === "hours" || line[pos] === ":") {
      if (line[pos] !== ":") {
        err("No seconds found or minutes is greater than 59.");
        return;
      }
      pos++;
      val3 = collect(/\d/);
      if (val3.length !== 2) {
        err("Must be exactly two digits.");
        return;
      }
    } else {
      val3 = val2;
      val2 = val1;
      val1 = "0";
    }
    // 13
    if (line[pos] !== ".") {
      err("No decimal separator (\".\") found.");
      return;
    }
    pos++;
    // 14-16
    val4 = collect(/\d/);
    if (val4.length !== 3) {
      err("Milliseconds must be given in three digits.");
      return;
    }
    // 17
    if (parseInt(val2, 10) > 59) {
      err("You cannot have more than 59 minutes.");
      return;
    }
    if (parseInt(val3, 10) > 59) {
      err("You cannot have more than 59 seconds.");
      return;
    }
    return parseInt(val1, 10) * 60 * 60 + parseInt(val2, 10) * 60 + parseInt(val3, 10) + parseInt(val4, 10) / 1000;
  },

  /* http://dev.w3.org/html5/webvtt/#parse-the-webvtt-settings */
  parseSettings = function (input, cue) {
    var settings = input.split(SPACE),
        settingsLength = settings.length,
        seen = [],
        i,
        settingsElement, index, setting, value, lastValueIndex;

    for (i = 0; i < settingsLength; i++) {
      settingsElement = settings[i];

      if (settingsElement === "") {
        continue;
      }

      index = settingsElement.indexOf(':');
      setting = settingsElement.slice(0, index);
      value = settingsElement.slice(index + 1);
      lastValueIndex = value.length - 1;

      if (seen.indexOf(setting) !== -1) {
        err("Duplicate setting.");
      }
      seen.push(setting);

      if (value === "") {
        err("No value for setting defined.");
        return;
      }

      switch (setting) {

        case ("vertical"): // writing direction
          if (value !== "rl" && value !== "lr") {
            err("Writing direction can only be set to 'rl' or 'rl'.");
            continue;
          }
          cue.direction = value;
          break;

        case ("line"): // line position
          if (!/\d/.test(value)) {
            err("Line position takes a number or percentage.");
            continue;
          }
          if (value.indexOf("-", 1) !== -1) {
            err("Line position can only have '-' at the start.");
            continue;
          }
          if (value.indexOf("%") !== -1 && value.indexOf("%") !== lastValueIndex) {
            err("Line position can only have '%' at the end.");
            continue;
          }
          if (value[0] === "-" && value[lastValueIndex] === "%") {
            err("Line position cannot be a negative percentage.");
            continue;
          }
          if (value[lastValueIndex] === "%") {
            if (parseInt(value, 10) > 100) {
              err("Line position cannot be >100%.");
              continue;
            }
            cue.snapToLines = false;
          }
          cue.linePosition = parseInt(value, 10);
          break;

        case ("position"): // text position
          if (value[lastValueIndex] !== "%") {
            err("Text position must be a percentage:" + value);
            continue;
          }
          if (parseInt(value, 10) > 100) {
            err("Size cannot be >100%.");
            continue;
          }
          cue.textPosition = parseInt(value, 10);
          break;

        case ("size"): // size
          if (value[lastValueIndex] !== "%") {
            err("Size must be a percentage.");
            continue;
          }
          if (parseInt(value, 10) > 100) {
            err("Size cannot be >100%.");
            continue;
          }
          cue.size = parseInt(value, 10);
          break;

        case ("align"): // alignment
          var alignValues = ["start", "middle", "end", "left", "right"];
          if (alignValues.indexOf(value) == -1) {
            err("Alignment can only be set to one of " + alignValues.join(", ") + ".");
            continue;
          }
          cue.alignment = value;
          break;

        case ("region"): // region
          if (seen.indexOf("line") !== -1 || seen.indexOf("size") !== -1) {
            continue;
          }
          cue.region = value;
          break;

        default:
          err("Invalid setting:" + setting);
      }
    } // end for

    if ((seen.indexOf("line") !== -1 || seen.indexOf("size") !== -1) && seen.indexOf("region") !== -1) {
      err("Ignoring region setting.");
      cue.region = "";
    }
  };

  that.parse = function(cue, previousCueStart) {
    skip(SPACE);
    cue.startTime = timestamp();

    var cueStartTime = cue.startTime;

    if (cueStartTime === undefined) {
      return;
    }
    if (cueStartTime < previousCueStart) {
      err("Start timestamp is not greater than or equal to start timestamp of previous cue.");
    }
    if (NOSPACE.test(line[pos])) {
      err("Timestamp not separated from '-->' by whitespace.");
    }
    skip(SPACE);
    // 6-8
    if (line[pos] !== "-") {
      err("No valid timestamp separator found.");
      return;
    }
    pos++;
    if (line[pos] !== "-") {
      err("No valid timestamp separator found.");
      return;
    }
    pos++;
    if (line[pos] !== ">") {
      err("No valid timestamp separator found.");
      return;
    }
    pos++;
    if (NOSPACE.test(line[pos])) {
      err("'-->' not separated from timestamp by whitespace.");
    }
    skip(SPACE);
    cue.endTime = timestamp();

    var cueEndTime = cue.endTime;

    if (cueEndTime === undefined) {
      return;
    }
    if (cueEndTime <= cueStartTime) {
      err("End timestamp is not greater than start timestamp.");
    }

    if (NOSPACE.test(line[pos])) {
      spaceBeforeSetting = false;
    }
    skip(SPACE);
    parseSettings(line.substring(pos), cue);
    return true;
  };

  that.parseTimestamp = function() {
    var ts = timestamp();
    if (line[pos] !== undefined) {
      err("Timestamp must not have trailing characters.");
      return;
    }
    return ts;
  };

  return that;
};

function WebVTTCueTextParser(line, errorHandler, mode) {
  var that = this,
    line = line,
    pos = 0,

    err = function(message) {
      if (mode == "metadata") return;
      errorHandler(message, pos+1);
    };

  that.parse = function(cueStart, cueEnd) {
    var result = {
      children:[]
    },
    current = result,
    timestamps = [],

    attach = function (token) {
      current.children.push({
        type:     "object",
        name:     token[1],
        classes:  token[2],
        children: [],
        parent:   current
      });
      current = current.children[current.children.length-1];
    },

    inScope = function (name) {
      var node = current;
      while(node) {
        if (node.name === name) {
          return true;
        }  
        node = node.parent;
      }
      return;
    };

    while(line[pos] !== undefined) {
      var token = nextToken();
      if (token[0] === "text") {
        current.children.push({
          type:   "text",
          value:  token[1],
          parent: current
        });
      } else if (token[0] === "start tag") {
        if (mode === "chapters") {
          err("Start tags not allowed in chapter title text.");
        }
        var name = token[1];
        if (name !== "v" && name !== "lang" && token[3] !== "") {
          err("Only <v> and <lang> can have an annotation.");
        }
        if (
          name === "c" ||
          name === "i" ||
          name === "b" ||
          name === "u" ||
          name === "ruby"
        ) {
          attach(token);
        } else if (name === "rt" && current.name === "ruby") {
          attach(token);
        } else if (name === "v") {
          if (inScope("v")) {
            err("<v> cannot be nested inside itself.");
          }
          attach(token);
          current.value = token[3]; // annotation
          if (!token[3]) {
            err("<v> requires an annotation.");
          }
        } else if(name == "lang") {
          attach(token);
          current.value = token[3]; // language
        } else {
          err("Incorrect start tag.");
        }
      } else if (token[0] === "end tag") {
        if (mode == "chapters") {
          err("End tags not allowed in chapter title text.");
        }
        // XXX check <ruby> content
        if (token[1] === current.name) {
          current = current.parent;
        } else if (token[1] === "ruby" && current.name === "rt") {
          current = current.parent.parent;
        } else {
          err("Incorrect end tag.");
        }
      } else if (token[0] === "timestamp") {
        if (mode == "chapters") {
          err("Timestamps not allowed in chapter title text.");
        }
        var timings = new WebVTTCueTimingsAndSettingsParser(token[1], err),
            timestamp = timings.parseTimestamp();
        if (timestamp !== undefined) {
          if (timestamp <= cueStart || timestamp >= cueEnd) {
            err("Timestamp must be between start timestamp and end timestamp.");
          }
          if (timestamps.length > 0 && timestamps[timestamps.length-1] >= timestamp) {
            err("Timestamp must be greater than any previous timestamp tag.");
          }
          current.children.push({
            type:   "timestamp",
            value:  timestamp,
            parent: current
          });
          timestamps.push(timestamp);
        }
      }
    }
    while(current.parent) {
      if (current.name !== "v") {
        err("Required end tag missing.");
      }
      current = current.parent;
    }
    return result;
  };

  var nextToken = function () {
    var state = "data",
        result = "",
        buffer = "",
        classes = [],

        checkItem = function(item) {
                  if (item) {
                    return true;
                  }
                };

    while(line[pos-1] !== undefined || pos === 0) {
      var c = line[pos];
      if (state === "data") {
        if (c === "&") {
          buffer = c;
          state = "escape";
        } else if (c === "<" && result === "") {
          state = "tag";
        } else if (c === "<" || c === undefined) {
          return ["text", result];
        } else {
          result += c;
        }
      } else if (state === "escape") {
        if (c === "&") {
          err("Incorrect escape.");
          result += buffer;
          buffer = c;
        } else if (/[abglmnsprt]/.test(c)) {
          buffer += c;
        } else if (c === ";") {
          if (buffer === "&amp") {
            result += "&";
          } else if (buffer === "&lt") {
            result += "<";
          } else if (buffer === "&gt") {
            result += ">";
          } else if(buffer == "&lrm") {
            result += "\u200e";
          } else if(buffer == "&rlm") {
            result += "\u200f";
          } else if(buffer == "&nbsp") {
            result += "\u00A0";
          } else {
            err("Incorrect escape.");
            result += buffer + ";";
          }
          state = "data";
        } else if (c === "<" || c === undefined) {
          err("Incorrect escape.");
          result += buffer;
          return ["text", result];
        } else {
          err("Incorrect escape.");
          result += buffer + c;
          state = "data";
        }
      } else if (state === "tag") {
        if (c === "\t" || c === "\n" || c === "\f" || c === " ") {
          state = "start tag annotation";
        } else if (c === ".") {
          state = "start tag class";
        } else if (c === "/") {
          state = "end tag";
        } else if (/\d/.test(c)) {
          result = c;
          state = "timestamp tag";
        } else if (c === ">" || c === undefined) {
          if (c === ">") {
            pos++;
          }
          return ["start tag", "", [], ""];
        } else {
          result = c;
          state = "start tag";
        }
      } else if (state === "start tag") {
        if (c === "\t" || c === "\f" || c === " ") {
          state = "start tag annotation";
        } else if (c === "\n") {
          buffer = c;
          state = "start tag annotation";
        } else if (c === ".") {
          state = "start tag class";
        } else if (c === ">" || c === undefined) {
          if (c === ">") {
            pos++;
          }
          return ["start tag", result, [], ""];
        } else {
          result += c;
        }
      } else if (state === "start tag class") {
        if (c === "\t" || c === "\f" || c === " ") {
          classes.push(buffer);
          buffer = "";
          state = "start tag annotation";
        } else if (c === "\n") {
          classes.push(buffer);
          buffer = c;
          state = "start tag annotation";
        } else if (c === ".") {
          classes.push(buffer);
          buffer = "";
        } else if (c === ">" || c === undefined) {
          if (c === ">") {
            pos++;
          }
          classes.push(buffer);
          return ["start tag", result, classes, ""];
        } else {
          buffer += c;
        }
      } else if (state === "start tag annotation") {
        if (c === ">" || c === undefined) {
          if (c === ">") {
            pos++;
          }
          buffer = buffer.split(/[\u0020\t\f\r\n]+/).filter(checkItem).join(" ");
          return ["start tag", result, classes, buffer];
        } else {
          buffer +=c;
        }
      } else if (state === "end tag") {
        if (c === ">" || c === undefined) {
          if (c === ">") {
            pos++;
          }
          return ["end tag", result];
        } else {
          result += c;
        }
      } else if (state === "timestamp tag") {
        if (c === ">" || c === undefined) {
          if (c === ">") {
            pos++;
          }
          return ["timestamp", result];
        } else {
          result += c;
        }
      } else {
        err("Never happens."); // The joke is it might.
      }
      // 8
      pos++;
    }
  };

  return that;
};

if (typeof module !== "undefined") {
  module.exports.WebVTTParser = WebVTTParser;
  module.exports.WebVTTCueTextParser = WebVTTCueTextParser;
}