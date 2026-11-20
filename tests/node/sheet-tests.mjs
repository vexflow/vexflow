// Cross-backend layout, color inheritance, resizing, and rendering diagnostics.
import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer';

import { analyzeLayout } from '../../tools/render-metrics.mjs';
import { renderSheetStudy } from '../../tools/sheet-fixture.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));

test('responsive sheets and themes on Canvas and SVG', async (t) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
  });
  try {
    const page = await browser.newPage();
    await page.setContent('<div id="score"></div>');
    await page.addScriptTag({ path: `${root}build/cjs/vexflow-debug.js` });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    for (const font of ['Bravura', 'Petaluma']) {
      for (const backend of ['svg', 'canvas']) {
        await t.test(`${font} ${backend}: resize, bounds, colors`, async () => {
          const result = await page.evaluate(renderSheetStudy, { font, backend, widths: [320, 680] });
          const [wide, narrow, restored] = result.snapshots;
          assert.deepEqual(restored, wide, 'wide/narrow/wide reflow is deterministic');
          assert.ok(narrow.rows.length > wide.rows.length, 'narrow viewport wraps more rows');
          for (const snapshot of result.snapshots) {
            const metrics = analyzeLayout(snapshot.boxes, { width: snapshot.width + 40, height: snapshot.height + 40 });
            assert.deepEqual(metrics.invalid, []);
            assert.deepEqual(metrics.collisions, [], 'curated voices and measures do not overlap');
            // A single over-wide measure is preserved and reported rather than crushed.
            const reportedOverflow = snapshot.rows.some((row) => row.overflow > 0);
            if (!reportedOverflow) assert.deepEqual(metrics.overflow, []);
          }
          if (backend === 'svg') {
            assert.equal(result.cssWidth, '720px');
            const colors = result.colors.flatMap((item) => [item.fill, item.stroke]);
            assert.ok(colors.includes('rgb(231, 237, 245)'), 'theme reaches marks');
            assert.ok(colors.includes('rgb(237, 155, 64)'), 'explicit highlight survives');
            assert.ok(!colors.includes('rgb(0, 0, 0)'), 'no hard-coded black marks');
          } else {
            const pixels = await page.evaluate(() => {
              const canvas = document.querySelector('canvas');
              const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
              let theme = 0,
                highlight = 0,
                black = 0;
              for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] < 250) continue;
                if (data[i] === 231 && data[i + 1] === 237 && data[i + 2] === 245) theme++;
                if (data[i] === 237 && data[i + 1] === 155 && data[i + 2] === 64) highlight++;
                if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0) black++;
              }
              return { theme, highlight, black };
            });
            assert.ok(pixels.theme > 100);
            assert.ok(pixels.highlight > 10);
            assert.equal(pixels.black, 0);
          }
        });
      }
    }
    await t.test('theme changes preserve local styles and repeated tuplet draws', async () => {
      for (const backend of ['svg', 'canvas']) {
        const result = await page.evaluate((backend) => {
          const VF = VexFlow;
          const host = document.getElementById('score');
          host.replaceChildren();
          const target = backend === 'canvas' ? host.appendChild(document.createElement('canvas')) : host;
          target.id = backend === 'canvas' ? 'score-canvas' : 'score';
          const f = new VF.Factory({ renderer: { elementId: target.id, width: 600, height: 300 } });
          const score = f.EasyScore();
          const notes = score.notes('C5/8, D5, E5, F5/q, G5, A5');
          f.Tuplet({ notes: notes.slice(0, 3), options: { suffix: VF.Glyphs.metNoteQuarterUp } });
          f.System({ width: 560, y: 50 })
            .addStave({ voices: [score.voice(notes)] })
            .addClef('treble');
          const bracket = f.TextBracket({
            from: notes[3],
            to: notes[5],
            text: '8',
            options: { superscript: 'va', position: 'top' },
          });
          const pedal = f.PedalMarking({ notes: [notes[0], notes[5]] });
          for (const element of [bracket, pedal]) {
            element.renderOptions.color = '#ff0000';
            element.setStyle({ fillStyle: '#00aa00', strokeStyle: '#00aa00' });
          }
          const frames = [];
          for (const color of ['#112233', '#ddeeff', '#112233']) {
            f.setStyle({ fillStyle: color, strokeStyle: color });
            f.getContext().clear();
            f.draw({ retain: true });
            frames.push(
              backend === 'canvas'
                ? target.toDataURL()
                : [...host.querySelectorAll('path,text,rect')].map((node) => {
                    const style = getComputedStyle(node);
                    return {
                      text: node.textContent,
                      x: node.getAttribute('x'),
                      y: node.getAttribute('y'),
                      d: node.getAttribute('d'),
                      fill: style.fill,
                      stroke: style.stroke,
                    };
                  })
            );
          }
          const defaults = f.getContext().getDefaultStyle();
          f.reset();
          return { frames, defaults, voices: f.getVoices().length };
        }, backend);
        assert.deepEqual(result.frames[0], result.frames[2], `${backend}: redraw returns identical output`);
        assert.notDeepEqual(result.frames[0], result.frames[1], `${backend}: changing theme changes output`);
        assert.deepEqual(result.defaults, {}, 'drawing restores context defaults');
        assert.equal(result.voices, 0, 'reset releases retained score');
        if (backend === 'svg') {
          const colors = result.frames[0].flatMap((item) => [item.fill, item.stroke]);
          assert.ok(colors.includes('rgb(0, 170, 0)'), 'explicit bracket and pedal color renders');
          assert.ok(!colors.includes('rgb(255, 0, 0)'), 'explicit styles override legacy colors');
        }
      }
    });
    await t.test('empty and oversized sheets, parser boundaries, and ownership', async () => {
      const result = await page.evaluate(() => {
        const VF = VexFlow;
        const f = new VF.Factory({ renderer: { elementId: 'score', width: 600, height: 400 } });
        const empty = f.Sheet({ width: 50 }).format().getRows();
        const score = f.EasyScore();
        const measures = score.measures('C4/h[id="a|b"], E4, |, G4, C5');
        const durations = measures.map((notes) => notes.map((note) => note.getDuration()));
        const invalid = ['', 'C4/w || C4/w', '| C4/w', 'C4/w | rubbish'].map((line) => {
          try {
            score.measures(line);
            return false;
          } catch {
            return true;
          }
        });
        const sheet = f.Sheet({ width: 50 });
        const system = sheet.addSystem();
        system.addStave({ voices: [score.voice(measures[0])] }).addClef('treble');
        sheet.format();
        const rows = sheet.getRows().map(({ systems, ...row }) => row);
        let builds = 0;
        class CountedNote extends VF.StaveNote {
          buildNoteHeads() {
            builds++;
            return super.buildNoteHeads();
          }
          count() {
            return this.children.length;
          }
        }
        const note = new CountedNote({ keys: ['c/4', 'e/4'], duration: '8' });
        const initialBuilds = builds;
        const initialChildren = note.count();
        for (let i = 0; i < 20; i++) note.setStemDirection(i % 2 ? 1 : -1);
        return { empty, durations, invalid, rows, initialBuilds, initialChildren, finalChildren: note.count() };
      });
      assert.deepEqual(result.empty, []);
      assert.deepEqual(result.durations, [
        ['h', 'h'],
        ['h', 'h'],
      ]);
      assert.ok(result.invalid.every(Boolean));
      assert.ok(result.rows[0].overflow > 0);
      assert.equal(result.initialBuilds, 1);
      assert.equal(result.finalChildren, result.initialChildren);
    });
  } finally {
    await browser.close();
  }
});

