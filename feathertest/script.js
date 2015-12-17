var FeatherTest = window.FeatherTest = FeatherTest || {};

(function (d, c) {
    'use strict';

    FeatherTest = (function (ft) {
        ft.config = {};

        /**
         * Load the test
         */
        var _testLoad = function (callback) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', localStorage.ft_url + '?' + Math.random());
            xhr.onload = function () {
                ft.config.test = this.response.split('\n');
                if (ft.config.test[0].substr(0, 13).toLowerCase() !== "'feathertest'") {
                    c.error("FeatherTest: Not a valid test! Tests must start with 'feathertest'");
                    _testReset();
                    return false;
                }
                c.info('FeatherTest: ' + localStorage.ft_url + ' started  ' + new Date());
                c.dir(ft.config.test);
                callback();
            };
            xhr.send();
        };

        /**
         * Loop through items until the end
         */
        var _testLoop = function (order) {
            if (ft.config.test === null) return false;

            if (ft.config.test.length > 0) {
                if (ft.config.step < ft.config.test.length) {
                    ft.config.step = parseInt(ft.config.step) + 1;
                    _itemRun(ft.config.test[ft.config.step - 1], ft.config.step);
                }
                // Reached end
                else {
                    if (ft.config.failed === 0) {
                        c.info('FeatherTest: Test finished OK ( %c' + ft.config.passed + ' PASSED %c/%c ' + ft.config.failed + ' failed %c)', 'color: green', 'color: black', 'color: red', 'color: black');
                    }
                    else {
                        c.info('FeatherTest: Test finished with ERRORS ( %c' + ft.config.passed + ' PASSED %c/%c ' + ft.config.failed + ' FAILED %c)', 'color: green', 'color: black', 'background: red; color: white', 'color: black');
                    }
                    _testReset();
                }
            }
            else {
                c.error('FeatherTest: Test is empty');
            }
        };

        /**
         * Run a certain item of the test
         */
        var _itemRun = function (order, step) {
            // Save everything before running just in case
            chrome.storage.local.set({
                'config': ft.config
            }, function () {
                if (!isNaN(parseFloat(order)) && isFinite(order)) // checks if it's a number
                {
                    c.log('FeatherTest: %c[' + step + '] Waiting ' + order + 'ms...', 'color: grey');
                    ft.config.t = setTimeout(function () {
                        _testLoop();
                    }, order);
                }
                else {
                    c.log('FeatherTest: %c[' + step + '] %c' + order, 'color: grey', 'color: blue');
                    eval(order);
                    _testLoop();
                }
            });
        };

        /**
         * Reset the test
         */
        var _testReset = function () {
            ft.config = {
                test: null,
                step: null,
                passed: null,
                failed: null,
                t: null,
                vars: []
            };
            chrome.storage.local.set({
                'config': ft.config
            });
        };

        /**
         * Set event listener for Chrome toolbar button click
         */
        var _setPopupListener = function () {
            chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {

                if (request.action == 'newTest') {
                    // test was running, stop
                    if (!isNaN(parseFloat(ft.config.step)) && isFinite(ft.config.step)) // is numeric
                    {
                        c.info('FeatherTest: Test interrupted by user ( %c' + ft.config.passed + ' passed %c/ %c' + ft.config.failed + ' failed %c)', 'color: green', 'color: black', 'color: red', 'color: black');
                        _testReset();
                    }
                    // Start test
                    else {
                        var url = prompt('Specify the path to a test:', localStorage.ft_url || window.location.origin + '/test.txt');

                        if (url !== null) {
                            localStorage.ft_url = url;
                            ft.config.step = 1; // skips 0 since it's just 'feathertest'
                            ft.config.passed = 0;
                            ft.config.failed = 0;

                            chrome.storage.local.set({
                                'config': ft.config
                            }, function () {
                                _testLoad(_testLoop);
                            });
                        }
                    }
                }

            });
        };

        /**
         * Dipatch an event
         *
         * @param selector The query selector string
         * @param type the event type string
         */
        var _dispatchEvent = function (selector, type) {
            var element = document.querySelector(selector);

            if (element) {
                var elEvent = new CustomEvent(type, {
                    detail: {
                        message: "FT Event - " + type,
                        time: new Date()
                    },
                    bubbles: true,
                    cancelable: true
                });

                element.dispatchEvent(elEvent);
            } else {
                c.error("Cannot dispatch event, query did not return any element.");
            }
        };

        /**
         * Makes the current test marked as passed.
         * @param f The expression that was accepted.
         * @private
         */
        var _currentTestPassed = function (f) {
            ft.config.passed = ft.config.passed + 1;
            c.info('FeatherTest: %c PASS %c (' + f + ')', 'background: green; color: white;', 'color: grey');
        };

        /**
         * Makes the current test marked as failed.
         * @param f The expression that failed the test.
         * @param expected The expected value.
         * @param fatal true if the test suite execution must stop.
         * @private
         */
        var _currentTestFailed = function (f, expected, fatal) {
            ft.config.failed = ft.config.failed + 1;
            c.error('FeatherTest: %c FAIL %c (got: ' + f + ', expected: ' + expected + ')', 'background: red; color: white;', 'color: grey');

            if (fatal) {
                ft.stop();
            }
        };

        /*
         * Test assertions and methods
         */

        /**
         * Validate that f is true.
         * @param f The expression to validate
         * @param fatal true if failure must stop execution.
         */
        ft.isTrue = function (f, fatal) {
            if (f) {
                _currentTestPassed(f);
            }
            else {
                _currentTestFailed(f, true, fatal);
            }
        };

        /**
         * Validate that f is false.
         * @param f The expression to validate
         * @param fatal true if failure must stop execution.
         */
        ft.isFalse = function (f, fatal) {
            if (!f) {
                _currentTestPassed(f);
            }
            else {
                _currentTestFailed(f, false, fatal);
            }
        };

        /**
         * Validate that f is equal to val.
         * @param f The expression to validate
         * @param val The expected value to compare with
         * @param fatal true if failure must stop execution.
         */
        ft.isEqual = function (f, val, fatal) {
            if (f == val) {
                _currentTestPassed(f);
            }
            else {
                _currentTestFailed(f, val, fatal);
            }
        };

        /**
         * Validate that f is equal to val and same type.
         * @param f The expression to validate
         * @param val The expected value to compare with
         * @param fatal true if failure must stop execution.
         */
        ft.isEqualAbsolute = function (f, val, fatal) {
            if (f === val) {
                _currentTestPassed(f);
            }
            else {
                _currentTestFailed(f, val, fatal);
            }
        };

        /**
         * Stops tests execution.
         */
        ft.stop = function () {
            ft.config.step = ft.config.test.length + 1;
        };

        /**
         * Jumps to specified step.
         * @param step The targeted step.
         * @param condition The condition to meet in order to jump to step.
         */
        ft.step = function (step, condition) {
            if (!condition) return;
            ft.config.step = step - 1;
        };

        /**
         * Save a variable
         * @param param The param key.
         * @param value The param value to store.
         */
        ft.set = function (param, value) {
            ft.config.vars[param] = value;
        };

        /**
         * Get a variable
         * @param param The param key.
         */
        ft.get = function (param) {
            return ft.config.vars[param] || null;
        };

        /**
         * Dipatch an event
         *
         * @param selector The query selector string
         * @param type the event type string
         */
        ft.dispatch = function (selector, type) {
            _dispatchEvent(selector, type);
        };

        /**
         * Sets the value on an element matching the selector query.
         * @param selector The query selector string
         * @param val The new value to set on the element.
         */
        ft.val = function (selector, val) {
            document.querySelector(selector).value = val;
            _dispatchEvent(selector, "keyup");
            _dispatchEvent(selector, "change");
        };

        /**
         * Start the script
         */
        ft.init = function () {
            chrome.storage.local.get('config', function (data) {
                if (typeof data.config === 'undefined') {
                    _testReset();
                }
                else {
                    ft.config = data.config;
                }

                _setPopupListener();
                _testLoop();
            });
        };

        return ft;
    })(FeatherTest || {});

    FeatherTest.init();
}(document, console));
