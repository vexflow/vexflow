// Browser contracts for physical pages, independent parts and the portable print adapter.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import puppeteer from 'puppeteer';

import { tabEndingStudy } from '../engraving/continuous-studies.mjs';
import {
  condensedFlutesStudy,
  leadSheetStudy,
  ossiaRangeStudy,
  publicationStudy,
  transposedCueStudy,
} from '../engraving/publication-studies.mjs';

test('publication views, pagination and portable printing', async (t) => {
  const browser = await puppeteer.launch({ headless: true, args: process.env.CI ? ['--no-sandbox'] : [] });
  try {
    const page = await browser.newPage();
    await page.setContent('<main></main><aside></aside>');
    await page.addScriptTag({ path: 'build/cjs/vexflow-debug.js' });
    await page.addScriptTag({ path: 'node_modules/opentype.js/dist/opentype.js' });
    await page.addScriptTag({ content: 'window.study=' + publicationStudy });
    for (const [family, file] of [
      ['Bravura', 'bravura'],
      ['Academico', 'academico'],
    ]) {
      const data = await readFile('node_modules/@vexflow-fonts/' + file + '/' + file + '.otf');
      await page.evaluate(
        async ({ family, data }) => {
          const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
          document.fonts.add(await new FontFace(family, bytes).load());
          (window.faces ??= []).push({ family, font: opentype.parse(bytes.buffer) });
        },
        { family, data: data.toString('base64') }
      );
    }
    await page.evaluate(() => VexFlow.setFonts('Bravura', 'Academico'));
    await t.test('two flute players retain their individual attacks in a condensed conductor passage', async () => {
      await page.addScriptTag({ content: 'window.flutesStudy=' + condensedFlutesStudy });
      const views = await page.evaluate(() => {
        const { source, condense } = flutesStudy();
        const book = new VexFlow.Publication(source);
        const target = document.querySelector('main');
        const render = (options) => {
          const { pages, diagnostics } = book.render(target, options);
          const roots = pages.map((p) => p.svg);
          const metadata = roots.map((s) => JSON.parse(s.querySelector('metadata').textContent));
          return {
            notes: roots.flatMap((s) =>
              [...s.querySelectorAll('.vf-stavenote')].map((n) => ({
                id: n.dataset.vfId,
                heads: n.querySelectorAll('.vf-notehead').length,
                stem: n.querySelector('.vf-stem path')?.getAttribute('d'),
              }))
            ),
            labels: roots.flatMap((s) =>
              [...s.querySelectorAll('text')].map((n) => n.textContent).filter((s) => ['1.', '2.', 'a2'].includes(s))
            ),
            events: metadata.flatMap((m) => m.events),
            measures: metadata.flatMap((m) => m.measures),
            systems: pages.flatMap((p) => p.systems.map((s) => s.measures)),
            staves: metadata[0].staves,
            diagnostics,
          };
        };
        return {
          wide: render({ condense }),
          narrow: render({ condense, paper: { width: 77, height: 190 } }),
          passage: render({ condense: { ...condense, measures: [2, 3] } }),
          first: render({ staves: ['fl1'] }),
          second: render({ staves: ['fl2'] }),
          restored: render({ condense }),
        };
      });
      const { wide, narrow, passage, first, second, restored } = views;
      assert.deepEqual(wide, restored);
      assert.deepEqual(wide.staves, ['fl1']);
      assert.deepEqual(wide.systems, [[1, 2, 3]]);
      assert.ok(narrow.systems.length > 1);
      for (const view of [wide, narrow]) {
        assert.deepEqual(view.diagnostics, []);
        assert.deepEqual(view.labels, ['1.', 'a2']);
        assert.deepEqual(
          view.events.filter((e) => e.staff === 'fl1'),
          first.events
        );
        assert.deepEqual(
          view.events.filter((e) => e.staff === 'fl2'),
          second.events
        );
        assert.deepEqual(
          view.notes.map((n) => n.id).sort(),
          [
            'vf-f1m1n1',
            'vf-f1m1n2',
            'vf-f1m2n1',
            'vf-f1m2n2',
            'vf-f1m3n1',
            'vf-f1m3n2',
            'vf-f2m3n1',
            'vf-f2m3n2',
          ].sort()
        );
        assert.ok(view.notes.every((n) => n.heads === 1 && n.stem));
        for (const note of view.notes.filter((n) => n.id.includes('m3'))) {
          const coords = note.stem.match(/-?[\d.]+/g).map(Number);
          assert.equal(Math.sign(coords[3] - coords[1]), note.id.includes('f1m') ? -1 : 1);
        }
      }
      assert.deepEqual(
        second.events.filter((e) => e.measure === 1).map((e) => e.rest),
        [true]
      );
      assert.deepEqual(passage.measures, [2, 3]);
      assert.deepEqual(passage.labels, ['a2']);
      assert.deepEqual(
        passage.events,
        wide.events.filter((e) => e.measure >= 2)
      );
    });
    for (const paper of ['A4', 'Letter'])
      for (const part of [false, true]) {
        await t.test((part ? 'cello' : 'score') + ' on ' + paper, async () => {
          const { diagnostics, ranges, media, metadata, ids, boxes, printed, geometry, svg } = await page.evaluate(
            ({ part, paper }) => {
              const { source, options } = study(part, paper),
                target = document.querySelector('main');
              const result = new VexFlow.Publication(source).render(target, options);
              const roots = result.pages.map((p) => p.svg);
              const ids = roots.flatMap((s) => [...s.querySelectorAll('[id]')].map((el) => el.id));
              const p = result.pages[0];
              const xml = result.toSVG(1),
                outlined = result.toSVG(1, faces);
              const parse = (s) => new DOMParser().parseFromString(s, 'image/svg+xml');
              return {
                diagnostics: result.diagnostics,
                ranges: result.pages.map((p) => p.systems.flatMap((s) => s.measures)),
                media: roots.map((el) => [el.getAttribute('width'), el.getAttribute('height')]),
                metadata: roots.map((s) => JSON.parse(s.querySelector('metadata').textContent)),
                ids: ids.length === new Set(ids).size,
                boxes: result.pages.map((p) => p.systems),
                printed: result.toPrintHTML(faces),
                geometry: [...parse(outlined).querySelectorAll('[data-system]')].map((g) =>
                  g.getAttribute('transform')
                ),
                svg: {
                  transforms: [...p.svg.querySelectorAll('[data-system]')].map((g) => g.getAttribute('transform')),
                  source: parse(xml).querySelectorAll('text').length,
                  outlined: parse(outlined).querySelectorAll('text').length,
                  meta:
                    parse(outlined).querySelector('metadata').textContent ===
                    p.svg.querySelector('metadata').textContent,
                },
              };
            },
            { part, paper }
          );
          assert.deepEqual(diagnostics, []);
          assert.deepEqual(
            ranges.flat(),
            Array.from({ length: 26 }, (_, i) => i + 1)
          );
          assert.deepEqual(
            ranges.map((r) => r.at(-1)),
            part ? [16, 26] : paper === 'A4' ? [12, 24, 26] : [8, 20, 26]
          );
          const [w, h] = paper === 'A4' ? [210, 297] : [215.9, 279.4];
          assert.ok(media.every((m) => m[0] === w + 'mm' && m[1] === h + 'mm'));
          for (const systems of boxes)
            for (const [i, s] of systems.entries()) {
              assert.ok(s.x >= 16 && s.x + s.width <= w - 16 + 0.001);
              assert.ok(s.y >= 15 && s.y + s.height < h - 15);
              if (i) assert.ok(s.y >= systems[i - 1].y + systems[i - 1].height + 5.99);
            }
          assert.ok(ids && svg.meta && svg.source > 0 && !svg.outlined);
          assert.deepEqual(geometry, svg.transforms);
          const events = metadata.flatMap((m) => m.events);
          assert.ok(events.some((n) => n.id === 'vc-16-1' && n.rest));
          if (part) {
            const cue = metadata.flatMap((m) => m.regions).find((r) => r.kind === 'cue');
            assert.ok(cue.events.some((e) => e.id === 'fl-16-1' && e.measure === 16 && e.staff === 'fl'));
            assert.ok(events.every((e) => e.staff === 'vc'));
            assert.deepEqual(
              metadata.flatMap((m) => m.regions).map((r) => [r.kind, r.measure]),
              [
                ['cue', 16],
                ['ossia', 21],
              ]
            );
          }
          const print = await browser.newPage();
          try {
            await print.setContent(printed);
            const pdf = Buffer.from(await print.pdf({ preferCSSPageSize: true, printBackground: true }));
            const bytes = pdf.toString('latin1');
            const pages = bytes.match(/\/Type\s*\/Page\b/g) ?? [];
            assert.equal(pages.length, ranges.length);
            const media = [...bytes.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/g)];
            assert.equal(media.length, ranges.length);
            assert.ok(
              media.every(
                (m) => Math.abs(Number(m[1]) - (w * 72) / 25.4) < 1 && Math.abs(Number(m[2]) - (h * 72) / 25.4) < 1
              )
            );
          } finally {
            await print.close();
          }
        });
      }
    await t.test('a transposed flute cue follows the clarinet signature and regenerates from source', async () => {
      await page.addScriptTag({ content: 'window.cueStudy=' + transposedCueStudy });
      const result = await page.evaluate(() => {
        const { source, options } = cueStudy();
        const book = new VexFlow.Publication(source);
        const target = document.querySelector('main');
        function quote() {
          const { pages, diagnostics } = book.render(target, options);
          const svg = pages[0].svg;
          const group = svg.querySelector('[data-region="cue"]');
          const meta = JSON.parse(svg.querySelector('metadata').textContent);
          return {
            keys: meta.regions[0].events.map((e) => e.keys[0].toLowerCase()),
            ticks: meta.regions[0].events.map((e) => e.ticks),
            rest: meta.events[0].rest,
            label: group.querySelector(':scope > text').textContent,
            transform: group.querySelector('g[transform]').getAttribute('transform'),
            sharps: [...group.textContent].filter((c) => c === VexFlow.Glyphs.accidentalSharp).length,
            naturals: [...group.textContent].filter((c) => c === VexFlow.Glyphs.accidentalNatural).length,
            diagnostics,
          };
        }
        const original = quote();
        source.staves[0].measures[0].voices[0].notes = ['e/4', 'f/4', 'g/4', 'bb/4'].map((key) => ({
          keys: [key],
          duration: 'q',
        }));
        const edited = quote();
        const concert = book.render(target, { staves: ['fl'] }).pages[0].svg;
        return {
          original,
          edited,
          concert: JSON.parse(concert.querySelector('metadata').textContent).events.map((e) => e.keys[0]),
        };
      });
      assert.deepEqual(result.original.keys, ['f#/4', 'g/4', 'a/4', 'b/4']);
      assert.deepEqual(result.edited.keys, ['f#/4', 'g/4', 'a/4', 'c/5']);
      assert.deepEqual(result.concert, ['e/4', 'f/4', 'g/4', 'bb/4']);
      for (const quote of [result.original, result.edited]) {
        assert.deepEqual(quote.diagnostics, []);
        assert.equal(quote.rest, true);
        assert.equal(quote.label, 'Flute');
        assert.match(quote.transform, /scale\(0\.7\)/);
        assert.deepEqual(quote.ticks, Array(4).fill('4096/1'));
        assert.equal(quote.sharps, 2);
      }
      assert.equal(result.original.naturals, 0);
      assert.equal(result.edited.naturals, 1);
    });
    await t.test(
      'a ranged ossia aligns each bar, continues on the next system and restores its original layout',
      async () => {
        await page.addScriptTag({ content: 'window.ossiaStudy=' + ossiaRangeStudy });
        const result = await page.evaluate(() => {
          const { source, options } = ossiaStudy();
          const book = new VexFlow.Publication(source);
          const target = document.querySelector('main');
          function render(view) {
            const result = book.render(target, view);
            const sections = result.pages.flatMap((p) => [...p.svg.querySelectorAll('[data-region]')]);
            const metadata = result.pages.map((p) => JSON.parse(p.svg.querySelector('metadata').textContent));
            const serialized = result.pages.map((p) =>
              new DOMParser().parseFromString(result.toSVG(p.number, faces), 'image/svg+xml')
            );
            const offsets = sections.flatMap((section) => {
              const system = section.closest('[data-system]');
              const hostStaves = system.lastElementChild.querySelectorAll('.vf-stave');
              const index = Number(section.dataset.measure) - Number(system.dataset.system);
              return [...section.querySelectorAll('.vf-stave')].map((staff, i) => {
                const inset = staff.getBoundingClientRect();
                const host = hostStaves[index + i].getBoundingClientRect();
                return [inset.left - host.left, inset.right - host.right];
              });
            });
            return {
              diagnostics: result.diagnostics,
              aligned: offsets.every((ends) => ends.every((d) => Math.abs(d) < 0.01)),
              widths: sections.flatMap((el) =>
                [...el.querySelectorAll('.vf-stave')].map((s) => s.getBoundingClientRect().width)
              ),
              exported: serialized.every(
                (svg, i) =>
                  svg.querySelector('metadata').textContent === JSON.stringify(metadata[i]) &&
                  svg.querySelectorAll('[data-region] .vf-notehead').length ===
                    result.pages[i].svg.querySelectorAll('[data-region] .vf-notehead').length
              ),
              ranges: sections.map((el) => [Number(el.dataset.measure), Number(el.dataset.endMeasure)]),
              noteCounts: sections.map((el) => el.querySelectorAll('.vf-stavenote').length),
              labels: sections.flatMap((el) => [...el.querySelectorAll(':scope > text')].map((t) => t.textContent)),
              main: metadata.flatMap((m) => m.events).map((e) => [e.id, e.keys, e.ticks]),
              alternate: metadata.flatMap((m) => m.regions).flatMap((r) => r.events.map((e) => [e.measure, e.id])),
              x: sections.flatMap((el) =>
                [...el.querySelectorAll('.vf-notehead')].map((n) => n.getBoundingClientRect().x)
              ),
            };
          }
          const control = render({ ...options, regions: [] });
          const wide = render(options);
          const split = render({ ...options, paper: { width: 150, height: 130 }, systemBreaks: [3] });
          const pages = render({ ...options, pageBreaks: [3] });
          const restored = render(options);
          const invalid = [1, 2.5, 5].map((endMeasure) => {
            const before = target.firstChild;
            try {
              book.render(target, { ...options, regions: [{ ...options.regions[0], endMeasure }] });
            } catch {
              return target.firstChild === before;
            }
            return false;
          });
          // Unequal intrinsic widths prevent an equal division of the inset from passing the alignment check.
          source.staves[0].measures[2] = { voices: [{ notes: 'F4/8, G4/8, F4/8, E4/8, D4/8, C4/8' }] };
          const uneven = render(options);
          // Rests under an alternate line still need individually aligned measures.
          source.continuous = { compressRests: true };
          const rests = { voices: [{ notes: ['hr', 'qr'].map((duration) => ({ keys: ['b/4'], duration })) }] };
          source.staves[0].measures = [rests, rests, rests, rests];
          const resting = render(options);
          return { control, wide, split, pages, restored, invalid, uneven, resting };
        });
        const { control, wide, split, pages, restored } = result;
        assert.deepEqual(wide.ranges, [[2, 3]]);
        assert.deepEqual(wide.noteCounts, [12]);
        assert.deepEqual(split.ranges, [
          [2, 2],
          [3, 3],
        ]);
        assert.deepEqual(split.noteCounts, [6, 6]);
        assert.deepEqual(pages.ranges, split.ranges);
        assert.deepEqual(pages.noteCounts, split.noteCounts);
        assert.deepEqual(wide, restored);
        assert.ok(result.uneven.aligned && Math.abs(result.uneven.widths[0] - result.uneven.widths[1]) > 1);
        assert.ok(result.resting.aligned && result.resting.exported);
        assert.deepEqual(result.resting.alternate, wide.alternate);
        assert.deepEqual(result.resting.noteCounts, [12]);
        for (const view of [wide, split, pages]) {
          assert.ok(view.aligned && view.exported);
          assert.deepEqual(view.diagnostics, []);
          assert.deepEqual(view.labels, ['Ossia']);
          assert.deepEqual(view.main, control.main);
          assert.deepEqual(
            view.alternate,
            [2, 3].flatMap((m) => Array.from({ length: 6 }, (_, i) => [m, 'alternate-' + m + '-' + (i + 1)]))
          );
        }
        assert.deepEqual(result.invalid, [true, true, true]);
      }
    );
    await t.test('structured chords and rhythmic tab retain written dots in independent parts', async () => {
      const samples = await page.evaluate(() => {
        const keys = ['c/4', 'e/4'];
        const positions = [
          { str: 1, fret: 12 },
          { str: 2, fret: 10 },
        ];
        const source = {
          staves: ['stave', 'tab'].map((kind) => ({
            id: kind,
            kind,
            time: '13/16',
            measures: [
              {
                voices: [
                  {
                    notes: [1, 2].map((dots) => ({
                      id: kind + dots,
                      ...(kind === 'tab'
                        ? { tab: { duration: 'q', positions, dots }, drawStem: true }
                        : { note: { duration: 'q', keys, dots } }),
                    })),
                  },
                ],
              },
            ],
          })),
        };
        const host = document.querySelector('aside');
        host.replaceChildren();
        host.id = 'dot-score';
        const factory = new VexFlow.Factory({ renderer: { elementId: host.id, width: 500, height: 330 } });
        const screen = factory.EasyScore().compose(source);
        factory.draw();
        const countDots = (group) =>
          [...group.querySelectorAll('text')].filter((el) => el.textContent === VexFlow.Glyphs.augmentationDot).length;
        return source.staves.flatMap(({ id }) => {
          const book = new VexFlow.Publication(source).render(document.querySelector('main'), { staves: [id] });
          const svg = book.pages[0].svg;
          const events = JSON.parse(svg.querySelector('metadata').textContent).events;
          return events.map((event) => ({
            id: event.id,
            ticks: screen.getNote(event.id).getTicks().toString(),
            partTicks: event.ticks,
            screenDots: countDots(host.querySelector('#vf-' + event.id)),
            partDots: countDots(svg.querySelector('[data-vf-id="vf-' + event.id + '"]')),
          }));
        });
      });
      assert.deepEqual(samples, [
        { id: 'stave1', ticks: '6144/1', partTicks: '6144/1', screenDots: 2, partDots: 2 },
        { id: 'stave2', ticks: '7168/1', partTicks: '7168/1', screenDots: 4, partDots: 4 },
        { id: 'tab1', ticks: '6144/1', partTicks: '6144/1', screenDots: 1, partDots: 1 },
        { id: 'tab2', ticks: '7168/1', partTicks: '7168/1', screenDots: 2, partDots: 2 },
      ]);
    });
    await t.test(
      'an extracted tab part prints the tied string and the ending across its own system break',
      async () => {
        const source = tabEndingStudy();
        source.staves.unshift({
          id: 'melody',
          time: '1/4',
          measures: [1, 2].map(() => ({ voices: [{ notes: 'C4/q' }] })),
        });
        const result = await page.evaluate((source) => {
          const book = new VexFlow.Publication(source).render(document.querySelector('main'), {
            staves: ['guitar'],
            systemBreaks: [2],
          });
          const svg = book.pages[0].svg;
          const meta = JSON.parse(svg.querySelector('metadata').textContent);
          return {
            diagnostics: book.diagnostics,
            staves: meta.staves,
            spans: meta.spans,
            systems: [...svg.querySelectorAll('[data-system]')].map((g) => ({
              endings: [...g.querySelectorAll('text')].filter((e) => e.textContent === '1.').length,
              curves: [...g.querySelectorAll('path')].filter((e) => /Q/i.test(e.getAttribute('d'))).length,
            })),
          };
        }, source);
        assert.deepEqual(result.diagnostics, []);
        assert.deepEqual(result.staves, ['guitar']);
        assert.deepEqual(result.systems, [
          { endings: 1, curves: 1 },
          { endings: 0, curves: 1 },
        ]);
        assert.deepEqual(
          result.spans.filter((s) => s.id === 'hold'),
          [
            { id: 'hold', kind: 'tie', part: 'first', strings: [2], from: 'tab0' },
            { id: 'hold', kind: 'tie', part: 'last', strings: [2], to: 'tab1' },
          ]
        );
        assert.deepEqual(
          result.spans.filter((s) => s.id === 'ending').map((s) => s.part),
          ['first', 'last']
        );
      }
    );
    await t.test('lead sheet marks stay on their notes through reflow and part extraction', async () => {
      await page.addScriptTag({ content: 'window.leadSheetStudy=' + leadSheetStudy });
      const result = await page.evaluate(() => {
        const source = leadSheetStudy();
        const host = document.querySelector('aside');
        host.replaceChildren();
        host.id = 'lead-score';
        const factory = new VexFlow.Factory({ renderer: { elementId: host.id, width: 800, height: 1200 } });
        const score = factory.EasyScore().compose(source);
        const read = (svg) => {
          const anchor = (id) => svg.querySelector('#vf-' + id + ', [data-vf-id="vf-' + id + '"]');
          const marks = (id) => Array.from(anchor(id).querySelectorAll('.vf-annotation text'), (t) => t.textContent);
          const bars = [...svg.querySelectorAll('.vf-stavebarline')].map((el) =>
            Array.from(el.querySelectorAll('rect[stroke="none"]'), (r) => Number(r.getAttribute('width')))
          );
          return {
            opening: marks('a0'),
            second: marks('a3'),
            meterSigns: svg.querySelectorAll('.vf-timesignature').length,
            double: bars.filter((w) => w.join() === '1,1').length,
            final: bars.filter((w) => w.join() === '1,3').length,
            beams: svg.querySelectorAll('.vf-beam').length,
          };
        };
        const samples = [760, 270].map((width) => {
          factory.getContext().clear();
          score.sheet.setWidth(width);
          factory.draw({ retain: true });
          return { rows: score.sheet.getRows().length, drawing: read(host) };
        });
        const beamSizes = [...new Set(score.notes[0][0][0].map((n) => n.getBeam()))].map((b) => b.getNotes().length);
        const book = new VexFlow.Publication(source).render(document.querySelector('main'), {
          staves: ['lead'],
          systemBreaks: [2],
          paper: 'A4',
        });
        return { samples, beamSizes, printed: read(book.pages[0].svg), diagnostics: book.diagnostics };
      });
      const drawing = { opening: ['Cmaj7', 'Day'], second: ['light'], meterSigns: 0, double: 1, final: 1, beams: 4 };
      assert.deepEqual(result.samples, [
        { rows: 1, drawing },
        { rows: 2, drawing },
      ]);
      assert.deepEqual(result.beamSizes, [3, 3]);
      assert.deepEqual(result.printed, drawing);
      assert.deepEqual(result.diagnostics, []);
    });
    await t.test('a fingering and its transparent hit area stay with the printed note', async () => {
      const printed = await page.evaluate(() => {
        const measures = Array.from({ length: 6 }, (_, i) => ({
          voices: [{ notes: i === 5 ? 'C5/w[id="fingered",fingerings="4.left"]' : 'G4/w' }],
        }));
        const music = { staves: [{ id: 'keyboard', measures }] };
        const book = new VexFlow.Publication(music).render(document.querySelector('main'), {
          systemBreaks: [2, 3, 4, 5, 6],
        });
        const note = book.pages.map((p) => p.svg.querySelector('[data-vf-id="vf-fingered"]')).find(Boolean);
        const digit = Array.from(note.querySelectorAll('text'))
          .find((el) => el.textContent === '4')
          .getBoundingClientRect();
        const head = note.querySelector('.vf-notehead text').getBoundingClientRect();
        return {
          system: note.closest('[data-system]').getAttribute('data-system'),
          clear: digit.right < head.left,
          aligned: digit.top < head.bottom && head.top < digit.bottom,
        };
      });
      assert.deepEqual(printed, { system: '6', clear: true, aligned: true });
    });
    await t.test('pagination reserves running text at the final page scale', async () => {
      const result = await page.evaluate(() => {
        const style = document.createElement('style');
        style.textContent = 'svg[role="img"] [data-page-furniture] text { font-size: 7px }';
        document.head.append(style);
        try {
          const { source, options } = study(false, 'Letter');
          const book = new VexFlow.Publication(source).render(document.querySelector('main'), options);
          return book.pages.map((p) => {
            const footer = Array.from(p.svg.querySelector('[data-page-furniture]').children).slice(-2);
            const bottom = Math.min(...footer.map((el) => el.getBBox().y));
            const last = p.systems.at(-1);
            return { end: last.measures.at(-1), clearance: bottom - last.y - last.height };
          });
        } finally {
          style.remove();
        }
      });
      assert.deepEqual(
        result.map((p) => p.end),
        [8, 16, 24, 26]
      );
      assert.ok(
        result.every((p) => p.clearance >= 3.99),
        'Every system clears the footer reservation'
      );
    });
    await t.test(
      'an extracted cross-staff voice keeps its notes and reports a spanner ending in another part',
      async () => {
        const data = await page.evaluate(() => {
          const { source } = study(false, 'A4');
          const note = source.staves[0].measures[0].voices[0].notes[0];
          note.stave = 'va';
          note.note.clef = 'alto';
          source.continuous.spans.push({ kind: 'slur', id: 'between', from: 'fl-1-1', to: 'vc-2-2' });
          const registry = new VexFlow.Registry();
          VexFlow.Registry.enableDefaultRegistry(registry);
          try {
            const r = new VexFlow.Publication(source).render(document.querySelector('aside'), { staves: ['fl'] });
            const metadata = JSON.parse(r.pages[0].svg.querySelector('metadata').textContent);
            return {
              notes: metadata.events.filter((n) => n.id === 'fl-1-1'),
              omitted: r.diagnostics.filter((d) => d.code === 'ExcludedAnchor'),
              registry: VexFlow.Registry.getDefaultRegistry() === registry && !registry.getElementById('fl-1-1'),
            };
          } finally {
            VexFlow.Registry.disableDefaultRegistry();
          }
        });
        assert.equal(data.notes[0].staff, 'fl');
        assert.deepEqual(data.omitted, [{ code: 'ExcludedAnchor', measures: [1, 2], detail: 'between' }]);
        assert.ok(data.registry);
      }
    );
    await t.test(
      'part-only breaks, forced and forbidden turns, oversize diagnostics and transactional redraw',
      async () => {
        const checks = await page.evaluate(() => {
          const { source, options } = study(false, 'A4'),
            part = study(true, 'A4').options;
          const base = JSON.stringify(source),
            pub = new VexFlow.Publication(source);
          const main = document.querySelector('main'),
            other = document.querySelector('aside');
          const score = pub.render(main, options),
            before = main.innerHTML;
          const forced = pub.render(other, { ...part, pageBreaks: [5], forbiddenTurns: [4] });
          const last = other.innerHTML;
          let invalid = false;
          try {
            pub.render(other, { ...part, regions: [{ kind: 'cue', staff: 'missing', measure: 4, label: 'Cue' }] });
          } catch {
            invalid = true;
          }
          const intact = other.innerHTML === last;
          const narrow = pub.render(other, { ...part, paper: { width: 130, height: 68 }, title: 'A '.repeat(100) });
          let refused = false;
          try {
            narrow.toPrintHTML(faces);
          } catch {
            refused = true;
          }
          return {
            invalid,
            intact,
            refused,
            unchanged: before === main.innerHTML && base === JSON.stringify(source),
            turn: forced.diagnostics.filter((d) => d.code === 'ForbiddenTurn').map((d) => d.measures),
            first: forced.pages[1].systems[0].measures[0],
            codes: narrow.diagnostics.map((d) => d.code),
            score: score.pages.length,
          };
        });
        assert.ok(checks.invalid && checks.intact && checks.refused && checks.unchanged);
        assert.equal(checks.first, 5);
        assert.deepEqual(checks.turn, [[4]]);
        assert.ok(checks.codes.includes('PageOverflow') && checks.codes.includes('TextOverflow'));
      }
    );
  } finally {
    await browser.close();
  }
});

test('equally feasible pages prefer a performing rest and respect a forbidden turn and last-page spacing', async () => {
  // Load the built module at runtime so the ESM compiler does not also treat its output as a source file.
  const { paginate } = await import(new URL('../../build/esm/src/pagebreaks.js', import.meta.url).href);
  const rows = Array.from({ length: 5 }, (_, i) => ({ measures: [i + 1], height: 10, restAtEnd: i === 1 }));
  const rules = {
    firstHeight: 34,
    laterHeight: 34,
    gap: 1,
    maxExtraGap: 8,
    justifyLast: false,
    part: true,
    forceBefore: new Set(),
    preferAfter: new Set(),
    forbidAfter: new Set(),
  };
  const natural = paginate(rows, rules);
  assert.deepEqual(
    natural.map((p) => p.end),
    [2, 5]
  );
  assert.deepEqual(natural[1].offsets, [0, 11, 22]);
  assert.deepEqual(paginate(rows, { ...rules, justifyLast: true })[1].offsets, [0, 12, 24]);
  assert.deepEqual(
    paginate(rows, { ...rules, forbidAfter: new Set([2]) }).map((p) => p.end),
    [3, 5]
  );
});
