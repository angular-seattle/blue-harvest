/**
 * @fileoverview Browser-side scripts for Monkey Helper and Action Helpers.
 *
 * The browser-side part of Monkey Helper can be developed and debugged without
 * protractor. Just paste this whole file in Chrome inspector, and you'll get
 * most Monkey Helper functions. (The ones that rely on finding elements on
 * page, but without timeout support. Timeouts are done on protractor side.)
 *
 * Hover on the return value of see() or click() in the inspector to see the
 * element highlighted in the page. When it breaks, you can try to debug
 * browserSideFind(). For example, if below('Foo').see('Bar') is not returning
 * the element you would expect, try this in the inspector and step into the
 * code:
 *
 *   debugger; see('FooBar');
 *
 * One known issue (likely fixable with some overkill approach) is that click()
 * does not work in many cases. However, it returns the element that would be
 * clicked if we were running in protractor, so you can find it on the page and
 * click it yourself.
 *
 * Another problem is that focus is stolen from the page by chrome inspector,
 * making it difficult to interact with jfk-select. To work around this problem,
 * do the following:
 *
 *   1. Open the inspector
 *   2. Click the jfk-select dropdown so that it opens
 *   3. Press F8 - debugger starts and the page gets frozen
 *   4. You can now experiment with see(), click(), etc. in the inspector
 *
 * You can also use this for quick experimentation with the locators while your
 * tests are building, when provisiong is broken and you don't have a project,
 * etc., but remember that the see(), click(), etc., functions do not implement
 * the whole functionality of Monkey Helper, because they are only intended for
 * debugging and development of Monkey Helper itself, not the actual tests.
 */


/**
 * Browser-side function that locates an element.
 *
 * Returns:
 * - element, if found,
 * - a string, in case of an error,
 * - true, if the element was not found and that is expected ("not" is true).
 *
 * You can test Monkey Helper locators directly in Chrome inspector. Paste from
 * here to end of file into the Chrome inspector. See also comment at end of
 * file.
 *
 * @param {!Array<{
 *     using: string,
 *     value: string,
 *     direction: ?string,
 *     wantZero: ?boolean,
 *     enabled: ?boolean,
 *     disabled: ?boolean,
 *     allowCovered: ?boolean,
 *     allowUnseen: ?boolean,
 *   }>} locators Identifies the element.
 * @param {Object=} opt_options Options that affect matching.
 * @return {!WebElement|string|boolean} The element if exactly one was found, or
 *   an error message, or true if no elements were found and wantZero option was
 *   given.
 */
