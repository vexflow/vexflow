// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// Tests stave and inline clef glyphs, written-pitch anchors and spacing.

import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { Clef } from '../src/clef';
import { Glyphs } from '../src/glyphs';

const ClefTests = {
  Start(): void {
    QUnit.module('Clef');
    const run = VexFlowTests.runTests;
    run('Bounding Box', draw, { drawBoundingBox: true });
    run('Bounding Box Clef Change', drawClefChange, { drawBoundingBox: true });
    run('Double-octave clefs', doubleOctaveClefs);
    run('Clef Test', draw, { drawBoundingBox: false });
    run('Clef End Test', drawEnd);
    run('Small Clef Test', drawSmall);
    run('Small Clef End Test', drawSmallEnd);
    run('Clef Change Test', drawClefChange, { drawBoundingBox: false });
  },
};

/** Compare full-size and small inline forms at the same written pitch and inspect their visible ink. */
function doubleOctaveClefs(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 620, 270);
  const forms = [
    ['treble', '15ma', Glyphs.gClef15ma],
    ['treble', '15mb', Glyphs.gClef15mb],
    ['bass', '15ma', Glyphs.fClef15ma],
    ['bass', '15mb', Glyphs.fClef15mb],
  ] as const;
  for (const [index, [type, annotation, glyph]] of forms.entries()) {
    const stave = f
      .Stave({ x: 15 + 290 * (index % 2), y: 12 + 120 * Math.floor(index / 2), width: 270 })
      .addClef(type, 'default', annotation);
    const start = stave.getModifiers(undefined, Clef.CATEGORY)[0] as Clef;
    const inline = f.ClefNote({ type, options: { size: 'small', annotation } });
    const key = type === 'treble' ? 'g/4' : 'f/3';
    const quarter = f.StaveNote({ keys: [key], duration: 'q', clef: type });
    const voice = f.Voice({ time: '1/4' }).addTickables([inline, quarter]);
    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);
    // Both clefs need their final drawn position for the bounds check.
    stave.draw();
    voice.draw(f.getContext(), stave);
    const small = inline.getClef();
    for (const clef of [start, small]) {
      options.assert.equal(clef.code, glyph, 'selects the complete double-octave glyph');
      options.assert.equal(clef.getGlyphY(), stave.getYForLine(Clef.types[type].line), 'retains the ordinary anchor');
    }
    const ink = small.getInkBounds();
    const box = inline.getBoundingBox();
    options.assert.ok(ink.w > 0 && ink.h > 0 && ink.h < start.getInkBounds().h, 'inline glyph is visibly smaller');
    options.assert.ok(
      box.x <= ink.x + 1 &&
        box.x + box.w >= ink.x + ink.w - 1 &&
        box.y <= ink.y + 1 &&
        box.y + box.h >= ink.y + ink.h - 1,
      'measured box encloses the ink'
    );
    options.assert.ok(
      ink.x + ink.w < quarter.getNoteHeadBeginX(),
      `${type} ${annotation} clears the next notehead (${ink.x + ink.w} < ${quarter.getNoteHeadBeginX()})`
    );
  }
}

function draw(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 800, 120);
  const stave = f
    .Stave()
    .addClef('treble')
    .addClef('treble', 'default', '8va')
    .addClef('treble', 'default', '8vb')
    .addClef('alto')
    .addClef('tenor')
    .addClef('soprano')
    .addClef('bass')
    .addClef('bass', 'default', '8vb')
    .addClef('mezzo-soprano')
    .addClef('baritone-c')
    .addClef('baritone-f')
    .addClef('subbass')
    .addClef('percussion')
    .addClef('french')
    .addEndClef('treble');
  f.draw();

  // Render bounding boxes
  if (options.params.drawBoundingBox === true) {
    const elements = stave.getModifiers(undefined, 'Clef');
    elements.forEach((element) => VexFlowTests.drawBoundingBox(f.getContext(), element));
  }

  options.assert.ok(true, 'all pass');
}

function drawEnd(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 800, 120);
  f.Stave()
    .addClef('bass')
    .addEndClef('treble')
    .addEndClef('treble', 'default', '8va')
    .addEndClef('treble', 'default', '8vb')
    .addEndClef('alto')
    .addEndClef('tenor')
    .addEndClef('soprano')
    .addEndClef('bass')
    .addEndClef('bass', 'default', '8vb')
    .addEndClef('mezzo-soprano')
    .addEndClef('baritone-c')
    .addEndClef('baritone-f')
    .addEndClef('subbass')
    .addEndClef('percussion')
    .addEndClef('french');
  f.draw();
  options.assert.ok(true, 'all pass');
}

