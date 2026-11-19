// Chord typography invariants using real fonts and the same layout for Canvas and SVG.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createCanvas, registerFont } from 'canvas';
import { JSDOM } from 'jsdom';

const VF = await import(new URL('../../build/esm/entry/vexflow-core.js', import.meta.url));
const { ChordSymbol, Element, StaveNote } = VF;
const { Glyphs } = VF.VexFlow;
for (const [family, file] of [
  ['Academico', 'academico/academico'],
  ['Bravura', 'bravura/bravura'],
  ['Petaluma Script', 'petalumascript/petalumascript'],
  ['Petaluma', 'petaluma/petaluma'],
])
  registerFont(new URL(`../../node_modules/@vexflow-fonts/${file}.otf`, import.meta.url).pathname, { family });
Element.setTextMeasurementCanvas(createCanvas(1, 1));
const sup = { symbolModifier: ChordSymbol.symbolModifiers.SUPERSCRIPT };
const sub = { symbolModifier: ChordSymbol.symbolModifiers.SUBSCRIPT };
const state = () => ({ leftShift: 0, rightShift: 0, topTextLine: 0, textLine: 0 });
const close = (a, b, tolerance = 0.04) => assert.ok(Math.abs(a - b) < tolerance, `${a} ≈ ${b}`);

/** Attach a real note so normal formatter width accounting is exercised. */
function chord(mode = 'auto', family = 'Academico,Bravura', size = VF.Metrics.getFontInfo('ChordSymbol').size) {
  const symbol = new ChordSymbol().setFont(family, size).setKerning(mode);
  new StaveNote({ keys: ['c/5'], duration: 'q' }).addModifier(symbol, 0);
  return symbol;
}
function format(symbol) {
  ChordSymbol.format([symbol], state());
  return symbol;
}
const diminished = (symbol) => symbol.addText('A').addGlyph('diminished', sup);

for (const family of ['Academico,Bravura', 'Petaluma Script,Petaluma']) {
  test(`${family}: auto tightens A diminished; none preserves legacy advances`, () => {
    const legacy = format(diminished(chord('none', family)));
    const auto = format(diminished(chord('auto', family)));
    assert.ok(auto.getWidth() < legacy.getWidth());
    assert.equal(legacy.getKerning(), 'none');
    close(
      legacy.getWidth(),
      legacy.symbolBlocks.reduce((sum, block) => sum + block.getWidth() + ChordSymbol.minPadding, 0)
    );
    assert.equal(auto.kernedRuns[0].font.family, family.split(',')[0]);
    assert.equal(auto.kernedRuns[1].font.family, family.split(',')[1]);
  });

  test(`${family}: all root/glyph fixtures have finite, contained ink bounds`, () => {
    for (const root of 'ABCDEFG')
      for (const glyph of ['diminished', 'halfDiminished', 'majorSeventh', '#', 'b']) {
        const symbol = format(chord('auto', family).addText(root).addGlyph(glyph, sup));
        const bounds = symbol.getBoundingBox();
        assert.ok([bounds.x, bounds.y, bounds.w, bounds.h, symbol.getWidth()].every(Number.isFinite));
        assert.ok(bounds.x >= -0.001 && bounds.x + bounds.w <= symbol.getWidth() + 0.001);
      }
  });

  test(`${family}: sizes and repeated formatting do not accumulate shifts`, () => {
    const small = format(diminished(chord('auto', family, 12)));
    const large = format(diminished(chord('auto', family, 24)));
    // Ink extents can round to whole pixels (Pango on Linux), so test the em-based
    // spacing independently of native glyph advances and the left-overhang shift.
    const gap = (symbol) => {
      const [root, script] = symbol.kernedRuns;
      return script.x - root.x - root.metrics.width;
    };
    close(gap(large), gap(small) * 2);
    small.kernedRuns.forEach((run, i) => {
      close(
        VF.Font.convertSizeToPixelValue(large.kernedRuns[i].font.size),
        VF.Font.convertSizeToPixelValue(run.font.size) * 2
      );
      close(large.kernedRuns[i].y, run.y * 2);
    });
    const before = JSON.stringify(large.kernedRuns);
    const box = large.getBoundingBox();
    box.mergeWith(new VF.BoundingBox(-1000, -1000, 1, 1));
    for (let i = 0; i < 3; i++) format(large);
    assert.equal(JSON.stringify(large.kernedRuns), before);
    assert.ok(large.getBoundingBox().x >= 0, 'bounds queries never mutate run metrics');
    small.setFontSize(24);
    format(small);
    close(small.getWidth(), large.getWidth());
  });
}

test('text spans retain native shaping and adjacent text fragments can form one run', () => {
  const symbol = format(chord().addText('F').addText('maj7'));
  assert.equal(symbol.kernedRuns.length, 1);
  assert.equal(symbol.kernedRuns[0].text, 'Fmaj7');
  const combined = format(chord().addGlyphOrText('C#7'));
  assert.deepEqual(
    combined.kernedRuns.map((run) => run.text),
    ['C', Glyphs.csymAccidentalSharp, '7']
  );
});

