// Synodal Kievan C-clef placement and line/space note forms before and after a pitch edit.
import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { Clef } from '../src/clef';
import { measureEngraving } from '../src/engravinggeometry';
import { Glyphs } from '../src/glyphs';
import { KievanNote } from '../src/kievannote';
import { Tables } from '../src/tables';

const KievanNoteTests = {
  Start(): void {
    QUnit.module('KievanNote');
    VexFlowTests.runTests('Synodal half notes on lines and spaces', synodalPhrase, {}, ['Bravura']);
  },
};

/** Engrave the seven half notes and change the second pitch in the same formatted voice. */
function synodalPhrase(options: TestOptions): void {
  const { assert } = options;
  const f = VexFlowTests.makeFactory(options, 510, 140);
  const stave = f.Stave({ x: 12, y: 15, width: 482 }).addClef('kievan');
  const pitches = ['c/4', 'd/4', 'e/4', 'f/4', 'e/4', 'd/4', 'c/4'];
  const notes = pitches.map((pitch) => f.KievanNote({ pitch, duration: 'h' }));
  const voice = f.Voice({ time: '7/2' }).addTickables(notes);
  const format = () => f.Formatter().joinVoices([voice]).formatToStave([voice], stave);
  format();

  const clef = stave.getModifiers(undefined, Clef.CATEGORY)[0] as Clef;
  assert.equal(clef.code, Glyphs.kievanCClef);
  assert.equal(clef.getGlyphY(), stave.getYForLine(2), 'The tse-fa-ut clef marks middle C');
  const line = Glyphs.kievanNoteHalfStaffLine;
  const space = Glyphs.kievanNoteHalfStaffSpace;
  assert.deepEqual(
    notes.map((n) => n.text),
    [line, space, line, space, line, space, line]
  );
  assert.deepEqual(
    notes.map((n) => n.getYs()[0]),
    [2, 1.5, 1, 0.5, 1, 1.5, 2].map((l) => stave.getYForLine(l))
  );
  assert.ok(voice.isComplete());
  const ticks = notes.map((n) => n.getTicks().value());
  assert.ok(
    ticks.every((tick) => tick === Tables.RESOLUTION / 2),
    'Every event keeps a half note of time'
  );
  for (const note of notes) {
    const shape = measureEngraving(note);
    assert.deepEqual(shape.diagnostics, []);
    assert.deepEqual(
      shape.parts,
      [note.getTextInk(note.getAbsoluteX(), note.getYs()[0])],
      'Pre-draw ink uses the selected form'
    );
  }
  const xs = notes.map((n) => n.getAbsoluteX());
  const edited = notes[1].setPitch('e/4');
  format();
  assert.equal(voice.getTickables()[1], edited, 'The edited note stays in the same voice slot');
  assert.deepEqual(edited.getKeys(), ['e/4']);
  assert.equal(edited.text, line);
  assert.equal(edited.getYs()[0], notes[2].getYs()[0]);
  assert.deepEqual(
    notes.map((n) => n.getTicks().value()),
    ticks
  );
  assert.deepEqual(
    notes.map((n) => n.getAbsoluteX()),
    xs,
    'All attacks keep their columns'
  );
  assert.throws(() => edited.setPitch('c/4/invalid'), /pitch/);
  assert.deepEqual(edited.getKeys(), ['e/4'], 'An invalid edit preserves the last valid pitch');
  assert.throws(() => new KievanNote({ pitch: 'c/4', duration: 'q' }), /half-note/);
  edited.setPitch('d/4');
  const ctx = f.getContext();
  stave.draw();
  const glyphs: string[] = [];
  let strokes = 0;
  const fillText = ctx.fillText;
  const stroke = ctx.stroke;
  ctx.fillText = function (text, x, y) {
    glyphs.push(text);
    return fillText.call(this, text, x, y);
  };
  ctx.stroke = function () {
    strokes++;
    return stroke.call(this);
  };
  try {
    voice.draw(ctx, stave);
  } finally {
    ctx.fillText = fillText;
    ctx.stroke = stroke;
  }
  assert.deepEqual(glyphs, [line, space, line, space, line, space, line], 'Draws one historical sign per event');
  assert.equal(strokes, 0, 'Each half note already includes its stem');
}

VexFlowTests.register(KievanNoteTests);
export { KievanNoteTests };
