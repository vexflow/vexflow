// Browser contracts for physical pages, independent parts and the portable print adapter.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import puppeteer from 'puppeteer';
import { publicationStudy } from '../engraving/publication-studies.mjs';

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
