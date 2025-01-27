// Run:
//   node canvas.js > output/canvascontext.html

// Summary: Create an HTML page containing the VexFlow output.
//   Use VexFlow to render a hello world score in a node-canvas context.
//   See: https://www.npmjs.com/package/canvas
//   Display the canvas data in an <img> tag via canvas.toDataURL().
//
//
// Since we use a require(...) statement below, we will load the CJS bundle at build/cjs/vexflow.js
// See the `exports` field in package.json for details.

const Vex = require('vexflow');

const { createCanvas, registerFont } = require('canvas');

// Node canvas has a different API for loading fonts.
registerFont('../../node_modules/@vexflow-fonts/bravura/bravura.otf', { family: 'Bravura' });
registerFont('../../node_modules/@vexflow-fonts/petaluma/petaluma.otf', { family: 'Petaluma' });

const { Renderer, Stave, StaveNote, Formatter } = VexFlow;

const canvas = createCanvas(1000, 500);

// VexFlow 5 uses a hidden canvas for measuring font glyphs.
// https://www.w3.org/TR/2012/WD-html5-author-20120329/the-canvas-element.html#the-canvas-element
// In browsers, canvas elements usually default to 300 x 150.
VexFlow.Element.setTextMeasurementCanvas(createCanvas(300, 150));

VexFlow.setFonts('Bravura');
// VexFlow.setFonts('Petaluma');

const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);
const context = renderer.getContext();
context.scale(2, 2);

const stave = new Stave(10, 40, 400);
stave.addClef('treble');
stave.addTimeSignature('4/4');
stave.setContext(context).drawWithStyle();

const notes = [
  new StaveNote({ keys: ['c/5'], duration: '4' }),
  new StaveNote({ keys: ['b/4'], duration: '4' }),
  new StaveNote({ keys: ['a/4'], duration: '4' }),
  new StaveNote({ keys: ['g/4'], duration: '4' }),
];

Formatter.FormatAndDraw(context, stave, notes);

console.log(`<!DOCTYPE html><html><body><img width="500" src="${canvas.toDataURL()}"></body></html>`);
