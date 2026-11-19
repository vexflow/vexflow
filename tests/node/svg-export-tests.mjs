// Portable SVG integration tests in browsers without access to fonts or styles.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer';

const root = fileURLToPath(new URL('../../', import.meta.url));

/** Run both music font families in a browser, then view the exported files without fonts. */
test('portable SVG paths retain score geometry and render with fonts and styles blocked', async () => {
  // Match the existing QUnit runner on CI hosts that do not support Chrome's sandbox.
  const browser = await puppeteer.launch({
    headless: true,
    args: process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 640, height: 300, deviceScaleFactor: 1 });
    await page.setContent('<div id="score"></div>');
    await page.addScriptTag({ path: join(root, 'build/cjs/vexflow-debug.js') });
    await page.addScriptTag({ path: join(root, 'node_modules/opentype.js/dist/opentype.js') });
    const faces = [
      ['Bravura', 'bravura/bravura.otf'],
      ['Academico', 'academico/academico.otf'],
      ['Academico', 'academico/academico-bold.otf', 'bold'],
      ['Petaluma', 'petaluma/petaluma.otf'],
      ['Petaluma Script', 'petalumascript/petalumascript.otf'],
    ].map(([family, file, weight]) => ({
      family,
      weight,
      data: readFileSync(join(root, 'node_modules/@vexflow-fonts', file)).toString('base64'),
    }));
    await page.evaluate(async (faces) => {
      window.outlineFonts = [];
      for (const { family, weight, data } of faces) {
        const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
        const face = new FontFace(family, bytes, { weight: weight ?? 'normal' });
        document.fonts.add(await face.load());
        window.outlineFonts.push({ family, weight, font: opentype.parse(bytes.buffer) });
      }
      await document.fonts.ready;
    }, faces);

    // Verify exact outlines, fallback runs, sizes, style matching, and non-mutating errors.
    const checks = await page.evaluate(() => {
      const container = document.createElement('div');
      const context = new VexFlow.SVGContext(container);
      context.resize(200, 100);
      context.openGroup('styled').setAttribute('transform', 'translate(4 5)');
      context.setFont('Academico', '12pt', 'bold').setFillStyle('#cf2300').fillText('AV', 10, 30);
      context.closeGroup();
      context.setFont('Bravura,Academico', '16px').fillText('\uE050Hello', 5, 60);
      const before = context.toSVG();
      let missingError = false;
      try {
        context.toSVG([]);
      } catch (error) {
        missingError = /MissingFont/.test(error.message);
      }
      const exported = new DOMParser().parseFromString(context.toSVG(window.outlineFonts), 'image/svg+xml');
      const paths = exported.querySelectorAll('path');
      const bold = window.outlineFonts.find((face) => face.weight === 'bold').font;
      const regular = window.outlineFonts.find((face) => face.family === 'Academico' && !face.weight).font;
      const music = window.outlineFonts[0].font;
      const expectedMixed =
        music.getPath('\uE050', 5, 60, 16).toPathData(5) +
        regular.getPath('Hello', 5 + music.getAdvanceWidth('\uE050', 16), 60, 16).toPathData(5);
      context.setFont('Academico', '12pt', 'normal', 'italic').fillText('italic', 5, 80);
      let italicError = false;
      try {
        context.toSVG(window.outlineFonts);
      } catch (error) {
        italicError = /MissingFont/.test(error.message);
      }
      return {
        exact: paths[0].getAttribute('d') === bold.getPath('AV', 10, 30, 16).toPathData(5),
        mixed: paths[1].getAttribute('d') === expectedMixed,
        color: paths[0].getAttribute('fill'),
        transform: paths[0].parentElement.getAttribute('transform'),
        original: before.includes('<text') && context.svg.querySelectorAll('text').length === 3,
        noText: !exported.querySelector('text'),
        missingError,
        italicError,
      };
    });
    assert.deepEqual(checks, {
      exact: true,
      mixed: true,
      color: '#cf2300',
      transform: 'translate(4 5)',
      original: true,
      noText: true,
      missingError: true,
      italicError: true,
    });

    for (const [music, text] of [
      ['Bravura', 'Academico'],
      ['Petaluma', 'Academico'],
      ['Petaluma', 'Petaluma Script'],
    ]) {
      const drawings = await page.evaluate(
        ({ music, text }) => {
          document.querySelector('#score').replaceChildren();
          VexFlow.setFonts(music, text);
          const factory = new VexFlow.Factory({ renderer: { elementId: 'score', width: 620, height: 240 } });
          const context = factory.getContext();
          const score = factory.EasyScore();
          const notes = score.notes('(C#5 E5 G5)/q, B4, A4, B4/q/r');
          const system = factory.System({ x: 15, y: 60, width: 580 });
          const stave = system
            .addStave({ voices: [score.voice(notes)] })
            .addClef('treble')
            .addKeySignature('D')
            .addTimeSignature('4/4');
          // Exercise real text and music glyphs in the same raised extension.
          notes[1].addModifier(
            factory.ChordSymbol().addText('G').addGlyphOrText('b9', {
              symbolModifier: VexFlow.ChordSymbol.symbolModifiers.SUPERSCRIPT,
            })
          );
          system.getPhraseLayout().addVerse(stave, [
            { note: notes[0], text: 'Chanté' },
            { note: notes[1], text: 'dolce' },
          ]);
          factory.draw();
          context.setFont(`${text},Academico`, '14pt').fillText('Andante — AV', 20, 28);
          const before = context.toSVG();
          const after = context.toSVG(window.outlineFonts);
          const clone = new DOMParser().parseFromString(after, 'image/svg+xml').documentElement;
          // Compare each role at its live SVG origin with the outline from the approved face and point size.
          const regularFace = (family) =>
            window.outlineFonts.find((face) => face.family === family && !face.weight).font;
          const letters = regularFace(text);
          const symbols = regularFace(music);
          const verifyRole = (selector, expected) => {
            const live = context.svg.querySelectorAll(selector + ' text');
            const paths = clone.querySelectorAll(selector + ' path');
            return (
              live.length === expected.length &&
              paths.length === expected.length &&
              expected.every(
                (outline, i) =>
                  paths[i].getAttribute('d') ===
                  outline(Number(live[i].getAttribute('x')), Number(live[i].getAttribute('y')))
              )
            );
          };
          const outline = (word, pt) => (x, y) =>
            letters.getPath(word, x, y, VexFlow.Font.convertSizeToPixelValue(pt)).toPathData(5);
          const raisedNinth = (x, y) => {
            const flat = VexFlow.Glyphs.csymAccidentalFlat;
            const size = VexFlow.Font.convertSizeToPixelValue(8.4);
            return (
              symbols.getPath(flat, x, y, size).toPathData(5) +
              outline('9', 8.4)(x + symbols.getAdvanceWidth(flat, size), y)
            );
          };
          return {
            before,
            after,
            glyphs: context.svg.querySelectorAll('text').length,
            paths: clone.querySelectorAll('path').length,
            chords: verifyRole('.vf-chordsymbol', [outline('G', 14), raisedNinth]),
            lyrics: verifyRole('.vf-annotation', [outline('Chanté', 12), outline('dolce', 12)]),
          };
        },
        { music, text }
      );
      assert.ok(drawings.chords, `chord outlines in ${music} and ${text}`);
      assert.ok(drawings.lyrics, `verse outlines in ${text}`);
      assert.ok(drawings.glyphs > 10);
      assert.ok(drawings.paths >= drawings.glyphs);
      assert.doesNotMatch(drawings.after, /<text\b|@font-face|<use\b/);

      // A fresh document has no web fonts. CSP forbids styles, fonts, and network fetches.
      const viewer = await browser.newPage();
      await viewer.setViewport({ width: 640, height: 300, deviceScaleFactor: 1 });
      const failures = [];
      viewer.on('request', (request) => failures.push(request.url()));
      const csp =
        "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; font-src 'none'; style-src 'none'; img-src data:\">";
      for (const state of ['before', 'after']) {
        await viewer.setContent(csp + drawings[state]);
        assert.equal(await viewer.evaluate(() => document.fonts.size), 0);
        if (state === 'after') {
          const geometry = await viewer.$eval('svg', (svg) => {
            const box = svg.getBBox();
            return { width: box.width, height: box.height, text: svg.querySelectorAll('text').length };
          });
          assert.equal(geometry.text, 0);
          assert.ok(geometry.width > 500 && geometry.height > 100);
        }
      }
      // Also exercise the SVG-as-image path used by image export tools.
      await viewer.setContent(
        csp +
          `<img width="620" height="240" src="data:image/svg+xml;base64,${Buffer.from(drawings.after).toString('base64')}">`
      );
      await viewer.waitForFunction(() => document.querySelector('img').complete);
      assert.ok(await viewer.$eval('img', (img) => img.naturalWidth > 0));
      assert.ok(
        failures.every((url) => url.startsWith('data:')),
        'no font or network requests'
      );
      await viewer.close();
    }
    await page.close();
  } finally {
    await browser.close();
  }
});

/** Reproduce the original generator workflow, including SVG loaded through Image(). */
test('image generator embeds the local music fonts in saved SVGs', () => {
  const directory = join(root, 'build/svg-generator-check');
  mkdirSync(directory, { recursive: true });
  const result = spawnSync(process.execPath, ['tools/generate_images_pptr.js', 'build', directory, '--module=Clef'], {
    cwd: root,
    timeout: 30000,
    encoding: 'utf8',
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const files = readdirSync(directory);
  const svgs = files.filter((name) => name.endsWith('.svg'));
  assert.ok(svgs.length >= 3, 'representative SVGs generated');
  for (const name of svgs) {
    assert.match(readFileSync(join(directory, name), 'utf8'), /data:font\/woff2;base64,/);
    assert.ok(files.includes(name + '.png'), 'SVG rasterization succeeded');
  }
});
