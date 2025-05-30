// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// StaveNote Tests

// TODO: In StaveNote.preFormat() line 929, should noteHeadPadding default to StaveNote.minNoteheadPadding?
//       The bounding box of a note changes slightly when we add a ModifierContext (even if we add zero modifiers).

import { VexFlow } from '../src/vexflow';
import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { Accidental } from '../src/accidental';
import { Annotation, AnnotationVerticalJustify } from '../src/annotation';
import { Articulation } from '../src/articulation';
import { Beam } from '../src/beam';
import { Dot } from '../src/dot';
import { Formatter } from '../src/formatter';
import { Fraction } from '../src/fraction';
import { FretHandFinger } from '../src/frethandfinger';
import { Modifier, ModifierPosition } from '../src/modifier';
import { ModifierContext } from '../src/modifiercontext';
import { Ornament } from '../src/ornament';
import { RenderContext } from '../src/rendercontext';
import { ContextBuilder } from '../src/renderer';
import { Stave } from '../src/stave';
import { StaveNote, StaveNoteStruct } from '../src/stavenote';
import { Stem } from '../src/stem';
import { StringNumber } from '../src/stringnumber';
import { Stroke } from '../src/strokes';
import { TickContext } from '../src/tickcontext';

const StaveNoteTests = {
  Start(): void {
    QUnit.module('StaveNote');
    QUnit.test('Tick', ticks);
    QUnit.test('Tick - New API', ticksNewAPI);
    QUnit.test('Stem', stem);
    QUnit.test('Automatic Stem Direction', autoStem);
    QUnit.test('Stem Extension Pitch', stemExtensionPitch);
    QUnit.test('Displacement after calling setStemDirection', setStemDirectionDisplacement);
    QUnit.test('StaveLine', staveLine);
    QUnit.test('Width', width);
    QUnit.test('TickContext', tickContext);

    const run = VexFlowTests.runTests;
    run('StaveNote Draw - Treble', drawBasic, { clef: 'treble', octaveShift: 0, restKey: 'r/4' });
    run('StaveNote BoundingBoxes - Treble', drawBoundingBoxes, { clef: 'treble', octaveShift: 0, restKey: 'r/4' });
    run('StaveNote Draw - Alto', drawBasic, { clef: 'alto', octaveShift: -1, restKey: 'r/4' });
    run('StaveNote Draw - Tenor', drawBasic, { clef: 'tenor', octaveShift: -1, restKey: 'r/3' });
    run('StaveNote Draw - Bass', drawBasic, { clef: 'bass', octaveShift: -2, restKey: 'r/3' });
    run('StaveNote Draw - Harmonic And Muted', drawHarmonicAndMuted);
    run('StaveNote Draw - Slash', drawSlash);
    run('Displacements', displacements);
    run('StaveNote Draw - Bass 2', drawBass);
    run('StaveNote Draw - Key Styles', drawKeyStyles);
    run('StaveNote Draw - StaveNote Stem Styles', drawNoteStemStyles);
    run('StaveNote Draw - StaveNote Stem Lengths', drawNoteStemLengths);
    run('StaveNote Draw - StaveNote Flag Styles', drawNoteStylesWithFlag);
    run('StaveNote Draw - StaveNote Styles', drawNoteStyles);
    run('Stave, Ledger Line, Beam, Stem and Flag Styles', drawBeamStyles);
    run('Flag and Dot Placement - Stem Up', dotsAndFlagsStemUp);
    run('Flag and Dots Placement - Stem Down', dotsAndFlagsStemDown);
    run('Beam and Dot Placement - Stem Up', dotsAndBeamsUp);
    run('Beam and Dot Placement - Stem Down', dotsAndBeamsDown);
    run('No Padding', noPadding);
    run('Note Heads Placement - Simple', noteHeadsSimple);
    run('Note Heads Placement - Hidden Notes', noteHeadsHidden);
    run('Center Aligned Note', centerAlignedRest);
    run('Center Aligned Note with Articulation', centerAlignedRestFermata);
    run('Center Aligned Note with Annotation', centerAlignedRestAnnotation);
    run('Center Aligned Note - Multi Voice', centerAlignedMultiVoice);
    run('Center Aligned Note with Multiple Modifiers', centerAlignedNoteMultiModifiers);

    // This interactivity test currently only works with the SVG backend.
    VexFlowTests.runSVGTest('Interactive Mouseover StaveNote', drawBasic, {
      clef: 'treble',
      octaveShift: 0,
      restKey: 'r/4',
      ui: true,
    });
  },
};

// Helper function to create StaveNotes.
const staveNote = (struct: StaveNoteStruct) => new StaveNote(struct);

/**
 * Helper function to draw a note with an optional bounding box.
 */
function draw(
  note: StaveNote,
  stave: Stave,
  context: RenderContext,
  x: number,
  drawBoundingBox: boolean = false,
  addModifierContext: boolean = true
) {
  // Associate the note with the stave.
  note.setStave(stave);

  // A ModifierContext is required for dots and other modifiers to be drawn properly.
  // If added, it changes the bounding box of a note, even if there are no modifiers to draw.
  // See StaveNote.minNoteheadPadding in stavenote.ts.
  if (addModifierContext) {
    note.addToModifierContext(new ModifierContext());
  }

  new TickContext().addTickable(note).preFormat().setX(x);
  note.setContext(context).drawWithStyle();

  if (drawBoundingBox) {
    const bb = note.getBoundingBox();
    context.rect(bb.getX(), bb.getY(), bb.getW(), bb.getH());
    context.stroke();
  }
  return note;
}