var browserSideFind = function(locators, opt_options) {
  var epsilon = 0.1;
  var options = opt_options || {};
  var regExp;

  // Finds elements by xpath and returns them as an array.
  var byXPath = function(locator, opt_context) {
    var iterator = document.evaluate(
        locator, opt_context || document.body, null, XPathResult.ANY_TYPE,
        null);
    var result = [];
    for (var x = iterator.iterateNext(); x; x = iterator.iterateNext()) {
      result.push(x);
    }
    return result;
  };

  // Find elements by string and returns them as an array.
  var byString = function(locator) {
    var parts = locator.match(/[^']+|[']/g).map(function(part) {
      if (part === '\'') return '"\'"';
      return '\'' + part.toLowerCase() + '\'';
    });
    var escapedText =
        parts.length > 1 ? 'concat(' + parts.join(',') + ')' : parts[0];
    var inputsFound =
        byXPath(
            '//input[@type="text" or @type="number" or not(@type)] | ' +
            '//textarea')
            .filter(function(e) {
              return e.value == locator;
            });
    // Finds the bottom-most element whose in the DOM whose text content
    // matches given text. So for example given <div><span>bar</span></div>
    // it will return the <span>, not the <div>.
    var match = function(expr) {
      return 'normalize-space(translate(' + expr + ', ' +
          ' "ABCDEFGHIJKLMNOPQRSTUVWXYZ\u00A0",' +
          ' "abcdefghijklmnopqrstuvwxyz "))' +
          ' = ' + escapedText;
    };
    return byXPath(
               '//*[(' + match('.') + ' or ' + match('text()') + ') and ' +
               ' not(descendant::*[' + match('.') + '])]')
        .concat(inputsFound);
  };

  // Finds elements by regexp and returns them as an array.
  var byRegExp = function(e) {
    var results = [];
    for (var i = 0; i < e.children.length; ++i) {
      results = results.concat(byRegExp(e.children[i]));
    }
    if (results.length) return results;
    if (e.textContent ||
        e.value && (e.type == 'text' || e.type == 'textarea')) {
      var text = (e.textContent || e.value).replace(/\s+/g, ' ').trim();
      if (regExp.test(text)) return [e];
    }
    return [];
  };

  /**
   * Given an element, return all of the elements covering it.
   *
   * @param {Element} e
   * @returns {Array<Element>} all elements covering the argument element.
   */
  let coveringElements = function(e) {
    let r = e.getBoundingClientRect();
    if (!r.height || !r.width) return [];
    let x = (r.left + r.right) / 2;
    let y = (r.top + r.bottom) / 2;
    let elementSet = new Set();
    // get the set of elements at the center and corners of the bounding rect.
    elementSet.add(document.elementFromPoint(x, y));
    elementSet.add(document.elementFromPoint(r.left + 1, r.top + 1));
    elementSet.add(document.elementFromPoint(r.left + 1, r.bottom - 1));
    elementSet.add(document.elementFromPoint(r.right - 1, r.top + 1));
    elementSet.add(document.elementFromPoint(r.right - 1, r.bottom - 1));
    // remove the element itself. Will be present if any points are uncovered.
    elementSet.delete(e);
    return Array.from(elementSet);
  };

  /**
   * Given an element, return a value representing if it can be seen.
   *
   * @param {Element} e
   * @returns {string} - a value from DISPLAY_STATUS_ENUM
   */
  let displayStatus = function(e) {
    // Check that parent elements are displayed.
    let r = e.getBoundingClientRect();
    if (!r.height || !r.width) return DISPLAY_STATUS_ENUM.empty;
    let x = (r.left + r.right) / 2;
    let y = (r.top + r.bottom) / 2;
    if (hitsAncestorButton(e, x, y)) {
      return DISPLAY_STATUS_ENUM.visible;
    }
    // Move up to the first clickable element, because elementFromPoint
    // ignores the unclickables.
    let style = window.getComputedStyle(e);
    while (style.pointerEvents === 'none') {
      // If element is in a hidden container, break and return false.
      if (isUnseenStyle(style)) {
        return DISPLAY_STATUS_ENUM.invisible;
      }
      // Move one up.
      e = e.parentElement;
      style = window.getComputedStyle(e);
    }
    if (isUnseenStyle(style) && options.allowUnseen !== true) {
      return DISPLAY_STATUS_ENUM.invisible;
    }
    if (options.allowCovered) return DISPLAY_STATUS_ENUM.visible;
    // Check that the element is not covered (by glass, for example).
    return (hitsElement(x, y, e) || hitsElement(r.left + 1, r.top + 1, e) ||
            hitsElement(r.left + 1, r.bottom - 1, e) ||
            hitsElement(r.right - 1, r.top + 1, e) ||
            hitsElement(r.right - 1, r.bottom - 1, e)) ?
        DISPLAY_STATUS_ENUM.visible :
        DISPLAY_STATUS_ENUM.covered;
  };

  const DISPLAY_STATUS_ENUM = {
    covered: 'COVERED',
    empty: 'EMPTY',
    invisible: 'INVISIBLE',
    visible: 'VISIBLE',
  };

  // If f is below e, returns the distance down from e to f. Otherwise 1e100.
  var distanceDown = function(e, f) {
    e = e.getBoundingClientRect();
    f = f.getBoundingClientRect();
    // Boundary error, so that in instances and templates creation, in directive
    // for machine types, CPU value is checked (below('vCPU').see(value) ).
    if (e.bottom <= f.top + 2) return f.top - e.bottom + 2;
    return 1e100;
  };

  // If f is rightwards from e returns the distance right from e to f, or 1e100.
  var distanceRight = function(e, f) {
    e = e.getBoundingClientRect();
    f = f.getBoundingClientRect();
    // Note the difference between this and distanceDown. This is more relaxed
    // than distanceDown, to support cases seen in Pantheon, e.g. a label
    // overlapping by one pixel with a warning icon to the right of it.
    e = (e.left + e.right) / 2;
    f = (f.left + f.right) / 2;
    if (e <= f) return f - e;
    return 1e100;
  };

  // Given an array of elements, returns a string with HTML of some initial (up
  // to 3) elements from the array, for inclusion in error messages.
  var elementsToString = function(a) {
    var s = '';
    for (var i = 0; i < a.length && i < 3; ++i) {
      s += a[i].outerHTML + '\n';
    }
    if (a.length > 3) s += '...\n';
    return s;
  };

  // Finds exactly one element globally (or zero if locator.wantZero is set).
  var findGlobal = function(locator) {
    if (locator.direction === 'at') {
      return {
        rightOf: findGlobal(locator.rightOf),
        under: findGlobal(locator.under),
      };
    }
    var all = selectAll(locator);
    var candidateElements = all.filter(hasCorrectDisplayStatus);
    // Try to auto-scroll to see an element.
    if (!candidateElements.length && options.scroll !== false) {
      var maybeDisplayed = all.filter(isMaybeDisplayed);
      if (maybeDisplayed.length == 1 && shouldAutoScroll(maybeDisplayed[0])) {
        maybeDisplayed[0].scrollIntoView();
        if (hasCorrectDisplayStatus(maybeDisplayed[0])) {
          candidateElements = maybeDisplayed;
        }
      }
    }
    // Check result.
    if (locator.wantZero) {
      if (candidateElements.length) {
        throw 'Found unwanted: ' + locatorToString(locator) + '\n' +
            elementsToString(candidateElements);
      }
      return true;
    }
    if (!candidateElements.length) {
      var extraMessage = '';
      if (all.length > 0) {
        extraMessage =
            ' Number of hidden elements: ' + all.length + '\nElements:\n';
        for (let i = 0; i < all.length; i++) {
          const hiddenElement = all[i];
          const status = displayStatus(hiddenElement);
          extraMessage +=
              `${formatHtmlString(hiddenElement.outerHTML)}: ${status}\n`;
          if (status === DISPLAY_STATUS_ENUM.covered) {
            const elementsCovering = coveringElements(hiddenElement);
            extraMessage += `\tby ${elementsCovering.length} elements\n`;
            for (let j = 0; j < elementsCovering.length; j++) {
              let elementCovering = elementsCovering[j];
              if (!elementCovering) {
                extraMessage += '\t\tunknown element';
              } else {
                extraMessage +=
                    `\t\t${formatHtmlString(elementCovering.outerHTML)}\n`;
              }
            }
          }
        }
      }
      throw 'Looking for ' + locatorToString(locator) +
          ' failed. No elements are displayed.' + extraMessage;
    }
    if (candidateElements.length > 1) {
      throw 'Looking for ' + locatorToString(locator) +
          ' failed. More than one element is ' +
          'displayed, number of displayed elements: ' + candidateElements.length +
          '\nElements:\n' + elementsToString(candidateElements);
    }
    var disabledAncestor = getDisabledAncestor(candidateElements[0]);
    if (locator.enabled && disabledAncestor) {
      throw 'Looking for ' + locatorToString(locator) +
          ' failed. Element found is disabled.' +
          '\nThe element:\n' + disabledAncestor.outerHTML;
    }
    if (locator.disabled && !disabledAncestor) {
      throw 'Looking for ' + locatorToString(locator) +
          ' failed. Element found is enabled.' +
          '\nThe element:\n' + candidateElements[0].outerHTML;
    }
    return candidateElements[0];
  };

  // Finds an element relative to another.
  var findRelative = function(reference, locator, type) {
    if (locator.direction === 'at') {
      return {
        rightOf: findRelative(reference, locator.rightOf, type),
        under: findRelative(reference, locator.under, type),
      };
    }
    // Find all and calculate distances.
    var all = selectAll(locator).map(function(e) {
      var distance = 1e100;
      if (type == 'below') {
        distance = distanceDown(reference, e);
      } else if (type == 'under' && isUnderOrOver(reference, e)) {
        distance = distanceDown(reference, e);
      } else if (type == 'leftOf' && isLeftOfOrRightOf(reference, e)) {
        distance = distanceRight(e, reference);
      } else if (type == 'rightOf' && isLeftOfOrRightOf(reference, e)) {
        distance = distanceRight(reference, e);
      } else if (
          type == 'inside' && isUnderOrOver(reference, e) &&
          isLeftOfOrRightOf(reference, e)) {
        distance = 0;
      } else if (
          type == 'at' && isUnderOrOver(reference.under, e) &&
          isLeftOfOrRightOf(reference.rightOf, e)) {
        if (distanceDown(reference.under, e) < 1e100 &&
            distanceRight(reference.rightOf, e) < 1e100) {
          // Do not allow for any ambiguity.
          distance = 0;
        }
      }
      return {element: e, distance: distance};
    });
    // Remove those in a wrong direction; sort.
    all = all.filter(function(e) {
               return e.distance != 1e100;
             })
              .sort(function(a, b) {
                return a.distance - b.distance;
              });
    // Filter displayed.
    var candidateElements = all.filter(function(e) {
      return hasCorrectDisplayStatus(e.element);
    });
    // Try to auto-scroll to see an element.
    if (!candidateElements.length && options.scroll !== false) {
      var maybeDisplayed = all.filter(function(e) {
        return isMaybeDisplayed(e.element);
      });
      if (maybeDisplayed.length) {
        maybeDisplayed[0].element.scrollIntoView();
        candidateElements = all.filter(function(e) {
          return hasCorrectDisplayStatus(e.element);
        });
      }
    }
    // Get the closest one(s).
    var minDist = candidateElements.length && candidateElements[0].distance;
    var found = candidateElements.filter(function(e) {
      return Math.abs(e.distance - minDist) < 1;
    });
    // Check result.
    if (locator.wantZero) {
      if (found.length) {
        throw 'Found unwanted: ' + locatorToString(locator) + '\n' +
            elementsToString(found);
      }
      return true;
    }
    const referenceString = reference.rightOf && reference.under ?
        'rightOf: ' + reference.rightOf.outerHTML +
            ' and under: ' + reference.under.outerHTML :
        reference.outerHTML;
    if (!found.length) {
      var extraMessage = '';
      if (candidateElements.length > 0) {
        extraMessage = '\nDisqualified elements: ' +
            elementsToString(candidateElements.map(function(e) {
                         return e.element;
                       }));
      }
      throw 'No elements are within area defined by reference element. ' +
          '\nReference element: ' + referenceString + extraMessage;
    }
    if (found.length > 1) {
      throw 'More than one element seems to be nearest to reference element. ' +
          'Cannot choose.\nReference element: ' + referenceString +
          '\nElements: ' + elementsToString(found.map(function(e) {
            return e.element;
          }));
    }
    var disabledAncestor = getDisabledAncestor(found[0].element);
    if (locator.enabled && disabledAncestor) {
      throw 'Element found within area is disabled.' +
          '\nReference element: ' + referenceString + '\nThe element:\n' +
          disabledAncestor.outerHTML;
    }
    if (locator.disabled && !disabledAncestor) {
      throw 'Element found within area is enabled.' +
          '\nReference element: ' + referenceString + '\nThe element:\n' +
          found[0].element.outerHTML;
    }
    return found[0].element;
  };

  /**
   * Take a string for HTML and strip out newlines and empty space in tags
   *
   * @param {string} s - a string of HTML content
   * @returns {string} the input without any new-lines or empty space between tags
   */
  let formatHtmlString = function(s) {
    return s.replace('\n', '').replace(/>\s*</, '><');
  };

  // Workaround for buttons in Firefox to detect properly.
  var hitsAncestorButton = function(e, x, y) {
    var elementAtPoint = document.elementFromPoint(x, y);
    if (elementAtPoint && elementAtPoint.tagName === 'BUTTON') {
      for (var p = e.parentElement; p; p = p.parentElement) {
        if (p === elementAtPoint) {
          return true;
        }
      }
    }
    return false;
  };

  // Checks that clicking at x, y hits element e (or its descendant).
  var hitsElement = function(x, y, e) {
    for (var f = document.elementFromPoint(x, y); f; f = f.parentElement) {
      if (e === f) return true;
    }
    return false;
  };

  /**
   * Checks that an element is visble and not obscured by any clickable element.
   * Accounts for options passed to browserSideFind.
   *
   * @param {Element} e
   * @returns {boolean}
   */
  var hasCorrectDisplayStatus = function(e) {
    return displayStatus(e) === DISPLAY_STATUS_ENUM.visible;
  };

  var isUnseenStyle = function(style) {
    return style.visibility == 'hidden' || style.display == 'none' ||
          style.opacity == 0;
  };

  // Returns true if the projection of the two elements on the top edge of the
  // screen is a single interval, not two disjoint intervals. They must overlap
  // for more than epsilon.
  var isUnderOrOver = function(e, f) {
    e = e.getBoundingClientRect();
    f = f.getBoundingClientRect();
    return (e.right - f.left > epsilon) && (f.right - e.left > epsilon);
  };

  // Returns true if the projection of the two elements on the left edge of the
  // screen is a single interval, not two disjoint intervals. They must overlap
  // for more than epsilon.
  var isLeftOfOrRightOf = function(e, f) {
    e = e.getBoundingClientRect();
    f = f.getBoundingClientRect();
    return (e.bottom - f.top > epsilon) && (f.bottom - e.top > epsilon);
  };

  // Checks that an element can be potentially displayed after scoll.
  var isMaybeDisplayed = function(e) {
    return e.offsetWidth && e.offsetHeight &&
        e.getBoundingClientRect().right > 0;
  };

  // Checks if an element or its ancestors are disabled. Returns disabled
  // element or innermost disabled ancestor.
  var getDisabledAncestor = function(e) {
    var xpath =
        'ancestor-or-self::*[@disabled or contains(@class, "p6n-disabled")]';
    return byXPath(xpath, e)[0];
  };

  // Converts a locator (e.g. by.css) to a string, for error messages.
  var locatorToString = function(locator) {
    if (locator.using == 'string' || locator.using == 'regexp')
      return locator.value;
    return locator.using + '(' + locator.value + ')';
  };

  // Finds elements by a locator (xpath, css or text) and returns them as an
  // array.
  var selectAll = function(locator) {
    // See
    // https://github.com/SeleniumHQ/selenium/blob/master/javascript/webdriver/locators.js#L110
    switch (locator.using) {
      case 'string':
        return byString(locator.value);
      case 'regexp':
        regExp = eval(locator.value);
        return byRegExp(document.body);
      case 'css selector':
        return Array.from(document.body.querySelectorAll(locator.value));
      case 'xpath':
        return byXPath(locator.value);
      default:
        throw 'Invalid locator ' + locatorToString(locator);
    }
  };

  /**
   * Returns true iff we allow to auto-scroll given element.
   *
   * @param {HTMLElement} element
   * @return {boolean}
   */
  var shouldAutoScroll = function(element) {
    // Special case for ng2 section nav: we don't want to horizontally scroll
    // a hidden section name: https://screenshot.googleplex.com/YCiZCRRv93D
    // More information: section_nav_ng2 mod.
    return !element.classList.contains('cfc-page-displayName');
  };
  // Scrolls to given locator.
  var scrollTo = function(locator) {
    var maybeDisplayed = selectAll(locator).filter(isMaybeDisplayed);
    if (maybeDisplayed.length != 1) {
      throw 'Scrolling to ' + locatorToString(locator) + ' failed. ' +
          'Expected exactly one displayable element to match. Matched: ' +
          maybeDisplayed.length + '\nElements:\n' +
          elementsToString(maybeDisplayed);
    }
    var e = maybeDisplayed[0];
    e.scrollIntoView();
    if (!hasCorrectDisplayStatus(e)) {
      throw 'Scrolling to ' + locatorToString(locator) + ' failed. The ' +
          'displayable element did not become displayed after ' +
          'scrollIntoView(). The element:\n' + e.outerHTML;
    }
  };

  try {
    if (options.scroll) {
      if (locators.length != 1)
        throw 'Assert failed: scroll requires exactly one locator.';
      scrollTo(locators[0]);
      return true;
    }

    // wantZero, enabled, and disabled options apply only to the last selector.
    locators[locators.length - 1].wantZero = options.wantZero;
    locators[locators.length - 1].enabled = options.enabled;
    locators[locators.length - 1].disabled = options.disabled;

    var found = null;
    locators.forEach(function(locator, i) {
      if (!i) {
        found = findGlobal(locator);
      } else {
        found = findRelative(found, locator, locators[i - 1].direction);
      }
    });
    return found;
  } catch (e) {
    if (typeof e == 'string') return e;
    throw e;
  }
};


