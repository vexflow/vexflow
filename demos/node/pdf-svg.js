// Summary:
//   Render a score in SVG and convert it to a PDF. Saved in `output/score.pdf`.
// Run:
//   node pdf-svg.js
// Status:
//   BROKEN
//   VexFlow 5 broke this demo because the paths are no longer draw into the SVG context.
//   Instead of JSDOM, we'll probably need to use Puppeteer or Playwright (https://playwright.dev/docs/api/class-playwright).

const Vex = require('vexflow');
// const Vex = require('vexflow/bravura');

const fs = require('fs');
const { JSDOM } = require('jsdom');
const { jsPDF } = require('jspdf');
require('svg2pdf.js');

// Make sure the output folder exists.
if (!fs.existsSync('./output/')) {
  fs.mkdirSync('./output/');
}

const outputFile = 'output/score-svg.pdf';

const { Stave, StaveNote, Formatter, Renderer } = VexFlow;

console.log('VexFlow Build: ' + VexFlow.BUILD.ID);

const dom = new JSDOM(`<!DOCTYPE html><html><head><style></style></head><body><div id="container"></div><body></html>`);

global.window = dom.window;
global.document = dom.window.document;

const div = document.getElementById('container');
const renderer = new Renderer(div, Renderer.Backends.SVG);

// Configure the rendering context.
renderer.resize(200, 200);
const context = renderer.getContext();

const stave = new Stave(10, 0, 190);

// Add a clef and time signature.
stave.addClef('treble').addTimeSignature('4/4');

// Connect it to the rendering context and draw!
stave.setContext(context).drawWithStyle();

const notes = [
  new StaveNote({ keys: ['c/4'], duration: 'q' }),
  new StaveNote({ keys: ['d/4'], duration: 'q' }),
  new StaveNote({ keys: ['b/4'], duration: 'qr' }),
  new StaveNote({ keys: ['c/4', 'e/4', 'g/4'], duration: 'q' }),
];

// Helper function to justify and draw a 4/4 voice.
Formatter.FormatAndDraw(context, stave, notes);

const doc = new jsPDF();
const svgElement = div.childNodes[0];
doc.svg(svgElement).then(() => doc.save(outputFile));
console.log('Saved a PDF:', outputFile);
