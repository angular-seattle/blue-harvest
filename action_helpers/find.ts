import {browser, WebElement} from 'protractor';

import {PositionalLocator} from './locator_types';
import {log} from './logger';

// tslint:disable:no-require-imports "browser_side_scripts.js" is a file
// which is sent to the browser under test via webdriver's execute script.
// It must be uncompiled JavaScript.
const browserSideScripts = require(
    './browser_side_scripts.js');
// tslint:enable:no-require-imports

interface BrowserSidePositionalLocator {
  using: 'string'|'regexp'|'css selector';
  value: string;
}

export interface BrowserSideOptions {
  allowUnseen?: boolean;
  wantZero?: boolean;
  enabled?: boolean;
  disabled?: boolean;
}

/**
 * Retrying Find does several things to improve stability for tests. Throws
 * an error if the element is not found. Returns the found WebElement, or
 * true if the element was not desired and was not found.
 *
 * NOTE: We are attempting to deprecate all the extra retries here by hooking
 * Pantheon up to the standard task-based system that Protractor uses to ask
 * Angular when the page is stable.
 *
 * Current stability measures:
 *  - Polling retry until the timeout is hit.
 *  - Make sure the element is visible for two searches at least 0.5 seconds
 *    apart.
 */
export async function retryingFind(
    locatorChain: ReadonlyArray<PositionalLocator>, timeout: number,
    description: string,
    options: BrowserSideOptions): Promise<WebElement|boolean> {
  let failure = 'Failure reason unknown';
  let okSince = 0;
  const returnTimes: Array<number|string> = [];

  // Translate values into the form that BrowserSideFind expects.
  const browserSideLocators: BrowserSidePositionalLocator[] =
      locatorChain.map((positionalLocator) => {
        const loc =
            browserSideScripts.browserSideLocator(positionalLocator.locator);
        loc.direction = positionalLocator.position;
        return loc;
      });

  try {
    return await browser.wait(async () => {
      try {
        // TODO(ralphj): can we replace this with browser.findElement and use
        // the JS locator strategy? Probably not, because it sometimes returns
        // a boolean (in the 'not' case).
        const response: WebElement|string|true =
            <any>(await browser.driver.executeScript(
                browserSideScripts.browserSideFind, browserSideLocators,
                options));
        const returnTime = Date.now();
        returnTimes.push(returnTime);

        // If the return value is a string, this is an error message, element
        // was not found (or was found if unexpected).
        if (typeof response === 'string') {
          failure = response;
          okSince = 0;
          return false;
        }

        // If the return value was a WebElement or true, the script was
        // successful.
        if (okSince === 0) {
          failure = options.wantZero ?
              'Element was unseen, but must be unseen for at least 0.5s' :
              'Element found, but must remain visible for at least 0.5s';
          okSince = returnTime;
        }
        const ELEMENT_STABILITY_TIMEOUT = 500;
        if (returnTime - okSince >= ELEMENT_STABILITY_TIMEOUT) {
          return response;
        } else {
          return false;
        }
      } catch (executeScriptError) {
        failure = executeScriptError.message;
        return false;
      }
    }, timeout);
  } catch (waitTimeoutError) {
    const truncatedReturnTimes = returnTimes.length < 6 ?
        returnTimes :
        returnTimes.slice(0, 3).concat('...', returnTimes.slice(-3));
    // Log the failure here as well as throwing it, so it shows up in place in
    // the test log.
    log(failure);
    log(`Browser-side find element tried ${returnTimes.length} times at:
         [${truncatedReturnTimes.join(', ')}]`);
    throw new Error(`Failed to find ${description}:
          ${failure}`);
  }
}
