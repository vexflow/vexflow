// Test musical identities, performance time and rendered interactions for the M6 instrument profiles.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import puppeteer from 'puppeteer';

import { makeInstrumentStudy, makeTremoloStudy } from '../engraving/instrument-studies.mjs';

test('instrument studies and score construction', async (t) => {
  const browser = await puppeteer.launch({ headless: true, args: process.env.CI ? ['--no-sandbox'] : [] });
  try {
    const page = await browser.newPage();
    await page.setContent('<main id="music"></main>');
    await page.addScriptTag({ path: 'build/cjs/vexflow-debug.js' });
    await page.addScriptTag({ content: 'window.makeStudy=' + makeInstrumentStudy });
    await page.addScriptTag({ content: 'window.makeTremoloStudy=' + makeTremoloStudy });
    await page.evaluate(async () => {
      const VF = window.VexFlow;
      await VF.loadFonts('Bravura', 'Academico');
      VF.setFonts('Bravura', 'Academico');
      window.study = (kind) => {
        document.querySelector('main').replaceChildren();
        const f = new VF.Factory({
          renderer: { elementId: 'music', width: 710, height: 530, backend: VF.Renderer.Backends.SVG },
        });
        return makeStudy(VF, f, kind);
      };
    });

    await t.test('written harmonies transpose independently spelled roots and basses with the melody', async () => {
      const result = await page.evaluate(() => {
        const V = VexFlow;
        const spelling = V.NotationSpelling;
        const slash = Object.freeze({ root: 'G', quality: '7', bass: 'B' });
        const raised = spelling.transposeChord(slash, 2, 1);
        const altered = { root: 'Bb', quality: '7(b9,#11)', bass: 'Db' };
        const flat = spelling.transposeChord({ root: 'C' }, 1, 1);
        const sharp = spelling.transposeChord({ root: 'C' }, 1, 0);
        document.getElementById('music').replaceChildren();
        const factory = new V.Factory({ renderer: { elementId: 'music', width: 700, height: 190 } });
        const melody = ['b/3', 'd/4', 'f/4', 'g/4'].map((key) => spelling.transpose(key, 2, 1));
        const notes = melody.map((key, i) => ({ id: 'n' + i, note: { keys: [key], duration: 'q' } }));
        const chords = [
          { note: 'n0', harmony: raised },
          { note: 'n1', harmony: spelling.transposeChord(altered, 2, 1) },
          { note: 'n2', harmony: flat },
          { note: 'n3', text: 'N.C.' },
        ];
        const score = factory.EasyScore().compose({
          sheet: { width: 670 },
          staves: [{ id: 'lead', measures: [{ voices: [{ notes }], chords }] }],
        });
        factory.draw();
        const rejects = (harmony, semitones, steps) => {
          try {
            spelling.transposeChord(harmony, semitones, steps);
            return false;
          } catch (error) {
            return error.code === 'BadArguments';
          }
        };
        return {
          raised,
          roundTrip: spelling.transposeChord(raised, -2, -1),
          original: slash,
          pitches: notes.map(({ id }) => score.getNote(id).getKeys()[0]),
          labels: [...document.querySelectorAll('#music .vf-annotation text')].map((e) => e.textContent),
          enharmonics: [flat, sharp].map((chord) => spelling.chordText(chord)),
          invalid: [
            rejects({ root: 'H' }, 2, 1),
            rejects({ root: 'C', bass: 'B/3' }, 2, 1),
            rejects({ root: 'C' }, 9, 0),
          ],
        };
      });
      assert.deepEqual(result.raised, { root: 'A', quality: '7', bass: 'C#' });
      assert.deepEqual(result.roundTrip, { root: 'G', quality: '7', bass: 'B' });
      assert.deepEqual(result.roundTrip, result.original);
      assert.deepEqual(result.pitches, ['c#/4', 'e/4', 'g/4', 'a/4']);
      assert.deepEqual(result.labels, ['A7/C♯', 'C7(b9,#11)/E♭', 'D♭', 'N.C.']);
      assert.deepEqual(result.enharmonics, ['D♭', 'C♯']);
      assert.ok(result.invalid.every(Boolean));
    });

    await t.test('fret position labels follow score and diagram fonts on SVG and Canvas', async () => {
      const labels = await page.evaluate(() => {
        const VF = VexFlow;
        const spec = { firstFret: 7, frets: ['x', 7, 9, 9, 8, 7] };
        const result = [];
        for (const backend of ['svg', 'canvas']) {
          const host = document.createElement('div');
          const canvas = document.createElement('canvas').getContext('2d');
          const ctx = backend === 'svg' ? new VF.SVGContext(host) : new VF.CanvasContext(canvas);
          const fillText = canvas.fillText.bind(canvas);
          canvas.fillText = (text, x, y) => {
            result.push([text, canvas.font]);
            fillText(text, x, y);
          };
          for (const [family, override] of [
            ['Academico', false],
            ['serif', false],
            ['serif', true],
          ]) {
            VF.setTextFonts(family);
            const diagram = new VF.FretDiagram(spec).setContext(ctx);
            if (override) diagram.setFont('monospace', 11, 'bold');
            diagram.draw();
            if (backend === 'svg') {
              const label = [...host.querySelectorAll('text')].at(-1);
              result.push([label.textContent, label.getAttribute('font-family')]);
            }
          }
        }
        VF.setFonts('Bravura', 'Academico');
        return result;
      });
      for (let i = 0; i < labels.length; i++) {
        assert.equal(labels[i][0], '7');
        assert.match(labels[i][1], [/Academico/, /serif/, /monospace/][i % 3]);
      }
      assert.equal(labels.length, 6);
      assert.match(labels[5][1], /bold/);
    });

    await t.test(
      'percussion keeps mixed head identities and stems in native notes, compositions and exported parts',
      async () => {
        const result = await page.evaluate(() => {
          const VF = VexFlow,
            kit = new VF.PercussionMap();
          const attack = kit.note(['snare', 'hat'], 'q');
          const native = new VF.StaveNote(attack);
          const { notes } = study('kit');
          const name = document.getElementById('vf-' + notes[2].getAttribute('id')).getAttribute('aria-label');
          const source = {
            staves: [
              {
                id: 'drums',
                clef: 'percussion',
                measures: [
                  {
                    voices: [
                      { notes: [{ id: 'backbeat', note: attack }, kit.note(['kick'], 'q'), kit.note(['hat'], 'h')] },
                    ],
                  },
                ],
              },
            ],
            continuous: {},
          };
          const result = new VF.Publication(source).render(document.querySelector('main'), { staves: ['drums'] });
          const metadata = JSON.parse(result.pages[0].svg.querySelector('metadata').textContent);
          const side = study('line').notes;
          return {
            name,
            positions: native.getKeyProps().map((p) => p.line),
            different: native.noteHeads[0].getText() !== native.noteHeads[1].getText(),
            exported: metadata.events.find((e) => e.id === 'backbeat').notation,
            kick: kit.note(['kick'], 'q').stemDirection,
            override: kit.note(['kick'], 'q', 'up').stemDirection,
            barHeight: side[0].checkStave().getBarlineBounds().botY - side[0].checkStave().getBarlineBounds().topY,
            side: side.every((n) => n.getYs()[0] === n.checkStave().getYForLine(2)),
          };
        });
        assert.deepEqual(result.positions, [3.5, 5.5]);
        assert.equal(result.different, true);
        assert.equal(result.side, true);
        assert.equal(result.barHeight, 21);
        assert.equal(result.kick, -1);
        assert.equal(result.override, 1);
        assert.equal(result.name, 'Snare drum, Closed hi-hat');
        assert.deepEqual(
          result.exported.map((e) => [e.id, e.index]),
          [
            ['snare', 0],
            ['hat', 1],
          ]
        );
      }
    );

    await t.test(
      'tremolo divides written duration while retaining strokes, and rejects unrelated endpoints',
      async () => {
        const data = await page.evaluate(() => {
          const VF = VexFlow,
            { notes } = study('techniques');
          const bad = new VF.AlternatingTremolo(notes[0], notes[2], 3);
          let rejected = false;
          try {
            bad.draw();
          } catch (e) {
            rejected = e.code === 'BadArguments';
          }
          return {
            written: notes[0].getDuration(),
            total: (notes[0].getTicks().value() + notes[1].getTicks().value()) / VF.RESOLUTION,
            strokes: document.querySelectorAll('.vf-alternating-tremolo path').length,
            rejected,
            identities: notes.slice(2).flatMap((n) => n.notation.map((e) => e.id)),
          };
        });
        assert.equal(data.written, 'h');
        assert.equal(data.total, 0.5);
        assert.equal(data.strokes, 3);
        assert.equal(data.rejected, true);
        assert.deepEqual(data.identities, ['harmonic', 'down-bow', 'pedal', 'finger-2', 'breath', 'sons-etouffes']);
      }
    );

    await t.test(
      'whole-note, four-stroke and cross-staff tremolos retain written time and join their endpoints',
      async () => {
        const result = await page.evaluate(() => {
          const VF = VexFlow;
          const render = (duration, strokes, crossStaff) => {
            const host = document.createElement('div');
            document.body.append(host);
            const ctx = new VF.SVGContext(host);
            const { voice, notes, draw } = makeTremoloStudy(VF, ctx, duration, strokes, crossStaff);
            return (gap) => {
              ctx.clear();
              draw(gap);
              const bars = Array.from(host.querySelectorAll('.vf-alternating-tremolo path'), (path) => {
                const values = path
                  .getAttribute('d')
                  .match(/-?\d+(?:\.\d+)?/g)
                  .map(Number);
                return {
                  x1: values[0],
                  y1: values[1],
                  x2: values[2],
                  y2: values[3],
                  bottom2: values[5],
                  bottom1: values[7],
                };
              });
              return {
                bars,
                extensions: Array.from(host.querySelectorAll('.vf-alternating-tremolo rect'), (rect) => {
                  const box = rect.getBBox();
                  return { x: box.x + box.width / 2, y: box.y, bottom: box.y + box.height };
                }),
                stems: notes.map((n) => n.getStemSegment() ?? null),
                heads: notes.map((n) => n.getHeadInk()[0]),
                ticks: notes.map((n) => n.getTicks().value() / VF.RESOLUTION),
                complete: voice.isComplete(),
                stemCount: host.querySelectorAll('.vf-stem').length,
              };
            };
          };
          const cross = render('h', 3, true);
          const testHost = document.createElement('div');
          const testContext = new VF.SVGContext(testHost);
          const pair = makeTremoloStudy(VF, testContext, 'h', 3, true);
          pair.draw();
          const [first, last] = pair.notes;
          last.checkStave().setX(400);
          let disjointError;
          try {
            new VF.AlternatingTremolo(first, last, 3).setContext(testContext).draw();
          } catch (error) {
            disjointError = error.code;
          }
          return {
            disjointError,
            whole: render('w', 3, false)(),
            four: render('h', 4, false)(),
            three: render('h', 3, false)(),
            quarter: render('q', 3, false)(),
            gaps: [cross(82), cross(132), cross(82)],
          };
        });
        const { whole, four, three, quarter, gaps } = result;
        assert.equal(result.disjointError, 'BadArguments');
        assert.equal(whole.stemCount, 0);
        assert.equal(whole.bars.length, 3);
        assert.deepEqual(whole.ticks, [0.5, 0.5]);
        assert.ok(
          whole.bars.every(
            (b) => b.x1 > whole.heads[0].x + whole.heads[0].w && b.x2 < whole.heads[1].x && b.y1 === b.y2
          )
        );
        assert.deepEqual(four.ticks, [0.25, 0.25]);
        assert.deepEqual(quarter.ticks, [0.125, 0.125]);
        assert.equal(quarter.bars.length, 3);
        assert.equal(four.bars.length, 4);
        assert.deepEqual(four.bars.slice(0, 3), three.bars);
        const step = four.bars[1].y1 - four.bars[0].y1;
        assert.ok(Math.abs(step) > Math.abs(four.bars[0].bottom1 - four.bars[0].y1));
        assert.ok(Math.abs(four.bars[3].y1 - four.bars[2].y1 - step) < 0.01);
        for (const frame of gaps) {
          const [left, right] = frame.stems;
          assert.equal(frame.bars.length, 3);
          assert.deepEqual(frame.ticks, [0.25, 0.25]);
          const leftExtension = frame.extensions.find((r) => Math.abs(r.x - left.x) < 0.01);
          const rightExtension = frame.extensions.find((r) => Math.abs(r.x - right.x) < 0.01);
          assert.ok(leftExtension && rightExtension);
          assert.ok(Math.abs(leftExtension.y - left.tipY) < 0.01);
          assert.ok(Math.abs(rightExtension.bottom - right.tipY) < 0.01);
          for (const bar of frame.bars) {
            assert.ok(Math.abs((bar.y2 - bar.y1) / (bar.x2 - bar.x1)) <= 0.251);
            assert.ok(Math.abs(bar.x1 - left.x) < 0.01 && Math.abs(bar.x2 - right.x) < 0.01);
            assert.ok(bar.y1 >= left.baseY && bar.bottom1 <= leftExtension.bottom + 0.01);
            assert.ok(bar.y2 >= rightExtension.y - 0.01 && bar.bottom2 <= right.baseY);
          }
          assert.ok(Math.abs(frame.bars[2].bottom1 - leftExtension.bottom) < 0.01);
          assert.ok(Math.abs(frame.bars[0].y2 - rightExtension.y) < 0.01);
        }
        assert.equal(gaps[1].stems[1].tipY - gaps[0].stems[1].tipY, 50);
        assert.deepEqual(gaps[2], gaps[0]);
        assert.ok([whole, three, four, quarter, ...gaps].every((frame) => frame.complete));
      }
    );

    await t.test(
      'tuning and capo preserve displayed frets, and the diagram encodes open, muted and barred strings',
      async () => {
        const result = await page.evaluate(() => {
          const VF = VexFlow;
          const { notes } = study('guitar');
          const frame = document.querySelector('.vf-fret-diagram');
          const guitar = new VF.FrettedInstrument('dropd', 2);
          const pair = guitar.attack(
            [
              { str: 6, fret: 0 },
              { str: 2, fret: 3 },
            ],
            'q'
          );
          return {
            keys: pair.note.keys,
            frets: pair.tab.positions.map((p) => p.fret),
            first: notes[0].getKeys()[0],
            frame: frame.getAttribute('aria-label'),
            ink: frame.getBBox().width,
            bends: document.querySelectorAll('.vf-tabnote').length,
          };
        });
        assert.deepEqual(result.keys, ['E/3', 'E/5']);
        assert.deepEqual(result.frets, [0, 3]);
        assert.equal(result.first, 'E/3');
        assert.ok(result.ink > 30);
        assert.match(result.frame, /x, 0, 2, 2, 2, 0, barre at fret 2/);
        assert.ok(result.bends >= 4);
      }
    );

    await t.test('two microtonal conventions preserve order, cancellation and octave-specific memory', async () => {
      const data = await page.evaluate(() => {
        const VF = VexFlow;
        study('micro');
        const signatures = [...document.querySelectorAll('.vf-keysignature')].map((g) => g.textContent).filter(Boolean);
        const state = new VF.WrittenAccidentalState({ g: 'o' });
        const sequence = [
          state.sign('g/4', 'o'),
          state.sign('g/4', 'n'),
          state.sign('g/5', 'o'),
          state.sign('g/4', 'n', true),
        ];
        state.reset();
        sequence.push(state.sign('g/4', 'o'));
        return {
          sequence,
          signatures,
          expected: [
            VF.Glyphs.accidentalQuarterToneFlatStein + VF.Glyphs.accidentalQuarterToneSharpStein,
            VF.Glyphs.accidentalKoron + VF.Glyphs.accidentalSori,
          ],
        };
      });
      assert.deepEqual(data.sequence, [null, 'n', null, 'n', null]);
      assert.deepEqual(data.signatures, data.expected);
    });

    await t.test(
      'shared onsets stay aligned across staff-local barlines; a free cadenza permits a shorter sounding voice',
      async () => {
        const data = await page.evaluate(() => {
          const { notes, bars, freeVoices } = study('meter');
          return {
            shared: notes.slice(0, 6).map((n, i) => n.getAbsoluteX() - notes[i + 6].getAbsoluteX()),
            bars: bars.map(
              ({ bar, before, after }) => bar.getX() > before.getAbsoluteX() && bar.getX() < after.getAbsoluteX()
            ),
            free: freeVoices.map((v) => v.getTicksUsed().value()),
            silent: freeVoices[1].getTickables().at(-1) instanceof VexFlow.GhostNote,
          };
        });
        assert.deepEqual(data.shared, [0, 0, 0, 0, 0, 0]);
        assert.deepEqual(data.bars, [true, true, true]);
        assert.equal(data.free[0], data.free[1]);
        assert.equal(data.silent, true);
      }
    );

    await t.test('pitch, key and rhythm changes are opt-in and preserve explicit spelling', async () => {
      const data = await page.evaluate(() => {
        const VF = VexFlow,
          S = VF.NotationSpelling;
        const invalid = (fn) => {
          try {
            fn();
            return false;
          } catch (e) {
            return e.code === 'BadArguments';
          }
        };
        const source = ['b/4', 'db/5'];
        const lead = study('lead').notes;
        return {
          source,
          pitches: source.map((k) => S.transpose(k, 2, 1)),
          enharmonic: S.transpose('c/4', 1, 1),
          key: S.transposeKey('Fm', 2, 1),
          parts: S.rhythm(48, 40, [80, 64, 80]),
          rests: S.rhythm(10, 24, [16, 32], true),
          lead: lead.flatMap((n) => n.notation).length,
          pickup: study('spelling').notes.map((n) => n.getDuration()),
          rejected: [
            invalid(() => new VF.PercussionMap().note(['missing'], 'q')),
            invalid(() => new VF.FrettedInstrument().attack([{ str: 1, fret: -1 }], 'q')),
            invalid(() => new VF.FretDiagram({ frets: ['x', 9] })),
            invalid(() => S.transpose('c/4', 9, 0)),
            invalid(() => S.rhythm(1, 0)),
          ],
        };
      });
      assert.deepEqual(data.source, ['b/4', 'db/5']);
      assert.deepEqual(data.pitches, ['c#/5', 'eb/5']);
      assert.equal(data.enharmonic, 'db/4');
      assert.equal(data.key, 'Gm');
      assert.deepEqual(
        data.parts.map((p) => [p.start, p.duration, p.tieNext]),
        [
          [48, '4', true],
          [64, '4', true],
          [80, '8', false],
        ]
      );
      assert.ok(data.rests.every((r) => !r.tieNext));
      assert.equal(data.lead, 4);
      assert.equal(data.pickup.length, 5);
      assert.ok(data.rejected.every(Boolean));
    });
  } finally {
    await browser.close();
  }
});