function ticks(assert: Assert): void {
  const BEAT = (1 * VexFlow.RESOLUTION) / 4;

  // Key value pairs of `testName: [durationString, expectedBeats, expectedNoteType]`
  const tickTests: Record<string, [string, number, string]> = {
    'Breve note': ['1/2', 8.0, 'n'],
    'Whole note': ['w', 4.0, 'n'],
    'Quarter note': ['q', 1.0, 'n'],
    'Dotted half note': ['hd', 3.0, 'n'],
    'Doubled-dotted half note': ['hdd', 3.5, 'n'],
    'Triple-dotted half note': ['hddd', 3.75, 'n'],
    'Dotted half rest': ['hdr', 3.0, 'r'],
    'Double-dotted half rest': ['hddr', 3.5, 'r'],
    'Triple-dotted half rest': ['hdddr', 3.75, 'r'],
    'Dotted harmonic quarter note': ['qdh', 1.5, 'h'],
    'Double-dotted harmonic quarter note': ['qddh', 1.75, 'h'],
    'Triple-dotted harmonic quarter note': ['qdddh', 1.875, 'h'],
    'Dotted muted 8th note': ['8dm', 0.75, 'm'],
    'Double-dotted muted 8th note': ['8ddm', 0.875, 'm'],
    'Triple-dotted muted 8th note': ['8dddm', 0.9375, 'm'],
  };

  Object.keys(tickTests).forEach((testName: string) => {
    const testData = tickTests[testName];
    const durationString = testData[0];
    const expectedBeats = testData[1];
    const expectedNoteType = testData[2];
    const note = new StaveNote({ keys: ['c/4', 'e/4', 'g/4'], duration: durationString });
    assert.equal(note.getTicks().value(), BEAT * expectedBeats, testName + ' must have ' + expectedBeats + ' beats');
    assert.equal(note.getNoteType(), expectedNoteType, 'Note type must be ' + expectedNoteType);
  });

  assert.throws(
    () => new StaveNote({ keys: ['c/4', 'e/4', 'g/4'], duration: '8.7dddm' }),
    /BadArguments/,
    "Invalid note duration '8.7' throws BadArguments exception"
  );

  assert.throws(
    () => new StaveNote({ keys: ['c/4', 'e/4', 'g/4'], duration: '2Z' }),
    /BadArguments/,
    "Invalid note type 'Z' throws BadArguments exception"
  );

  assert.throws(
    () => new StaveNote({ keys: ['c/4', 'e/4', 'g/4'], duration: '2dddZ' }),
    /BadArguments/,
    "Invalid note type 'Z' throws BadArguments exception"
  );
}

function ticksNewAPI(assert: Assert): void {
  const BEAT = (1 * VexFlow.RESOLUTION) / 4;

  // Key value pairs of `testName: [noteData, expectedBeats, expectedNoteType]`
  const tickTests: Record<string, [StaveNoteStruct, number, string]> = {
    'Breve note': [{ duration: '1/2' }, 8.0, 'n'],
    'Whole note': [{ duration: 'w' }, 4.0, 'n'],
    'Quarter note': [{ duration: 'q' }, 1.0, 'n'],
    'Dotted half note': [{ duration: 'h', dots: 1 }, 3.0, 'n'],
    'Doubled-dotted half note': [{ duration: 'h', dots: 2 }, 3.5, 'n'],
    'Triple-dotted half note': [{ duration: 'h', dots: 3 }, 3.75, 'n'],
    'Dotted half rest': [{ duration: 'h', dots: 1, type: 'r' }, 3.0, 'r'],
    'Double-dotted half rest': [{ duration: 'h', dots: 2, type: 'r' }, 3.5, 'r'],
    'Triple-dotted half rest': [{ duration: 'h', dots: 3, type: 'r' }, 3.75, 'r'],
    'Dotted harmonic quarter note': [{ duration: 'q', dots: 1, type: 'h' }, 1.5, 'h'],
    'Double-dotted harmonic quarter note': [{ duration: 'q', dots: 2, type: 'h' }, 1.75, 'h'],
    'Triple-dotted harmonic quarter note': [{ duration: 'q', dots: 3, type: 'h' }, 1.875, 'h'],
    'Dotted muted 8th note': [{ duration: '8', dots: 1, type: 'm' }, 0.75, 'm'],
    'Double-dotted muted 8th note': [{ duration: '8', dots: 2, type: 'm' }, 0.875, 'm'],
    'Triple-dotted muted 8th note': [{ duration: '8', dots: 3, type: 'm' }, 0.9375, 'm'],
  };

  Object.keys(tickTests).forEach(function (testName) {
    const testData = tickTests[testName];
    const noteData = testData[0];
    const expectedBeats = testData[1];
    const expectedNoteType = testData[2];

    noteData.keys = ['c/4', 'e/4', 'g/4'];

    const note = new StaveNote(noteData);
    assert.equal(note.getTicks().value(), BEAT * expectedBeats, testName + ' must have ' + expectedBeats + ' beats');
    assert.equal(note.getNoteType(), expectedNoteType, 'Note type must be ' + expectedNoteType);
  });

  assert.throws(
    () => new StaveNote({ keys: ['c/4', 'e/4', 'g/4'], duration: '8.7dddm' }),
    /BadArguments/,
    "Invalid note duration '8.7' throws BadArguments exception"
  );

  assert.throws(
    () => new StaveNote({ keys: ['c/4', 'e/4', 'g/4'], duration: '2Z' }),
    /BadArguments/,
    "Invalid note type 'Z' throws BadArguments exception"
  );

  assert.throws(
    () => new StaveNote({ keys: ['c/4', 'e/4', 'g/4'], duration: '2dddZ' }),
    /BadArguments/,
    "Invalid note type 'Z' throws BadArguments exception"
  );
}

function stem(assert: Assert): void {
  const note = new StaveNote({ keys: ['c/4', 'e/4', 'g/4'], duration: 'w' });
  assert.equal(note.getStemDirection(), Stem.UP, 'Default note has UP stem');
}

function autoStem(assert: Assert): void {
  const testData: [/* keys */ string[], /* expectedStemDirection */ number][] = [
    [['c/5', 'e/5', 'g/5'], Stem.DOWN],
    [['e/4', 'g/4', 'c/5'], Stem.UP],
    [['c/5'], Stem.DOWN],
    [['a/4', 'e/5', 'g/5'], Stem.DOWN],
    [['b/4'], Stem.DOWN],
  ];
  testData.forEach((td) => {
    const keys = td[0];
    const expectedStemDirection = td[1];
    const note = new StaveNote({ keys: keys, autoStem: true, duration: '8' });
    assert.equal(
      note.getStemDirection(),
      expectedStemDirection,
      'Stem must be ' + (expectedStemDirection === Stem.UP ? 'up' : 'down')
    );
  });
}

function stemExtensionPitch(assert: Assert): void {
  // [keys, expectedStemExtension, override stem direction]
  const testData: [string[], number, number][] = [
    [['c/5', 'e/5', 'g/5'], 0, 0],
    [['e/4', 'g/4', 'c/5'], 0, 0],
    [['c/5'], 0, 0],
    [['f/3'], 15, 0],
    [['f/3'], 15, Stem.UP],
    [['f/3'], 0, Stem.DOWN],
    [['f/3', 'e/5'], 0, 0],
    [['g/6'], 25, 0],
    [['g/6'], 25, Stem.DOWN],
    [['g/6'], 0, Stem.UP],
  ];
  testData.forEach((td) => {
    const keys = td[0];
    const expectedStemExtension = td[1];
    const overrideStemDirection = td[2];
    let note;
    if (overrideStemDirection === 0) {
      note = new StaveNote({ keys: keys, autoStem: true, duration: '4' });
    } else {
      note = new StaveNote({ keys: keys, duration: '4', stemDirection: overrideStemDirection });
    }
    assert.equal(
      note.getStemExtension(),
      expectedStemExtension,
      'For ' + keys.toString() + ' StemExtension must be ' + expectedStemExtension
    );
    // set to weird Stave
    const stave = new Stave(10, 10, 300, { spacingBetweenLinesPx: 20 });
    note.setStave(stave);
    assert.equal(
      note.getStemExtension(),
      expectedStemExtension * 2,
      'For wide staff ' + keys.toString() + ' StemExtension must be ' + expectedStemExtension * 2
    );

    //    const wholeNote = new StaveNote({ keys: keys, duration: 'w' });
    //    assert.equal(
    //      wholeNote.getStemExtension(),
    //      -1 * VexFlow.STEM_HEIGHT,
    //      'For ' + keys.toString() + ' wholeNote StemExtension must always be -1 * VexFlow.STEM_HEIGHT'
    //    );
  });
}

