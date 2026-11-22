// German lute letter assignments, rhythm alignment, and stable attack spacing after a course edit.
import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { measureEngraving } from '../src/engravinggeometry';
import { GermanLuteNote } from '../src/germanlutenote';
import { Glyphs } from '../src/glyphs';

const GermanLuteNoteTests = {
  Start(): void {
    QUnit.module('GermanLuteNote');
    VexFlowTests.runTests('Principal courses on one staffless row', principalCourses);
  },
};

/** Format the four-attack reading exercise, then edit only the first course. */
function principalCourses(options: TestOptions): void {
  const { assert } = options;
  const f = VexFlowTests.makeFactory(options, 470, 150);
  const stave = f.Stave({ x: 15, y: 50, width: 430, options: { numLines: 0, leftBar: false, rightBar: false } });
  const notes = [
    [5, 1],
    [4, 1],
    [5, 2],
    [1, 2],
  ].map(([course, fret]) => f.GermanLuteNote({ course, fret, duration: 'q' }));
  const voice = f.Voice({ time: '4/4' }).addTickables(notes);
  function format(): void {
    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);
  }
  format();
  assert.equal(stave.getNumLines(), 0, 'No course ruling');
  assert.deepEqual(
    notes.map((n) => n.text),
    [Glyphs.luteGermanALower, Glyphs.luteGermanBLower, Glyphs.luteGermanFLower, Glyphs.luteGermanKLower]
  );
  const attacks = notes.map((n) => n.getAbsoluteX());
  const ticks = notes[0].getTicks().value();
  for (const note of notes) {
    const { parts, diagnostics } = measureEngraving(note);
    assert.deepEqual(diagnostics, [], 'Both signs have pre-draw geometry');
    assert.equal(note.getYs()[0], stave.getYForLine(0), 'Common letter baseline');
    assert.ok(parts[0].y > parts[1].y + parts[1].h, 'Rhythm clears the letter');
    assert.ok(
      parts.every((b) => b.w > 0 && b.h > 0),
      'Both signs have ink'
    );
  }
  notes[0].setPosition(4, 1);
  format();
  assert.equal(notes[0].text, Glyphs.luteGermanBLower);
  assert.deepEqual(
    notes.map((n) => n.getAbsoluteX()),
    attacks,
    'All columns survive a same-fret course edit'
  );
  assert.equal(notes[0].getTicks().value(), ticks, 'Attack retains its duration');
  assert.throws(() => notes[0].setPosition(2, 5), /No principal-course/, 'Unknown sign is rejected');
  assert.deepEqual(notes[0].getPosition(), { course: 4, fret: 1 }, 'Rejected edit retains the last valid position');
  assert.throws(() => new GermanLuteNote({ course: 5, fret: 1, duration: '64' }), /duration/);
  assert.equal(
    new GermanLuteNote({ course: 3, fret: 5, duration: 'h' }).text,
    Glyphs.luteGermanZLower,
    'Last defined lowercase sign'
  );
  notes[0].setPosition(5, 1);
  const ctx = f.getContext();
  const fillText = ctx.fillText;
  const flags: number[] = [];
  ctx.fillText = function (text, x, y) {
    if (text === Glyphs.luteDurationQuarter) flags.push(x);
    return fillText.call(this, text, x, y);
  };
  try {
    f.draw();
  } finally {
    ctx.fillText = fillText;
  }
  assert.deepEqual(flags, attacks, 'Each quarter attack draws its lute rhythm sign at the letter origin');
}

VexFlowTests.register(GermanLuteNoteTests);
export { GermanLuteNoteTests };