/**
 * @param {string|number|!RegExp|{using: string, value: string}} locator
 * @return {{using: string, value: string}}
 */
var browserSideLocator = function(locator) {
  if (typeof locator == 'string' || typeof locator == 'number')
    return {using: 'string', value: String(locator)};
  if (typeof locator == 'object' && locator.constructor.name == 'RegExp')
    return {using: 'regexp', value: locator.toString()};
  if (locator && (locator.using == 'css selector' || locator.using == 'xpath'))
    return {using: locator.using, value: locator.value};
  throw new Error(
      'Only text, number, RegExp, by.css() and by.xpath() are supported by ' +
      'helpers, sorry: ' + locator);
};


if (typeof exports != 'undefined') {
  /** We're in a node.js environment, export for other modules to use. */
  exports.browserSideFind = browserSideFind;
  exports.browserSideLocator = browserSideLocator;
}


// Below are functions used for debugging purposes.
var by = {
  css: function(value) {
    return {using: 'css selector', value: value};
  },
  xpath: function(value) {
    return {using: 'xpath', value: value};
  }
};


var click = function(locator) {
  var e = see(locator, {allowUnseen: true});
  if (e.click) e.click();
  return e;
};


var see = function(locator, opt_options) {
  return browserSideFind([browserSideLocator(locator)], opt_options);
};


var not = {
  see: function(locator) {
    return see(locator, {wantZero: true});
  }
};


var scroll = function(locator) {
  return see(locator, {scroll: true});
};


var DROPDOWN = by.css('jfk-select,.p6n-dropdown-menu');
var INPUT = by.css('input');
