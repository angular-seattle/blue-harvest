# blue-harvest

## Getting Started
You can npm to install the package:
`npm install https://github.com/copperleaftech/blue-harvest`.

## Writing Tests
### Configurations
In order for you to use `async await` in the tests, `SELENIUM_PROMISE_MANAGER: false` should be added to the `protractor.conf.js` file.

To regulate the resolution of the screenshots, add 
`browser.driver.manage().window().setSize(1366, 1024)`
 inside `onPrepare()`.
### Comparing Screenshots
To test if a page has changed from a previous screenshot:
```
let result =  await blueharvest.compareScreenshot(
                   await browser.takeScreenShot(), pathToGolden, destForDiffImage);
```
The difference between the two screenshots will be highlighted in pink. The third parameter defines where to save the difference images and is optional. If the destination path
for the created difference image is not given but the test fails, `compareScreenshot` will still reject the promise, but will not save the difference image. 

### Updating Reference Screenshots
When a change in a page is expected and not a regression, you can update the reference screenshots by
setting `UPDATE_GOLDENS=1` when you run the tests. In this case, if any test fails,
blue-harvest will update the reference image with the new one. 

In a Linux system, you can simply run `UPDATE_GOLDENS=1 yarn e2e` to update the reference screenshots. 
In a windows environment where the command cannot be directly run, you can put it in a shell file and
add a npm script that runs `bash ./filename.sh` to update the reference screenshots.

### Adding Masks
If there is a part on a page that should be ignored in the screenshot tests, 
you can add a coloured mask to a certain element before you take the screenshot so it will not be compared each time the tests run.
```
let e = element(by.css('element_to_ignore'));
await blueharvest.addMask(e, 'gray');
```