function setStemDirectionDisplacement(assert: Assert): void {
  function getDisplacements(note: StaveNote) {
    return note.noteHeads.map((noteHead) => noteHead.isDisplaced());
  }

  const stemUpDisplacements = [false, true, false];
  const stemDownDisplacements = [true, false, false];

  const note = new StaveNote({ keys: ['c/5', 'd/5', 'g/5'], stemDirection: Stem.UP, duration: '4' });
  assert.deepEqual(getDisplacements(note), stemUpDisplacements);
  note.setStemDirection(Stem.DOWN);
  assert.deepEqual(getDisplacements(note), stemDownDisplacements);
  note.setStemDirection(Stem.UP);
  assert.deepEqual(getDisplacements(note), stemUpDisplacements);
}

function staveLine(assert: Assert): void {
  const stave = new Stave(10, 10, 300);
  const note = new StaveNote({ keys: ['c/4', 'e/4', 'a/4'], duration: 'w' });
  note.setStave(stave);

  const props = note.getKeyProps();
  assert.equal(props[0].line, 0, 'C/4 on line 0');
  assert.equal(props[1].line, 1, 'E/4 on line 1');
  assert.equal(props[2].line, 2.5, 'A/4 on line 2.5');

  const ys = note.getYs();
  assert.equal(ys.length, 3, 'Chord should be rendered on three lines');
  assert.equal(ys[0], 100, 'Line for C/4');
  assert.equal(ys[1], 90, 'Line for E/4');
  assert.equal(ys[2], 75, 'Line for A/4');
}

function width(assert: Assert): void {
  const note = new StaveNote({ keys: ['c/4', 'e/4', 'a/4'], duration: 'w' });
  assert.throws(() => note.getWidth(), /UnformattedNote/, 'Unformatted note should have no width');
}

function tickContext(assert: Assert): void {
  const stave = new Stave(10, 10, 400);
  const note = new StaveNote({ keys: ['c/4', 'e/4', 'a/4'], duration: 'w' }).setStave(stave);

  new TickContext().addTickable(note).preFormat().setX(10).setPadding(0);

  assert.expect(0);
}

function drawBasic(options: TestOptions, contextBuilder: ContextBuilder): void {
  const clef = options.params.clef;
  const octaveShift = options.params.octaveShift;
  const restKey = options.params.restKey;

  const ctx = contextBuilder(options.elementId, 700, 180);
  const stave = new Stave(10, 30, 750);
  stave.setContext(ctx);
  stave.addClef(clef);
  stave.drawWithStyle();

  const lowerKeys = ['c/', 'e/', 'a/'];
  const higherKeys = ['c/', 'e/', 'a/'];
  for (let k = 0; k < lowerKeys.length; k++) {
    lowerKeys[k] = lowerKeys[k] + (4 + octaveShift);
    higherKeys[k] = higherKeys[k] + (5 + octaveShift);
  }

  const restKeys = [restKey];

  const noteStructs: StaveNoteStruct[] = [
    { clef: clef, keys: higherKeys, duration: '1/2' },
    { clef: clef, keys: lowerKeys, duration: 'w' },
    { clef: clef, keys: higherKeys, duration: 'h' },
    { clef: clef, keys: lowerKeys, duration: 'q' },
    { clef: clef, keys: higherKeys, duration: '8' },
    { clef: clef, keys: lowerKeys, duration: '16' },
    { clef: clef, keys: higherKeys, duration: '32' },
    { clef: clef, keys: higherKeys, duration: '64' },
    { clef: clef, keys: higherKeys, duration: '128' },
    { clef: clef, keys: lowerKeys, duration: '1/2', stemDirection: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: 'w', stemDirection: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: 'h', stemDirection: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: 'q', stemDirection: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: '8', stemDirection: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: '16', stemDirection: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: '32', stemDirection: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: '64', stemDirection: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: '128', stemDirection: Stem.DOWN },

    { clef: clef, keys: restKeys, duration: '1/2r' },
    { clef: clef, keys: restKeys, duration: 'wr' },
    { clef: clef, keys: restKeys, duration: 'hr' },
    { clef: clef, keys: restKeys, duration: 'qr' },
    { clef: clef, keys: restKeys, duration: '8r' },
    { clef: clef, keys: restKeys, duration: '16r' },
    { clef: clef, keys: restKeys, duration: '32r' },
    { clef: clef, keys: restKeys, duration: '64r' },
    { clef: clef, keys: restKeys, duration: '128r' },
    { keys: ['x/4'], duration: 'h' },
  ];
  options.assert.expect(noteStructs.length * 2);

  const colorDescendants = (parentItem: SVGElement, color: string) => () =>
    parentItem.querySelectorAll('*').forEach((child) => {
      child.setAttribute('fill', color);
      child.setAttribute('stroke', color);
    });

  for (let i = 0; i < noteStructs.length; ++i) {
    const note = draw(staveNote(noteStructs[i]), stave, ctx, (i + 1) * 25);

    // If this is an interactivity test (ui: true), then attach mouseover & mouseout handlers to the notes.
    if (options.params.ui) {
      const item = note.getSVGElement();
      if (item) {
        item.addEventListener('mouseover', colorDescendants(item, 'green'), false);
        item.addEventListener('mouseout', colorDescendants(item, 'black'), false);
      }
    }
    options.assert.ok(note.getX() > 0, 'Note ' + i + ' has X value');
    options.assert.ok(note.getYs().length > 0, 'Note ' + i + ' has Y values');
  }
}

