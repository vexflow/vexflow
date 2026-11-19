// Contracts for single-source continuous scores, hard breaks and retained row-dependent notation.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer';
import { createCanvas, registerFont } from 'canvas';
import { makeContinuousStudy, tabEndingStudy } from '../engraving/continuous-studies.mjs';
const VF = await import(new URL('../../build/esm/entry/vexflow-core.js', import.meta.url));
for (const family of ['Bravura', 'Academico']) {
  const name = family.toLowerCase();
  registerFont(new URL('../../node_modules/@vexflow-fonts/' + name + '/' + name + '.otf', import.meta.url).pathname, {
    family,
  });
}
VF.Element.setTextMeasurementCanvas(createCanvas(1, 1));
function factory() {
  const canvas = createCanvas(960, 1100),
    ctx = canvas.getContext('2d');
  const f = new VF.Factory({ renderer: { elementId: null, width: 960, height: 1100 } }).setContext(
    new VF.CanvasContext(ctx)
  );
  return { f, ctx, canvas };
}
function scene(kind, width, mode) {
  const { f, ctx, canvas } = factory(),
    c = makeContinuousStudy(VF, f, kind, width, mode),
    l = c.sheet.getContinuousLayout();
  const frame = (w) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    c.sheet.setWidth(w);
    f.draw({ retain: true });
    return {
      rows: l.rows.map((r) => ({ m: r.measures, v: r.visibleStaves, w: r.width, h: r.height, rest: r.restGroups })),
      fragments: structuredClone(l.fragments),
      diagnostics: structuredClone(l.diagnostics),
      pixels: canvas.toBuffer(),
    };
  };
  return { f, c, l, frame };
}
test('vocal phrase retains IDs; three fragments reunite at the original width with identical pixels', () => {
  const { c, l, frame } = scene('choir', 740),
    head = c.getNote('v00');
  const wide = frame(740);
  assert.equal(wide.rows.length, 1);
  const narrow = frame(260);
  assert.deepEqual(
    narrow.rows.map((r) => r.m),
    [
      [1, 2],
      [3, 4],
      [5, 6],
    ]
  );
  for (const id of ['sung-word', 'phrase'])
    assert.deepEqual(
      l.fragments.filter((f) => f.id === id).map((f) => f.part),
      ['first', 'middle', 'last']
    );
  const endSigns = c.staves[1][0].getModifiers(VF.StaveModifier.Position.END, VF.KeySignature.CATEGORY);
  assert.equal(endSigns.length, 1);
  assert.deepEqual(narrow.diagnostics, []);
  assert.equal(head, c.getNote('v00'));
  assert.deepEqual(frame(740), wide);
  assert.equal(c.staves[1][0].getModifiers(VF.StaveModifier.Position.END, VF.KeySignature.CATEGORY).length, 0);
});
test('balanced width avoids the greedy last-measure row on the same seven measures', () => {
  const greedy = scene('breaks', 415, 'greedy').frame(415),
    balanced = scene('breaks', 415, 'balanced').frame(415);
  assert.deepEqual(
    greedy.rows.map((r) => r.m.length),
    [6, 1]
  );
  assert.deepEqual(
    balanced.rows.map((r) => r.m.length),
    [3, 4]
  );
  assert.deepEqual(
    balanced.rows.flatMap((r) => r.m),
    greedy.rows.flatMap((r) => r.m)
  );
});
test('grand-staff drawing preserves cross-staff stem joins and wedge aperture across redraw', () => {
  const { c, frame } = scene('keyboard', 490);
  const wide = frame(490),
    n = c.getNote('cross'),
    staff = c.staves[0][1],
    beam = n.getBeam();
  assert.equal(n.getStave(), staff);
  assert.ok(beam.getStripBounds().every((b) => Number.isFinite(b.y)));
  const parts = wide.fragments.filter((f) => f.kind === 'crescendo');
  assert.deepEqual(
    parts.map((f) => f.part),
    ['first', 'last']
  );
  assert.equal(parts[0].progress[1], parts[1].progress[0]);
  assert.equal(parts[0].progress[0], 0);
  assert.equal(parts[1].progress[1], 1);
  assert.deepEqual(
    c.staves[0].map((s) => s.getY()),
    c.staves[1].map((s) => s.getY())
  );
  frame(300);
  assert.deepEqual(frame(490), wide);
  assert.equal(n.getStave(), staff);
});
test('silent staves return with their names and a compressed run retains its measure identities', () => {
  const { c, frame } = scene('ensemble', 430);
  const { rows, diagnostics } = frame(430);
  assert.deepEqual(diagnostics, []);
  assert.deepEqual(
    rows.map((r) => r.v),
    [['fl'], ['fl', 'vc']]
  );
  assert.deepEqual(rows[0].rest, [[2, 3, 4]]);
  assert.equal(c.notes.length, 6);
  assert.ok(c.notes[2][1][0][0].isRest());
  assert.equal(c.staves[4][1].getModifiers()[0].getType(), VF.Barline.type.REPEAT_BEGIN);
  assert.equal(c.staves[5][0].getModifiers()[1].getType(), VF.Barline.type.REPEAT_END);
});
function spec(count, continuous, notes = (i) => [{ id: 'n' + i, note: { keys: ['c/5'], duration: 'w' } }]) {
  return {
    staves: [{ id: 'staff', measures: Array.from({ length: count }, (_, i) => ({ voices: [{ notes: notes(i) }] })) }],
    continuous,
  };
}
test('hard keeps overflow together and forced breaks win over spare space', () => {
  const { f } = factory();
  const c = f.EasyScore().compose(
    spec(4, {
      boundaries: [
        { measure: 2, breakBefore: 'keep' },
        { measure: 3, breakBefore: 'force' },
        { measure: 4, breakBefore: 'keep' },
      ],
    })
  );
  const l = c.sheet.getContinuousLayout();
  c.sheet.setWidth(12).format();
  assert.deepEqual(
    l.rows.map((r) => r.measures),
    [
      [1, 2],
      [3, 4],
    ]
  );
  assert.deepEqual(
    l.diagnostics.map((d) => d.code),
    ['RowOverflow', 'RowOverflow']
  );
  assert.ok(l.rows.every((r) => r.overflow > 0));
  c.sheet.setWidth(800).format();
  assert.deepEqual(
    l.rows.map((r) => r.measures),
    [
      [1, 2],
      [3, 4],
    ]
  );
  assert.deepEqual(l.diagnostics, []);
});
test('span families retain the source anchors and continuous parameter at first, middle and final fragments', () => {
  for (const kind of [
    'tie',
    'slur',
    'crescendo',
    'diminuendo',
    'pedal',
    'lyric',
    'hyphen',
    'volta',
    'ottava',
    'trill',
    'tuplet',
  ]) {
    const { f } = factory(),
      c = f.EasyScore().compose(
        spec(3, {
          spans: [{ id: 's', kind, from: 'n0', to: 'n2' }],
          boundaries: [
            { measure: 2, breakBefore: 'force' },
            { measure: 3, breakBefore: 'force' },
          ],
        })
      );
    f.draw({ retain: true });
    const l = c.sheet.getContinuousLayout(),
      fs = l.fragments;
    assert.deepEqual(l.diagnostics, [], kind);
    assert.deepEqual(
      fs.map((f) => f.part),
      ['first', 'middle', 'last'],
      kind
    );
    assert.ok(fs.every((f) => f.id === 's' && f.x1 < f.x2 && Number.isFinite(f.y1 + f.y2)));
    for (let i = 1; i < fs.length; i++) assert.equal(fs[i - 1].progress[1], fs[i].progress[0]);
  }
});
test('tab ties stay on the selected string through reflow and leave a visible incoming curve', () => {
  for (const selectors of [{ string: 2 }, { fromHead: 1 }, { toHead: 0 }, { fromHead: 1, toHead: 0 }, {}]) {
    const source = tabEndingStudy();
    const tie = source.continuous.spans[0];
    delete tie.fromHead;
    Object.assign(tie, selectors);
    const string = Object.keys(selectors).length ? 2 : 1;
    const { f } = factory();
    const score = f.EasyScore().compose(source);
    const layout = score.sheet.getContinuousLayout();
    function frame(width) {
      score.sheet.setWidth(width);
      f.draw({ retain: true });
      assert.deepEqual(layout.diagnostics, []);
      return structuredClone(layout.fragments);
    }
    const wide = frame(420);
    assert.deepEqual(
      wide.map((f) => f.part),
      ['single', 'single']
    );
    const narrow = frame(122);
    for (const kind of ['tie', 'volta'])
      assert.deepEqual(
        narrow.filter((f) => f.kind === kind).map((f) => f.part),
        ['first', 'last']
      );
    for (const f of narrow.filter((f) => f.kind === 'tie')) {
      const stave = score.staves[f.row][0];
      assert.deepEqual(f.strings, [string]);
      assert.ok(f.x2 - f.x1 >= stave.space(1), 'visible tie on each side of the break');
      const line = stave.getYForLine(string - 1);
      assert.ok(f.y1 < line && f.y1 > line - stave.space(0.5));
      assert.equal(f.y1, f.y2);
    }
    assert.deepEqual(frame(420), wide);
  }
});

