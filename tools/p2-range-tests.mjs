// Regression coverage and repeatable visual evidence for the second P2 batch.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import puppeteer from 'puppeteer';

import { renderRangeExample } from './p2-range-examples.mjs';

const bundle = resolve(process.env.VEXFLOW_TEST_BUNDLE ?? 'build/cjs/vexflow-debug.js');
const label = process.env.VEXFLOW_EXAMPLE_LABEL ?? 'after';
const evidenceOnly = process.env.VEXFLOW_EVIDENCE_ONLY === '1';
const output = resolve('build/p2-range');
mkdirSync(output, { recursive: true });

test('P2 rest clearance, pedal clearance, grace bounds, fret sizes, and tuplet edits', async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 780, height: 450, deviceScaleFactor: 1 });
    await page.addScriptTag({ path: bundle });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    for (const family of ['Bravura', 'Petaluma']) {
      for (const issue of [203, 206, 253, 255]) {
        for (const variant of [0, 1]) {
          const result = await page.evaluate(renderRangeExample, { issue, family, variant });
          await page.screenshot({ path: resolve(output, `${issue}-${family}-${variant}-${label}.png`) });
          if (evidenceOnly) {
            console.log(JSON.stringify({ issue, family, variant, result }));
            continue;
          }
          if (issue === 203) {
            const { rest, chord } = result;
            assert.ok(variant ? rest.y >= chord.y + chord.h : rest.y + rest.h <= chord.y, JSON.stringify(result));
          } else if (issue === 206) {
            assert.ok(result.baseline - result.height >= result.bottom + 4, JSON.stringify(result));
          } else if (issue === 253) {
            assert.deepEqual(result.before, result.repeat);
            assert.deepEqual(result.before, result.after);
            assert.equal(result.renderedBefore, false);
            assert.ok(result.before.x > 35 && result.before.w > 0);
          } else {
            for (const entry of result)
              for (const fret of entry.frets) {
                assert.equal(fret.size, entry.requested);
                assert.ok(Math.abs(fret.center) < 0.001);
              }
            assert.ok(result[0].width < result[2].width);
          }
        }
      }
    }
    if (evidenceOnly) return;
    const bounds = await page.evaluate(() => {
      const V = VexFlow;
      const ctx = new V.SVGContext(document.createElement('div'));
      const stave = new V.Stave(80, 75, 550).setContext(ctx);
      const grace = new V.GraceNote({ keys: ['d/4'], duration: '8' });
      const group = new V.GraceNoteGroup([grace]);
      const parent = new V.StaveNote({ keys: ['c/5'], duration: 'q' }).setStave(stave).addModifier(group, 0);
      const dynamics = new V.TextDynamics({ text: 'sfz', duration: 'q', line: 8 }).setStave(stave);
      const voice = new V.Voice('2/4').addTickables([parent, dynamics]);
      new V.Formatter().joinVoices([voice]).formatToStave([voice], stave);
      const before = { ...group.getBoundingBox() };
      const dynamicsBefore = { ...dynamics.getBoundingBox() };
      voice.draw(ctx, stave);
      const after = { ...group.getBoundingBox() };
      const dynamicsAfter = { ...dynamics.getBoundingBox() };
      const drawn = [...ctx.svg.querySelectorAll('text')].at(-1);
      const drawnX = Number(drawn.getAttribute('x'));
      const drawnY = Number(drawn.getAttribute('y')) - dynamics.getTextMetrics().actualBoundingBoxAscent;
      // Position must follow a later formatting pass without accumulating offsets.
      new V.Formatter().joinVoices([voice]).formatToStave([voice], new V.Stave(140, 100, 600));
      parent.setStave(new V.Stave(140, 100, 600).setContext(ctx));
      const moved = { ...group.getBoundingBox() };
      const tab = new V.GraceTabNote({ positions: [{ str: 2, fret: 12 }], duration: '8' });
      const defaultSize = V.Font.convertSizeToPointValue(tab.fretElement[0].fontInfo.size);
      tab.setFontSize(7).setGhost(true);
      const ghostSize = V.Font.convertSizeToPointValue(tab.fretElement[0].fontInfo.size);
      tab.setGhost(false).setFontSize();
      const resetSize = V.Font.convertSizeToPointValue(tab.fretElement[0].fontInfo.size);
      return { before, after, dynamicsBefore, dynamicsAfter, drawnX, drawnY, moved, defaultSize, ghostSize, resetSize };
    });
    assert.deepEqual(bounds.before, bounds.after);
    assert.deepEqual(bounds.dynamicsBefore, bounds.dynamicsAfter);
    assert.ok(Math.abs(bounds.dynamicsBefore.x - bounds.drawnX) < 0.001);
    assert.ok(Math.abs(bounds.dynamicsBefore.y - bounds.drawnY) < 0.001);
    assert.ok(bounds.moved.x > bounds.before.x && bounds.moved.y > bounds.before.y);
    assert.equal(bounds.defaultSize, 6);
    assert.equal(bounds.ghostSize, 7);
    assert.equal(bounds.resetSize, 6);
    const timing = await page.evaluate(() => {
      const V = VexFlow;
      const makeNotes = () => Array.from({ length: 3 }, () => new V.StaveNote({ keys: ['c/4'], duration: '8' }));
      const notes = makeNotes();
      const voice = new V.Voice('1/4').setStrict(false).addTickables(notes);
      const initial = voice.getTicksUsed().value();
      const tuplet = new V.Tuplet(notes, { numNotes: 3, notesOccupied: 2 });
      voice.setStrict(true);
      const after = voice.getTicksUsed().value();
      const complete = voice.isComplete();
      tuplet.attach();
      notes[0].addTuplet(tuplet);
      const repeat = voice.getTicksUsed().value();
      const shortest = voice.getSmallestTickCount().value();
      const resolution = voice.getResolutionMultiplier();
      const nested = new V.Tuplet(notes, { numNotes: 3, notesOccupied: 2 });
      const nestedTicks = voice.getTicksUsed().value();
      nested.detach();
      const unnested = voice.getTicksUsed().value();
      tuplet.setNotesOccupied(1);
      const changed = voice.getTicksUsed().value();
      tuplet.detach();
      const detached = voice.getTicksUsed().value();
      const incomplete = !voice.isComplete();
      tuplet.attach();
      notes.forEach((n) => n.clearTuplets());
      const cleared = voice.getTicksUsed().value();
      const first = makeNotes();
      new V.Tuplet(first, { numNotes: 3, notesOccupied: 2 });
      const strict = new V.Voice('1/4').addTickables(first);
      const strictComplete = strict.isComplete();
      let rejectsOverflow = false;
      try {
        strict.addTickable(new V.StaveNote({ keys: ['c/4'], duration: '8' }));
      } catch {
        rejectsOverflow = true;
      }
      const editedNotes = makeNotes();
      const editedVoice = new V.Voice('4/4').setStrict(false).addTickables(editedNotes);
      const outer = new V.Tuplet(editedNotes, { numNotes: 3, notesOccupied: 2 });
      const inner = new V.Tuplet(editedNotes, { numNotes: 3, notesOccupied: 2 });
      editedNotes[0].setDuration(new V.Fraction(1, 4));
      inner.detach();
      outer.detach();
      const edited = editedVoice.getTicksUsed().value();
      const other = new V.Voice('1/4').addTickables(makeNotes().slice(0, 2));
      new V.Formatter().joinVoices([strict, other]).format([strict, other], 300);
      return {
        initial,
        after,
        complete,
        repeat,
        shortest,
        resolution,
        nestedTicks,
        unnested,
        changed,
        detached,
        incomplete,
        cleared,
        strictComplete,
        rejectsOverflow,
        edited,
      };
    });
    assert.equal(timing.initial, 6144);
    assert.equal(timing.after, 4096);
    assert.equal(timing.repeat, 4096);
    assert.ok(timing.complete && timing.strictComplete && timing.rejectsOverflow && timing.incomplete);
    assert.equal(timing.shortest, 4096 / 3);
    assert.equal(timing.resolution, 3);
    assert.equal(timing.nestedTicks, (4096 * 2) / 3);
    assert.equal(timing.unnested, 4096);
    assert.equal(timing.changed, 2048);
    assert.equal(timing.detached, 6144);
    assert.equal(timing.cleared, 6144);
    assert.equal(timing.edited, 8192);
  } finally {
    await browser.close();
  }
});

/** The class metric must resize fret text without a protected-property workaround. */
test('GraceTabNote fontScale controls fret text and width', async () => {
  const { createCanvas } = await import('canvas');
  const { Element, GraceTabNote, Metrics, MetricsDefaults } = await import('../build/esm/entry/vexflow-core.js');
  Element.setTextMeasurementCanvas(createCanvas(200, 200));
  const oldScale = MetricsDefaults.GraceTabNote.fontScale;
  try {
    MetricsDefaults.GraceTabNote.fontScale = 1 / 3;
    Metrics.clear('GraceTabNote');
    const small = new GraceTabNote({ positions: [{ str: 1, fret: 12 }], duration: '8' });
    MetricsDefaults.GraceTabNote.fontScale = 2 / 3;
    Metrics.clear('GraceTabNote');
    const large = new GraceTabNote({ positions: [{ str: 1, fret: 12 }], duration: '8' });
    small.preFormat();
    large.preFormat();
    assert.ok(small.getWidth() > 0);
    assert.ok(large.getWidth() > small.getWidth() * 1.8);
  } finally {
    MetricsDefaults.GraceTabNote.fontScale = oldScale;
    Metrics.clear('GraceTabNote');
  }
});