function drawBoundingBoxes(options: TestOptions, contextBuilder: ContextBuilder): void {
  const clef = options.params.clef;
  const octaveShift = options.params.octaveShift;
  const restKey = options.params.restKey;

  const ctx = contextBuilder(options.elementId, 700, 180);
  const stave = new Stave(10, 30, 750);
  stave.setContext(ctx);
  stave.addClef(clef);
  stave.drawWithStyle();

  const lowerKeys = ['c/', 'e/', 'a/'];
  const higherKeys = ['c/', 'e/', 'a/'];
  for (let k = 0; k < lowerKeys.length; k++) {
    lowerKeys[k] = lowerKeys[k] + (4 + octaveShift);
    higherKeys[k] = higherKeys[k] + (5 + octaveShift);
  }

  const restKeys = [restKey];

  const noteStructs = [
    { clef: clef, keys: higherKeys, duration: '1/2' },
    { clef: clef, keys: lowerKeys, duration: 'w' },
    { clef: clef, keys: higherKeys, duration: 'h' },
    { clef: clef, keys: lowerKeys, duration: 'q' },
    { clef: clef, keys: higherKeys, duration: '8' },
    { clef: clef, keys: lowerKeys, duration: '16' },
    { clef: clef, keys: higherKeys, duration: '32' },
    { clef: clef, keys: higherKeys, duration: '64' },
    { clef: clef, keys: higherKeys, duration: '128' },
    { clef: clef, keys: lowerKeys, duration: '1/2', stemDirection: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: 'w', stemDirection: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: 'h', stemDirection: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: 'q', stemDirection: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: '8', stemDirection: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: '16', stemDirection: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: '32', stemDirection: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: '64', stemDirection: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: '128' },

    { clef: clef, keys: restKeys, duration: '1/2r' },
    { clef: clef, keys: restKeys, duration: 'wr' },
    { clef: clef, keys: restKeys, duration: 'hr' },
    { clef: clef, keys: restKeys, duration: 'qr' },
    { clef: clef, keys: restKeys, duration: '8r' },
    { clef: clef, keys: restKeys, duration: '16r' },
    { clef: clef, keys: restKeys, duration: '32r' },
    { clef: clef, keys: restKeys, duration: '64r' },
    { clef: clef, keys: restKeys, duration: '128r' },
    { keys: ['x/4'], duration: 'h' },
  ];
  options.assert.expect(noteStructs.length * 2);

  const notes: StaveNote[] = [];
  for (let i = 0; i < noteStructs.length; ++i) {
    notes.push(staveNote(noteStructs[i]));
  }
  notes[2].addModifier(new Ornament('tr'), 0);
  notes[2].addModifier(new Accidental('b'), 0);
  Dot.buildAndAttach([notes[2]], { all: true });

  for (let i = 0; i < noteStructs.length; ++i) {
    const note = draw(notes[i], stave, ctx, (i + 1) * 25, true /* drawBoundingBox */, false /* addModifierContext */);
    options.assert.ok(note.getX() > 0, 'Note ' + i + ' has X value');
    options.assert.ok(note.getYs().length > 0, 'Note ' + i + ' has Y values');
  }
}

function drawBass(options: TestOptions, contextBuilder: ContextBuilder): void {
  options.assert.expect(40);
  const ctx = contextBuilder(options.elementId, 600, 280);
  const stave = new Stave(10, 10, 650);
  stave.setContext(ctx);
  stave.addClef('bass');
  stave.drawWithStyle();

  const noteStructs: StaveNoteStruct[] = [
    { clef: 'bass', keys: ['c/3', 'e/3', 'a/3'], duration: '1/2' },
    { clef: 'bass', keys: ['c/2', 'e/2', 'a/2'], duration: 'w' },
    { clef: 'bass', keys: ['c/3', 'e/3', 'a/3'], duration: 'h' },
    { clef: 'bass', keys: ['c/2', 'e/2', 'a/2'], duration: 'q' },
    { clef: 'bass', keys: ['c/3', 'e/3', 'a/3'], duration: '8' },
    { clef: 'bass', keys: ['c/2', 'e/2', 'a/2'], duration: '16' },
    { clef: 'bass', keys: ['c/3', 'e/3', 'a/3'], duration: '32' },
    { clef: 'bass', keys: ['c/2', 'e/2', 'a/2'], duration: 'h', stemDirection: Stem.DOWN },
    { clef: 'bass', keys: ['c/2', 'e/2', 'a/2'], duration: 'q', stemDirection: Stem.DOWN },
    { clef: 'bass', keys: ['c/2', 'e/2', 'a/2'], duration: '8', stemDirection: Stem.DOWN },
    { clef: 'bass', keys: ['c/2', 'e/2', 'a/2'], duration: '16', stemDirection: Stem.DOWN },
    { clef: 'bass', keys: ['c/2', 'e/2', 'a/2'], duration: '32', stemDirection: Stem.DOWN },

    { keys: ['r/4'], duration: '1/2r' },
    { keys: ['r/4'], duration: 'wr' },
    { keys: ['r/4'], duration: 'hr' },
    { keys: ['r/4'], duration: 'qr' },
    { keys: ['r/4'], duration: '8r' },
    { keys: ['r/4'], duration: '16r' },
    { keys: ['r/4'], duration: '32r' },
    { keys: ['x/4'], duration: 'h' },
  ];

  for (let i = 0; i < noteStructs.length; ++i) {
    const note = draw(staveNote(noteStructs[i]), stave, ctx, (i + 1) * 25);

    options.assert.ok(note.getX() > 0, 'Note ' + i + ' has X value');
    options.assert.ok(note.getYs().length > 0, 'Note ' + i + ' has Y values');
  }
}

function displacements(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 700, 155);
  ctx.scale(0.9, 0.9);

  const stave = new Stave(10, 10, 675);
  stave.setContext(ctx);
  stave.drawWithStyle();

  const noteStructs = [
    { keys: ['g/3', 'a/3', 'c/4', 'd/4', 'e/4'], duration: '1/2' },
    { keys: ['g/3', 'a/3', 'c/4', 'd/4', 'e/4'], duration: 'w' },
    { keys: ['d/4', 'e/4', 'f/4'], duration: 'h' },
    { keys: ['f/4', 'g/4', 'a/4', 'b/4'], duration: 'q' },
    { keys: ['e/3', 'b/3', 'c/4', 'e/4', 'f/4', 'g/5', 'a/5'], duration: '8' },
    { keys: ['a/3', 'c/4', 'e/4', 'g/4', 'a/4', 'b/4'], duration: '16' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '32' },
    { keys: ['c/4', 'e/4', 'a/4', 'a/4'], duration: '64' },
    { keys: ['g/3', 'c/4', 'd/4', 'e/4'], duration: 'h', stemDirection: Stem.DOWN },
    { keys: ['d/4', 'e/4', 'f/4'], duration: 'q', stemDirection: Stem.DOWN },
    { keys: ['f/4', 'g/4', 'a/4', 'b/4'], duration: '8', stemDirection: Stem.DOWN },
    { keys: ['c/4', 'd/4', 'e/4', 'f/4', 'g/4', 'a/4'], duration: '16', stemDirection: Stem.DOWN },
    { keys: ['b/3', 'c/4', 'e/4', 'a/4', 'b/5', 'c/6', 'e/6'], duration: '32', stemDirection: Stem.DOWN },
    {
      keys: ['b/3', 'c/4', 'e/4', 'a/4', 'b/5', 'c/6', 'e/6', 'e/6'],
      duration: '64',
      stemDirection: Stem.DOWN,
    },
  ];
  options.assert.expect(noteStructs.length * 2);

  for (let i = 0; i < noteStructs.length; ++i) {
    const note = draw(staveNote(noteStructs[i]), stave, ctx, (i + 1) * 45);

    options.assert.ok(note.getX() > 0, 'Note ' + i + ' has X value');
    options.assert.ok(note.getYs().length > 0, 'Note ' + i + ' has Y values');
  }
}

