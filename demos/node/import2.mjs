// Summary:
//   Save scores to portable SVG, with embedded OTF fonts (base64 encoded).
//
// Run:
//   node import2.mjs
//
// Press a key to advance to the next command. CTRL+C to quit.
// This demo uses await import(...) to load vexflow.js.

import { default as fs } from 'fs';

import { JSDOM } from 'jsdom';

// VexFlow 5 uses a hidden canvas for measuring font glyphs.
// In a browser environment, you don't need to do anything special.
// However, in a node environment, you need to provide a canvas element.
import { createCanvas, registerFont } from 'canvas';
const fontsDir = '../../node_modules/@vexflow-fonts/';

function getFontPath(fontName) {
  const fontNameLowerCase = fontName.toLowerCase();
  return `${fontsDir}${fontNameLowerCase}/${fontNameLowerCase}.otf`;
}

const fonts = ['Bravura', 'Petaluma', 'Gonville', 'Leland'];
fonts.forEach((fontName) => {
  // Register the fonts with node canvas so the canvas context can measure glyphs properly.
  registerFont(getFontPath(fontName), { family: fontName });
  console.log(`Registered font: ${fontName}`);
});

// Reference to VexFlow, assigned in the step1() function.
let VF;

async function waitForKeyPress() {
  process.stdin.setRawMode(true);
  return new Promise((resolve) =>
    process.stdin.once('data', (data) => {
      // Handle CTRL+C.
      const byteArray = [...data];
      if (byteArray.length > 0 && byteArray[0] === 3) {
        console.log('^C');
        process.exit(1);
      }
      process.stdin.setRawMode(false);
      resolve();
    })
  );
}

function svgScore(fontName) {
  const { Renderer, Stave, StaveNote, Formatter } = VF;
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="vf"></div><body></html>');

  global.document = dom.window.document;

  // Create an SVG renderer and attach it to the DIV element named "vf".
  const div = document.getElementById('vf');
  const renderer = new Renderer(div, Renderer.Backends.SVG);

  const w = 800;
  const h = 600;

  // Configure the rendering context.
  renderer.resize(w, h);
  const ctx = renderer.getContext();
  ctx.setFillStyle('#ddd');
  ctx.fillRect(0, 0, w, h);
  ctx.setFillStyle('#222');

  const stave = new Stave(10, 40, 400);

  stave.addClef('treble').addTimeSignature('4/4');

  const notes = [
    new StaveNote({ keys: ['c/4', 'e/4'], duration: 'h' }),
    new StaveNote({ keys: ['c/4', 'e/4', 'c/5'], duration: 'h' }),
  ];

  stave.setContext(ctx).drawWithStyle();
  Formatter.FormatAndDraw(ctx, stave, notes);

  const svg = div.childNodes[0];
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  insertFont(svg, fontName);

  return svg.outerHTML;
}

// Embed a custom font directly into the SVG.
function insertFont(svgElement, fontName) {
  const fontFile = fs.readFileSync(getFontPath(fontName));
  const fontBase64 = fontFile.toString('base64');

  const defsElement = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const defsString = `
<style>
  <![CDATA[
    @font-face {
      font-family: "${fontName}";
      src: url("data:font/opentype;base64,${fontBase64}");
    }
  ]]>
</style>
`;
  defsElement.innerHTML = defsString;
  // Insert the font definition <defs> element as the first child of the SVG element.
  svgElement.insertBefore(defsElement, svgElement.firstChild);
}

async function step0() {
  console.log('Press any key to run the next command. CTRL+C to quit.');
  console.log('\n==================================\n');
  console.log('>>> load vexflow ...');

  // Make sure the output folder exists.
  if (!fs.existsSync('./output/')) {
    fs.mkdirSync('./output/');
  }
}

async function importVexFlow() {
  const { VexFlow, Element } = await import('vexflow');
  VF = VexFlow;

  // VexFlow 5 uses a hidden canvas for measuring font glyphs.
  // https://www.w3.org/TR/2012/WD-html5-author-20120329/the-canvas-element.html#the-canvas-element
  // In browsers, canvas elements usually default to 300 x 150.
  Element.setTextMeasurementCanvas(createCanvas(300, 150));

  console.log('Loaded VexFlow Version: ', VF.BUILD.VERSION, ' Build: ', VF.BUILD.ID);
  console.log('The default music font stack is:', VF.getFonts());

  console.log('\n==================================\n');
  console.log('>>> Bravura...');
}

async function renderScoreWithFont(currFontName, nextFontName) {
  VF.setFonts(currFontName); // You can add more fonts as additional parameters.
  console.log('The current music font stack is:', VF.getFonts());
  const outputFile = `output/score_${currFontName.toLowerCase()}.svg`;
  fs.writeFileSync(outputFile, svgScore(currFontName));
  console.log('Saved to ' + outputFile);
  console.log('\n==================================\n');
  if (nextFontName) {
    console.log(`>>> ${nextFontName}...`);
  }
}

async function runAllSteps() {
  await step0();
  await waitForKeyPress();
  await importVexFlow();
  await waitForKeyPress();
  await renderScoreWithFont('Bravura', 'Petaluma');
  await waitForKeyPress();
  await renderScoreWithFont('Petaluma', 'Gonville');
  await waitForKeyPress();
  await renderScoreWithFont('Gonville', 'Leland');
  await waitForKeyPress();
  await renderScoreWithFont('Leland');
  console.log('DONE!');
}

runAllSteps().then(() => process.exit(0));