test('chord ink clears the next measure and stays attached through reflow', async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
  });
  try {
    const page = await browser.newPage();
    await page.setContent('<div id="score"></div>');
    await page.addScriptTag({ path: root + 'build/cjs/vexflow-debug.js' });
    const results = await page.evaluate(async () => {
      const V = VexFlow;
      await V.loadFonts('Bravura', 'Academico');
      await document.fonts.ready;

      // Measure the actual SVG text and its distance from the owning beat on every draw.
      function frames(
        labels,
        { continuous = false, literal = false, reportWidth = false, below = false, keep = false } = {}
      ) {
        const host = document.getElementById('score');
        host.replaceChildren();
        const f = new V.Factory({ renderer: { elementId: 'score', width: 860, height: 450 } });
        const score = f.EasyScore();
        const anchors = ['last', 'first'];
        const music = score.compose({
          sheet: { width: 800, measurePadding: 0 },
          continuous: continuous ? { boundaries: keep ? [{ measure: 2, breakBefore: 'keep' }] : [] } : undefined,
          staves: [
            {
              id: 'melody',
              measures: ['C4/q, D4, E4, F4[id="last"]', 'C4/q[id="first"], D4, E4, F4'].map((notes, i) => ({
                voices: [{ notes }],
                // A literal chord on the incoming downbeat shares the native symbol's lane.
                chords: literal && i === 1 ? [{ note: anchors[i], text: labels[i] }] : [],
              })),
            },
          ],
        });
        const notes = anchors.map((id) => music.getNote(id));
        const marks = notes.map((n, i) => {
          if (literal && i === 1) return n.getModifiers().find((m) => m instanceof V.Annotation);
          const c = new V.ChordSymbol().addText(labels[i]).setReportWidth(reportWidth);
          if (below && i === 1) c.setVertical('below');
          n.addModifier(c, 0);
          return c;
        });
        return [800, 190, 800].map((width) => {
          music.sheet.setWidth(width);
          f.getContext().clear();
          f.draw({ retain: true });
          const boxes = marks.map((mark) => document.getElementById('vf-' + mark.getAttribute('id')).getBBox());
          const positions = notes.map((n) => n.getModifierStartXY(V.Modifier.Position.ABOVE, 0).x);
          return {
            gap: boxes[1].x - boxes[0].x - boxes[0].width,
            offsets: boxes.map((b, i) => b.x - positions[i]),
            positions,
            rows: music.sheet.getRows().map((r) => ({ count: r.systems.length, overflow: r.overflow })),
          };
        });
      }
      const long = ['C#maj13(#11,b9)/G', 'Dbmaj13(#11,b9)/Gb'];
      const all = [];
      for (const continuous of [false, true]) {
        for (const literal of [false, true]) all.push(frames(long, { continuous, literal }));
        all.push(frames(long, { continuous, reportWidth: true }));
      }
      const short = frames(['C', 'G']);
      const separateLanes = frames(long, { below: true });
      const kept = frames(long, { continuous: true, keep: true });
      return { all, short, separateLanes, kept };
    });
    for (const [wide, narrow, restored] of results.all) {
      assert.deepEqual(wide.rows, [{ count: 2, overflow: 0 }]);
      assert.ok(wide.gap > 0, 'rendered labels clear the barline');
      assert.ok(narrow.rows.length === 2, 'the narrow row breaks between measures');
      for (let i = 0; i < 2; i++) assert.ok(Math.abs(wide.offsets[i] - narrow.offsets[i]) < 0.01);
      assert.deepEqual(restored, wide, 'restoring the width restores the anchors and ink');
    }
    assert.deepEqual(
      results.short[0].positions,
      results.separateLanes[0].positions,
      'short labels and labels on opposite sides of the staff consume no boundary space'
    );
    assert.ok(results.kept[1].rows[0].overflow > 0 && results.kept[1].rows[0].count === 2);
    assert.ok(results.kept[1].gap > 0, 'an unbreakable group reports overflow and still clears the labels');
  } finally {
    await browser.close();
  }
});
