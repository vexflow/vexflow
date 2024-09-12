// Summary: Create a SVG file using the VexFlow library.
// Run:
//   node svg.js > output/svgcontext.svg
//
// ### CURRENT LIMITATIONS ###
// If you open the SVG file, you'll see: font-family="Bravura,Academico"
// If these fonts are not installed on your system, the glyphs will look like empty squares instead of music symbols.
//
// In V4, the VexFlow library contained the paths for every supported glyph, so we could save those paths into the SVG output.
// This resulted in portable SVGs that could be viewed on any system.
// This is a big drawback of the current V5 approach.
//
// TODO: Can we fix this with the help of opentype.js and a config option that tells the SVG context to render its paths?
// We could cache the paths for each glyph, so we don't have to recompute them every time we render a particular element type.
// Additionally, we could explore SVG <use> so we can define one template path and reuse it multiple times in one score.
// See: https://developer.mozilla.org/en-US/docs/Web/SVG/Element/use

const Vex = require('vexflow');
const { JSDOM } = require('jsdom');

const VF = VexFlow;

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="vf"></div><body></html>');

global.document = dom.window.document;

// Create an SVG renderer and attach it to the DIV element named "vf".
const div = document.getElementById('vf');
const renderer = new VF.Renderer(div, VF.Renderer.Backends.SVG);

// Configure the rendering context.
renderer.resize(500, 500);
const context = renderer.getContext();

// Create a stave of width 400 at position 10, 40 on the canvas.
const stave = new VF.Stave(10, 40, 400);

// Add a clef and time signature.
stave.addClef('treble').addTimeSignature('4/4');

// Connect it to the rendering context and draw!
stave.setContext(context).drawWithStyle();

const svg = div.innerHTML.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');

console.log(svg);