function drawHarmonicAndMuted(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 1000, 180);
  const stave = new Stave(10, 10, 950);
  stave.setContext(ctx);
  stave.drawWithStyle();

  const noteStructs = [
    { keys: ['c/4', 'e/4', 'a/4'], duration: '1/2h' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: 'wh' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: 'hh' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: 'qh' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '8h' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '16h' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '32h' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '64h' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '128h' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '1/2h', stemDirection: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: 'wh', stemDirection: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: 'hh', stemDirection: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: 'qh', stemDirection: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '8h', stemDirection: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '16h', stemDirection: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '32h', stemDirection: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '64h', stemDirection: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '128h', stemDirection: Stem.DOWN },

    { keys: ['c/4', 'e/4', 'a/4'], duration: '1/2m' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: 'wm' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: 'hm' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: 'qm' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '8m' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '16m' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '32m' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '64m' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '128m' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '1/2m', stemDirection: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: 'wm', stemDirection: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: 'hm', stemDirection: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: 'qm', stemDirection: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '8m', stemDirection: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '16m', stemDirection: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '32m', stemDirection: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '64m', stemDirection: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '128m', stemDirection: Stem.DOWN },
  ];
  options.assert.expect(noteStructs.length * 2);

  for (let i = 0; i < noteStructs.length; ++i) {
    const note = draw(staveNote(noteStructs[i]), stave, ctx, i * 25 + 5);

    options.assert.ok(note.getX() > 0, 'Note ' + i + ' has X value');
    options.assert.ok(note.getYs().length > 0, 'Note ' + i + ' has Y values');
  }
}

function drawSlash(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 700, 180);
  const stave = new Stave(10, 10, 650);
  stave.setContext(ctx);
  stave.drawWithStyle();

  const notes = [
    { keys: ['b/4'], duration: '1/2s', stemDirection: Stem.DOWN },
    { keys: ['b/4'], duration: 'ws', stemDirection: Stem.DOWN },
    { keys: ['b/4'], duration: 'hs', stemDirection: Stem.DOWN },
    { keys: ['b/4'], duration: 'qs', stemDirection: Stem.DOWN },
    { keys: ['b/4'], duration: '8s', stemDirection: Stem.DOWN },
    { keys: ['b/4'], duration: '16s', stemDirection: Stem.DOWN },
    { keys: ['b/4'], duration: '32s', stemDirection: Stem.DOWN },
    { keys: ['b/4'], duration: '64s', stemDirection: Stem.DOWN },
    { keys: ['b/4'], duration: '128s', stemDirection: Stem.DOWN },

    { keys: ['b/4'], duration: '1/2s', stemDirection: Stem.UP },
    { keys: ['b/4'], duration: 'ws', stemDirection: Stem.UP },
    { keys: ['b/4'], duration: 'hs', stemDirection: Stem.UP },
    { keys: ['b/4'], duration: 'qs', stemDirection: Stem.UP },
    { keys: ['b/4'], duration: '8s', stemDirection: Stem.UP },
    { keys: ['b/4'], duration: '16s', stemDirection: Stem.UP },
    { keys: ['b/4'], duration: '32s', stemDirection: Stem.UP },
    { keys: ['b/4'], duration: '64s', stemDirection: Stem.UP },
    { keys: ['b/4'], duration: '128s', stemDirection: Stem.UP },

    // Beam
    { keys: ['b/4'], duration: '8s', stemDirection: Stem.DOWN },
    { keys: ['b/4'], duration: '8s', stemDirection: Stem.DOWN },
    { keys: ['b/4'], duration: '8s', stemDirection: Stem.UP },
    { keys: ['b/4'], duration: '8s', stemDirection: Stem.UP },
  ];

  const staveNotes = notes.map((struct) => new StaveNote(struct));
  const beam1 = new Beam([staveNotes[16], staveNotes[17]]);
  const beam2 = new Beam([staveNotes[18], staveNotes[19]]);

  Formatter.FormatAndDraw(ctx, stave, staveNotes, false);

  beam1.setContext(ctx).drawWithStyle();
  beam2.setContext(ctx).drawWithStyle();

  options.assert.ok('Slash Note Heads');
}

function drawKeyStyles(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 300, 280);
  ctx.scale(3, 3);

  const stave = new Stave(10, 0, 100);

  const note = new StaveNote({ keys: ['g/4', 'bb/4', 'd/5'], duration: 'q' })
    .setStave(stave)
    .addModifier(new Accidental('b'), 1)
    .setKeyStyle(1, { shadowBlur: 2, shadowColor: 'blue', fillStyle: 'blue' });

  new TickContext().addTickable(note).preFormat().setX(25);

  stave.setContext(ctx).drawWithStyle();
  note.setContext(ctx).drawWithStyle();

  options.assert.ok(note.getX() > 0, 'Note has X value');
  options.assert.ok(note.getYs().length > 0, 'Note has Y values');
}

function drawNoteStyles(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 300, 280);
  const stave = new Stave(10, 0, 100);
  ctx.scale(3, 3);

  const note = new StaveNote({ keys: ['g/4', 'bb/4', 'd/5'], duration: '8' })
    .setStave(stave)
    .addModifier(new Accidental('b'), 1);

  note.setStyle({ shadowBlur: 2, shadowColor: 'blue', fillStyle: 'blue', strokeStyle: 'blue' });

  new TickContext().addTickable(note).preFormat().setX(25);

  stave.setContext(ctx).drawWithStyle();
  note.setContext(ctx).drawWithStyle();

  options.assert.ok(note.getX() > 0, 'Note has X value');
  options.assert.ok(note.getYs().length > 0, 'Note has Y values');
}

function drawNoteStemStyles(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 300, 280);
  const stave = new Stave(10, 0, 100);
  ctx.scale(3, 3);

  const note = new StaveNote({ keys: ['g/4', 'bb/4', 'd/5'], duration: 'q' })
    .setStave(stave)
    .addModifier(new Accidental('b'), 1);

  note.setStemStyle({ shadowBlur: 2, shadowColor: 'blue', fillStyle: 'blue', strokeStyle: 'blue' });

  new TickContext().addTickable(note).preFormat().setX(25);

  stave.setContext(ctx).drawWithStyle();
  note.setContext(ctx).drawWithStyle();

  options.assert.ok('Note Stem Style');
}

