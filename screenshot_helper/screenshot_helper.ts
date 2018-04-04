import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {browser, ElementFinder} from 'protractor';
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
 * @param data The screenshot image data.
 * @param golden The path to the golden image to compare to.
 */
export async function compareScreenshot(data, golden) {
  let screenshotPath = await writeScreenshot(data);
  const update = process.env['UPDATE_GOLDENS'] == "1"||
      process.env['UPDATE_GOLDENS'] === "true";
  if (update) {
    console.log('Updating reference images instead of comparing.');
    fs.writeFileSync(golden, fs.readFileSync(screenshotPath));
    return true;
  } else {
    return new Promise<boolean>((resolve, reject) => {
      looksSame(screenshotPath, golden, {strict: false, tolerance: 2.5}, (error, equal) => {
        if (!equal) {
          looksSame.createDiff({
            reference: golden,
            current: screenshotPath,
            diff: 'diff.png',
            highlightColor: '#ff00ff',  // color to highlight the differences
          }, (error) => {
            reject(`Screenshots do not match for ${golden}.`)
          });
        } else {
          resolve(true);
        }
      });
    });
  }
}

/**
 *  Write a screenshot to disk in a new temporary path.
 */
async function writeScreenshot(data) {
  const folder = fs.mkdtempSync(`${os.tmpdir()}${path.sep}`);
  let screenshotFile = path.join(folder, 'new.png');
  fs.writeFileSync(screenshotFile, data, 'base64');
  return screenshotFile;
}

export async function addMask(el: ElementFinder, color) {  
  let size = await el.getSize();
  let location = await el.getLocation();
  await browser.executeScript(mask_fn,
    location.x, location.y,
    size.width, size.height, color);
}
