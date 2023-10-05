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
registerFont(path.join(fontsDir, 'gonvillesmufl/gonvillesmufl.otf'), { family: 'Gonville' });
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
const ALL_FONTS = ['Bravura', 'Gonville', 'Petaluma', 'Finale Ash'];
let fontStacksToTest = ALL_FONTS;
const { argv } = process;

if (argv.length >= 5) {
  for (let i = 4; i < argv.length; i++) {
    const arg = argv[i].toLowerCase();
    const value = arg.split('=')[1];
    const intValue = parseInt(value);
    if (arg.startsWith('--fonts=')) {
      const fontsList = value.split(',');
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

// The entry point to the VexFlow tests has evolved over time. :-)
// In 3.0.9, vexflow-tests.js contained only the test code. The core library was in vexflow-debug.js.
// While migrating to TypeScript in 2021, we realized the vexflow-tests.js included the core library.
//   Thus, only vexflow-tests.js is used (and vexflow-debug.js is redundant).
//   See: https://github.com/0xfe/vexflow/pull/1074
// In 4.0.0, this file was renamed to vexflow-debug-with-tests.js for clarity.
//   It includes both the VexFlow library and the test code.
// We use file detection to determine which file(s) to include.
const vexflowDebugWithTestsJS = path.resolve(__dirname, path.join(scriptDir, 'vexflow-debug-with-tests.js'));
if (fs.existsSync(vexflowDebugWithTestsJS)) {
  // console.log('Generating Images for version >= 4.0.0');
  global.Vex = require(vexflowDebugWithTestsJS);
} else {
  // console.log('Generating Images for version <= 3.0.9');
  const vexflowTests = require(path.join(scriptDir, 'vexflow-tests.js'));
  if (typeof vexflowTests.Flow === 'object') {
    // During the migration of 3.0.9 => 4.0.0.
    // vexflowTests has all we need!
    global.Vex = vexflowTests;
  } else {
    // typeof vexflowTests.Flow === 'undefined'
    // Version 3.0.9 and older used vexflow-tests.js in combination with vexflow-debug.js!
    global.Vex = require(path.join(scriptDir, 'vexflow-debug.js'));
  }
}

// Some versions of VexFlow (during the 3.0.9 => 4.0.0 migration) may have required the next line:
// global.Vex.Flow.shims = { fs };

// 4.0.0
// vexflow_test_helpers uses this to write out image files.
global.Vex.Flow.Test.shims = { fs };

// Tell VexFlow that we're outside the browser. Just run the Node tests.
const VFT = Vex.Flow.Test;
VFT.RUN_CANVAS_TESTS = false;
VFT.RUN_SVG_TESTS = false;
VFT.RUN_NODE_TESTS = true;
VFT.NODE_IMAGEDIR = imageDir;
VFT.NODE_FONT_STACKS = fontStacksToTest;

// Create the image directory if it doesn't exist.
fs.mkdirSync(VFT.NODE_IMAGEDIR, { recursive: true });

// Run all tests.
VFT.run(runOptions);

// During the 3.0.9 => 4.0.0 migration, run() was briefly renamed to runTests().
// VFT.runTests();
