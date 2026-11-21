// Test musical identities, performance time and rendered interactions for the M6 instrument profiles.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import puppeteer from 'puppeteer';

import { makeInstrumentStudy, makeTremoloStudy, tiedBendStudy } from '../engraving/instrument-studies.mjs';

test('instrument studies and score construction', async (t) => {
  const browser = await puppeteer.launch({ headless: true, args: process.env.CI ? ['--no-sandbox'] : [] });
  try {
    const page = await browser.newPage();
    await page.setContent('<main id="music"></main>');
    await page.addScriptTag({ path: 'build/cjs/vexflow-debug.js' });
    await page.addScriptTag({ content: 'window.makeStudy=' + makeInstrumentStudy });
    await page.addScriptTag({ content: 'window.makeTremoloStudy=' + makeTremoloStudy });
    await page.addScriptTag({ content: 'window.tiedBendStudy=' + tiedBendStudy });
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

    await t.test('a tied TAB bend rises once and releases on its own string after reflow', async () => {
      const result = await page.evaluate(() => {
        const V = VexFlow,
          source = tiedBendStudy(V);
        const host = document.querySelector('main');
        host.replaceChildren();
        const factory = new V.Factory({ renderer: { elementId: 'music', width: 600, height: 720 } });
        const score = factory.EasyScore().compose(source),
          layout = score.sheet.getContinuousLayout();
        const frame = (width) => {
          factory.getContext().clear();
          score.sheet.setWidth(width);
          factory.draw({ retain: true });
          const nav = new V.ScoreNavigation(score, source.staves);
          const fragments = layout.fragments.filter((f) => f.id === 'tied-bend');
          const tabs = ['tabrise', 'tabrelease'].map((id) => score.getNote(id));
          const [first, last] = tabs,
            space = first.checkStave().space(1);
          const peak = fragments[0].bend.peakX;
          const release = fragments.at(-1).bend;
          return {
            parts: fragments.map((f) => f.part),
            phases: fragments.map((f) => [f.bend.peakX !== undefined, f.bend.releaseX !== undefined]),
            strings: fragments.map((f) => f.strings),
            stringYs: fragments.every(
              (f) => f.bend.stringY === score.staves[layout.rows[f.row].measures[0] - 1][1].getYForLine(2)
            ),
            phaseRatios: [
              (peak - fragments[0].bend.left) /
                (first.checkStave().getNoteEndX() - space * 0.35 - fragments[0].bend.left),
              (release.releaseX - last.getTieRightX()) / (release.right - last.getTieRightX()),
            ],
            positions: tabs.map((n) => n.getPositions()),
            keys: ['noterise', 'noterelease'].map((id) => score.getNote(id).getKeys()),
            events: nav.events.filter((e) => /tab(rise|release)/.test(e.id)),
            fullLabels: [...host.querySelectorAll('.vf-tied-bend text')].map((t) => t.textContent),
            paths: [...host.querySelectorAll('.vf-tied-bend')].map((g) =>
              [...g.querySelectorAll('path')].map((p) => p.getAttribute('d'))
            ),
            modifiers: tabs.map((n) => n.getModifiers().filter((m) => m instanceof V.Bend).length),
            diagnostics: layout.diagnostics,
          };
        };
        const wide = frame(520),
          narrow = frame(155),
          restored = frame(520);
        host.replaceChildren();
        const book = new V.Publication(source).render(host, { staves: ['tab'], systemBreaks: [2] });
        const metadata = book.pages.flatMap((p) => JSON.parse(p.svg.querySelector('metadata').textContent).spans);
        const invalid = [];
        for (const change of [
          (s) => (s.continuous.spans[1].bend.hold = [0, 1]),
          (s) => (s.continuous.spans[1].bend.release = [1, 3]),
          (s) => (s.continuous.spans[1].to = 'tablead'),
          (s) => {
            s.continuous.spans[1].to = 'tablast';
            s.staves[1].measures[1].voices[0].notes[1].tab = s.staves[1].measures[1].voices[0].notes[0].tab;
          },
          (s) => (s.continuous.spans[1].from = 'noterise'),
        ]) {
          const s = tiedBendStudy(V);
          change(s);
          try {
            new V.Factory({ renderer: { elementId: null } }).EasyScore().compose(s);
          } catch (err) {
            invalid.push(err.code);
          }
        }
        return { wide, narrow, restored, metadata, invalid };
      });
      const { wide, narrow, restored, metadata, invalid } = result;
      assert.deepEqual(restored, wide);
      assert.deepEqual(wide.parts, ['single']);
      assert.deepEqual(narrow.parts, ['first', 'last']);
      assert.deepEqual(wide.phases, [[true, true]]);
      assert.deepEqual(narrow.phases, [
        [true, false],
        [false, true],
      ]);
      for (const f of [wide, narrow]) {
        assert.ok(f.stringYs);
        assert.ok(f.strings.every((strings) => strings.join(',') === '3'));
        assert.ok(f.phaseRatios.every((r) => Math.abs(r - 0.5) < 1e-9));
        assert.deepEqual(f.fullLabels, ['full']);
        assert.deepEqual(f.modifiers, [0, 0]);
        assert.deepEqual(f.diagnostics, []);
        assert.deepEqual(f.positions[0], [...f.positions[1]].reverse());
        assert.deepEqual(f.keys[0], [...f.keys[1]].reverse());
        assert.deepEqual(
          f.events.map((e) => [e.id, e.onset, e.duration]),
          [
            ['tabrise', '1/4', '1/4'],
            ['tabrelease', '0/1', '1/4'],
          ]
        );
        assert.match(f.events[0].label, /Bend 2 semitones on string 3/);
        assert.match(f.events[1].label, /Sustain and release tied string 3/);
      }
      assert.deepEqual(narrow.events, wide.events);
      assert.deepEqual(
        metadata.map((f) => [f.id, f.part, f.strings, f.bend.semitones]),
        [
          ['tied-bend', 'first', [3], 2],
          ['tied-bend', 'last', [3], 2],
        ]
      );
      assert.deepEqual(invalid, [
        'BadArguments',
        'BadArguments',
        'BadContinuousScore',
        'BadContinuousScore',
        'BadContinuousScore',
      ]);
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

    await t.test('guitar voicings retain the requested tuning, chord tones and slash bass', async () => {
      const result = await page.evaluate(() => {
        const { FretDiagram, Tuning } = VexFlow;
        const tuning = new Tuning('standard');
        const c = { root: 'C' };
        const lookup = FretDiagram.lookupVoicing;
        const open = lookup(c, 'standard');
        const inversion = lookup({ root: 'c', quality: 'major', bass: 'e' }, 'standard');
        const barre = lookup(c, 'standard', 'third-position');
        const original = structuredClone(barre);
        // A consumer can edit a returned frame without affecting the catalog.
        barre.frets[1] = 0;
        barre.barre.from = 6;
        const pitches = (frame) =>
          frame.frets.flatMap((fret, i) =>
            fret === 'x' ? [] : [tuning.getValueForFret(fret, frame.frets.length - i)]
          );
        const sounded = [
          open,
          inversion,
          original,
          lookup({ root: 'D' }, 'standard'),
          lookup({ root: 'G' }, 'standard'),
        ].map(pitches);
        return {
          open,
          inversion,
          original,
          pitches: sounded.map((chord) => chord.map((note) => note % 12)),
          basses: sounded.map((chord) => Math.min(...chord) % 12),
          repeat: lookup(c, Tuning.names.standard, 'third-position'),
          named: lookup(c, 'standard', 'open'),
          unknown: [
            lookup(c, 'dropd'),
            lookup(c, Tuning.names.dropd),
            lookup(c, 'standardBanjo'),
            lookup({ root: 'C', quality: 'm' }, 'standard'),
            lookup({ root: 'C', bass: 'G' }, 'standard'),
            lookup({ root: 'C', quality: '/E' }, 'standard'),
            lookup(c, 'standard', 'missing'),
          ].every((shape) => shape === undefined),
        };
      });
      assert.deepEqual(result.open.frets, ['x', 3, 2, 0, 1, 0]);
      assert.deepEqual(result.inversion.frets, [0, 3, 2, 0, 1, 0]);
      assert.deepEqual(result.original.frets, ['x', 3, 5, 5, 5, 3]);
      assert.deepEqual(result.pitches, [
        [0, 4, 7, 0, 4],
        [4, 0, 4, 7, 0, 4],
        [0, 7, 0, 4, 7],
        [2, 9, 2, 6],
        [7, 11, 2, 7, 11, 7],
      ]);
      assert.deepEqual(result.basses, [0, 4, 0, 2, 7]);
      assert.deepEqual(result.repeat, result.original);
      assert.deepEqual(result.named, result.open);
      assert.ok(result.unknown);
    });

    await t.test('chord-frame fingerings follow stopped strings on SVG and Canvas', async () => {
      const result = await page.evaluate(() => {
        const VF = VexFlow;
        const frames = [];
        for (const backend of ['svg', 'canvas']) {
          const host = document.createElement('div');
          const ctx =
            backend === 'svg'
              ? new VF.SVGContext(host)
              : new VF.CanvasContext(document.createElement('canvas').getContext('2d'));
          let digits = [];
          const fillText = ctx.fillText.bind(ctx);
          ctx.fillText = (text, x, y) => {
            digits.push([text, x + ctx.measureText(text).width / 2, y]);
            return fillText(text, x, y);
          };
          const render = (frame) => {
            digits = [];
            frame.setContext(ctx).draw();
            return digits;
          };
          const fingers = [null, null, null, 1, 3, 2];
          const d = new VF.FretDiagram({ frets: ['x', 'x', 0, 2, 3, 2], fingerings: fingers });
          fingers[3] = null;
          const c = new VF.FretDiagram({ frets: ['x', 3, 2, 0, 1, 0], fingerings: [null, 3, 2, null, 1] });
          const full = render(d);
          const cleared = render(d.setFingerings(fingers));
          const invalid = [[1], [null, null, 1], [null, null, null, 5], Array(7).fill(null)].map((values) => {
            try {
              d.setFingerings(values);
              return false;
            } catch (error) {
              return error.code === 'BadArguments';
            }
          });
          frames.push({
            full,
            cleared,
            afterError: render(d),
            plain: render(d.setFingerings()),
            c: render(c),
            invalid,
          });
        }
        return frames;
      });
      const [svg, canvas] = result;
      assert.deepEqual(svg, canvas);
      assert.deepEqual(svg.full, [
        ['1', 49, 33],
        ['3', 58, 44],
        ['2', 67, 33],
      ]);
      assert.deepEqual(svg.c, [
        ['3', 31, 44],
        ['2', 40, 33],
        ['1', 58, 22],
      ]);
      assert.deepEqual(svg.cleared, svg.full.slice(1));
      assert.deepEqual(svg.afterError, svg.cleared);
      assert.deepEqual(svg.plain, []);
      assert.ok(svg.invalid.every(Boolean));
    });

    await t.test(
      'horizontal chord frames keep string assignments, barre endpoints and labels inside their bounds',
      async () => {
        const results = await page.evaluate(() =>
          ['svg', 'canvas'].map((backend) => {
            const VF = VexFlow;
            const canvas = document.createElement('canvas');
            canvas.width = 360;
            canvas.height = 180;
            const pixels = canvas.getContext('2d');
            const ctx =
              backend === 'svg' ? new VF.SVGContext(document.createElement('div')) : new VF.CanvasContext(pixels);
            const arcs = [];
            const segments = [];
            let point;
            const arc = ctx.arc.bind(ctx),
              move = ctx.moveTo.bind(ctx),
              line = ctx.lineTo.bind(ctx);
            ctx.arc = (x, y, ...args) => {
              arcs.push([x, y]);
              return arc(x, y, ...args);
            };
            ctx.moveTo = (x, y) => {
              point = [x, y];
              return move(x, y);
            };
            ctx.lineTo = (x, y) => {
              segments.push([...point, x, y]);
              return line(x, y);
            };
            const frets = ['x', 'x', 0, 2, 3, 2];
            const frame = new VF.FretDiagram({ orientation: 'horizontal', frets }).setContext(ctx);
            frame.draw();
            const positions = arcs.slice();
            const crosses = segments.filter((s) => Math.abs(s[2] - s[0]) === 5 && Math.abs(s[3] - s[1]) === 5);
            pixels.clearRect(0, 0, canvas.width, canvas.height);
            const bar = new VF.FretDiagram({
              orientation: 'horizontal',
              frets: ['x', 0, 7, 5, 5, 5],
              firstFret: 5,
              rows: 7,
              barre: { fret: 5, from: 1, to: 3 },
            })
              .setX(12)
              .setY(8)
              .setContext(ctx);
            bar.draw();
            const lastSegment = segments.at(-1);
            const { x, y, w, h } = bar.getBoundingBox();
            // Two frames can abut at their allocated edges. Count actual ink escaping the first box.
            const rgba = pixels.getImageData(0, 0, canvas.width, canvas.height).data;
            let ink = 0,
              outside = 0;
            for (let j = 0; j < canvas.height; j++)
              for (let i = 0; i < canvas.width; i++)
                if (rgba[(j * canvas.width + i) * 4 + 3]) {
                  ink++;
                  if (i + 1 <= x || i >= x + w || j + 1 <= y || j >= y + h) outside++;
                }
            frame
              .setX(x + w)
              .setY(y)
              .draw();
            return { positions, crosses, lastSegment, ink, outside, neighbor: frame.getBoundingBox().x, right: x + w };
          })
        );
        for (const result of results) {
          assert.deepEqual(result.positions, [
            [8.5, 33],
            [30.5, 24],
            [41.5, 15],
            [30.5, 6],
          ]);
          assert.equal(result.crosses.length, 4);
          assert.ok(result.crosses.every(([x1, , x2]) => Math.max(x1, x2) < 14));
          assert.deepEqual(result.lastSegment, [31.5, 14, 31.5, 32]);
          assert.equal(result.right, result.neighbor);
        }
        assert.ok(results[1].ink > 200);
        assert.equal(results[1].outside, 0);
      }
    );

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
