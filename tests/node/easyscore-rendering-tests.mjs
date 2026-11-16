// Compare the documented EasyScore example with independently constructed native notation.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer';

import { createEasyScoreExample } from '../../tools/easyscore-example.mjs';
import { createEasyScoreReferencesExample } from '../../tools/easyscore-references-example.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const guide = readFileSync(`${root}docs/easyscore.md`, 'utf8').match(/```js\n([\s\S]*?)```/)[1];

test('first EasyScore example matches native rendering', async (t) => {
  const browser = await puppeteer.launch({ headless: true, args: process.env.CI ? ['--no-sandbox'] : [] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 500, height: 240, deviceScaleFactor: 1 });
    await page.setContent('<style>body { margin: 0; background: white; }</style><div id="host"></div>');
    await page.addScriptTag({ path: `${root}build/cjs/vexflow-debug.js` });
    await page.evaluate(`window.createEasyScoreExample = ${createEasyScoreExample.toString()}`);
    await page.evaluate((source) => {
      window.createGuideExample = new Function(
        'VF',
        source + '\nreturn { score, notes, annotation, tie, voice, system };'
      );
    }, guide);
    for (const font of ['Bravura', 'Petaluma']) {
      for (const backend of ['svg', 'canvas']) {
        await t.test(`${font} ${backend}`, async () => {
          const frames = [];
          const metrics = [];
          for (const native of ['native', 'shared', 'guide']) {
            metrics.push(
              await page.evaluate(
                async ({ font, backend, native }) => {
                  const VF = VexFlow;
                  VF.setFonts(font, font === 'Bravura' ? 'Academico' : 'Petaluma Script');
                  await document.fonts.ready;
                  const host = document.getElementById('host');
                  host.replaceChildren();
                  const target = host.appendChild(document.createElement(backend === 'canvas' ? 'canvas' : 'div'));
                  target.id = 'score';
                  const renderer = { elementId: 'score', width: 500, height: 240 };
                  let example;
                  if (native === 'native') {
                    const factory = new VF.Factory({ renderer });
                    factory.setStyle({ fillStyle: '#24312c', strokeStyle: '#24312c' });
                    const notes = [
                      ['c/4', 'e/4', 'g/4'],
                      ['c/4', 'f/4', 'a/4'],
                    ].map((keys) => factory.StaveNote({ keys, duration: 'h', clef: 'treble', autoStem: true }));
                    const annotation = factory.Annotation({ text: 'dolce', vJustify: 'top' });
                    notes[0].addModifier(annotation, 0);
                    const tie = factory.StaveTie({ from: notes[0], to: notes[1], firstIndexes: [0], lastIndexes: [0] });
                    const voice = factory.Voice({ time: '4/4' }).addTickables(notes);
                    const system = factory.System({ x: 20, y: 70, width: 460 });
                    system
                      .addStave({ voices: [voice] })
                      .addClef('treble')
                      .addTimeSignature('4/4');
                    factory.draw({ retain: true });
                    example = { notes, annotation, tie, voice, system };
                  } else {
                    example =
                      native === 'shared' ? window.createEasyScoreExample(VF, renderer) : window.createGuideExample(VF);
                    window.example = example;
                    try {
                      example.score.notes('C4/q, invalid');
                    } catch (error) {
                      if (!(error instanceof VF.EasyScoreError)) throw new Error('Browser error class is not exported');
                    }
                  }
                  return example.notes.map((note) => ({
                    x: note.getAbsoluteX(),
                    ys: note.getYs(),
                    stem: note.getStemDirection(),
                    ticks: note.getTicks().value(),
                    bounds: { ...note.getBoundingBox() },
                  }));
                },
                { font, backend, native }
              )
            );
            frames.push(await page.screenshot({ omitBackground: false }));
          }
          assert.deepEqual(metrics[1], metrics[0], 'native and EasyScore geometry match');
          assert.deepEqual(metrics[2], metrics[0], 'guide geometry matches');
          assert.deepEqual(frames[2], frames[0], 'the actual guide snippet matches native pixels');
          assert.deepEqual(frames[1], frames[0], 'native and EasyScore pixels match on the same renderer');
          const draws = await page.evaluate(() => {
            const { score, annotation, tie } = window.example;
            const counts = { annotation: 0, tie: 0 };
            for (const [name, element] of [
              ['annotation', annotation],
              ['tie', tie],
            ]) {
              const draw = element.draw.bind(element);
              element.draw = () => {
                counts[name]++;
                return draw();
              };
            }
            for (const ink of ['#b74632', '#24312c']) {
              score.factory.getContext().clear();
              score.setStyle({ fillStyle: ink, strokeStyle: ink }).draw({ retain: true });
            }
            return counts;
          });
          assert.deepEqual(draws, { annotation: 2, tie: 2 }, 'one drawing owner per element on retained redraw');
          assert.deepEqual(
            await page.screenshot({ omitBackground: false }),
            frames[1],
            'theme round trip preserves output'
          );
        });
      }
    }
  } finally {
    await browser.close();
  }
});

