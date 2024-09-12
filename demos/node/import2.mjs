// Summary:
//   Save scores to portable SVG, with embedded OTF fonts (base64 encoded).
//   This demo is buggy, since the note heads are detached from the stems.
//   Perhaps this is a glyph measurement issue?
//
// Run:
//   node import2.mjs
//
// Press a key to advance to the next command. CTRL+C to quit.
// This demo uses await import(...) to load vexflow.js.

import { default as fs } from 'fs';

import { JSDOM } from 'jsdom';

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

  // const svg = div.innerHTML.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');

  const svg = div.childNodes[0];
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  insertFont(svg, fontName);

  return svg.outerHTML;
}

function insertFont(svgElement, fontName) {
  const fontNameLowerCase = fontName.toLowerCase();
  const fontsDir = '../../node_modules/@vexflow-fonts/';
  const fontFile = fs.readFileSync(fontsDir + fontNameLowerCase + '/' + fontNameLowerCase + '.otf');
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
</style>`;
  defsElement.innerHTML = defsString;
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

async function step1() {
  const { VexFlow } = await import('vexflow');
  VF = VexFlow;

  console.log('Loaded VexFlow Version: ', VF.BUILD.VERSION, ' Build: ', VF.BUILD.ID);
  console.log('The default music font stack is:', VF.getFonts());

  console.log('\n==================================\n');
  console.log('>>> Bravura...');
}

async function step2() {
  VF.setFonts('Bravura', 'Academico');
  console.log('The current music font stack is:', VF.getFonts());
  fs.writeFileSync('output/score_bravura.svg', svgScore('Bravura'));

  console.log('\n==================================\n');
  console.log('>>> Petaluma...');
}

async function step3() {
  VF.setFonts('Petaluma', 'Petaluma Script');
  console.log('The current music font stack is:', VF.getFonts());
  fs.writeFileSync('output/score_petaluma.svg', svgScore('Petaluma'));

  console.log('\n==================================\n');
  console.log('>>> Gonville...');
}

async function step4() {
  VF.setFonts('Gonville', 'Academico');
  console.log('The current music font stack is:', VF.getFonts());
  fs.writeFileSync('output/score_gonville.svg', svgScore('Gonville'));

  console.log('\n==================================\n');
  console.log('>>> Leland...');
}

async function step5() {
  VF.setFonts('Leland', 'Edwin');
  console.log('The current music font stack is:', VF.getFonts());
  fs.writeFileSync('output/score_leland.svg', svgScore('Leland'));

  console.log('\n==================================\n');
  console.log('DONE!');
}

async function runAllSteps() {
  await step0();
  await waitForKeyPress();
  await step1();
  await waitForKeyPress();
  await step2();
  await waitForKeyPress();
  await step3();
  await waitForKeyPress();
  await step4();
  await waitForKeyPress();
  await step5();
}

runAllSteps().then(() => process.exit(0));
