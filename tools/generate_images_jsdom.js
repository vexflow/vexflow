// Run the full VexFlow test suite, grab the generated images, and
// dump them into a local directory as PNG files.
//
// This meant to be used with the visual regression test system in
// `tools/visual_regression.sh`.

const fs = require('fs');
const path = require('path');

const { JSDOM } = require('jsdom');

const { registerFont } = require('canvas');

// JSDOM uses node-canvas internally. https://www.npmjs.com/package/canvas
// node-canvas can load custom fonts with registerFont(...).
// node-canvas doesn't seem to support WOFF2. Regular WOFF works fine.
const fontsDir = path.resolve(__dirname, '../node_modules/@vexflow-fonts/');
registerFont(path.join(fontsDir, 'bravura/bravura.otf'), { family: 'Bravura' });
registerFont(path.join(fontsDir, 'academico/academico.otf'), { family: 'Academico' });
registerFont(path.join(fontsDir, 'petaluma/petaluma.otf'), { family: 'Petaluma' });
registerFont(path.join(fontsDir, 'petalumascript/petalumascript.otf'), { family: 'Petaluma Script' });
registerFont(path.join(fontsDir, 'leland/leland.otf'), { family: 'Leland' });
registerFont(path.join(fontsDir, 'edwin/edwin-roman.otf'), { family: 'Edwin' });
registerFont(path.join(fontsDir, 'gonville/gonville.otf'), { family: 'Gonville' });
registerFont(path.join(fontsDir, 'sebastian/sebastian.otf'), { family: 'Sebastian' });
registerFont(path.join(fontsDir, 'finaleash/finaleash.otf'), { family: 'Finale Ash' });

const dom = new JSDOM(`<!DOCTYPE html><body><div id="qunit-tests"></div></body>`);
global.window = dom.window;
global.document = dom.window.document;

const [scriptDir, imageDir] = process.argv.slice(2, 4);

const runOptions = {
  jobs: 1,
  job: 0,
};

// Optional:
//  --fonts argument specifies which font stacks to test. Defaults to all.
//  --jobs, --job: see tests/vexflow_test_helpers.ts: VexFlowTests.run()
// For example:
//   node generate_images_jsdom.js SCRIPT_DIR IMAGE_OUTPUT_DIR --fonts=petaluma
//   node generate_images_jsdom.js SCRIPT_DIR IMAGE_OUTPUT_DIR --fonts=bravura,gonville
const ALL_FONTS = ['Bravura', 'Petaluma', 'Finale Ash', 'Sebastian', 'Gonville'];
let fontStacksToTest = ALL_FONTS;
const { argv } = process;

if (argv.length >= 5) {
  for (let i = 4; i < argv.length; i++) {
    const arg = argv[i];
    const value = arg.split('=')[1];
    const intValue = parseInt(value);
    if (arg.startsWith('--fonts=')) {
      const fontsList = value.split(',');
      // Create an array of font names with the first letter in upper case.
      fontStacksToTest = fontsList.map((fontName) => fontName.charAt(0).toUpperCase() + fontName.slice(1));
    } else if (arg.startsWith('--jobs=')) {
      runOptions.jobs = intValue;
    } else if (arg.startsWith('--job=')) {
      runOptions.job = intValue;
    } else {
      // console.log('???', arg);
    }
  }
}

// When generating PNG images for the visual regression tests,
// we mock out the QUnit methods (since we don't care about assertions).
if (!global.QUnit) {
  const QUMock = {
    moduleName: '',
    testName: '',

    assertions: {
      ok: () => true,
      equal: () => true,
      deepEqual: () => true,
      expect: () => true,
      throws: () => true,
      notOk: () => true,
      notEqual: () => true,
      notDeepEqual: () => true,
      strictEqual: () => true,
      notStrictEqual: () => true,
      propEqual: () => true,
    },

    module(name) {
      QUMock.moduleName = name;
    },

    // See: https://api.qunitjs.com/QUnit/test/
    test(testName, callback) {
      QUMock.testName = testName;
      QUMock.assertions.test.module.name = QUMock.moduleName;
      // Print out the progress and keep it on a single line.
      process.stdout.write(`\u001B[0G${QUMock.moduleName} :: ${testName}\u001B[0K`);
      callback(QUMock.assertions);
    },
  };

  // QUNIT MOCK
  global.QUnit = QUMock;
  for (const k in QUMock.assertions) {
    // Make all methods & properties of QUMock.assertions global.
    global[k] = QUMock.assertions[k];
  }
  global.test = QUMock.test;
  // Enable us to pass the name of the module around.
  // See: QUMock.test(...) and VexFlowTests.runWithParams(...)
  QUMock.assertions.test = { module: { name: '' } };
}

// vexflow-debug-with-tests.js includes both the VexFlow library and the test code.
const vexflowDebugWithTestsJS = path.resolve(__dirname, path.join(scriptDir, 'cjs', 'vexflow-debug-with-tests.js'));
if (!fs.existsSync(vexflowDebugWithTestsJS)) {
  console.log('Cannot find', vexflowDebugWithTestsJS);
  console.log('Aborting');
  process.exit(1);
}
global.VexFlow = require(vexflowDebugWithTestsJS);

// vexflow_test_helpers uses this to write out image files.
global.VexFlow.Test.shims = { fs };

// Tell VexFlow that we're outside the browser. Just run the Node tests.
const VFT = VexFlow.Test;
VFT.RUN_CANVAS_TESTS = false;
VFT.RUN_SVG_TESTS = false;
VFT.RUN_NODE_TESTS = true;
VFT.NODE_IMAGEDIR = imageDir;
VFT.NODE_FONT_STACKS = fontStacksToTest;

// Create the image directory if it doesn't exist.
fs.mkdirSync(VFT.NODE_IMAGEDIR, { recursive: true });

// Run all tests.
VFT.run(runOptions);
