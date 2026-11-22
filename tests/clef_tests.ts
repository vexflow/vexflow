// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// Tests stave and inline clef glyphs, written-pitch anchors and spacing.

import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { ChantDivision, ChantDivisionKind, ChantStave } from '../src/chantstave';
import { Clef } from '../src/clef';
import { GlyphNote } from '../src/glyphnote';
import { Glyphs } from '../src/glyphs';

const ClefTests = {
  Start(): void {
    QUnit.module('Clef');
    const run = VexFlowTests.runTests;
    run('Bounding Box', draw, { drawBoundingBox: true });
    run('Bounding Box Clef Change', drawClefChange, { drawBoundingBox: true });
    run('Chant clefs and divisions', chantClefsAndDivisions, {}, ['Bravura']);
    run('Double-octave clefs', doubleOctaveClefs);
    run('Clef Test', draw, { drawBoundingBox: false });
    run('Clef End Test', drawEnd);
    run('Small Clef Test', drawSmall);
    run('Small Clef End Test', drawSmallEnd);
    run('Clef Change Test', drawClefChange, { drawBoundingBox: false });
  },
};

/** Match the two example phrases and move the upper clef while keeping the written C. */
function chantClefsAndDivisions(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 620, 280);
  const { assert } = options;
  const glyphs = [
    Glyphs.chantDivisioMinima,
    Glyphs.chantDivisioMaior,
    Glyphs.chantDivisioMaxima,
    Glyphs.chantDivisioFinalis,
  ];
  const kinds: ChantDivisionKind[] = ['minima', 'maior', 'maxima', 'finalis'];
  for (const [i, clef] of (['C', 'F'] as const).entries()) {
    const anchor = clef === 'C' ? 'c/4' : 'f/3';
    const keys =
      clef === 'C'
        ? ['c/4', 'd/4', 'd/4', 'e/4', 'e/4', 'd/4', 'd/4', 'c/4']
        : ['f/3', 'g/3', 'a/3', 'g/3', 'a/3', 'g/3', 'g/3', 'f/3'];
    const stave = new ChantStave(10, 5 + i * 125, 600, {
      clef,
      line: clef === 'C' ? 3 : 2,
      spacingBetweenLinesPx: 12,
    }).setContext(f.getContext());
    const originalY = stave.getYForPitch(anchor);
    if (clef === 'C') {
      stave.setChantClef('C', 2);
      assert.equal(stave.getYForPitch(anchor), originalY + 12, 'C follows the clef down one line');
      stave.setChantClef('C', 3);
      assert.equal(stave.getLineForPitch('b/3'), 1.5, 'B to middle C crosses an octave by a half-space');
    }
    const mark = stave.getModifiers(undefined, Clef.CATEGORY)[0] as Clef;
    assert.equal(mark.code, clef === 'C' ? Glyphs.chantCclef : Glyphs.chantFclef, 'uses the chant clef glyph');
    assert.equal(mark.getGlyphY(), originalY, 'the first punctum sits on its clef line');
    const notes = keys.map(
      (p) => new GlyphNote(Glyphs.chantPunctum, { duration: 'q' }, { line: stave.getLineForPitch(p) })
    );
    const divisions = kinds.map((kind) => new ChantDivision(kind));
    const voice = f.Voice({ time: '8/4' });
    for (let j = 0; j < divisions.length; j++) voice.addTickables([notes[2 * j], notes[2 * j + 1], divisions[j]]);
    // All eight quarters fill a strict voice; the four intervening divisions take no musical time.
    assert.ok(voice.isComplete(), 'strict voice counts only the eight pitches');
    for (const [j, division] of divisions.entries()) {
      assert.ok(division.shouldIgnoreTicks(), 'a phrase division has no duration in the voice');
      assert.equal(division.getText(), glyphs[j], 'uses the requested division glyph');
    }
    divisions[0].setKind('maior');
    assert.equal(divisions[0].getText(), Glyphs.chantDivisioMaior, 'replaces the mark in place');
    assert.equal(voice.getTickables()[1], notes[1], 'keeps the preceding pitch');
    assert.equal(voice.getTickables()[3], notes[2], 'keeps the following pitch');
    assert.ok(voice.isComplete(), 'changing a division preserves musical duration');
    divisions[0].setKind('minima');
    stave.draw();
    f.Formatter().joinVoices([voice]).formatToStave([voice], stave, { stave });
    voice.draw(f.getContext(), stave);
    const extents = [
      [-0.5, 0.5],
      [0.5, 2.5],
      [0, 3],
      [0, 3],
    ];
    for (const [j, division] of divisions.entries()) {
      const box = division.getBoundingBox();
      assert.ok(Math.abs(box.y - stave.getYForLine(extents[j][0])) <= 2, 'starts on the specified line or space');
      // WebKit clamps negative text descent to zero for a glyph entirely above its baseline (minima).
      if (j === 0) assert.equal(division.getY(), stave.getYForLine(1.5), 'minima uses its SMuFL center-staff origin');
      else
        assert.ok(
          Math.abs(box.y + box.h - stave.getYForLine(extents[j][1])) <= 2,
          'ends on the specified line or space'
        );
      assert.ok(division.getAbsoluteX() > notes[2 * j + 1].getAbsoluteX(), 'division follows its pair of puncta');
      if (j < 3) assert.ok(division.getAbsoluteX() < notes[2 * j + 2].getAbsoluteX(), 'next pair follows the division');
    }
  }
}

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