test('tab ties reject unmatched strings, frets and invalid chord positions before drawing', () => {
  for (const selectors of [{ string: 7 }, { string: 3 }, { fromHead: -1 }, { toHead: 2 }, { fromHead: 1, toHead: 1 }]) {
    const source = tabEndingStudy();
    Object.assign(source.continuous.spans[0], selectors);
    assert.throws(() => factory().f.EasyScore().compose(source), /tab tie/i);
  }
  const source = tabEndingStudy();
  source.staves[0].measures[1].voices[0].notes[0].tab.positions[0] = { str: 2, fret: 11 };
  assert.throws(() => factory().f.EasyScore().compose(source), /same string and fret/);
});
test('boundary key, clef and meter move together; explicit signs survive and returned tied accidentals reflow', () => {
  const { f } = factory(),
    es = f.EasyScore();
  const s = spec(2, { spans: [{ id: 'tie', kind: 'tie', from: 'n0', to: 'n1' }] }, (i) => [
    { id: 'n' + i, note: { keys: ['f#/4'], duration: 'w' } },
  ]);
  s.accidentals = 'key-aware';
  const c = es.compose(s),
    n = c.getNote('n1'),
    l = c.sheet.getContinuousLayout();
  const mods = () => n.getModifiers().filter((m) => m instanceof VF.Accidental);
  c.sheet.setWidth(680).format();
  assert.equal(mods().length, 0);
  c.sheet.setWidth(128).format();
  assert.equal(l.rows.length, 2);
  assert.equal(mods().length, 1);
  const explicit = f.Accidental({ type: 'n' }).setAsCautionary();
  n.addModifier(explicit, 0);
  c.sheet.setWidth(680).format();
  assert.deepEqual(mods(), [explicit]);
  const other = factory().f.EasyScore();
  const boundary = spec(2, {});
  boundary.staves[0].measures[0].key = 'D';
  Object.assign(boundary.staves[0].measures[1], { key: 'F', clef: 'bass', time: '2/2' });
  const b = other.compose(boundary);
  b.sheet.setWidth(145).format();
  const signs = (pos) => b.staves[0][0].getModifiers(pos).map((m) => m.getCategory());
  for (const cat of [VF.Clef.CATEGORY, VF.KeySignature.CATEGORY, VF.TimeSignature.CATEGORY])
    assert.ok(signs(VF.StaveModifier.Position.END).includes(cat), cat);
  b.sheet.setWidth(800).format();
  assert.deepEqual(signs(VF.StaveModifier.Position.END), [VF.Barline.CATEGORY]);
});
test('structural marks interrupt rest compression; navigation targets and span heads validate atomically', () => {
  const { f } = factory(),
    es = f.EasyScore(),
    rest = () => [{ note: { keys: ['b/4'], duration: 'wr' } }];
  const c = es.compose(
    spec(
      7,
      {
        compressRests: true,
        boundaries: [
          { measure: 4, navigation: { kind: 'segno', id: 'sign' } },
          { measure: 7, navigation: { kind: 'dalSegno', target: 'sign' } },
        ],
      },
      rest
    )
  );
  c.sheet.setWidth(850).format();
  assert.deepEqual(
    c.sheet.getContinuousLayout().rows.flatMap((r) => r.restGroups),
    [
      [2, 3],
      [5, 6],
    ]
  );
  for (const config of [
    { spans: [{ id: 's', kind: 'tie', from: 'n0', to: 'n1', toHead: 5 }] },
    { boundaries: [{ measure: 1, navigation: { kind: 'toCoda', target: 'missing' } }] },
    { boundaries: [{ measure: 3 }] },
  ]) {
    const fresh = factory().f.EasyScore();
    assert.throws(() => fresh.compose(spec(2, config)));
    assert.equal(fresh.getElement('n0'), undefined);
  }
});

