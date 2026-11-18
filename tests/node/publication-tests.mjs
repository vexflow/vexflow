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
          const { diagnostics, ranges, media, metadata, ids, boxes, footerTops, systemGap, printed, geometry, svg } =
            await page.evaluate(
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
                  // In this edition the last two furniture elements are the footer and the page number.
                  footerTops: roots.map((root) =>
                    Math.min(
                      ...Array.from(root.querySelector('[data-page-furniture]').children)
                        .slice(-2)
                        .map((el) => el.getBBox().y)
                    )
                  ),
                  systemGap: options.systemGap,
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
          const ends = ranges.map((r) => r.at(-1));
          if (part) assert.deepEqual(ends, [16, 26]);
          else if (paper === 'A4') assert.deepEqual(ends, [12, 24, 26]);
          else {
            // Bars 17–20 are close to the Letter page limit. Font ink metrics differ across browser hosts.
            const middle = boxes.flat().filter((s) => s.measures[0] >= 9 && s.measures[0] <= 17);
            assert.deepEqual(
              middle.map((s) => s.measures[0]),
              [9, 13, 17]
            );
            const needed = middle.reduce((height, s) => height + s.height, 2 * systemGap);
            const available = footerTops[1] - 4 - boxes[1][0].y; // Reserve 4 mm above the footer.
            assert.deepEqual(
              ends,
              [8, needed <= available ? 20 : 16, 26],
              `Middle three systems need ${needed.toFixed(2)} mm in ${available.toFixed(2)} mm`
            );
          }
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
  const { paginate } = await import('../../build/esm/src/pagebreaks.js');
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
