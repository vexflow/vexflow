// Accordion reed selection, entrance anchoring, and layout beside a fingering.
import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { AccordionRegister } from '../src/accordionregister';
import { measureEngraving } from '../src/engravinggeometry';
import { Glyphs } from '../src/glyphs';
import { Modifier } from '../src/modifier';

const AccordionRegisterTests = {
  Start(): void {
    QUnit.module('AccordionRegister');
    VexFlowTests.runTests('Active reed ranks follow their entrances', registerEntrances);
  },
};

/** Compare three successive switches on the same notes at two staff widths. */
function registerEntrances(options: TestOptions): void {
  const { assert } = options;
  const f = VexFlowTests.makeFactory(options, 470, 205);
  const stave = f.Stave({ x: 10, y: 65, width: 440 }).addClef('treble');
  const notes = ['c/5', 'a/4', 'b/4'].map((key) => f.StaveNote({ keys: [key], duration: 'q' }));
  const voice = f.Voice({ time: '3/4' }).addTickables(notes);
  const input = { middle: 1 };
  const marks = [
    f.AccordionRegister(input),
    f.AccordionRegister({ high: true, low: true }),
    f.AccordionRegister({ middle: 2 }),
  ];
  input.middle = 3;
  const fingering = f.Fingering({ number: '2', position: 'above' });
  notes[1].addModifier(fingering, 0);
  notes.forEach((note, i) => note.addModifier(marks[i], 0));

  const signs = [Glyphs.accdnRH3RanksClarinet, Glyphs.accdnRH3RanksOrgan, Glyphs.accdnRH3RanksTwoChoirs];
  const ranks = [
    { high: false, middle: 1, low: false },
    { high: true, middle: 0, low: true },
    { high: false, middle: 2, low: false },
  ];
  function format(width: number): number[] {
    stave.setWidth(width);
    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);
    const boxes = marks.map((mark, i) => {
      const box = mark.getBoundingBox();
      const note = notes[i];
      const anchor = note.getModifierStartXY(Modifier.Position.ABOVE, 0);
      const geometry = measureEngraving(mark);
      assert.deepEqual(geometry.diagnostics, [], 'The register participates in score geometry');
      assert.deepEqual(geometry.parts[0], box, 'Ink can be measured before drawing');
      assert.ok(Math.abs(box.x + box.w / 2 - anchor.x) < 2, 'Sign centered at its entrance');
      assert.ok(box.h > 0 && box.w > 0 && box.y + box.h < anchor.y, 'Full sign above the notehead');
      const spacing = note.getModifierContext()!.getState();
      assert.ok(spacing.leftShift + note.getGlyphWidth() / 2 + 1 >= box.w / 2, 'Space to the left');
      assert.ok(spacing.rightShift + note.getGlyphWidth() / 2 + 1 >= box.w / 2, 'Space to the right');
      return box;
    });
    const fingerAnchor = notes[1].getModifierStartXY(Modifier.Position.ABOVE, 0);
    const fingerInk = fingering.getTextInk(fingerAnchor.x - 4, fingerAnchor.y - 7);
    assert.ok(boxes[1].y + boxes[1].h < fingerInk.y, 'The outer-band sign clears the finger number');
    assert.deepEqual(
      marks.map((mark) => mark.getRanks()),
      ranks,
      'Stable reed settings'
    );
    assert.deepEqual(
      marks.map((mark) => mark.getText()),
      signs,
      'The signs specify the same reed settings'
    );
    return boxes.map((box) => box.x);
  }

  const narrow = format(260);
  const wide = format(440);
  assert.ok(wide[1] > narrow[1] && wide[2] > narrow[2], 'Later switches move with the bar');
  f.draw();
  assert.ok(
    marks.every((mark) => mark.isRendered()),
    'All three register signs are drawn'
  );
  assert.equal(new AccordionRegister({ middle: 3 }).getText(), Glyphs.accdnRH3RanksAuthenticMusette);
  assert.equal(new AccordionRegister({}).getText(), Glyphs.accdnCombRH3RanksEmpty);
  for (const middle of [-1, 1.5, 4, NaN]) {
    assert.throws(() => new AccordionRegister({ middle }), /middle/, 'Invalid middle-rank count');
  }
}

VexFlowTests.register(AccordionRegisterTests);
export { AccordionRegisterTests };
