// Compare the documented EasyScore example with independently constructed native notation.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import puppeteer from 'puppeteer';
import { createEasyScoreExample } from '../../tools/easyscore-example.mjs';

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
