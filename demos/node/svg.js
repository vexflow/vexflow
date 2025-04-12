// Summary: Create an SVG file using the VexFlow library.
// Run:
//   node svg.js > output/svgcontext.svg
//
// ### CURRENT LIMITATIONS ###
// In V5, you may see empty rectangles.
// If you open the SVG file, you'll see: font-family="Bravura,Academico"
// If these fonts are not installed on your system, the glyphs will look like empty rectangles instead of music symbols.
//
// In V4, the VexFlow library contained the paths for every supported glyph, so we could save those paths into the SVG output.
// This resulted in portable SVGs that could be viewed on any system.
// This is a big drawback of the current V5 approach.
//
// TODO: Can we fix this with the help of opentype.js and a config option that tells the SVG context to render its paths?
// We could cache the paths for each glyph, so we don't have to recompute them every time we render a particular element type.
// Additionally, we could explore SVG <use> so we can define one template path and reuse it multiple times in one score.
// See: https://developer.mozilla.org/en-US/docs/Web/SVG/Element/use

const { Formatter, Renderer, Stave, StaveNote } = require('vexflow');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="vf"></div><body></html>');

global.document = dom.window.document;

// Create an SVG renderer and attach it to the DIV element named "vf".
const div = document.getElementById('vf');
const renderer = new Renderer(div, Renderer.Backends.SVG);

// Configure the rendering context.
renderer.resize(500, 500);
const context = renderer.getContext();

// Create a stave of width 400 at position 10, 40 on the canvas.
const stave = new Stave(10, 40, 400);

// Add a clef and time signature.
stave.addClef('treble').addTimeSignature('4/4');

const notes = [
  new StaveNote({ keys: ['c/5'], duration: '4' }),
  new StaveNote({ keys: ['b/4'], duration: '4' }),
  new StaveNote({ keys: ['a/4'], duration: '4' }),
  new StaveNote({ keys: ['g/4'], duration: '4' }),
];

stave.setContext(context).drawWithStyle();
Formatter.FormatAndDraw(context, stave, notes);

const svg = div.innerHTML.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');

console.log(svg);