function drawSmall(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 800, 120);
  f.Stave()
    .addClef('treble', 'small')
    .addClef('treble', 'small', '8va')
    .addClef('treble', 'small', '8vb')
    .addClef('alto', 'small')
    .addClef('tenor', 'small')
    .addClef('soprano', 'small')
    .addClef('bass', 'small')
    .addClef('bass', 'small', '8vb')
    .addClef('mezzo-soprano', 'small')
    .addClef('baritone-c', 'small')
    .addClef('baritone-f', 'small')
    .addClef('subbass', 'small')
    .addClef('percussion', 'small')
    .addClef('french', 'small')
    .addEndClef('treble', 'small');
  f.draw();
  options.assert.ok(true, 'all pass');
}

function drawSmallEnd(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 800, 120);
  f.Stave()
    .addClef('bass', 'small')
    .addEndClef('treble', 'small')
    .addEndClef('treble', 'small', '8va')
    .addEndClef('treble', 'small', '8vb')
    .addEndClef('alto', 'small')
    .addEndClef('tenor', 'small')
    .addEndClef('soprano', 'small')
    .addEndClef('bass', 'small')
    .addEndClef('bass', 'small', '8vb')
    .addEndClef('mezzo-soprano', 'small')
    .addEndClef('baritone-c', 'small')
    .addEndClef('baritone-f', 'small')
    .addEndClef('subbass', 'small')
    .addEndClef('percussion', 'small')
    .addEndClef('french', 'small');
  f.draw();
  options.assert.ok(true, 'all pass');
}

function drawClefChange(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 800, 180);
  const stave = f.Stave().addClef('treble');
  const notes = [
    f.StaveNote({ keys: ['c/4'], duration: '4', clef: 'treble' }),
    f.ClefNote({ type: 'alto', options: { size: 'small' } }),
    f.StaveNote({ keys: ['c/4'], duration: '4', clef: 'alto' }),
    f.ClefNote({ type: 'tenor', options: { size: 'small' } }),
    f.StaveNote({ keys: ['c/4'], duration: '4', clef: 'tenor' }),
    f.ClefNote({ type: 'soprano', options: { size: 'small' } }),
    f.StaveNote({ keys: ['c/4'], duration: '4', clef: 'soprano' }),
    f.ClefNote({ type: 'bass', options: { size: 'small' } }),
    f.StaveNote({ keys: ['c/4'], duration: '4', clef: 'bass' }),
    f.ClefNote({ type: 'mezzo-soprano', options: { size: 'small' } }),
    f.StaveNote({ keys: ['c/4'], duration: '4', clef: 'mezzo-soprano' }),
    f.ClefNote({ type: 'baritone-c', options: { size: 'small' } }),
    f.StaveNote({ keys: ['c/4'], duration: '4', clef: 'baritone-c' }),
    f.ClefNote({ type: 'baritone-f', options: { size: 'small' } }),
    f.StaveNote({ keys: ['c/4'], duration: '4', clef: 'baritone-f' }),
    f.ClefNote({ type: 'subbass', options: { size: 'small' } }),
    f.StaveNote({ keys: ['c/4'], duration: '4', clef: 'subbass' }),
    f.ClefNote({ type: 'french', options: { size: 'small' } }),
    f.StaveNote({ keys: ['c/4'], duration: '4', clef: 'french' }),
    f.ClefNote({ type: 'treble', options: { size: 'small', annotation: '8vb' } }),
    f.StaveNote({ keys: ['c/4'], duration: '4', clef: 'treble', octaveShift: -1 }),
    f.ClefNote({ type: 'treble', options: { size: 'small', annotation: '8va' } }),
    f.StaveNote({ keys: ['c/4'], duration: '4', clef: 'treble', octaveShift: 1 }),
  ];
  const voice = f.Voice({ time: '12/4' }).addTickables(notes);
  f.Formatter().joinVoices([voice]).formatToStave([voice], stave);
  f.draw();
  // Render bounding boxes
  if (options.params.drawBoundingBox === true) {
    notes.forEach((element) => VexFlowTests.drawBoundingBox(f.getContext(), element));
  }
  options.assert.ok(true, 'all pass');
}

VexFlowTests.register(ClefTests);
export { ClefTests };