test('the shared stem and arpeggio follow the two native heads at each width', () => {
  const { c, frame } = scene('chord', 375);
  const wide = frame(375);
  assert.deepEqual(wide.diagnostics, []);
  const top = c.getNote('rh00'),
    bottom = c.getNote('lh00'),
    stroke = top.getModifiers().find((m) => m instanceof VF.Stroke);
  assert.equal(top.getStemX(), bottom.getStemX());
  const ink = stroke.getBoundingBox();
  assert.ok(ink.y <= top.getYs()[0] && ink.y + ink.h >= bottom.getYs()[0]);
  frame(160);
  assert.deepEqual(frame(375), wide);
});
test('instrument changes survive hiding and reflow and the new full name reserves row-start width', () => {
  const s = spec(3, { boundaries: [{ measure: 2, breakBefore: 'force' }] });
  s.staves[0].name = 'Flute';
  s.staves[0].shortName = 'Fl.';
  s.staves[0].measures[1].instrument = { name: 'Bass clarinet in B-flat', shortName: 'B. cl.' };
  const c = factory().f.EasyScore().compose(s);
  c.sheet.setWidth(165).format();
  assert.ok(c.staves[1][0].getX() > c.staves[0][0].getX() + 30);
  assert.ok(c.staves[2][0].getX() < c.staves[1][0].getX());
});

