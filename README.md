# WebVTT Parser with Regions

This code is an experimental implementation of CEA 708 caption feature support into WebVTT.

It follows the specification at http://www.w3.org/community/texttracks/wiki/MultiCueBox .


## Loading the demo

Load parser.html in your browser.
* it contains a demo WebVTT file
* it outputs what the browser would accept as a parsed version of that file
* it outputs a rendering of each cue in the WebVTT file on a fake video viewport

You can edit the WebVTT file live and it will immediately update the parsed output and the rendering.

Load player.html in your browser.
* it contains a demo WebVTT file
* it does the parsing, DOM construction, and rendering
* it outputs an actual video element with rendered captions on top

## Running the test suite

```
node ./validate.js -v
```

## Known bugs

While the parser is complete, the rendering is not fully implemented yet:
* missing support for vertically rendered text
* missing support for rtl text
* when "align" is added to cue settings, positioning breaks

## Thanks

The code is based on a parser and validator that Anne van Kestern implemented:
https://github.com/annevk/webvtt
=======
WebVTT parser and validator
===========================

Relevant links:

* [Live WebVTT Validator](http://quuz.org/webvtt/).
* [WebVTT Standard](http://dev.w3.org/html5/webvtt/)
