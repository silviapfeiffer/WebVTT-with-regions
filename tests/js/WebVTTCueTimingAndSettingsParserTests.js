// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

// Not intended to be fast, but if you can make it faster, please help out!

// Declare dependencies
/*global jqUnit, expect, jQuery, start*/

// JSLint options 
/*jslint white: true, funcinvoke: true, undef: true, newcap: true, nomen: true, regexp: true, bitwise: true, browser: true, forin: true, maxerr: 100, indent: 4 */

(function ($) {
    $(document).ready(function () {

        var webvttCueTimingAndSettingsParserTests = new jqUnit.TestCase("webvttCueTimingAndSettingsParser Tests");

        webvttCueTimingAndSettingsParserTests.test("First dummy test", function () {
            expect(1);
            
            jqUnit.assertEquals("First dummy test", true, true);
        });

    });
})(jQuery);
