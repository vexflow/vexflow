// Focused browser and jsdom regressions for the first five P2 issues.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer';

import { renderExamples } from './p2-examples.mjs';
import { renderScore } from './score-fixtures.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'build/p2-examples');

test('text fonts, lyric layout, and tie clearance', async () => {
  mkdirSync(output, { recursive: true });
  const browser = await puppeteer.launch({
    headless: true,
    args: process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 780, height: 430, deviceScaleFactor: 1 });
    await page.setContent('<div id="score"></div>');
    await page.addScriptTag({ path: join(root, 'build/cjs/vexflow-debug.js') });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    const result = await page.evaluate(() => {
      const VF = VexFlow;
      VF.setFonts('Bravura', 'Academico');
      const annotation = new VF.Annotation('Sing with gentle voices');
      const canvas = document.createElement('canvas').getContext('2d');
      canvas.font = VF.Font.toCSSString(annotation.fontInfo);
      const actual = canvas.measureText(annotation.getText()).width;
      canvas.font = VF.Font.toCSSString({ ...annotation.fontInfo, family: 'Academico' });
      const expected = canvas.measureText(annotation.getText()).width;
      const music = new VF.Accidental('#').fontInfo.family;
      const defaultText = annotation.fontInfo.family;
      const custom = new VF.Annotation('Override').setFont('Georgia', 12).fontInfo.family;
      VF.setTextFonts('Courier New');
      const customText = new VF.Annotation('Custom').fontInfo.family;
      VF.setFonts('Petaluma', 'Bravura', 'Leland');
      const musicStack = new VF.Accidental('#').fontInfo.family;
      VF.setFonts('Bravura', 'Academico');

      function tieOffset({ lyric = false, dots = false, inline = false, sideNumber = false } = {}) {
        const stave = new VF.Stave(10, 10, 600);
        const notes = [0, 1].map(() => new VF.StaveNote({ keys: ['c/4'], duration: 'h' }));
        if (lyric)
          notes[0].addModifier(
            new VF.Annotation('A very long lyric that must not shorten this tie').setVerticalJustification(
              inline ? VF.Annotation.VerticalJustify.CENTER : VF.Annotation.VerticalJustify.BOTTOM
            ),
            0
          );
        if (dots) VF.Dot.buildAndAttach([notes[0]]);
        if (sideNumber) notes[0].addModifier(new VF.StringNumber('3').setPosition(VF.Modifier.Position.RIGHT), 0);
        const voice = new VF.Voice('4/4').addTickables(notes).setStave(stave);
        new VF.Formatter().joinVoices([voice]).formatToStave([voice], stave);
        return notes[0].getTieRightX() - notes[0].getAbsoluteX();
      }
      const offsets = {
        plain: tieOffset(),
        lyric: tieOffset({ lyric: true }),
        dot: tieOffset({ dots: true }),
        lyricDot: tieOffset({ lyric: true, dots: true }),
        side: tieOffset({ sideNumber: true }),
        lyricSide: tieOffset({ lyric: true, sideNumber: true }),
        inline: tieOffset({ lyric: true, inline: true }),
      };

      // The base positioning methods must work before draw(), including all justifications.
      const context = new VF.SVGContext(document.createElement('div'));
      const stave = new VF.Stave(10, 20, 500);
      const note = new VF.StaveNote({ keys: ['c/4'], duration: 'w' }).setStave(stave);
      const text = new VF.Annotation('Aligned').setContext(context);
      note.addModifier(text, 0);
      const voice = new VF.Voice('4/4').addTickables([note]).setStave(stave);
      new VF.Formatter().joinVoices([voice]).formatToStave([voice], stave);
      const initialPosition = [text.getX(), text.getY(), text.isRendered()];
      text.computeX();
      text.computeY();
      const pureLayout =
        JSON.stringify(initialPosition) === JSON.stringify([text.getX(), text.getY(), text.isRendered()]);
      const automaticY = text.computeY().y;
      text.setTextBaseline(210);
      const fixedBaseline = text.computeY().y === 210;
      text.setTextBaseline();
      const resetBaseline = text.computeY().y === automaticY;
      let invalidBaseline = false;
      try {
        text.setTextBaseline(Infinity);
      } catch {
        invalidBaseline = true;
      }
      const coordinates = [];
      for (const horizontal of Object.values(VF.Annotation.HorizontalJustify)) {
        for (const vertical of Object.values(VF.Annotation.VerticalJustify)) {
          text.setJustification(horizontal).setVerticalJustification(vertical);
          const x = text.computeX().x,
            y = text.computeY().y;
          text.draw();
          const drawn = context.svg.lastElementChild.querySelector('text');
          coordinates.push(
            Number.isFinite(x) &&
              Number.isFinite(y) &&
              Math.abs(Number(drawn.getAttribute('x')) - x) < 0.01 &&
              Math.abs(Number(drawn.getAttribute('y')) - y) < 0.01
          );
        }
      }
      class FixedLyric extends VF.Annotation {
        computeY() {
          return { y: 250, textHeight: 15 };
        }
      }
      const overridden = new FixedLyric('Override').setContext(context);
      overridden.setNote(note).setIndex(0);
      const x = overridden.computeX().x;
      overridden.draw();
      const rendered = context.svg.querySelector('g:last-child text');
      return {
        actual,
        expected,
        music,
        defaultText,
        custom,
        customText,
        musicStack,
        offsets,
        coordinates,
        pureLayout,
        fixedBaseline,
        resetBaseline,
        invalidBaseline,
        overridden:
          Number(rendered.getAttribute('y')) === 250 && Math.abs(Number(rendered.getAttribute('x')) - x) < 0.01,
      };
    });
    assert.ok(Math.abs(result.actual - result.expected) < 0.01, 'text spaces use Academico metrics');
    assert.equal(result.defaultText, 'Academico,Bravura');
    assert.equal(result.music, 'Bravura,Academico');
    assert.equal(result.musicStack, 'Petaluma,Bravura,Leland');
    assert.equal(result.custom, 'Georgia');
    assert.ok(result.customText.startsWith('Courier New'));
    assert.ok(result.coordinates.every(Boolean));
    assert.ok(result.overridden);
    assert.ok(result.pureLayout && result.fixedBaseline && result.resetBaseline && result.invalidBaseline);
    const o = result.offsets;
    assert.ok(Math.abs(o.plain - o.lyric) < 0.01);
    assert.ok(o.dot > o.plain);
    assert.ok(Math.abs(o.dot - o.lyricDot) < 0.01);
    assert.ok(o.side > o.plain);
    assert.ok(Math.abs(o.side - o.lyricSide) < 0.01);
    assert.ok(o.inline > o.plain, 'inline text still reserves clearance');

    for (const issue of [152, 177, 182])
      for (const family of ['Bravura', 'Petaluma']) {
        const rendered = await page.evaluate(renderExamples, { issue, family });
        if (issue === 177) for (const ys of rendered.positions) assert.ok(ys.every((y) => y === ys[0]));
        writeFileSync(join(output, `${issue}-${family}-after.svg`), rendered.svg);
        await page.screenshot({ path: join(output, `${issue}-${family}-after.png`) });
      }
    // Ensure every benchmark remains a renderable score; timing is deliberately not a CI threshold.
    for (const kind of ['chorale', 'piano', 'chamber']) {
      const result = await page.evaluate(renderScore, { kind, systems: 1 });
      const expected = {
        chorale: { notes: 48, staves: 8 },
        piano: { notes: 64, staves: 8 },
        chamber: { notes: 144, staves: 12 },
      }[kind];
      assert.deepEqual({ notes: result.notes, staves: result.staves }, expected);
      assert.ok(result.layoutMs > 0 && result.drawMs > 0);
      assert.ok(result.svg.includes('<path'));
    }
  } finally {
    await browser.close();
  }
});

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

/** Class-specific metrics remain more specific than the shared text default. */
test('class font overrides survive separate text defaults', async () => {
  const { Metrics, MetricsDefaults, VexFlow } = await import('../build/esm/entry/vexflow-core.js');
  VexFlow.setFonts('Bravura', 'Academico');
  MetricsDefaults.Annotation.fontFamily = 'Georgia';
  Metrics.clear();
  try {
    assert.equal(Metrics.getFontInfo('Annotation').family, 'Georgia');
  } finally {
    delete MetricsDefaults.Annotation.fontFamily;
    Metrics.clear();
  }
});
