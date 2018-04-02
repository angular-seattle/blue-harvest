#!/bin/bash
rm -rf dist/

npm run tsc
cp action_helpers/browser_side_scripts.js dist/action_helpers/
cp screenshot_helper/mask.js dist/screenshot_helper/