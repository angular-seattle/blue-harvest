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
                   await browser.takeScreenShot(), 'reference.png', 'root/errors');
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
`addMask()` returns the mask element, which can be passed to `removeMask()` to be removed.
```
const e = element(by.css('element_to_ignore'));
const mask = await blueharvest.addMask(e, 'gray', 99999, 10, 20, 1.1);
const screenshot = await browser.takeScreenShot();
blueharvest.removeMask(mask);
```
The default z-index for the mask element is 10000. An optional `z_index` argument can be passed to `addMask()`
 if you would like to increase the value of a mask's z-index. If the mask appears to be off the desired place, 
 you can pass optional `x_offset`, `y_offset` and `size_multiplier` arguments to `addMask()` to move/shape the mask manually. 


export async function addMask(el: ElementFinder, color, z_index = 10000, x_offset = 0, y_offset = 0, size_multiplier = 1.0) {