test('adopted native notation matches rendering and retained redraw lifecycle', async (t) => {
  const browser = await puppeteer.launch({ headless: true, args: process.env.CI ? ['--no-sandbox'] : [] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 500, height: 240, deviceScaleFactor: 1 });
    await page.setContent('<style>body { margin: 0; background: white; }</style><div id="host"></div>');
    await page.addScriptTag({ path: `${root}build/cjs/vexflow-debug.js` });
    await page.evaluate(`window.createReferenceExample = ${createEasyScoreReferencesExample.toString()}`);
    for (const font of ['Bravura', 'Petaluma']) {
      for (const backend of ['svg', 'canvas']) {
        await t.test(`${font} ${backend}`, async () => {
          const frames = [];
          for (const native of [true, false]) {
            await page.evaluate(
              async ({ font, backend, native }) => {
                const VF = VexFlow;
                VF.setFonts(font, font === 'Bravura' ? 'Academico' : 'Petaluma Script');
                await document.fonts.ready;
                const host = document.getElementById('host');
                host.replaceChildren();
                const target = host.appendChild(document.createElement(backend === 'canvas' ? 'canvas' : 'div'));
                target.id = 'score';
                const renderer = { elementId: 'score', width: 500, height: 240 };
                if (!native) {
                  window.example = window.createReferenceExample(VF, renderer);
                  return;
                }
                const factory = new VF.Factory({ renderer });
                factory.setStyle({ fillStyle: '#24312c', strokeStyle: '#24312c' });
                const notes = [
                  factory.StaveNote({ keys: ['c/4'], duration: 'h', autoStem: true }),
                  factory.StaveNote({ keys: ['c/4'], duration: 'q', autoStem: true }),
                  factory.StaveNote({ keys: ['e/4'], duration: 'q', autoStem: true }),
                ];
                notes[0].addModifier(factory.Annotation({ text: 'dolce', vJustify: 'top' }), 0);
                factory.StaveTie({ from: notes[0], to: notes[1] });
                factory.Curve({ from: notes[1], to: notes[2] });
                const voice = factory.Voice({ time: '4/4' }).addTickables(notes);
                factory
                  .System({ x: 20, y: 70, width: 460 })
                  .addStave({ voices: [voice] })
                  .addClef('treble')
                  .addTimeSignature('4/4');
                factory.draw({ retain: true });
              },
              { font, backend, native }
            );
            frames.push(await page.screenshot({ omitBackground: false }));
          }
          assert.deepEqual(frames[1], frames[0], 'native extensions preserve rendered pixels');
          const counts = await page.evaluate(() => {
            const { score, notes, label, tie, curve } = window.example;
            const calls = { label: 0, tie: 0, curve: 0, native: 0 };
            for (const [key, element] of [
              ['label', label],
              ['tie', tie],
              ['curve', curve],
              ['native', notes[2]],
            ]) {
              const draw = element.draw.bind(element);
              element.draw = () => {
                calls[key]++;
                return draw();
              };
            }
            score.adopt(curve, 'drawable');
            score.adopt(notes[2], 'note');
            score.adopt(label, 'modifier');
            score.attach(notes[0], label);
            score.factory.getContext().clear();
            score.draw({ retain: true });
            if (score.getNote('start') !== notes[0] || !score.getSource(notes[0])) throw new Error('Lost references');
            return calls;
          });
          assert.deepEqual(counts, { label: 1, tie: 1, curve: 1, native: 1 });
          assert.deepEqual(await page.screenshot({ omitBackground: false }), frames[1], 'retained redraw is identical');
          assert.deepEqual(
            await page.evaluate(() => {
              const { score, notes } = window.example;
              score.factory.getContext().clear();
              score.draw(); // Default drawing clears queues but preserves references for inspection.
              const found = score.getNote('start') === notes[0];
              score.reset();
              return {
                found,
                missing: score.getElement('start') === undefined,
                cleared: VexFlow.EasyScore.getSource(notes[0]) === undefined,
              };
            }),
            { found: true, missing: true, cleared: true }
          );
        });
      }
    }
  } finally {
    await browser.close();
  }
});