test('choir, piano and ensemble reflow in browser SVG and Canvas with two font pairs', async () => {
  const browser = await puppeteer.launch({ headless: true, args: process.env.CI ? ['--no-sandbox'] : [] });
  try {
    const page = await browser.newPage();
    await page.setContent('<body></body>');
    await page.addScriptTag({ path: new URL('../../build/cjs/vexflow-debug.js', import.meta.url).pathname });
    await page.addScriptTag({ content: 'window.makeContinuousStudy=' + makeContinuousStudy.toString() });
    for (const family of ['Bravura', 'Academico', 'Petaluma', 'Petaluma Script']) {
      const name = family.toLowerCase().replaceAll(' ', '');
      const data = await readFile(
        new URL('../../node_modules/@vexflow-fonts/' + name + '/' + name + '.woff2', import.meta.url)
      );
      await page.evaluate(
        async (family, data) =>
          document.fonts.add(await new FontFace(family, 'url(data:font/woff2;base64,' + data + ')').load()),
        family,
        data.toString('base64')
      );
    }
    for (const backend of ['svg', 'canvas'])
      for (const kind of ['choir', 'keyboard', 'ensemble'])
        for (const family of ['Bravura', 'Petaluma']) {
          const output = await page.evaluate(
            ({ backend, kind, family }) => {
              const VF = window.VexFlow;
              VF.setFonts(family, family === 'Bravura' ? 'Academico' : 'Petaluma Script');
              const target = document.createElement(backend === 'svg' ? 'div' : 'canvas');
              target.id = 'study';
              document.body.replaceChildren(target);
              const f = new VF.Factory({ renderer: { elementId: 'study', width: 850, height: 1200 } });
              const c = window.makeContinuousStudy(VF, f, kind, 740),
                layout = c.sheet.getContinuousLayout();
              return [740, 270, 740].map((w) => {
                f.getContext().clear();
                c.sheet.setWidth(w);
                f.draw({ retain: true });
                const geometry = layout.rows.map((r) => [r.measures, r.visibleStaves, r.height, r.width]);
                const drawn =
                  backend === 'svg'
                    ? target.querySelectorAll('path,text').length > 0
                    : target
                        .getContext('2d')
                        .getImageData(0, 0, 850, 1200)
                        .data.some((v, i) => i % 4 === 3 && v > 0);
                return {
                  geometry,
                  fragments: structuredClone(layout.fragments),
                  diagnostics: structuredClone(layout.diagnostics),
                  drawn,
                };
              });
            },
            { backend, kind, family }
          );
          assert.deepEqual(output[0], output[2], backend + ' ' + kind + ' ' + family);
          assert.notDeepEqual(output[0].geometry, output[1].geometry);
          for (const frame of output) {
            assert.ok(frame.drawn);
            assert.deepEqual(frame.diagnostics, [], backend + ' ' + kind + ' ' + family);
          }
        }
  } finally {
    await browser.close();
  }
});
