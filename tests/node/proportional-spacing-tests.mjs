// Musical-time invariants for strict spacing, using real font metrics.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createCanvas, registerFont } from 'canvas';
import { JSDOM } from 'jsdom';
const VF = await import(new URL('../../build/esm/entry/vexflow-core.js', import.meta.url));

for (const [family, file] of [
  ['Bravura', 'bravura/bravura'],
  ['Academico', 'academico/academico'],
]) {
  registerFont(new URL(`../../node_modules/@vexflow-fonts/${file}.otf`, import.meta.url).pathname, { family });
}
VF.Element.setTextMeasurementCanvas(createCanvas(1, 1));
const documentFixture = new JSDOM('<div></div>');
globalThis.document = documentFixture.window.document;
test.after(() => {
  delete globalThis.document;
  documentFixture.window.close();
});
const { Formatter, Voice, Stave, StaveNote, Tuplet, ClefNote, Accidental, Dot, GraceNote, GraceNoteGroup } = VF;
const rhythm = ['16', '16', '16', '16', '8', '8', 'q', 'q'];
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} ≈ ${expected}`);
/** Build independent fixtures so formatting caches cannot conceal state leaks. */
function voice(durations = rhythm, meter = '4/4', stave = new Stave(10, 50, 900)) {
  const notes = durations.map((duration) => new StaveNote({ keys: ['c/5'], duration }).setStave(stave));
  VF.Beam.generateBeams(notes);
  return new Voice(meter).setMode(Voice.Mode.SOFT).addTickables(notes).setMode(Voice.Mode.STRICT);
}
const proportional = (pixelsPerQuarter) => new Formatter({ spacing: { mode: 'proportional', pixelsPerQuarter } });
const positions = (voice) =>
  voice
    .getTickables()
    .filter((n) => !n.shouldIgnoreTicks())
    .map((n) => n.getTickContext().getX());
/** Compare absolute onsets relative to the first anchor, not repeated pixel increments. */
function onsets(v, expected) {
  const x = positions(v);
  expected.forEach((offset, i) => close(x[i] - x[0], offset));
}

test('mixed durations retain exact scale, final duration, trailing space, and tuning invariance', () => {
  const v = voice();
  const f = proportional(100).joinVoices([v]).format([v], 800);
  onsets(v, [0, 25, 50, 75, 100, 150, 200, 300]);
  close(f.getMinTotalWidth(), 404);
  const before = positions(v);
  for (let i = 0; i < 10; i++) f.tune();
  assert.deepEqual(positions(v), before);
  f.format([v], 500);
  assert.deepEqual(positions(v), before);
});

test('omitted scale fits the full measure; omitted width uses measured minimum', () => {
  const v = voice();
  const f = proportional().joinVoices([v]).format([v], 504);
  onsets(v, [0, 31.25, 62.5, 93.75, 125, 187.5, 250, 375]);
  const minimum = f.preCalculateMinTotalWidth([v]);
  f.format([v], minimum);
  const expected = positions(v);
  f.format([v]);
  assert.deepEqual(positions(v), expected);
});

test('7/8 and dotted rhythms retain duration ratios', () => {
  const v = voice(Array(7).fill('8'), '7/8');
  proportional(100).joinVoices([v]).format([v]);
  onsets(v, [0, 50, 100, 150, 200, 250, 300]);
  const dotted = voice(['qd', '8', 'h']);
  Dot.buildAndAttach([dotted.getTickables()[0]]);
  proportional(100).joinVoices([dotted]).format([dotted]);
  onsets(dotted, [0, 150, 200]);
});

test('shared onsets align in multiple voices on the same stave', () => {
  const stave = new Stave(10, 50, 900);
  const upper = voice(rhythm, '4/4', stave);
  const lower = voice(['q', 'q', 'q', 'q'], '4/4', stave);
  lower.getTickables().forEach((note) => note.setStemDirection(-1));
  const f = proportional(140).joinVoices([upper, lower]).format([upper, lower]);
  [0, 4, 6, 7].forEach((index, beat) => close(positions(upper)[index], positions(lower)[beat]));
  assert.ok(f.getMinTotalWidth() >= 560);
});

test('triplets and septuplets on separate staves share rational endpoints without false collisions', () => {
  const first = voice([...Array(3).fill('8'), 'q', 'h']);
  const second = voice([...Array(7).fill('8'), 'h']);
  new Tuplet(first.getTickables().slice(0, 3), { numNotes: 3, notesOccupied: 2 });
  new Tuplet(second.getTickables().slice(0, 7), { numNotes: 7, notesOccupied: 4 });
  const f = proportional(140).joinVoices([first, second]).format([first, second]);
  onsets(first, [0, 140 / 3, 280 / 3, 140, 280]);
  onsets(second, [...Array.from({ length: 7 }, (_, i) => (i * 280) / 7), 280]);
  close(positions(first)[4], positions(second)[7]);
  assert.equal(f.getTickContexts().resolutionMultiplier % 21, 0);
});

test('inline clefs and trailing barlines occupy space without consuming time', () => {
  const stave = new Stave(10, 50, 900);
  const notes = voice(['q', 'q', 'q', 'q'], '4/4', stave).getTickables();
  const clefs = [new ClefNote('bass', 'small'), new ClefNote('treble', 'small')].map((c) => c.setStave(stave));
  const end = new VF.BarNote().setStave(stave);
  const v = new Voice('4/4').addTickables([notes[0], ...clefs, ...notes.slice(1), end]);
  const f = proportional(130).joinVoices([v]).format([v]);
  onsets(v, [0, 130, 260, 390]);
  assert.ok(clefs[0].getAbsoluteX() < clefs[1].getAbsoluteX());
  assert.ok(clefs[1].getAbsoluteX() + clefs[1].getWidth() <= notes[1].getAbsoluteX());
  close(end.getTickContext().getX() - positions(v)[0], 520 - 1 - end.getTickContext().getMetrics().notePx);
  const before = v.getTickables().map((n) => n.getAbsoluteX());
  f.format([v]);
  assert.deepEqual(
    v.getTickables().map((n) => n.getAbsoluteX()),
    before
  );
});

test('grace groups and accidentals reserve space before the first rhythmic anchor', () => {
  const v = voice(['q', 'q', 'q', 'q']);
  const first = v.getTickables()[0];
  first.addModifier(new Accidental('##'), 0);
  first.addModifier(new GraceNoteGroup([new GraceNote({ keys: ['d/5'], duration: '8' })]), 0);
  const f = proportional(150).joinVoices([v]).format([v]);
  onsets(v, [0, 150, 300, 450]);
  assert.ok(positions(v)[0] > 20);
  assert.ok(f.getMinTotalWidth() > 620);
});

test('crowded chords and insufficient stave width fail with actionable dimensions', () => {
  const v = voice();
  v.getTickables()[1].addModifier(new Accidental('##'), 0);
  assert.throws(
    () => proportional(10).joinVoices([v]).format([v]),
    /InsufficientProportionalSpace.*px\/quarter.*px width/
  );
  const f = proportional(200).joinVoices([v]);
  assert.throws(() => f.format([v], 100), /InsufficientProportionalSpace/);
  f.format([v], 1000);
  onsets(v, [0, 50, 100, 150, 200, 300, 400, 600]);
});

test('partial voices keep the declared span and SOFT overflow extends it', () => {
  const partial = new Voice('4/4').setMode(Voice.Mode.SOFT).addTickables(voice(['q'], '1/4').getTickables());
  const f = proportional(100).joinVoices([partial]).format([partial]);
  close(f.getMinTotalWidth(), 404);
  const overflow = new Voice('4/4')
    .setMode(Voice.Mode.SOFT)
    .addTickables(voice(Array(5).fill('q'), '5/4').getTickables());
  const g = proportional(100).joinVoices([overflow]).format([overflow]);
  close(g.getMinTotalWidth(), 504);
});

test('invalid scales and widths are rejected, and default spacing remains available', () => {
  for (const scale of [0, -1, NaN, Infinity]) {
    const v = voice();
    assert.throws(() => proportional(scale).joinVoices([v]).format([v]), /pixelsPerQuarter/);
  }
  for (const width of [-1, Infinity, NaN]) {
    const v = voice();
    assert.throws(() => proportional(100).joinVoices([v]).format([v], width), /Width must/);
  }
  const v = voice();
  new Formatter().joinVoices([v]).format([v], 500);
  assert.notEqual(positions(v)[4] - positions(v)[0], positions(v)[6] - positions(v)[4]);
});

test('centered whole-measure rests retain centering', () => {
  const v = voice(['wr']);
  v.getTickables()[0].setCenterAlignment(true);
  proportional(100).joinVoices([v]).format([v], 800);
  close(v.getTickables()[0].getCenterXShift(), 200);
});

test('System autoWidth and tuning preserve fixed spacing on Canvas and SVG', () => {
  const dom = new JSDOM('<div id="score"></div>');
  const oldDocument = globalThis.document;
  globalThis.document = dom.window.document;
  try {
    for (const backend of [VF.Renderer.Backends.CANVAS, VF.Renderer.Backends.SVG]) {
      const host = document.getElementById('score');
      host.replaceChildren();
      const target =
        backend === VF.Renderer.Backends.CANVAS ? host.appendChild(document.createElement('canvas')) : host;
      target.id = 'target';
      const factory = new VF.Factory({ renderer: { elementId: target, backend, width: 900, height: 300 } });
      const notes = factory.EasyScore().notes('C5/16, D5, E5, F5, G5/8, A5, B5/q, C6');
      const v = factory.Voice().addTickables(notes);
      const system = factory.System({
        details: { spacing: { mode: 'proportional', pixelsPerQuarter: 120 } },
        formatIterations: 5,
      });
      system.addStave({ voices: [v] }).addClef('treble');
      factory.draw({ retain: true });
      onsets(v, [0, 30, 60, 90, 120, 180, 240, 360]);
      assert.ok(system.getWidth() > 480);
      const before = positions(v);
      factory.draw({ retain: true });
      assert.deepEqual(positions(v), before);
      target.id = 'score';
    }
  } finally {
    globalThis.document = oldDocument;
    dom.window.close();
  }
});

test('dense chord bounds remain separated at the automatic minimum width', () => {
  const stave = new Stave(10, 50, 900);
  const notes = Array.from({ length: 8 }, () =>
    new StaveNote({ keys: ['c/5', 'd/5', 'e/5'], duration: '8' }).setStave(stave)
  );
  notes.forEach((note) => note.addModifier(new Accidental('##'), 0).addModifier(new Accidental('b'), 1));
  VF.Beam.generateBeams(notes);
  const v = new Voice('4/4').addTickables(notes);
  const f = proportional().joinVoices([v]).format([v]);
  for (let i = 1; i < notes.length; i++) {
    const previous = notes[i - 1].getMetrics();
    const current = notes[i].getMetrics();
    const right =
      notes[i - 1].getTickContext().getX() + previous.notePx + previous.modRightPx + previous.rightDisplacedHeadPx;
    const left = notes[i].getTickContext().getX() - current.modLeftPx - current.leftDisplacedHeadPx;
    assert.ok(left - right >= 2 - 1e-7);
  }
  const scale = positions(v)[1] - positions(v)[0];
  onsets(
    v,
    notes.map((_, i) => scale * i)
  );
  assert.ok(Number.isFinite(f.getMinTotalWidth()));
});

test('staves supplied during format also apply to inline prefixes', () => {
  const notes = ['q', 'q', 'q', 'q'].map((duration) => new StaveNote({ keys: ['c/5'], duration }));
  const clef = new ClefNote('bass', 'small');
  const v = new Voice('4/4').addTickables([clef, ...notes]);
  const stave = new Stave(10, 50, 900);
  proportional(120).joinVoices([v]).format([v], 600, { stave });
  onsets(v, [0, 120, 240, 360]);
  assert.ok(clef.getAbsoluteX() + clef.getWidth() <= notes[0].getAbsoluteX());
});

test('unsupported numeric ranges fail before producing infinite coordinates', () => {
  assert.throws(() => proportional().preCalculateMinTotalWidth([]), /No voices/);
  assert.throws(() => proportional().format([]), /No voices/);
  const v = voice();
  assert.throws(() => proportional(Number.MAX_VALUE).joinVoices([v]).format([v]), /pixel range/);
});

test('optical spacing fits measured obstacles, then stretches rhythmic intervals without moving clefs into notes', () => {
  const stave = new Stave(10, 50, 900);
  const notes = ['q', 'q', '8', '16', '32', '64'].map((duration) =>
    new StaveNote({ keys: ['c/5'], duration }).setStave(stave)
  );
  notes[0].addModifier(new VF.Annotation('crescendo'), 0);
  notes[1].addModifier(
    new GraceNoteGroup(['d/5', 'e/5', 'f/5'].map((key) => new GraceNote({ keys: [key], duration: '16' }))),
    0
  );
  notes[2].addModifier(new VF.ChordSymbol().addText('Cmaj7/G'), 0);
  notes[3].addModifier(new Accidental('##'), 0);
  const clef = new ClefNote('bass', 'small').setStave(stave);
  const v = new Voice('4/4').setStrict(false).addTickables([notes[0], clef, ...notes.slice(1)]);
  const f = new Formatter({ spacing: { mode: 'optical' } }).joinVoices([v]);
  const minimum = f.preCalculateMinTotalWidth([v]);
  assert.throws(() => f.format([v], minimum - 1), /InsufficientOpticalSpace.*px width/);
  f.format([v], minimum);
  const tight = positions(v);
  for (let i = 1; i < notes.length; ++i) {
    const prev = notes[i - 1].getMetrics(),
      curr = notes[i].getMetrics();
    assert.ok(
      tight[i] - curr.modLeftPx - curr.leftDisplacedHeadPx >=
        tight[i - 1] + prev.notePx + prev.rightDisplacedHeadPx + prev.modRightPx + 2 - 1e-7
    );
  }
  assert.ok(clef.getAbsoluteX() + clef.getWidth() <= notes[1].getAbsoluteX());
  f.format([v], minimum + 200);
  const loose = positions(v);
  const extra = (i) => loose[i] - loose[i - 1] - (tight[i] - tight[i - 1]);
  close(extra(3) / extra(4), Math.sqrt(2));
  f.tune();
  assert.deepEqual(positions(v), loose);
});

test('nested 5:4 and 3:2 tuplets preserve every exact onset through reformat', () => {
  const stave = new Stave(10, 50, 900);
  const notes = Array.from({ length: 5 }, () => new StaveNote({ keys: ['c/5'], duration: '8' }).setStave(stave));
  new Tuplet(notes, { numNotes: 5, notesOccupied: 4 });
  new Tuplet(notes.slice(1, 4), { numNotes: 3, notesOccupied: 2 });
  const v = new Voice('4/4').setStrict(false).addTickables(notes);
  const f = proportional(200).joinVoices([v]).format([v]);
  const expected = [0, 6, 10, 14, 18]; // units of one fifteenth of a quarter
  const elapsed = new VF.Fraction(0, 1);
  for (const [i, n] of notes.entries()) {
    assert.ok(elapsed.equals(new VF.Fraction(expected[i] * 4096, 15)));
    elapsed.add(n.getTicks());
  }
  assert.ok(elapsed.equals(new VF.Fraction(24 * 4096, 15)));
  onsets(
    v,
    expected.map((value) => (value * 200) / 15)
  );
  f.format([v], 1600);
  onsets(
    v,
    expected.map((value) => (value * 200) / 15)
  );
});

test('optical and exact policies expose different minima for a very short final attack', () => {
  const makeVoice = () => voice(['h', 'q', '8', '16', '32', '64', '64']);
  const run = (spacing) => {
    const v = makeVoice();
    const f = new Formatter(spacing ? { spacing } : {}).joinVoices([v]);
    const minimum = f.preCalculateMinTotalWidth([v]);
    f.format([v], minimum);
    assert.ok(positions(v).every(Number.isFinite));
    return minimum;
  };
  const optical = run({ mode: 'optical' });
  const exact = run({ mode: 'proportional' });
  const legacy = run();
  assert.ok(optical < exact);
  assert.ok(legacy > 0);
  const constrained = new Formatter({ spacing: { mode: 'proportional' } });
  const v = makeVoice();
  assert.throws(() => constrained.joinVoices([v]).format([v], optical), /InsufficientProportionalSpace/);
});
