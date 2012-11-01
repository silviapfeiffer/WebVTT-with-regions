"use strict";

var EDGEMARGIN = 0.3; /* % */

var WebVTT2DocumentFragment = function() {
  var that = this,

  /* construct DOM tree out of cue content */
  tree2HTML = function(tree) {
    var result = "",
        treeLength = tree.length;
    for (var i = 0; i < treeLength; i++) {
      var node = tree[i],
          nodeType = node.type,
          nodeClasses = node.classes;
      if (nodeType === "text") {
        result += node.value.replace(/\n/g, "<br/>");
      } else if (nodeType === "object") {
        if (node.name === 'c') {
          result += "<span";
          if (nodeClasses) {
            result += " class='";
            var nodeClassesLength = nodeClasses.length;
            for (var y = 0; y < nodeClassesLength; y++) {
              if (y > 0) {
                result += ' ';
              }
              result += nodeClasses[y];
            }
            result += "'";
          }
          result += ">";
        } else if (node.name === 'v') {
          result += "<span";
          if (node.value) {
            result += " title='" + node.value + "'";
          }
          result += ">";
        } else {
          result += "<" + node.name + ">";
        }
        if (node.children) {
          result += tree2HTML(node.children);
        }
        if (node.name === 'c') {
          result += "</span>";
        } else if (node.name === 'v') {
          result += "</span>";
        } else {
          result += "</" + node.name + ">";
        }
      } else if (nodeType === "timestamp") {
        result += "<?timestamp " + printTimestamp(node.value) + " ?>";
      }
    }
    return result;
  },

  getTextHeight = function(element, parent, styles) {
    var temp = document.createElement(element.nodeName);
    temp.setAttribute("style", styles);
    temp.innerHTML = element.innerHTML;
    temp = parent.appendChild(temp);
    var ret = temp.clientHeight;
    parent.removeChild(temp);
    return ret;
  },

  isNumber = function(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  },

  /* convert cue settings to CSS for cue div */
  /* TODO: vertical settings; rtl text */
  getCueCSS = function(cue, videoWidth, videoHeight, domFragment, parent) {
    var maxsize = 0,
        size = 0,
        width = 0,
        height = 0,
        xposition = 0,
        yposition = 0,
        rightmarginedge = 0,
        left = 0,
        top = 0,
        margin = 0,
        maxdimension = 0,
        fullDimension = 0,
        lineHeight = 0,
        fontSize = 0,
        step = 0,
        linePosition = 0,
        position = 0,
        divHeight = 0,
        result = "";

    /* set defaults */
    lineHeight = 0.05 * videoHeight;
    fontSize = lineHeight / 1.3;

    result = "position:absolute;";
    result += " unicode-bidi:-webkit-plaintext; unicode-bidi:-moz-plaintext; unicode-bidi:plaintext;";
    result += " direction:ltr;";
    result += " background:rgba(0,0,0,0.8);";
    result += " word-wrap:break-word; overflow-wrap:break-word;";
    result += " font: " + fontSize + "px sans-serif;";
    result += " line-height:" + lineHeight + "px;";
    result += " color: rgba(255, 255, 255, 1);";

    if (cue.direction === "lr") {
      result += " writing-mode:vertical-lr;-webkit-writing-mode:vertical-lr;";
    } else if (cue.direction === "rl") {
      result += " writing-mode:vertical-rl;-webkit-writing-mode:vertical-rl;";
    } else {
      result += " writing-mode:horizontal-tb;-webkit-writing-mode:horizontal-tb;";
    }

    /* assuming ltr */
    if (cue.alignment === "start") {
      result += " text-align:start;";
      maxsize = 100 - cue.textPosition;
    } else if (cue.alignment === "end") {
      result += " text-align:end;";
      maxsize = cue.textPosition;
    } else if (cue.alignment === "middle" && cue.textPosition <= 50) {
      result += " text-align:center;";
      maxsize = cue.textPosition * 2;
    } else if (cue.alignment === "middle" && cue.textPosition > 50) {
      result += " text-align:center;";
      maxsize = (100 - cue.textPosition) * 2;
    } else if (cue.alignment === "left") {
      result += " text-align:left";
      maxsize = 100 - cue.textPosition;
    } else if (cue.alignment === "right") {
      result += " text-align:right";
      maxsize = cue.textPosition;
    }

    if (cue.size < maxsize) {
      size = cue.size;
    } else {
      size = maxsize;
    }

    if (cue.alignment === "start" || cue.alignment === "left") {
      xposition = cue.textPosition;
    } else if (cue.alignment === "end" || cue.alignment === "right") {
      xposition = cue.textPosition - size;
    } else if (cue.alignment === "middle") {
      xposition = cue.textPosition - (size / 2);
    }

    if (cue.snapToLines === true) {
      yposition = 0;
    } else {
      yposition = cue.linePosition;
    }

    // Only apply edgemargin to non-percentage positioned cues
    // why is there no margin in yposition dimension?
    // https://www.w3.org/Bugs/Public/show_bug.cgi?id=19744
    if (cue.snapToLines === true) {
      var edgemargin = EDGEMARGIN * videoWidth / 100.0;
      if (xposition < edgemargin && (xposition + size > edgemargin)) {
        xposition += edgemargin;
        size -= edgemargin;
        rightmarginedge = 100 - edgemargin;
        if (xposition < rightmarginedge && (xposition + size > rightmarginedge)) {
          size -= edgemargin;
        }
      }
    }

    left = xposition * videoWidth / 100.0;
    result += " left:" + left + "px;";

    width = size * videoWidth / 100.0;
    result += " width:" + width + "px;";

    height = 'auto';
    result += " height:auto;";

    top = yposition * videoHeight / 100.0;

    // compute line position
    if (isNumber(cue.linePosition)) {
      linePosition = cue.linePosition;
      if (cue.snapToLines === false) {
        if (cue.linePosition < 0 || cue.linePosition > 100) {
          linePosition = 100;
        }
      }
    } else { // 'auto' linePosition
      if (cue.snapToLines === false) {
        linePosition = 100;
      } else {
        linePosition = -1;
      }
    }

    /* adjust positions */
    if (cue.snapToLines === true) {
      margin = EDGEMARGIN * videoHeight / 100.0;
      fullDimension = videoHeight;
      maxdimension = fullDimension - (2 * margin);
      step = lineHeight;
      position = step * linePosition;

      if (linePosition < 0) {
        position += maxdimension;
        step *= -1;
      } else {
        position += margin;
      }
      top += position;

      // calculate how much of the cue is outside the video viewport
      divHeight = getTextHeight(domFragment, parent, result);
      var score = maxdimension - top - divHeight;
      while (top > 0 && score < 0 && top < maxdimension) {
        top += step;
        score = maxdimension - top - divHeight;
      }

    } else {
      // Requested to fix relative positioning:
      // https://www.w3.org/Bugs/Public/show_bug.cgi?id=18501
      // best by not doing the x% / y% adjustment.
      //x = cue.textPosition;
      //y = linePosition;
    }

    result += " top:" + top + "px;";

    return result;
  };

  /* convert cue to a HTML fragment */
  that.cue2DOMFragment = function(cue, videoWidth, videoHeight, parent) {
    var domFragment = document.createElement("div");
    domFragment.setAttribute("style", "display:inline;");
    domFragment.innerHTML = tree2HTML(cue.tree.children);
    if (cue.id) {
      domFragment.setAttribute("id", cue.id);
    }
    domFragment.setAttribute("style", getCueCSS(cue, videoWidth, videoHeight, domFragment, parent));

    return {
      domFragment: domFragment,
      startTime: cue.startTime,
      endTime: cue.endTime
    };
  };

  return that;
};
