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
 * @param [outputFolder] Path where to save the diff
 */
export async function compareScreenshot(data, golden, outputFolder = undefined) {
  const tempFolder = createTempFolder();
  let screenshotPath = await writeScreenshot(tempFolder, data);
  const update = process.env['UPDATE_GOLDENS'] == '1'||
    process.env['UPDATE_GOLDENS'] === 'true';
  if (update) {
    console.log('Updating reference images instead of comparing.');
    fs.writeFileSync(golden, fs.readFileSync(screenshotPath));
    return true;
  } else {
    const goldenName = path.basename(golden);
    const diffPath = `${outputFolder || tempFolder}}${path.sep}${goldenName}_diff.png`;
    return new Promise<boolean>((resolve, reject) => {
      looksSame(screenshotPath, golden, {strict: false, tolerance: 2.5},
        async (error, equal) => {
          if (!equal) {
            await looksSame.createDiff({
              reference: golden,
              current: screenshotPath,
              diff: diffPath,
              highlightColor: '#ff00ff',  // color to highlight the differences
            }, (err) => {
              console.log('SAVING DIFF ERROR: ' + err);
            });
            reject(`no match. error: ${error}`);
          } else {
            resolve(true);
          }
        });
    });
  }
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

export async function addMask(el: ElementFinder, color) {
  let size = await el.getSize();
  let location = await el.getLocation();
  await browser.executeScript(mask_fn,
    location.x, location.y,
    size.width, size.height, color);
}
