// French lute letter selection, continuous ruled lines and the common diapason row.
import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { FrenchLuteNote } from '../src/frenchlutenote';
import { Glyphs } from '../src/glyphs';

const FrenchLuteNoteTests = {
  Start(): void {
    QUnit.module('FrenchLuteNote');
    VexFlowTests.runTests('French fret letters and open bass courses', exercise, undefined, ['Bravura']);
    QUnit.test('French lute position limits', positionLimits);
  },
};

/** Draw the same eight sounding positions at two widths and inspect the actual glyph draws. */
function exercise(options: TestOptions): void {
  const { assert } = options;
  const factory = VexFlowTests.makeFactory(options, 520, 320);
  const ctx = factory.getContext();
  const positions = [
    ...[0, 1, 2, 8, 9].map((fret) => ({ str: 1, fret })),
    ...[7, 8, 9].map((str) => ({ str, fret: 0 })),
  ];
  const expected = [
    Glyphs.luteFrenchFretA,
    Glyphs.luteFrenchFretB,
    Glyphs.luteFrenchFretC,
    Glyphs.luteFrenchFretI,
    Glyphs.luteFrenchFretK,
    Glyphs.luteFrench7thCourse,
    Glyphs.luteFrench8thCourse,
    Glyphs.luteFrench9thCourse,
  ];
  const painted: string[] = [];
  const paint = ctx.fillText.bind(ctx);
  ctx.fillText = (text, x, y) => {
    painted.push(text);
    return paint(text, x, y);
  };
  let lineMasks = 0;
  const clear = ctx.clearRect.bind(ctx);
  ctx.clearRect = (x, y, w, h) => {
    ++lineMasks;
    return clear(x, y, w, h);
  };

  const notes = positions.map((position) => factory.FrenchLuteNote({ positions: [position], duration: '8' }));
  const voice = factory.Voice().addTickables(notes);
  let wideLastX = 0;
  for (const [row, width] of [490, 265].entries()) {
    const stave = factory.TabStave({ x: 8, y: 5 + 145 * row, width }).drawWithStyle();
    voice.setStave(stave);
    factory.Formatter().joinVoices([voice]).formatToStave([voice], stave);
    painted.length = 0;
    voice.draw(ctx, stave);
    assert.deepEqual(painted, expected, 'Paint one French letter or diapason per attack');
    assert.deepEqual(
      notes.map((note) => note.getPositions()[0]),
      positions,
      'All sounding positions remain numeric'
    );
    assert.equal(stave.getNumLines(), 6, 'Exactly six ruled courses');
    assert.equal(lineMasks, 0, 'The letters leave the course lines continuous');
    let previousRight = 0;
    for (const [i, note] of notes.entries()) {
      const firstCourse = positions[i].str === 1;
      const ink = note.getFretInk()[0];
      assert.equal(note.getYs()[0], stave.getYForLine(firstCourse ? 0 : 6.5), 'Marks use the correct baseline');
      assert.ok(firstCourse ? ink.y < stave.getYForLine(0) : ink.y > stave.getYForLine(5), 'Visible ink on its course');
      assert.ok(ink.w > 0 && ink.x > previousRight, 'Distinct sign with space before it');
      previousRight = ink.x + ink.w;
    }
    if (row === 0) wideLastX = notes[7].getAbsoluteX();
    else assert.ok(notes[7].getAbsoluteX() < wideLastX, 'The last attack follows the narrower measure');
  }
  const bassChord = factory.FrenchLuteNote({
    positions: [
      { str: 9, fret: 0 },
      { str: 6, fret: 3 },
      { str: 7, fret: 0 },
    ],
    duration: 'q',
  });
  const [lowBass, sixthCourse, highBass] = bassChord.getYs();
  assert.ok(sixthCourse < highBass && highBass < lowBass, 'Simultaneous basses have separate rows below course six');
}

/** Reject positions outside the alphabet and the open-bass convention. */
function positionLimits(assert: Assert): void {
  const make = (str: number, fret: number) => new FrenchLuteNote({ duration: 'q', positions: [{ str, fret }] });
  assert.ok(make(6, 12) && make(10, 0), 'Last letter and fourth diapason are supported');
  for (const str of [0, 1.5, 11]) assert.throws(() => make(str, 0), /courses/);
  for (const fret of [-1, 0.5, 13]) assert.throws(() => make(1, fret), /frets/);
  assert.throws(() => make(7, 1), /open/);
}

VexFlowTests.register(FrenchLuteNoteTests);
export { FrenchLuteNoteTests };
