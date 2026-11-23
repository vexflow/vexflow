// Browser contracts for physical pages, independent parts and the portable print adapter.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import puppeteer from 'puppeteer';

import { headOccurrenceStudy } from '../engraving/head-occurrence-studies.mjs';
import { textLaneStudy } from '../engraving/text-lane-studies.mjs';

import { balladeSpacingStudy, sextupletStudy, tabEndingStudy } from '../engraving/continuous-studies.mjs';
import { friskaSlurStudy, soleaSlurStudy } from '../engraving/slur-studies.mjs';
import {
  condensedFlutesStudy,
  headMarksStudy,
  leadSheetStudy,
  ossiaRangeStudy,
  publicationStudy,
  transposedCueStudy,
  voiceBeamStudy,
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
    await t.test(
      'one source head identifies its fret, custom ink and cue through reflow and physical page scaling',
      async () => {
        await page.addScriptTag({ content: 'window.occurrenceStudy=' + headOccurrenceStudy });
        const result = await page.evaluate(() => {
          const { Factory, SVGContext, Publication, ScoreNavigation } = VexFlow;
          const scoreHost = document.querySelector('main'),
            printHost = document.querySelector('aside');
          const spec = occurrenceStudy('guitar');
          const factory = new Factory({ renderer: { elementId: null, width: 1, height: 1 } }).setContext(
            new SVGContext(scoreHost)
          );
          const score = factory.EasyScore().compose(spec);
          function testHits(index, entries) {
            return entries.every(
              (e) =>
                index.hitTest(e.bounds.x + e.bounds.w / 2, e.bounds.y + e.bounds.h / 2)?.sourceHead === e.sourceHead
            );
          }
          // Ink centers in millimeters, measured independently from the browser's actual glyph and transform.
          const ctx = document.createElement('canvas').getContext('2d');
          function matchesInk(page, el, occurrence) {
            const style = getComputedStyle(el);
            ctx.font = style.fontSize + ' ' + style.fontFamily;
            const ink = ctx.measureText(el.textContent);
            const x = +el.getAttribute('x') + (ink.actualBoundingBoxRight - ink.actualBoundingBoxLeft) / 2;
            const y = +el.getAttribute('y') + (ink.actualBoundingBoxDescent - ink.actualBoundingBoxAscent) / 2;
            const mat = page.svg.getScreenCTM().inverse().multiply(el.getScreenCTM());
            const point = new DOMPoint(x, y).matrixTransform(mat);
            const b = occurrence.bounds;
            return Math.abs(point.x - b.x - b.w / 2) < 0.12 && Math.abs(point.y - b.y - b.h / 2) < 0.12;
          }
          const screen = [490, 290].map((width) => {
            score.sheet.setWidth(width);
            factory.draw({ retain: true });
            const nav = new ScoreNavigation(score, spec.staves),
              entries = nav.heads.get('g13', 'string-5');
            return {
              roles: entries.map((e) => e.role).sort(),
              hits: testHits(nav.heads, entries),
              events: nav.events.length,
              spaces: entries.every((e) => e.space === 'score' && e.system === 1),
              all: nav.heads.get('g13').length,
            };
          });
          const printed = [5, 8].map((staffSize) => {
            const page = new Publication(spec).render(printHost, { paper: 'Letter', staffSize }).pages[0];
            const entries = page.heads.get('g13', 'string-5');
            const attacks = JSON.parse(page.svg.querySelector('metadata').textContent).events;
            const samples = entries
              .filter((e) => e.role !== 'mark')
              .map((e) => {
                const isFret = e.role === 'fret';
                const selector = isFret
                  ? '[data-vf-id="vf-tab-g13"] > text'
                  : '[data-vf-id="vf-g13"] .vf-notehead text';
                const nodes = page.svg.querySelectorAll(selector);
                // The bass pitch is entered first on the written staff and last in the TAB chord.
                return matchesInk(page, nodes[isFret ? nodes.length - 1 : 0], e);
              });
            return {
              hits: testHits(page.heads, entries),
              attacks: attacks.map((e) => e.sourceEvent),
              samples,
              spaces: entries.every((e) => e.space === 'page-mm' && e.page === 1),
              width: entries.find((e) => e.role === 'notehead').bounds.w,
            };
          });
          const haydn = occurrenceStudy('quartet');
          const book = new Publication(haydn).render(printHost, {
            paper: 'Letter',
            staves: ['cello'],
            pageBreaks: [23],
            regions: [{ kind: 'cue', staff: 'violin-ii', measure: 23, label: 'Vln. II', scale: 0.65 }],
          });
          const last = book.pages.at(-1),
            [cue] = last.heads.get('vln-23', 0);
          const metadata = JSON.parse(last.svg.querySelector('metadata').textContent);
          return {
            screen,
            printed,
            cue: {
              role: cue.role,
              reference: cue.reference,
              staff: cue.staff,
              sourceStaff: cue.sourceStaff,
              projection: cue.projection,
              page: cue.page,
              measure: cue.measure,
              ink: matchesInk(
                last,
                last.svg.querySelector('[data-region="cue"] [data-vf-id="vf-vln-23"] .vf-notehead text'),
                cue
              ),
              anonymous: last.heads.get(JSON.stringify(['violin-ii', 23, 0, 1]), 0)[0]?.reference,
              hit: testHits(last.heads, [cue]),
              sourceOnly: !metadata.events.some((e) => e.id === 'vln-23'),
            },
            earlier: book.pages.slice(0, -1).flatMap((page) => page.heads.get('vln-23')).length,
          };
        });
        for (const sample of result.screen)
          assert.deepEqual(sample, {
            roles: ['fret', 'mark', 'notehead'],
            hits: true,
            events: 4,
            spaces: true,
            all: 9,
          });
        for (const p of result.printed) {
          assert.ok(p.hits && p.spaces);
          assert.deepEqual(p.samples, [true, true]);
          assert.deepEqual(p.attacks, ['g13', 'melody-1', 'melody-2', 'melody-3']);
        }
        assert.ok(Math.abs(result.printed[1].width / result.printed[0].width - 8 / 5) < 1e-5);
        assert.deepEqual(result.cue, {
          role: 'notehead',
          reference: 'cue',
          staff: 'cello',
          sourceStaff: 'violin-ii',
          projection: true,
          page: 2,
          measure: 23,
          ink: true,
          anonymous: 'cue',
          hit: true,
          sourceOnly: true,
        });
        assert.equal(result.earlier, 0);
      }
    );
    await t.test('local tuplet brackets and independent hand slopes agree on screen and paper', async () => {
      await page.addScriptTag({ content: 'window.voiceBeamStudy=' + voiceBeamStudy });
      const appearances = await page.evaluate(() => {
        const source = voiceBeamStudy();
        const main = document.querySelector('main');
        const host = document.createElement('div');
        main.replaceChildren(host);
        const vf = new VexFlow.Factory({ renderer: { elementId: null, width: 1, height: 1 } }).setContext(
          new VexFlow.SVGContext(host)
        );
        vf.EasyScore().compose(source);
        vf.draw();
        const paper = new VexFlow.Publication(source).render(document.querySelector('aside'), { paper: 'Letter' });
        function appearance(svg) {
          const tuplets = [...svg.querySelectorAll('.vf-tuplet')];
          const heads = [...svg.querySelectorAll('.vf-notehead')].map((el) => el.getBBox().y);
          const middle = (Math.min(...heads) + Math.max(...heads)) / 2;
          return {
            brackets: tuplets.map((el) => el.querySelectorAll('rect:not([opacity="0"])').length),
            above: tuplets.map((el) => Number(el.querySelector('text').getAttribute('y')) < middle),
            beamPaths: [...svg.querySelectorAll('.vf-beam')].map((g) =>
              g.querySelector(':scope > path')?.getAttribute('d')
            ),
          };
        }
        return [appearance(host.querySelector('svg')), appearance(paper.pages[0].svg)];
      });
      for (const view of appearances) {
        assert.deepEqual(view.brackets, [0, 0, 0, 4]);
        assert.deepEqual(view.above, [true, true, false, false]);
        // A beam strip begins at one stem and runs to the opposite stem. Compare the two upper corners.
        const flat = view.beamPaths.map((d) => {
          const [x1, y1, , , , , x2, y2] = d.match(/-?[\d.]+/g).map(Number);
          assert.notEqual(x1, x2);
          return y1 === y2;
        });
        assert.deepEqual(flat, [false, false, true, true], JSON.stringify(view.beamPaths));
      }
    });
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
    await t.test('extracted parts retain only the rhythmic tuplets belonging to their staff', async () => {
      await page.addScriptTag({ content: 'window.sextupletStudy=' + sextupletStudy });
      const frames = await page.evaluate(() => {
        const source = sextupletStudy();
        source.staves.push({ id: 'bass', measures: [1, 2].map(() => ({ voices: [{ notes: 'C3/w' }] })) });
        const book = new VexFlow.Publication(source);
        return ['flute', 'bass'].map((staff) => {
          const printed = book.render(document.querySelector('main'), { staves: [staff], systemBreaks: [2] });
          return printed.pages.flatMap((p) => JSON.parse(p.svg.querySelector('metadata').textContent).spans);
        });
      });
      assert.deepEqual(
        frames[0].map((s) => [s.id, s.part]),
        [
          ['six', 'first'],
          ['six', 'last'],
        ]
      );
      assert.deepEqual(frames[1], []);
    });
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
    await t.test('the extracted guitar and piano parts retain the slur through a forced page turn', async () => {
      await page.addScriptTag({ content: 'window.solea=' + soleaSlurStudy + ';window.friska=' + friskaSlurStudy });
      const results = await page.evaluate(() =>
        [solea(), friska(VexFlow)].map((source) => {
          source.staves.push({
            id: 'other',
            time: source.staves[0].time,
            measures: source.staves[0].measures.map(() => ({
              voices: [{ notes: source.staves[0].time === '2/4' ? 'B4/h/r' : 'B4/q./r' }],
            })),
          });
          const views = [];
          source.engraving = {
            ...source.engraving,
            place(c) {
              views.push(c.sheet.getContinuousLayout().fragments.map((f) => [f.part, f.above, f.strings]));
            },
          };
          const r = new VexFlow.Publication(source).render(document.querySelector('main'), {
            staves: [source.staves[0].id],
            paper: 'Letter',
            pageBreaks: [2],
          });
          return {
            views: views.at(-1),
            spans: r.pages.flatMap((p) => JSON.parse(p.svg.querySelector('metadata').textContent).spans),
            diagnostics: r.diagnostics.filter((d) => d.detail.startsWith('CurveCollision')),
          };
        })
      );
      for (const [i, result] of results.entries()) {
        assert.deepEqual(result.diagnostics, []);
        assert.deepEqual(
          result.views.map((v) => v.slice(0, 2)),
          [
            ['first', true],
            ['last', true],
          ]
        );
        assert.deepEqual(
          result.spans.map((s) => s.part),
          ['first', 'last']
        );
        if (i === 0)
          assert.deepEqual(
            result.spans.map((s) => [s.strings, s.from, s.to]),
            [
              [[4], 'ligado-start', undefined],
              [[4], undefined, 'ligado-end'],
            ]
          );
      }
    });
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
    await t.test('typed and parsed engraving follows each note into independent parts and a slurred cue', async () => {
      const samples = await page.evaluate(() => {
        const { Factory, Publication, StaveNote, Accidental, FretHandFinger, Modifier } = VexFlow;
        return [true, false].map((typed) => {
          // The two sources spell the same chord in opposite orders. Select E by pitch.
          const notes = typed
            ? [
                { id: 'chord', note: { keys: ['e/4', 'c/4'], duration: 'h' } },
                { id: 'answer', note: { keys: ['g/4'], duration: 'h' } },
              ]
            : '(C4 E4)/h[id="chord"], G4/h[id="answer"]';
          const instances = new Set();
          const prepared = [];
          const legacy = [];
          const fragments = [];
          const source = {
            staves: [
              { id: 'solo', measures: [{ voices: [{ notes }] }] },
              { id: 'bass', measures: [{ voices: [{ notes: 'B4/w/r[id="rest"]' }] }] },
            ],
            continuous: { spans: [{ id: 'phrase', kind: 'slur', from: 'chord', to: 'answer' }] },
            engraving: {
              prepareNote({ id }, note) {
                prepared.push(id);
                if (id !== 'chord') return;
                instances.add(note);
                const index = note.getKeys().findIndex((p) => p.toLowerCase() === 'e/4');
                note.addModifier(new Accidental('n'), index);
                note.addModifier(new FretHandFinger('2').setPosition(Modifier.Position.LEFT), index);
              },
              place(score, addMark) {
                const note = score.getElement('chord');
                if (!(note instanceof StaveNote)) return;
                fragments.push(score.sheet.getContinuousLayout().fragments.map((f) => f.id));
                const bounds = { x: note.getAbsoluteX(), y: note.getYs()[0] - 55, w: 6, h: 3 };
                addMark({ source: note, bounds, draw: (ctx) => ctx.fillRect(bounds.x, bounds.y, 6, 3) });
              },
            },
          };
          const host = document.querySelector('aside');
          host.replaceChildren();
          host.id = 'engraving-score';
          const factory = new Factory({ renderer: { elementId: host.id, width: 600, height: 450 } });
          const score = factory.EasyScore().compose(source);
          const counts = [460, 280].map((width) => {
            factory.getContext().clear();
            score.sheet.setWidth(width);
            factory.draw({ retain: true });
            return [
              score.sheet.getEngravingMarks().length,
              host.querySelectorAll('[data-source-event="chord"]').length,
            ];
          });
          const book = new Publication(source);
          function print(staff, cue) {
            const opts = { staves: [staff], noteHooks: [({ id }) => legacy.push(id)] };
            if (cue) opts.regions = [{ kind: 'cue', staff: 'solo', measure: 1, label: 'Solo' }];
            const svg = book.render(document.querySelector('main'), opts).pages[0].svg;
            const g = cue ? svg.querySelector('[data-region="cue"]') : svg;
            const text = Array.from(g.querySelectorAll('text'), (el) => el.textContent);
            return [
              g.querySelectorAll('[data-source-event="chord"]').length,
              text.filter((value) => value === '2').length,
              text.filter((value) => value === VexFlow.Glyphs.accidentalNatural).length,
            ];
          }
          const parts = [print('solo'), print('solo'), print('bass', true)];
          const selected = [...instances].map((n) =>
            n
              .getModifiers()
              .filter((m) => m instanceof Accidental || m instanceof FretHandFinger)
              .map((m) => n.getKeys()[m.getIndex()].toLowerCase())
          );
          return { counts, parts, instances: instances.size, prepared, legacy, fragments, selected };
        });
      });
      for (const sample of samples) {
        assert.deepEqual(sample.counts, [
          [1, 1],
          [1, 1],
        ]);
        assert.deepEqual(sample.parts, Array(3).fill([1, 1, 1]));
        assert.equal(sample.instances, 4);
        assert.deepEqual(sample.selected, Array(4).fill(['e/4', 'e/4']));
        assert.deepEqual(sample.fragments, Array(5).fill(['phrase']));
        assert.deepEqual(sample.prepared, [
          'chord',
          'answer',
          'rest',
          'chord',
          'answer',
          'chord',
          'answer',
          'rest',
          'chord',
          'answer',
        ]);
        assert.deepEqual(sample.legacy, ['chord', 'answer', 'chord', 'answer', 'rest', 'chord', 'answer']);
      }
    });
    await t.test(
      'typed chord fingerings and authored unisons keep their pitch and ink in extracted parts',
      async () => {
        await page.addScriptTag({ content: 'window.headMarksStudy=' + headMarksStudy });
        const result = await page.evaluate(() => {
          const VF = VexFlow;
          const source = headMarksStudy();
          const samples = [];
          source.engraving.place = (score) => {
            const third = (id) => {
              const note = score.getElement(id);
              if (!note) return;
              const digits = note.getModifiers().filter((m) => m instanceof VF.FretHandFinger);
              const art = VF.measureEngraving(note.getModifiers().find((m) => m instanceof VF.Articulation)).ink;
              const heads = note.getHeadInk();
              const stem = note.getStemSegment();
              const above = digits[0].getPosition() === VF.Modifier.Position.ABOVE;
              const boxes = digits
                .map((digit) => {
                  const index = digit.getIndex();
                  const { ink } = VF.measureEngraving(digit);
                  return { key: note.getKeys()[index], label: digit.getText(), y: ink.y, bottom: ink.y + ink.h };
                })
                .sort((a, b) => a.y - b.y);
              const top = Math.min(...heads.map((h) => h.y), stem.tipY, art.y);
              const bottom = Math.max(...heads.map((h) => h.y + h.h), stem.tipY, art.y + art.h);
              return {
                digits: boxes.map(({ key, label }) => [key, label]),
                stacked: boxes[0].bottom < boxes[1].y,
                clear: above ? boxes[1].bottom < top : bottom < boxes[0].y,
              };
            };
            const guitar = score.getElement('sor');
            let clearance;
            if (guitar) {
              const box = (type) => VF.measureEngraving(guitar.getModifiers().find((m) => m instanceof type)).ink;
              const sign = box(VF.Accidental),
                digit = box(VF.FretHandFinger),
                [head] = guitar.getHeadInk();
              clearance = [digit.x - sign.x - sign.w, head.x - digit.x - digit.w];
            }
            samples.push({
              thirds: ['ascending', 'reversed', 'lower-column', 'lower-reversed'].map(third).filter(Boolean),
              clearance,
            });
          };
          const host = document.querySelector('aside');
          const f = new VF.Factory({ renderer: { elementId: null } }).setContext(new VF.SVGContext(host));
          host.replaceChildren(f.getContext().svg);
          const score = f.EasyScore().compose(source);
          for (const w of [650, 395]) {
            score.sheet.setWidth(w);
            f.getContext().clear();
            f.draw({ retain: true });
          }
          const book = new VF.Publication(source);
          const render = (staves) =>
            book.render(document.querySelector('main'), { staves, paper: 'Letter' }).pages[0].svg;
          const written = (svg, id) =>
            Array.from(svg.querySelectorAll('[data-vf-id="vf-' + id + '"] text'), (el) => el.textContent);
          const thirds = written(render(['piano']), 'reversed').filter((s) => /^\d$/.test(s));
          const guitar = render(['guitar']);
          const sor = written(guitar, 'sor');
          const cautionary = written(guitar, 'courtesy').join('');
          const duet = render(['duet']);
          const sharp = (id) => written(duet, id).filter((s) => s === VF.Glyphs.accidentalSharp).length;
          // The written E-sharp and cautionary E become G-double-sharp and cautionary G-sharp in the cue.
          const cuePage = book.render(document.querySelector('main'), {
            staves: ['duet'],
            regions: [
              { kind: 'cue', staff: 'guitar', measure: 1, label: 'Guitar', transpose: { semitones: 4, steps: 2 } },
            ],
          }).pages[0].svg;
          const cue = cuePage.querySelector('[data-region="cue"]');
          const cueSor = written(cue, 'sor');
          const cueCourtesy = written(cue, 'courtesy').join('');
          return {
            samples,
            thirds: thirds.sort(),
            sor: [sor.includes('1'), sor.includes(VF.Glyphs.accidentalSharp)],
            cautionary: cautionary.includes(
              VF.Glyphs.accidentalParensLeft + VF.Glyphs.accidentalNatural + VF.Glyphs.accidentalParensRight
            ),
            cue: [
              cueSor.includes('1'),
              cueSor.includes(VF.Glyphs.accidentalDoubleSharp),
              cueCourtesy.includes(
                VF.Glyphs.accidentalParensLeft + VF.Glyphs.accidentalSharp + VF.Glyphs.accidentalParensRight
              ),
            ],
            unison: [sharp('automatic'), sharp('forced'), sharp('plain-1') + sharp('plain-2')],
          };
        });
        const piano = result.samples.filter((s) => s.thirds.length);
        assert.ok(piano.length >= 3);
        for (const sample of piano) {
          for (const third of sample.thirds) assert.ok(third.clear && third.stacked, JSON.stringify(third));
          assert.deepEqual(
            sample.thirds.map((s) => s.digits),
            [
              [
                ['d#/5', '4'],
                ['b/4', '1'],
              ],
              [
                ['d#/5', '4'],
                ['b/4', '1'],
              ],
              [
                ['e/5', '5'],
                ['c#/5', '2'],
              ],
              [
                ['e/5', '5'],
                ['c#/5', '2'],
              ],
            ]
          );
        }
        const sor = result.samples.filter((s) => s.clearance);
        assert.ok(sor.length >= 3);
        for (const { clearance } of sor)
          assert.ok(
            clearance.every((gap) => gap >= 2),
            JSON.stringify(clearance)
          );
        assert.deepEqual(result.thirds, ['1', '4']);
        assert.deepEqual(result.sor, [true, true]);
        assert.ok(result.cautionary);
        assert.deepEqual(result.unison, [0, 1, 1]);
        assert.deepEqual(result.cue, [true, true, true]);
      }
    );
    await t.test('resizing a canvas to sheet height includes the registered ink below the last system', async () => {
      const result = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.id = 'mark-canvas';
        document.querySelector('aside').replaceChildren(canvas);
        const factory = new VexFlow.Factory({
          renderer: { elementId: canvas.id, width: 400, height: 200, backend: VexFlow.Renderer.Backends.CANVAS },
        });
        let addProofMark = false;
        let draws = 0;
        const score = factory.EasyScore().compose({
          staves: [{ id: 'solo', measures: [{ voices: [{ notes: 'C4/w[id="a"]' }] }] }],
          engraving: {
            place(score, addMark) {
              if (!addProofMark) return;
              const source = score.getNote('a');
              const last = score.sheet.getRows().at(-1);
              const bounds = { x: source.getAbsoluteX(), y: last.y + last.height + 10, w: 3, h: 3 };
              addMark({
                source,
                bounds,
                draw(ctx) {
                  draws++;
                  ctx.fillRect(bounds.x, bounds.y, 3, 3);
                },
              });
            },
          },
        });
        score.sheet.format();
        const unmarked = score.sheet.getHeight();
        addProofMark = true;
        score.sheet.format();
        const height = score.sheet.getHeight();
        const ctx = factory.getContext();
        ctx.resize(400, height);
        factory.draw({ retain: true });
        const { x, y } = score.sheet.getEngravingMarks()[0].bounds;
        const alpha = canvas.getContext('2d').getImageData(Math.ceil(x), Math.ceil(y), 1, 1).data[3];
        addProofMark = false;
        score.sheet.format();
        return { extra: height - unmarked, restored: score.sheet.getHeight() === unmarked, draws, alpha };
      });
      assert.deepEqual(result, { extra: 13, restored: true, draws: 1, alpha: 255 });
    });
    await t.test('a custom mark stays on its source page even when its ink reaches the next system', async () => {
      const pages = await page.evaluate(() => {
        const source = {
          continuous: { verticalSpacing: 'profile' },
          staves: [
            { id: 'solo', measures: ['a', 'b'].map((id) => ({ voices: [{ notes: 'C4/w[id="' + id + '"]' }] })) },
          ],
          engraving: {
            place(score, addMark) {
              const source = score.getNote('a');
              const bounds = { x: source.getAbsoluteX(), y: score.getNote('b').getYs()[0], w: 8, h: 10 };
              addMark({ source, bounds, draw: (ctx) => ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h) });
            },
          },
        };
        return new VexFlow.Publication(source)
          .render(document.querySelector('main'), { pageBreaks: [2] })
          .pages.map(({ svg }) =>
            Array.from(svg.querySelectorAll('[data-source-event]'), (el) =>
              el.closest('[data-system]').getAttribute('data-system')
            )
          );
      });
      assert.deepEqual(pages, [['1'], []]);
    });
    await t.test(
      'system text lanes follow the reflowed music and timed directions remain selectable in parts',
      async () => {
        await page.addScriptTag({ content: 'window.textLaneStudy=' + textLaneStudy });
        for (const backend of ['SVG', 'CANVAS']) {
          const frames = await page.evaluate((backend) => {
            const { Factory, Renderer, Annotation, ScoreNavigation, Publication } = VexFlow;
            const host = document.querySelector('aside');
            const make = (kind) => {
              const target = document.createElement(backend === 'SVG' ? 'div' : 'canvas');
              host.replaceChildren(target);
              target.id = 'lanes';
              const factory = new Factory({
                renderer: { elementId: target.id, backend: Renderer.Backends[backend], width: 900, height: 600 },
              });
              const source = textLaneStudy(kind);
              const score = factory.EasyScore().compose(source);
              const draw = (width) => {
                factory.getContext().clear();
                score.sheet.setWidth(width);
                factory.draw({ retain: true });
                return score.sheet.getContinuousLayout().fragments;
              };
              const word = (id, text) =>
                score
                  .getNote(id)
                  .getModifiers()
                  .find((m) => m instanceof Annotation && m.text === text);
              const ink = (mark) => mark.getTextInk(mark.computeX().x, mark.computeY().y);
              return { score, source, draw, word, ink };
            };
            const blues = make('blues');
            const verses = [720, 210, 720].map((width) => {
              const fs = blues.draw(width),
                gyp = blues.word('a3', 'Gyp'),
                sy = blues.word('b0', 'sy');
              const syllables = [
                ...['I', 'hate', 'to', 'see'].map((t, i) => blues.word('a' + i, t)),
                ...['Been', 'to', 'de', 'Gyp'].map((t, i) => blues.word('a' + i, t)),
              ];
              const ys = syllables.map((m) => m.computeY().y);
              const hyphens = fs.filter((f) => f.kind === 'hyphen'),
                extenders = fs.filter((f) => f.kind === 'lyric');
              const start = hyphens[0],
                end = hyphens.at(-1);
              return {
                ys,
                clear: start.x1 > blues.ink(gyp).x + blues.ink(gyp).w && end.x2 < blues.ink(sy).x,
                attached: start.y1 === gyp.computeY().y && end.y2 === sy.computeY().y,
                hyphens: hyphens.map((f) => f.part),
                extenders: extenders.map((f) => f.part),
                distinct: extenders.at(-1).y2 < end.y2 - 6,
              };
            });
            const guitar = make('guitar');
            const harmony = [720, 210, 720].map((width) => {
              const slurs = guitar.draw(width).filter((f) => f.kind === 'slur');
              return {
                slurs,
                chords: ['G13', 'C6'].map((t, i) => ({
                  ...guitar.ink(guitar.word('bass' + i, t)),
                  yBase: guitar.word('bass' + i, t).computeY().y,
                })),
              };
            });
            const direction = make('direction');
            direction.draw(720);
            const nav = new ScoreNavigation(direction.score, direction.source.staves);
            const event = nav.events.find((e) => e.id === 'instruction'),
              box = nav.regions.find((e) => e.id === event.id);
            const note = direction.score.getNote('instruction'),
              stave = note.checkStave();
            const start = direction.score.getNote('start').getBoundingBox(),
              end = direction.score.getNote('end').getBoundingBox();
            const center = note.getAbsoluteX() + note.checkTickContext().getMetrics().glyphPx / 2;
            const book = new Publication(direction.source).render(document.querySelector('main'), {
              staves: ['lower'],
              paper: 'Letter',
            });
            const printed = book.pages[0].svg.querySelector('[data-vf-id="vf-instruction"]');
            const rect = printed.querySelector('rect');
            const meta = JSON.parse(book.pages[0].svg.querySelector('metadata').textContent).events.find(
              (e) => e.id === 'instruction'
            );
            return {
              verses,
              harmony,
              event,
              hit: nav.hitTest(box.x + box.w / 2, box.y + box.h / 2)?.id,
              centerError: Math.abs(box.x + box.w / 2 - center),
              edges: [start.x - stave.getNoteStartX(), end.x + end.w - stave.getNoteEndX()],
              printed: [
                printed.querySelector('text').textContent,
                Number(rect.getAttribute('width')),
                rect.getAttribute('pointer-events'),
              ],
              diagnostics: book.diagnostics,
              printedTiming: [meta.onset, meta.ticks, meta.anchor, meta.staff],
            };
          }, backend);
          const [wide, narrow, again] = frames.verses;
          assert.deepEqual(wide, again);
          for (const verse of [wide, narrow]) {
            assert.equal(new Set(verse.ys.slice(0, 4)).size, 1);
            assert.equal(new Set(verse.ys.slice(4)).size, 1);
            assert.ok(verse.ys[4] > verse.ys[0] + 6 && verse.clear && verse.attached && verse.distinct);
          }
          assert.deepEqual(wide.hyphens, ['single']);
          assert.deepEqual(narrow.hyphens, ['first', 'last']);
          assert.deepEqual(narrow.extenders, ['first', 'last']);
          assert.deepEqual(frames.harmony[0], frames.harmony[2]);
          assert.equal(frames.harmony[0].chords[0].yBase, frames.harmony[0].chords[1].yBase);
          const { curveParts } = await import(new URL('../../build/esm/src/continuousspan.js', import.meta.url));
          for (const { slurs, chords } of frames.harmony) {
            chords.forEach((chord, i) => {
              const slur = slurs.length === 1 ? slurs[0] : slurs[i];
              assert.ok(
                chord.y + chord.h < Math.min(...curveParts(slur).map((b) => b.y)),
                'guitar harmony clears the complete slur'
              );
            });
          }
          assert.equal(frames.hit, 'instruction');
          assert.deepEqual([frames.event.onset, frames.event.duration, frames.event.voice], ['1/4', '1/2', 2]);
          assert.ok(frames.centerError < 2 && frames.edges.every((edge) => Math.abs(edge) < 0.01));
          assert.deepEqual(frames.printedTiming, ['4096/1', '8192/1', 'beat', 'lower']);
          assert.equal(frames.printed[0], 'il basso sempre stacc.');
          assert.ok(frames.printed[1] > 10);
          assert.equal(frames.printed[2], 'auto');
          assert.deepEqual(frames.diagnostics, []);
        }
      }
    );
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
    await t.test('Letter page turns retain the Ballade ossia, pedal and physical margins', async () => {
      await page.addScriptTag({ content: 'window.balladeSpacingStudy=' + balladeSpacingStudy });
      const result = await page.evaluate(() => {
        const source = balladeSpacingStudy();
        const publication = new VexFlow.Publication(source);
        const view = {
          paper: 'Letter',
          margins: { top: 16, bottom: 18, left: 16, right: 16 },
          pageNumbers: false,
          systemGap: 8,
          maxExtraGap: 0,
          staves: ['upper', 'lower'],
          regions: [{ kind: 'ossia', staff: 'ossia', measure: 1, label: 'Ossia' }],
        };
        const frame = (pageBreaks) => {
          const r = publication.render(document.querySelector('main'), { ...view, pageBreaks });
          return {
            diagnostics: r.diagnostics,
            pages: r.pages.map((p) => ({
              systems: p.systems,
              regions: p.svg.querySelectorAll('[data-region="ossia"]').length,
            })),
          };
        };
        return { same: frame([]), split: frame([2]) };
      });
      const { same, split } = result;
      assert.deepEqual(same.diagnostics, []);
      assert.deepEqual(split.diagnostics, []);
      assert.equal(same.pages.length, 1);
      assert.deepEqual(
        split.pages.map((p) => p.regions),
        [1, 0]
      );
      const [first, second] = same.pages[0].systems;
      assert.ok(second.y < first.y + first.height + 8, 'neighbouring systems share unused vertical space');
      assert.equal(split.pages[1].systems[0].y, first.y);
      for (const page of split.pages) {
        assert.ok(page.systems.every((s) => s.y >= 16 && s.y + s.height <= 279.4 - 18));
      }
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