test('stacked script groups share an anchor and the next group clears both advances', () => {
  for (const [first, second] of [
    [sup, sub],
    [sub, sup],
  ]) {
    const symbol = format(
      chord().addText('F7').addGlyphOrText('b9', first).addGlyphOrText('#11', second).addText('sus4')
    );
    const runs = symbol.kernedRuns;
    close(runs[1].x, runs[3].x);
    const end = Math.max(...runs.slice(1, -1).map((run) => run.x + run.metrics.width));
    assert.ok(runs[runs.length - 1].x > end);
    const before = JSON.stringify(runs);
    format(symbol);
    assert.equal(JSON.stringify(symbol.kernedRuns), before);
  }
});

test('unsupported fonts and styles retain the legacy layout', () => {
  for (const [family, weight, style] of [
    ['Arial,Bravura', 'normal', 'normal'],
    ['Academico,Bravura', 'bold', 'normal'],
    ['Academico,Bravura', 'normal', 'italic'],
  ]) {
    const make = (mode) => format(diminished(chord(mode, family).setFont(family, 12, weight, style)));
    const auto = make('auto');
    assert.equal(auto.kernedRuns, undefined);
    close(auto.getWidth(), make('none').getWidth());
  }
});

test('reformatting picks up font, content, cache, and mode changes', () => {
  const symbol = format(diminished(chord()));
  symbol.setFont('Petaluma Script,Petaluma', 18).addText('7');
  Element.clearTextMeasurementCache();
  format(symbol);
  const fresh = format(diminished(chord('auto', 'Petaluma Script,Petaluma', 18)).addText('7'));
  assert.deepEqual(symbol.kernedRuns, fresh.kernedRuns);
  format(symbol.setKerning('none'));
  assert.equal(symbol.kernedRuns, undefined);
  // Legacy blocks retain the fonts they had when added; switching modes preserves that behavior.
  close(
    symbol.getWidth(),
    symbol.symbolBlocks.reduce((sum, block) => sum + block.getWidth() + ChordSymbol.minPadding, 0)
  );
  format(symbol.setKerning('auto'));
  assert.deepEqual(symbol.kernedRuns, fresh.kernedRuns);
});

test('custom profiles are isolated and shift the following advance as well as ink', () => {
  const profile = {
    textFont: 'Academico',
    musicFont: 'Bravura',
    pairs: [{ left: 'A', right: Glyphs.csymDiminished, position: 'superscript', adjustmentEm: 0 }],
  };
  const make = () => diminished(chord('auto', 'Academico,Bravura', 12)).addText('7');
  const base = format(make().setKerningProfile(profile));
  profile.pairs[0].adjustmentEm = -0.1;
  const adjusted = format(make().setKerningProfile(profile));
  close(base.getWidth() - adjusted.getWidth(), 1.6);
  close(base.kernedRuns[2].x - adjusted.kernedRuns[2].x, 1.6);
  format(base);
  close(base.getWidth() - adjusted.getWidth(), 1.6);
  assert.throws(
    () => make().setKerningProfile({ ...profile, pairs: [{ ...profile.pairs[0], adjustmentEm: NaN }] }),
    /Invalid/
  );
  assert.throws(() => make().setKerning('invalid'), /Kerning/);
  assert.equal(format(chord()).getWidth(), 0);
});

test('Canvas and SVG receive identical positioned runs and right alignment uses the computed width', () => {
  const dom = new JSDOM('<div id="svg"></div><canvas id="canvas"></canvas>');
  const previousDocument = globalThis.document;
  globalThis.document = dom.window.document;
  try {
    const results = [];
    for (const backend of [VF.Renderer.Backends.SVG, VF.Renderer.Backends.CANVAS]) {
      const target = document.getElementById(backend === VF.Renderer.Backends.SVG ? 'svg' : 'canvas');
      const renderer = new VF.Renderer(target, backend).resize(600, 240);
      const ctx = renderer.getContext();
      const symbol = diminished(new ChordSymbol().setFont('Academico,Bravura', 18).setKerning('auto'))
        .setHorizontal('right')
        .setReportWidth(false);
      const note = new StaveNote({ keys: ['c/5'], duration: 'q' }).addModifier(symbol, 0);
      const stave = new VF.Stave(30, 80, 500).setContext(ctx);
      note.setStave(stave);
      VF.Formatter.FormatAndDraw(ctx, stave, [note]);
      const calls = [];
      const fillText = ctx.fillText.bind(ctx);
      ctx.fillText = (text, x, y) => {
        calls.push({ text, x, y });
        return fillText(text, x, y);
      };
      symbol.setContext(ctx).draw();
      results.push(calls);
      const anchor = note.getModifierStartXY(VF.Modifier.Position.ABOVE, 0).x;
      const bounds = symbol.getBoundingBox();
      close(bounds.x + bounds.w, anchor);
    }
    assert.deepEqual(results[0], results[1]);
  } finally {
    globalThis.document = previousDocument;
    dom.window.close();
  }
});