function drawNoteStemLengths(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 975, 150);
  const stave = new Stave(10, 10, 975);
  stave.setContext(ctx).drawWithStyle();

  const keys = [
    'e/3',
    'f/3',
    'g/3',
    'a/3',
    'b/3',
    'c/4',
    'd/4',
    'e/4',
    'f/4',
    'g/4',
    'f/5',
    'g/5',
    'a/5',
    'b/5',
    'c/6',
    'd/6',
    'e/6',
    'f/6',
    'g/6',
    'a/6',
  ];
  const notes: StaveNote[] = [];
  let note;
  let i;

  for (i = 0; i < keys.length; i++) {
    let duration = 'q';
    if (i % 2 === 1) {
      duration = '8';
    }
    note = new StaveNote({ keys: [keys[i]], duration, autoStem: true }).setStave(stave);
    new TickContext().addTickable(note);
    note.setContext(ctx);
    notes.push(note);
  }

  const wholeKeys = ['e/3', 'a/3', 'f/5', 'a/5', 'd/6', 'a/6'];
  for (i = 0; i < wholeKeys.length; i++) {
    note = new StaveNote({ keys: [wholeKeys[i]], duration: 'w' }).setStave(stave);
    new TickContext().addTickable(note);
    note.setContext(ctx);
    notes.push(note);
  }
  Formatter.FormatAndDraw(ctx, stave, notes);

  options.assert.ok('Note Stem Length');
}

function drawNoteStylesWithFlag(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 300, 280);
  const stave = new Stave(10, 0, 100);
  ctx.scale(3, 3);

  const note = new StaveNote({ keys: ['g/4', 'bb/4', 'd/5'], duration: '8' })
    .setStave(stave)
    .addModifier(new Accidental('b'), 1);

  note.setFlagStyle({ shadowBlur: 2, shadowColor: 'blue', fillStyle: 'blue', strokeStyle: 'blue' });

  new TickContext().addTickable(note).preFormat().setX(25);

  stave.setContext(ctx).drawWithStyle();
  note.setContext(ctx).drawWithStyle();

  options.assert.ok(note.getX() > 0, 'Note has X value');
  options.assert.ok(note.getYs().length > 0, 'Note has Y values');
}

function drawBeamStyles(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 400, 160);
  const stave = new Stave(10, 10, 380);
  stave.setStyle({ strokeStyle: '#EEAAEE', lineWidth: 3 });
  stave.setContext(ctx);
  stave.drawWithStyle();

  const notes = [
    // beam1
    { keys: ['b/4'], duration: '8', stemDirection: Stem.DOWN },
    { keys: ['b/4'], duration: '8', stemDirection: Stem.DOWN },

    // should be unstyled...
    { keys: ['b/4'], duration: '8', stemDirection: Stem.DOWN },

    // beam2 should also be unstyled
    { keys: ['b/4'], duration: '8', stemDirection: Stem.DOWN },
    { keys: ['b/4'], duration: '8', stemDirection: Stem.DOWN },

    // beam3
    { keys: ['b/4'], duration: '8', stemDirection: Stem.UP },
    { keys: ['b/4'], duration: '8', stemDirection: Stem.UP },

    // beam4
    { keys: ['d/6'], duration: '8', stemDirection: Stem.DOWN },
    { keys: ['c/6', 'd/6'], duration: '8', stemDirection: Stem.DOWN },

    // unbeamed
    { keys: ['d/6', 'e/6'], duration: '8', stemDirection: Stem.DOWN },

    // unbeamed, unstyled
    { keys: ['e/6', 'f/6'], duration: '8', stemDirection: Stem.DOWN },
  ];

  const staveNotes = notes.map((note) => new StaveNote(note));

  const beam1 = new Beam(staveNotes.slice(0, 2));
  const beam2 = new Beam(staveNotes.slice(3, 5));
  const beam3 = new Beam(staveNotes.slice(5, 7));
  const beam4 = new Beam(staveNotes.slice(7, 9));

  // stem, key, ledger, flag; beam.setStyle

  beam1.setStyle({ fillStyle: 'blue', strokeStyle: 'blue' });

  staveNotes[0].setKeyStyle(0, { fillStyle: 'purple' });
  staveNotes[0].setStemStyle({ strokeStyle: 'green' });
  staveNotes[1].setStemStyle({ strokeStyle: 'orange' });
  staveNotes[1].setKeyStyle(0, { fillStyle: 'darkturquoise' });

  staveNotes[5].setStyle({ fillStyle: 'tomato', strokeStyle: 'tomato' });
  beam3.setStyle({ shadowBlur: 4, shadowColor: 'blue' });

  staveNotes[9].setLedgerLineStyle({ fillStyle: 'lawngreen', strokeStyle: 'lawngreen', lineWidth: 1 });
  staveNotes[9].setFlagStyle({ fillStyle: 'orange', strokeStyle: 'orange' });

  Formatter.FormatAndDraw(ctx, stave, staveNotes, false);

  beam1.setContext(ctx).drawWithStyle();
  beam2.setContext(ctx).drawWithStyle();
  beam3.setContext(ctx).drawWithStyle();
  beam4.setContext(ctx).drawWithStyle();

  options.assert.ok('draw beam styles');
}

function dotsAndFlagsStemUp(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 800, 150);
  ctx.scale(1.0, 1.0);

  const stave = new Stave(10, 10, 975);

  const notes = [
    staveNote({ keys: ['f/4'], duration: '4', stemDirection: Stem.UP }),
    staveNote({ keys: ['f/4'], duration: '8', stemDirection: Stem.UP }),
    staveNote({ keys: ['f/4'], duration: '16', stemDirection: Stem.UP }),
    staveNote({ keys: ['f/4'], duration: '32', stemDirection: Stem.UP }),
    staveNote({ keys: ['f/4'], duration: '64', stemDirection: Stem.UP }),
    staveNote({ keys: ['f/4'], duration: '128', stemDirection: Stem.UP }),
    staveNote({ keys: ['g/4'], duration: '4', stemDirection: Stem.UP }),
    staveNote({ keys: ['g/4'], duration: '8', stemDirection: Stem.UP }),
    staveNote({ keys: ['g/4'], duration: '16', stemDirection: Stem.UP }),
    staveNote({ keys: ['g/4'], duration: '32' }),
    staveNote({ keys: ['g/4'], duration: '64', stemDirection: Stem.UP }),
    staveNote({ keys: ['g/4'], duration: '128', stemDirection: Stem.UP }),
  ];
  Dot.buildAndAttach(notes, { all: true });
  Dot.buildAndAttach([notes[5], notes[11]], { all: true });

  stave.setContext(ctx).drawWithStyle();

  for (let i = 0; i < notes.length; ++i) {
    draw(notes[i], stave, ctx, i * 65);
  }

  options.assert.ok(true, 'Full Dot');
}

