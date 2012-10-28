"use strict";

var WebVTTSerializer = function() {
  var that = this,
  
  serializeTree = function (tree) {
    var result = "",
        treeLength = tree.length;
    for (var i = 0; i < treeLength; i++) {
      var node = tree[i],
          nodeType = node.type,
          nodeClasses = node.classes;
      if (nodeType === "text") {
        result += node.value;
      } else if (nodeType === "object") {
        result += "<" + node.name;
        if (nodeClasses) {
        var nodeClassesLength = nodeClasses.length;
          for(var y = 0; y < nodeClassesLength; y++) {
            result += "." + nodeClasses[y];
          }
        }
        if (node.value) {
          result += " " + node.value;
        }
        result += ">";
        if (node.children) {
          result += serializeTree(node.children);
        }
        result += "</" + node.name + ">";
      } else {
        result += "<" + node.value + ">";
      }
    }
    return result;
  },

  serializeCueSettings = function(cue) {
    var result = "";

    if (cue === "") {
      return result;
    }

    // writing direction
    if (cue.direction !== "horizontal") {
      result += "vertical:" + cue.direction + "% ";
    }

    // line position
    if (cue.linePosition !== "auto") {
      result += "line:" + cue.linePosition;
      if (cue.snapToLines === false) {
        result += "%";
      }
      result += " ";
    }

    // text position
    if (cue.textPosition !== 50) {
      result += "position:" + cue.textPosition + "% ";
    }

    // size
    if (cue.size !== 100) {
      result += "size:" + cue.size + "% ";
    }

    // alignment
    if (cue.alignment !== "middle") {
      result += "align:" + cue.alignment + " ";
    }

    // region
    if (cue.region !== "") {
      result += "region:" + cue.region;
    }

    return result;
  },

  serializeCue = function (cue) {
    var result = "";
    if (cue.id) {
      result += cue.id + "\n";
    }
    result += printTimestamp(cue.startTime) + " --> " + printTimestamp(cue.endTime);
    result += " " + serializeCueSettings(cue) + "\n";
    result += serializeTree(cue.tree.children) + "\n\n";

    return result;
  },

  serializeRegion = function(attributes) {
    var result = "";
    if (attributes.id) {
      result += " id=" + attributes.id;
    }
    result += " width=" + attributes.width + "%";
    result += " height=" + attributes.height;
    result += " anchorpoint=" + attributes.anchorX + "%," + attributes.anchorY + "%";
    result += " anchorposition=" + attributes.anchorPositionX + "%," + attributes.anchorPositionY + "%";
    if (attributes.scroll) {
      result += " scroll=" + attributes.scroll;
    }
    return result;
  };
  
  that.serialize = function(cues, metadatas) {
    var result = "WEBVTT\n",
        cueLength = cues.length,
        metadataLength = metadatas.length;

    for(var i=0; i<metadataLength; i++) {
      if (metadatas[i].name === "Region") {
        result += metadatas[i].name + ":" + serializeRegion(metadatas[i].regionAttributes) + "\n";
      } else {
        result += metadatas[i].name + ":" + metadatas[i].value + "\n";
      }
    }
    result += "\n";

    for(var i=0; i<cueLength; i++) {
      result += serializeCue(cues[i]);
    }
    return result;
  };
  
  return that;
};
