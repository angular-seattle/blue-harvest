import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { browser, ElementFinder, WebElement } from 'protractor';

let mask_fn = require('./mask').MASK_FN;

/*
 * Create shim for LooksSame typing.
 */
export interface LooksSame {
  (img1: string, img2: string, options: Object, check: (error: any, equal: any) => void);
  (img1: string, img2: string, check: (error: any, equal: any) => void);
  createDiff(options: Object, err: Function);
}

// Require looks-same casted with shim interface LooksSame typing.
let looksSame: LooksSame = require('looks-same');

/**
 * Compare a screenshot to a reference, or "golden" image.
 * Returns a Promise that resolves to whether or not the
 * screenshot is a match. If the UPDATE_SCREENSHOTS environment
 * variable is set, the promise resolves to true and the
 * golden image is updated.
 *

 * @param data - The screenshot image data.
 * @param golden - The path to the golden image to compare to.
 * @param outputFolder - The destination path for saving the diff. if it is not provided, the difference image will not be

 *   saved.
 */
export async function compareScreenshot(data, golden, outputFolder = undefined): Promise<string> {
  return new Promise<string>(async (resolve, reject) => {
    const tempFolder = createTempFolder();
    const screenshotPath = await writeScreenshot(tempFolder, data);
    // check if goldens need to be updated
    const update = process.env['UPDATE_GOLDENS'] === '1' || process.env['UPDATE_GOLDENS'] === 'true';
    if (update) {
      fs.writeFileSync(golden, fs.readFileSync(screenshotPath));
      resolve('Reference image ' + golden +' was successfully updated.');
      return;
    }
    const goldenName = path.basename(golden);
    looksSame(screenshotPath, golden, {
      strict: false,
      tolerance: 2.5,
    }, async (error, equal) => {
      if (error) {
        reject("There has been an error. Error: " + error);
        return;
      }
      if (!equal) {
        if (outputFolder) {
          const diffPath = path.join(outputFolder, `diff-${goldenName}`);
          looksSame.createDiff({
            reference: golden,
            current: screenshotPath,
            diff: diffPath,
            highlightColor: '#ff00ff',  // color to highlight the differences
          }, (err) => {
            if (err) {
              reject('An error occurred while saving the diff image: ' + err);
              return;
            }
            reject(`Screenshots do not match for ${golden}. Difference picture is saved as ${diffPath}.`);
          });
        } else { reject(`Screenshots do not match for ${golden}.`); }
      } else {
        resolve('The test passed. ');
      }
    });
  });
}

function createTempFolder() {
  return fs.mkdtempSync(`${os.tmpdir()}${path.sep}`);
}
/**
 *  Write a screenshot to disk in a new temporary path.
 */
async function writeScreenshot(folder, data) {
  let screenshotFile = path.join(folder, 'new.png');
  fs.writeFileSync(screenshotFile, data, 'base64');
  return screenshotFile;
}

export async function addMask(el: ElementFinder, color, zIndex = 10000, xOffset = 0, yOffset = 0, sizeMultiplier = 1.0) {
  let size = await el.getSize();
  let location = await el.getLocation();
  const mask: WebElement = <WebElement> await browser.executeScript(mask_fn, location.x + xOffset, location.y + yOffset,
    size.width*sizeMultiplier, size.height*sizeMultiplier, color, zIndex);
  return mask;
}

export async function removeMask(mask: WebElement) {
  await browser.executeScript("arguments[0].parentNode.removeChild(arguments[0])", mask);
}