function dotsAndFlagsStemDown(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 800, 160);
  ctx.scale(1.0, 1.0);

  const stave = new Stave(10, 10, 975);

  const staveNotes = [
    staveNote({ keys: ['e/5'], duration: '4', stemDirection: Stem.DOWN }),
    staveNote({ keys: ['e/5'], duration: '8', stemDirection: Stem.DOWN }),
    staveNote({ keys: ['e/5'], duration: '16', stemDirection: Stem.DOWN }),
    staveNote({ keys: ['e/5'], duration: '32', stemDirection: Stem.DOWN }),
    staveNote({ keys: ['e/5'], duration: '64', stemDirection: Stem.DOWN }),
    staveNote({ keys: ['e/5'], duration: '128', stemDirection: Stem.DOWN }),
    staveNote({ keys: ['d/5'], duration: '4', stemDirection: Stem.DOWN }),
    staveNote({ keys: ['d/5'], duration: '8', stemDirection: Stem.DOWN }),
    staveNote({ keys: ['d/5'], duration: '16', stemDirection: Stem.DOWN }),
    staveNote({ keys: ['d/5'], duration: '32', stemDirection: Stem.DOWN }),
    staveNote({ keys: ['d/5'], duration: '64', stemDirection: Stem.DOWN }),
    staveNote({ keys: ['d/5'], duration: '128', stemDirection: Stem.DOWN }),
  ];
  Dot.buildAndAttach(staveNotes, { all: true });

  stave.setContext(ctx).drawWithStyle();

  for (let i = 0; i < staveNotes.length; ++i) {
    draw(staveNotes[i], stave, ctx, i * 65);
  }

  options.assert.ok(true, 'Full Dot');
}

function dotsAndBeamsUp(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 800, 150);
  ctx.scale(1.0, 1.0);

  const stave = new Stave(10, 10, 975);

  const staveNotes = [
    staveNote({ keys: ['f/4'], duration: '8', stemDirection: Stem.UP }),
    staveNote({ keys: ['f/4'], duration: '16', stemDirection: Stem.UP }),
    staveNote({ keys: ['f/4'], duration: '32', stemDirection: Stem.UP }),
    staveNote({ keys: ['f/4'], duration: '64', stemDirection: Stem.UP }),
    staveNote({ keys: ['f/4'], duration: '128', stemDirection: Stem.UP }),
    staveNote({ keys: ['g/4'], duration: '8', stemDirection: Stem.UP }),
    staveNote({ keys: ['g/4'], duration: '16', stemDirection: Stem.UP }),
    staveNote({ keys: ['g/4'], duration: '32' }),
    staveNote({ keys: ['g/4'], duration: '64', stemDirection: Stem.UP }),
    staveNote({ keys: ['g/4'], duration: '128', stemDirection: Stem.UP }),
  ];
  Dot.buildAndAttach(staveNotes, { all: true });
  Dot.buildAndAttach([staveNotes[4], staveNotes[9]], { all: true });

  const beam = new Beam(staveNotes);

  stave.setContext(ctx).drawWithStyle();

  for (let i = 0; i < staveNotes.length; ++i) {
    draw(staveNotes[i], stave, ctx, i * 65);
  }

  beam.setContext(ctx).drawWithStyle();

  options.assert.ok(true, 'Full Dot');
}

function dotsAndBeamsDown(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 800, 160);
  ctx.scale(1.0, 1.0);

  const stave = new Stave(10, 10, 975);

  const staveNotes = [
    staveNote({ keys: ['e/5'], duration: '8', stemDirection: Stem.DOWN }),
    staveNote({ keys: ['e/5'], duration: '16', stemDirection: Stem.DOWN }),
    staveNote({ keys: ['e/5'], duration: '32', stemDirection: Stem.DOWN }),
    staveNote({ keys: ['e/5'], duration: '64', stemDirection: Stem.DOWN }),
    staveNote({ keys: ['e/5'], duration: '128', stemDirection: Stem.DOWN }),
    staveNote({ keys: ['d/5'], duration: '8', stemDirection: Stem.DOWN }),
    staveNote({ keys: ['d/5'], duration: '16', stemDirection: Stem.DOWN }),
    staveNote({ keys: ['d/5'], duration: '32', stemDirection: Stem.DOWN }),
    staveNote({ keys: ['d/5'], duration: '64', stemDirection: Stem.DOWN }),
    staveNote({ keys: ['d/5'], duration: '128', stemDirection: Stem.DOWN }),
  ];
  Dot.buildAndAttach(staveNotes, { all: true });

  const beam = new Beam(staveNotes);

  stave.setContext(ctx).drawWithStyle();

  for (let i = 0; i < staveNotes.length; ++i) {
    draw(staveNotes[i], stave, ctx, i * 65);
  }

  beam.setContext(ctx).drawWithStyle();

  options.assert.ok(true, 'Full Dot');
}

function noteHeadsSimple(options: TestOptions): void {
  const factory = VexFlowTests.makeFactory(options, 800, 250);
  const score = factory.EasyScore();

  const system1 = factory.System({ y: 100, x: 50, width: 200 });
  system1
    .addStave({
      voices: [
        score.voice([...score.beam(score.notes('a4/8, b4/8', { stem: 'up' })), ...score.notes('a4/q/r, a4/h/r')]),
        score.voice(score.notes('g4/w')),
      ],
    })
    .addClef('treble')
    .addTimeSignature('4/4');

  const system2 = factory.System({ y: 100, x: 250, width: 150 });
  system2.addStave({
    voices: [score.voice(score.notes('b4/h, b4/h/r')), score.voice(score.notes('b4/w'))],
  });

  const system3 = factory.System({ y: 100, x: 400, width: 150 });
  system3.addStave({
    voices: [score.voice(score.notes('d5/h, d5/h/r')), score.voice(score.notes('e4/w'))],
  });

  const system4 = factory.System({ y: 100, x: 550, width: 150 });
  system4.addStave({
    voices: [
      score.voice(score.notes('e4/q, e4/q/r, e4/h/r')),
      score.voice(score.notes('e4/8, e4/8/r, e4/q/r, e4/h/r')),
    ],
  });

  factory.draw();
  options.assert.expect(0);
}

function noPadding(options: TestOptions): void {
  const factory = VexFlowTests.makeFactory(options, 800, 500);
  const score = factory.EasyScore();

  function newStave(y: number, noPadding: boolean): void {
    let system = factory.System({ y, x: 50, width: 200, noPadding });
    system
      .addStave({
        voices: [
          score.voice([...score.beam(score.notes('a4/8, b4/8', { stem: 'up' })), ...score.notes('a4/q, a4/h')]),
          score.voice(score.notes('g4/w')),
        ],
      })
      .addClef('treble')
      .addTimeSignature('4/4');

    system = factory.System({ y, x: 250, width: 150, noPadding });
    system.addStave({
      voices: [score.voice(score.notes('b4/h, b4/h')), score.voice(score.notes('b4/w'))],
    });

    system = factory.System({ y, x: 400, width: 150, noPadding });
    system.addStave({
      voices: [score.voice(score.notes('d5/h, d5/h')), score.voice(score.notes('e4/w'))],
    });

    system = factory.System({ y, x: 550, width: 150, noPadding });
    system.addStave({
      voices: [score.voice(score.notes('e4/q, e4/q, e4/h')), score.voice(score.notes('e4/8, e4/8, e4/q, e4/h'))],
    });
  }

  newStave(100, true);
  newStave(200, false);
  factory.draw();
  options.assert.expect(0);
}

