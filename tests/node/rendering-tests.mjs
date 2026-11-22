// Check server rendering, score benchmark fixtures and shared dashed-line geometry.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer';

import { renderScore, scoreKinds } from '../../tools/score-fixtures.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));

test('jsdom registers fonts, renders PNGs, and exports portable SVG', () => {
  const directory = join(root, 'build/jsdom-smoke');
  mkdirSync(directory, { recursive: true });
  const script = `
    const assert=require('node:assert/strict');const fs=require('node:fs');
    const {JSDOM}=require('jsdom');const {registerFont}=require('canvas');const opentype=require('opentype.js');
    const dom=new JSDOM('<div id="score"></div>');global.window=dom.window;global.document=dom.window.document;
    const fonts=['bravura/bravura','academico/academico'].map((name,i)=>{
      const file='node_modules/@vexflow-fonts/'+name+'.otf';const family=i?'Academico':'Bravura';
      registerFont(file,{family});return {family,font:opentype.loadSync(file)};
    });
    const VF=require('./build/cjs/vexflow-debug.js');VF.setFonts('Bravura','Academico');
    const renderer=new VF.Renderer(document.getElementById('score'),VF.Renderer.Backends.SVG);renderer.resize(400,200);
    const ctx=renderer.getContext();new VF.Stave(10,40,350).addClef('treble').addTimeSignature('4/4').setContext(ctx).draw();
    ctx.setFont('Academico',12).fillText('Font-aware jsdom export',20,150);
    const svg=ctx.toSVG(fonts);assert.ok(!svg.includes('<text'));assert.ok(svg.includes('<path'));
    fs.writeFileSync(${JSON.stringify(join(directory, 'score.svg'))},svg);dom.window.close();
  `;
  const run = (args) => {
    const r = spawnSync(process.execPath, args, { cwd: root, timeout: 30000, encoding: 'utf8' });
    assert.ifError(r.error);
    assert.equal(r.status, 0, r.stderr + r.stdout);
  };
  run(['-e', script]);
  run(['tools/generate_images_jsdom.js', 'build', directory, '--fonts=bravura', '--module=Clef']);
  const pngs = readdirSync(directory).filter((file) => file.endsWith('.png'));
  assert.equal(pngs.length, 9);
  assert.ok(pngs.includes('Clef.Chant_clefs_and_divisions.Bravura.jsdom.png'));
  assert.ok(pngs.includes('Clef.Double_octave_clefs.Bravura.jsdom.png'));
  for (const file of pngs) assert.equal(readFileSync(join(directory, file)).subarray(1, 4).toString(), 'PNG');
});

/** Each benchmark must remain a renderable score; runtime is not a CI threshold. */
test('score benchmark fixtures render', async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
  });
  try {
    const page = await browser.newPage();
    await page.setContent('<div id="score"></div>');
    await page.addScriptTag({ path: join(root, 'build/cjs/vexflow-debug.js') });
    await page.evaluate(async () => {
      await Promise.all([...document.fonts].map((face) => face.load()));
      await document.fonts.ready;
    });
    for (const kind of scoreKinds) {
      const result = await page.evaluate(renderScore, { kind, systems: 1 });
      const expected = {
        chorale: { notes: 48, staves: 8 },
        piano: { notes: 64, staves: 8 },
        chamber: { notes: 144, staves: 12 },
        'lead-sheet': { notes: 32, staves: 4 },
        percussion: { notes: 32, staves: 4 },
        tab: { notes: 32, staves: 4 },
      }[kind];
      assert.deepEqual({ notes: result.notes, staves: result.staves }, expected);
      assert.ok(result.svg.includes('<path'));
    }
  } finally {
    await browser.close();
  }
});

/** Reject invalid geometry and patterns before a drawing backend receives any path commands. */
test('dashed lines reject invalid or excessive paths before drawing', async () => {
  const { Renderer } = await import('../../build/esm/entry/vexflow-core.js');
  const untouched = { beginPath: () => assert.fail('invalid line started a path') };
  for (const pattern of [[], [0, 0], [-1, 2], [NaN], [1, Infinity], [3, , 1], [0.00001]]) {
    assert.throws(() => Renderer.drawDashedLine(untouched, 0, 0, 10, 0, pattern), { code: 'BadDashPattern' });
  }
  for (const endpoints of [
    [NaN, 0, 1, 1],
    [0, 0, 1, Infinity],
    [-Number.MAX_VALUE, 0, Number.MAX_VALUE, 0],
  ]) {
    assert.throws(() => Renderer.drawDashedLine(untouched, ...endpoints, [3]), { code: 'BadDashLine' });
  }
});

/** Check real path coordinates for gaps of zero, odd-length patterns and reversed diagonal strokes. */
test('dashed lines preserve alternating segments and finish exactly on the endpoint', async () => {
  const { Renderer } = await import('../../build/esm/entry/vexflow-core.js');
  const path = [];
  const context = {
    beginPath() {
      path.length = 0;
    },
    moveTo(x, y) {
      path.push(['M', x, y]);
    },
    lineTo(x, y) {
      path.push(['L', x, y]);
    },
    closePath() {
      path.push(['Z']);
    },
    stroke() {
      path.push(['stroke']);
    },
  };
  Renderer.drawDashedLine(context, 0, 4, 5, 4, [3, 0]);
  assert.deepEqual(path, [['M', 0, 4], ['L', 3, 4], ['M', 3, 4], ['L', 5, 4], ['Z'], ['stroke']]);
  Renderer.drawDashedLine(context, 9, 12, 0, 0, [5]);
  assert.deepEqual(path, [['M', 9, 12], ['L', 6, 8], ['M', 3, 4], ['L', 0, 0], ['Z'], ['stroke']]);
  Renderer.drawDashedLine(context, 5, 7, 5, 7, [3]);
  assert.deepEqual(path, [['M', 5, 7], ['Z'], ['stroke']]);
});

/** Validate bracket styles atomically and keep their value independent of the caller's array. */
test('text brackets retain their validated dash pattern', async () => {
  const { TextBracket, StaveNote } = await import('../../build/esm/entry/vexflow-core.js');
  const note = new StaveNote({ keys: ['c/4'], duration: 'q' });
  const bracket = new TextBracket({ start: note, stop: note });
  const pattern = [3, 0];
  bracket.setDashed(true, pattern);
  pattern[0] = 0;
  assert.deepEqual(bracket.renderOptions.dash, [3, 0]);
  assert.throws(() => bracket.setDashed(false, [0]), { code: 'BadDashPattern' });
  assert.equal(bracket.renderOptions.dashed, true);
  bracket.setDashed(false);
  assert.equal(bracket.renderOptions.dashed, false);
  assert.deepEqual(bracket.renderOptions.dash, [3, 0]);
});