test('EasyScore notation families draw once and redraw identically on both backends', async (t) => {
  const { renderEasyScoreFamilies } = await import('../../tools/easyscore-families.mjs');
  const { renderEasyScoreStructure } = await import('../../tools/easyscore-structure.mjs');
  const { renderEasyScoreRhythm } = await import('../../tools/easyscore-rhythm.mjs');
  const browser = await puppeteer.launch({ headless: true, args: process.env.CI ? ['--no-sandbox'] : [] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 640, height: 240, deviceScaleFactor: 1 });
    await page.setContent('<style>body{margin:0;background:white}</style><div id="host"></div>');
    await page.addScriptTag({ path: `${root}build/cjs/vexflow-debug.js` });
    await page.evaluate(
      `window.renderFamilies = ${renderEasyScoreFamilies.toString()}; window.renderRhythm = ${renderEasyScoreRhythm.toString()}; window.renderStructure = ${renderEasyScoreStructure.toString()}`
    );
    for (const font of ['Bravura', 'Petaluma'])
      for (const backend of ['svg', 'canvas']) {
        for (const kind of [
          'modifiers',
          'accidentals',
          'text',
          'grace',
          'percussion',
          'sequence',
          'odd-meter',
          'tuplets',
          'ties',
          'curves',
          'hairpins',
          'lines',
          'brackets',
          'pedal',
          'partial-spans',
          'dynamics', 'tab', 'grace-tab', 'rest', 'inline', 'repeat', 'labels', 'endings',
        ]) {
          await t.test(`${font} ${backend} ${kind}`, async () => {
            await page.evaluate(
              async ({ font, backend, kind }) => {
                const VF = VexFlow;
                VF.setFonts(font, font === 'Bravura' ? 'Academico' : 'Petaluma Script');
                await document.fonts.ready;
                const host = document.getElementById('host');
                host.replaceChildren();
                const target = host.appendChild(document.createElement(backend === 'canvas' ? 'canvas' : 'div'));
                target.id = 'score';
                const render = ['modifiers', 'accidentals', 'text', 'grace', 'percussion', 'sequence'].includes(kind)
                  ? window.renderFamilies
                  : ['tab', 'grace-tab', 'rest', 'inline', 'repeat', 'labels', 'endings'].includes(kind) ? window.renderStructure : window.renderRhythm;
                window.example = render(VF, { elementId: 'score', width: 640, height: 240 }, kind);
              },
              { font, backend, kind }
            );
            const original = await page.screenshot({ omitBackground: false });
            const counts = await page.evaluate(() => {
              const { score, notes, marks } = window.example;
              const elements = [...notes, ...marks, ...marks.flatMap((mark) => mark.getGraceNotes?.() ?? [])];
              const counts = elements.map(() => 0);
              elements.forEach((element, index) => {
                const draw = element.draw.bind(element);
                element.draw = () => {
                  counts[index]++;
                  return draw();
                };
              });
              score.factory.getContext().clear();
              score.draw({ retain: true });
              return counts;
            });
            assert.ok(
              counts.every((count) => count === 1),
              `one drawing owner: ${counts}`
            );
            assert.deepEqual(await page.screenshot({ omitBackground: false }), original);
          });
        }
      }
  } finally {
    await browser.close();
  }
});