function noteHeadsHidden(options: TestOptions): void {
  const factory = VexFlowTests.makeFactory(options, 800, 250);
  const score = factory.EasyScore();

  const system1 = factory.System({ y: 100, x: 50, width: 200 });
  const notes1 = score.notes('g4/w');
  notes1[0].renderOptions.draw = false;
  system1
    .addStave({
      voices: [
        score.voice([...score.beam(score.notes('a4/8, b4/8', { stem: 'up' })), ...score.notes('a4/q/r, a4/h/r')]),
        score.voice(notes1),
      ],
    })
    .addClef('treble')
    .addTimeSignature('4/4');

  const system2 = factory.System({ y: 100, x: 250, width: 150 });
  const notes2 = score.notes('b4/w');
  notes2[0].renderOptions.draw = false;
  system2.addStave({
    voices: [score.voice(score.notes('b4/h, b4/h/r')), score.voice(notes2)],
  });

  const system3 = factory.System({ y: 100, x: 400, width: 150 });
  system3.addStave({
    voices: [score.voice(score.notes('d5/h, d5/h/r')), score.voice(score.notes('e4/w'))],
  });

  const system4 = factory.System({ y: 100, x: 550, width: 150 });
  const notes4 = score.notes('e4/q, e4/q/r, e4/h/r');
  notes4[0].renderOptions.draw = false;
  notes4[2].renderOptions.draw = false;
  system4.addStave({
    voices: [score.voice(notes4), score.voice(score.notes('e4/8, e4/8/r, e4/q/r, e4/h/r'))],
  });

  factory.draw();
  options.assert.expect(0);
}

function centerAlignedRest(options: TestOptions): void {
  const factory = VexFlowTests.makeFactory(options, 400, 160);
  const stave = factory.Stave({ x: 10, y: 10, width: 350 }).addClef('treble').addTimeSignature('4/4');
  const note = factory.StaveNote({ keys: ['b/4'], duration: '1r', alignCenter: true });
  const voice = factory.Voice().setStrict(false).addTickables([note]);
  factory.Formatter().joinVoices([voice]).formatToStave([voice], stave);
  factory.draw();
  options.assert.ok(true);
}

function centerAlignedRestFermata(options: TestOptions): void {
  const factory = VexFlowTests.makeFactory(options, 400, 160);

  const stave = factory.Stave({ x: 10, y: 10, width: 350 }).addClef('treble').addTimeSignature('4/4');

  const note = factory
    .StaveNote({ keys: ['b/4'], duration: '1r', alignCenter: true })
    .addModifier(new Articulation('a@a').setPosition(3), 0);

  const voice = factory.Voice().setStrict(false).addTickables([note]);

  factory.Formatter().joinVoices([voice]).formatToStave([voice], stave);

  factory.draw();

  options.assert.ok(true);
}

function centerAlignedRestAnnotation(options: TestOptions): void {
  const factory = VexFlowTests.makeFactory(options, 400, 160);

  const stave = factory.Stave({ x: 10, y: 10, width: 350 }).addClef('treble').addTimeSignature('4/4');

  const note = factory
    .StaveNote({ keys: ['b/4'], duration: '1r', alignCenter: true })
    .addModifier(new Annotation('Whole measure rest').setVerticalJustification(AnnotationVerticalJustify.TOP), 0);

  const voice = factory.Voice().setStrict(false).addTickables([note]);

  factory.Formatter().joinVoices([voice]).formatToStave([voice], stave);

  factory.draw();

  options.assert.ok(true);
}

function centerAlignedNoteMultiModifiers(options: TestOptions): void {
  const factory = VexFlowTests.makeFactory(options, 400, 160);

  const stave = factory.Stave({ x: 10, y: 10, width: 350 }).addClef('treble').addTimeSignature('4/4');

  function newFinger(num: string, pos: ModifierPosition) {
    return new FretHandFinger(num).setPosition(pos);
  }

  const note = factory
    .StaveNote({ keys: ['c/4', 'e/4', 'g/4'], duration: '4', alignCenter: true })
    .addModifier(new Annotation('Test').setPosition(3), 0)
    .addStroke(0, new Stroke(2))
    .addModifier(new Accidental('#'), 1)
    .addModifier(newFinger('3', Modifier.Position.LEFT), 0)
    .addModifier(newFinger('2', Modifier.Position.LEFT), 2)
    .addModifier(newFinger('1', Modifier.Position.RIGHT), 1)
    .addModifier(new StringNumber('4').setPosition(Modifier.Position.BELOW), 2);
  Dot.buildAndAttach([note], { all: true });

  const voice = factory.Voice().setStrict(false).addTickables([note]);

  factory.Formatter().joinVoices([voice]).formatToStave([voice], stave);

  factory.draw();

  options.assert.ok(true);
}

function centerAlignedMultiVoice(options: TestOptions): void {
  const factory = VexFlowTests.makeFactory(options, 400, 160);

  const stave = factory.Stave({ x: 10, y: 10, width: 350 }).addClef('treble').addTimeSignature('3/8');

  // Set a custom duration of 3 / 8.
  const customDuration = new Fraction(3, 8);
  // TODO: Should the whole rest draw a ledger line that is visible to the left/right of the rest?
  const notes0 = [
    factory.StaveNote({
      keys: ['c/4'],
      duration: '1r',
      alignCenter: true,
      durationOverride: customDuration,
    }),
  ];

  const createStaveNote = (struct: StaveNoteStruct) => factory.StaveNote(struct);
  const notes1 = [
    { keys: ['b/4'], duration: '8' },
    { keys: ['b/4'], duration: '8' },
    { keys: ['b/4'], duration: '8' },
  ].map(createStaveNote);

  notes1[1].addModifier(factory.Accidental({ type: '#' }), 0);

  factory.Beam({ notes: notes1 });

  const voice0 = factory.Voice({ time: '3/8' }).setStrict(false).addTickables(notes0);
  const voice1 = factory.Voice({ time: '3/8' }).setStrict(false).addTickables(notes1);

  factory.Formatter().joinVoices([voice0, voice1]).formatToStave([voice0, voice1], stave);

  factory.draw();

  options.assert.ok(true);
}

VexFlowTests.register(StaveNoteTests);
export { StaveNoteTests };
