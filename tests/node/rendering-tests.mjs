// Integration checks for server rendering and the score benchmark fixtures.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer';

import { renderScore } from '../../tools/score-fixtures.mjs';

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
  assert.equal(pngs.length, 7);
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
      await document.fonts.ready;
    });
    for (const kind of ['chorale', 'piano', 'chamber']) {
      const result = await page.evaluate(renderScore, { kind, systems: 1 });
      const expected = {
        chorale: { notes: 48, staves: 8 },
        piano: { notes: 64, staves: 8 },
        chamber: { notes: 144, staves: 12 },
      }[kind];
      assert.deepEqual({ notes: result.notes, staves: result.staves }, expected);
      assert.ok(result.svg.includes('<path'));
    }
  } finally {
    await browser.close();
  }
});
