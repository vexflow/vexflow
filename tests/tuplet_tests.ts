// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// Tuplet Tests

import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { Dot } from '../src/dot';
import { Formatter } from '../src/formatter';
import { Glyphs } from '../src/glyphs';
import { Stem } from '../src/stem';
import { Tuplet } from '../src/tuplet';

const TupletTests = {
  Start(): void {
    QUnit.module('Tuplet');
    const run = VexFlowTests.runTests;
    run('Bounding Box Above', aboveBounding);
    run('Bounding Box Below', belowBounding);
    run('Simple Tuplet', simple);
    run('Beamed Tuplet', beamed);
    run('Ratioed Tuplet', ratio);
    run('Suffixed Tuplet', suffix);
    run('Bottom Tuplet', bottom);
    run('Bottom Ratioed Tuplet', bottomRatio);
    run('Bottom Suffixed Tuplet', bottomSuffix);
    run('Awkward Tuplet', awkward);
    run('Complex Tuplet', complex);
    run('Mixed Stem Direction Tuplet', mixedTop);
    run('Mixed Stem Direction Bottom Tuplet', mixedBottom);
    run('Nested Tuplets', nested);
    run('Nested Tuplets Only Tuplet Children', nestedChildren);
    run('Single Tuplets', single);
  },
};

// Helper Functions to set the stem direction and duration of the options objects (i.e., StaveNoteStruct)
// that are ultimately passed into Factory.StaveNote().
// eslint-disable-next-line
const set = (key: string) => (value: number | string) => (object: any) => {
  object[key] = value;
  return object;
};
const setStemDirection = set('stemDirection');
const setStemUp = setStemDirection(Stem.UP);
const setStemDown = setStemDirection(Stem.DOWN);
const setDurationToQuarterNote = set('duration')('4');

function aboveBounding(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 600);
  const stave = f.Stave({ x: 10, y: 10 });

  const notes = [
    { keys: ['g/4'], duration: '4' },
    { keys: ['a/4'], duration: '4' },
    { keys: ['b/4'], duration: '4' },
    { keys: ['g/4'], duration: '4' },
    { keys: ['a/4'], duration: '4' },
    { keys: ['b/4'], duration: '4' },
    { keys: ['g/4'], duration: '4' },
    { keys: ['a/4'], duration: '4' },
    { keys: ['b/4'], duration: '4' },
    { keys: ['g/4'], duration: '4' },
    { keys: ['a/4'], duration: '4' },
    { keys: ['b/4'], duration: '4' },
    { keys: ['g/4'], duration: '4' },
    { keys: ['a/4'], duration: '4' },
    { keys: ['b/4'], duration: '4' },
    { keys: ['g/4'], duration: '4' },
    { keys: ['a/4'], duration: '4' },
    { keys: ['b/4'], duration: '4' },
    { keys: ['g/4'], duration: '4' },
    { keys: ['a/4'], duration: '4' },
    { keys: ['b/4'], duration: '4' },
  ]
    .map(setStemUp)
    .map(f.StaveNote.bind(f));

  const tuplet = f.Tuplet({ notes: notes.slice(0, 3), options: { notesOccupied: 2, numNotes: 3, bracketed: false } });
  const ratioedTuplet = f.Tuplet({
    notes: notes.slice(3, 6),
    options: { notesOccupied: 2, numNotes: 3, bracketed: false, ratioed: true },
  });
  const suffixTuplet = f.Tuplet({
    notes: notes.slice(6, 9),
    options: { notesOccupied: 2, numNotes: 3, bracketed: false, suffix: Glyphs.metNoteQuarterUp },
  });
  const ratioedSuffixTuplet = f.Tuplet({
    notes: notes.slice(9, 12),
    options: { notesOccupied: 2, numNotes: 3, bracketed: false, suffix: Glyphs.metNoteQuarterUp, ratioed: true },
  });
  const bracketedTuplet = f.Tuplet({ notes: notes.slice(12, 15), options: { notesOccupied: 2, numNotes: 3 } });
  const bracketedRatioedTuplet = f.Tuplet({
    notes: notes.slice(15, 18),
    options: { notesOccupied: 2, numNotes: 3, ratioed: true },
  });
  const bracketedRatioedSuffixTuplet = f.Tuplet({
    notes: notes.slice(18),
    options: { notesOccupied: 2, numNotes: 3, suffix: Glyphs.metNoteQuarterUp, ratioed: true },
  });

  const voice = f.Voice().setStrict(false).addTickables(notes);

  new Formatter().joinVoices([voice]).formatToStave([voice], stave);

  f.draw();

  VexFlowTests.drawBoundingBox(f.getContext(), tuplet);
  VexFlowTests.drawBoundingBox(f.getContext(), ratioedTuplet);
  VexFlowTests.drawBoundingBox(f.getContext(), suffixTuplet);
  VexFlowTests.drawBoundingBox(f.getContext(), ratioedSuffixTuplet);
  VexFlowTests.drawBoundingBox(f.getContext(), bracketedTuplet);
  VexFlowTests.drawBoundingBox(f.getContext(), bracketedRatioedTuplet);
  VexFlowTests.drawBoundingBox(f.getContext(), bracketedRatioedSuffixTuplet);

  options.assert.ok(true, 'Bounding Box Above Test');
}

function belowBounding(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 600);
  const stave = f.Stave({ x: 10, y: 10 });

  const notes = [
    { keys: ['g/4'], duration: '4' },
    { keys: ['a/4'], duration: '4' },
    { keys: ['b/4'], duration: '4' },
    { keys: ['g/4'], duration: '4' },
    { keys: ['a/4'], duration: '4' },
    { keys: ['b/4'], duration: '4' },
    { keys: ['g/4'], duration: '4' },
    { keys: ['a/4'], duration: '4' },
    { keys: ['b/4'], duration: '4' },
    { keys: ['g/4'], duration: '4' },
    { keys: ['a/4'], duration: '4' },
    { keys: ['b/4'], duration: '4' },
    { keys: ['g/4'], duration: '4' },
    { keys: ['a/4'], duration: '4' },
    { keys: ['b/4'], duration: '4' },
    { keys: ['g/4'], duration: '4' },
    { keys: ['a/4'], duration: '4' },
    { keys: ['b/4'], duration: '4' },
    { keys: ['g/4'], duration: '4' },
    { keys: ['a/4'], duration: '4' },
    { keys: ['b/4'], duration: '4' },
  ]
    .map(setStemUp)
    .map(f.StaveNote.bind(f));

  const tuplet = f.Tuplet({
    notes: notes.slice(0, 3),
    options: { notesOccupied: 2, numNotes: 3, bracketed: false, location: -1 },
  });
  const ratioedTuplet = f.Tuplet({
    notes: notes.slice(3, 6),
    options: { notesOccupied: 2, numNotes: 3, bracketed: false, ratioed: true, location: -1 },
  });
  const suffixTuplet = f.Tuplet({
    notes: notes.slice(6, 9),
    options: { notesOccupied: 2, numNotes: 3, bracketed: false, suffix: Glyphs.metNoteQuarterUp, location: -1 },
  });
  const ratioedSuffixTuplet = f.Tuplet({
    notes: notes.slice(9, 12),
    options: {
      notesOccupied: 2,
      numNotes: 3,
      bracketed: false,
      suffix: Glyphs.metNoteQuarterUp,
      ratioed: true,
      location: -1,
    },
  });
  const bracketedTuplet = f.Tuplet({
    notes: notes.slice(12, 15),
    options: { notesOccupied: 2, numNotes: 3, location: -1 },
  });
  const bracketedRatioedTuplet = f.Tuplet({
    notes: notes.slice(15, 18),
    options: { notesOccupied: 2, numNotes: 3, ratioed: true, location: -1 },
  });
  const bracketedRatioedSuffixTuplet = f.Tuplet({
    notes: notes.slice(18),
    options: { notesOccupied: 2, numNotes: 3, suffix: Glyphs.metNoteQuarterUp, ratioed: true, location: -1 },
  });

  const voice = f.Voice().setStrict(false).addTickables(notes);

  new Formatter().joinVoices([voice]).formatToStave([voice], stave);

  f.draw();

  VexFlowTests.drawBoundingBox(f.getContext(), tuplet);
  VexFlowTests.drawBoundingBox(f.getContext(), ratioedTuplet);
  VexFlowTests.drawBoundingBox(f.getContext(), suffixTuplet);
  VexFlowTests.drawBoundingBox(f.getContext(), ratioedSuffixTuplet);
  VexFlowTests.drawBoundingBox(f.getContext(), bracketedTuplet);
  VexFlowTests.drawBoundingBox(f.getContext(), bracketedRatioedTuplet);
  VexFlowTests.drawBoundingBox(f.getContext(), bracketedRatioedSuffixTuplet);

  options.assert.ok(true, 'Bounding Box Below Test');
}

/**
 * Simple test case with one ascending triplet and one descending triplet.
 */
function simple(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options);
  const stave = f.Stave({ x: 10, y: 10, width: 350 }).addTimeSignature('3/4');

  const notes = [
    { keys: ['g/4'], duration: '4' },
    { keys: ['a/4'], duration: '4' },
    { keys: ['b/4'], duration: '4' },
    { keys: ['b/4'], duration: '8' },
    { keys: ['a/4'], duration: '8' },
    { keys: ['g/4'], duration: '8' },
  ]
    .map(setStemUp)
    .map(f.StaveNote.bind(f));

  f.Tuplet({ notes: notes.slice(0, 3) });
  f.Tuplet({ notes: notes.slice(3, 6) });

  // 3/4 time
  const voice = f
    .Voice({ time: { numBeats: 3, beatValue: 4 } })
    .setStrict(true)
    .addTickables(notes);

  new Formatter().joinVoices([voice]).formatToStave([voice], stave);

  f.draw();

  options.assert.ok(true, 'Simple Test');
}

function beamed(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options);
  const stave = f.Stave({ x: 10, y: 10, width: 350 }).addTimeSignature('3/8');

  const notes = [
    { keys: ['b/4'], duration: '16' },
    { keys: ['a/4'], duration: '16' },
    { keys: ['g/4'], duration: '16' },
    { keys: ['a/4'], duration: '8' },
    { keys: ['f/4'], duration: '8' },
    { keys: ['a/4'], duration: '8' },
    { keys: ['f/4'], duration: '8' },
    { keys: ['a/4'], duration: '8' },
    { keys: ['f/4'], duration: '8' },
    { keys: ['g/4'], duration: '8' },
  ]
    .map(setStemUp)
    .map(f.StaveNote.bind(f));

  f.Beam({ notes: notes.slice(0, 3) });
  f.Beam({ notes: notes.slice(3, 10) });
  f.Tuplet({ notes: notes.slice(0, 3) });
  f.Tuplet({ notes: notes.slice(3, 10) });

  // 3/8 time
  const voice = f
    .Voice({ time: { numBeats: 3, beatValue: 8 } })
    .setStrict(true)
    .addTickables(notes);

  new Formatter().joinVoices([voice]).formatToStave([voice], stave);

  f.draw();

  options.assert.ok(true, 'Beamed Test');
}

function ratio(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options);
  const stave = f.Stave({ x: 10, y: 10, width: 350 }).addTimeSignature('4/4');

  const notes = [
    { keys: ['f/4'], duration: '4' },
    { keys: ['a/4'], duration: '4' },
    { keys: ['b/4'], duration: '4' },
    { keys: ['g/4'], duration: '8' },
    { keys: ['e/4'], duration: '8' },
    { keys: ['g/4'], duration: '8' },
  ]
    .map(setStemUp)
    .map(f.StaveNote.bind(f));

  f.Beam({
    notes: notes.slice(3, 6),
  });

  f.Tuplet({
    notes: notes.slice(0, 3),
    options: {
      ratioed: true,
    },
  });

  f.Tuplet({
    notes: notes.slice(3, 6),
    options: {
      ratioed: true,
      notesOccupied: 4,
    },
  });

  const voice = f.Voice().setStrict(true).addTickables(notes);

  new Formatter().joinVoices([voice]).formatToStave([voice], stave);

  f.draw();

  options.assert.ok(true, 'Ratioed Test');
}

function suffix(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options);
  const stave = f.Stave({ x: 10, y: 10, width: 350 }).addTimeSignature('4/4');

  const notes = [
    { keys: ['f/4'], duration: '4' },
    { keys: ['a/4'], duration: '4' },
    { keys: ['b/4'], duration: '4' },
    { keys: ['g/4'], duration: '8' },
    { keys: ['e/4'], duration: '8' },
    { keys: ['g/4'], duration: '8' },
  ]
    .map(setStemUp)
    .map(f.StaveNote.bind(f));

  f.Beam({
    notes: notes.slice(3, 6),
  });

  f.Tuplet({
    notes: notes.slice(0, 3),
    options: {
      ratioed: true,
      suffix: Glyphs.noteQuarterUp,
    },
  });

  f.Tuplet({
    notes: notes.slice(3, 6),
    options: {
      ratioed: true,
      notesOccupied: 4,
      suffix: Glyphs.note8thUp,
    },
  });

  const voice = f.Voice().setStrict(true).addTickables(notes);

  new Formatter().joinVoices([voice]).formatToStave([voice], stave);

  f.draw();

  options.assert.ok(true, 'Base Duration Test');
}

function bottom(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 350, 160);
  const stave = f.Stave({ x: 10, y: 10 }).addTimeSignature('3/4');

  const notes = [
    { keys: ['f/4'], duration: '4' },
    { keys: ['c/4'], duration: '4' },
    { keys: ['g/4'], duration: '4' },
    { keys: ['d/5'], duration: '8' },
    { keys: ['g/3'], duration: '8' },
    { keys: ['b/4'], duration: '8' },
  ]
    .map(setStemDown)
    .map(f.StaveNote.bind(f));

  f.Beam({
    notes: notes.slice(3, 6),
  });

  f.Tuplet({
    notes: notes.slice(0, 3),
    options: { location: Tuplet.LOCATION_BOTTOM },
  });

  f.Tuplet({
    notes: notes.slice(3, 6),
    options: { location: Tuplet.LOCATION_BOTTOM },
  });

  const voice = f
    .Voice({ time: { numBeats: 3, beatValue: 4 } })
    .setStrict(true)
    .addTickables(notes);

  new Formatter().joinVoices([voice]).formatToStave([voice], stave);

  f.draw();

  options.assert.ok(true, 'Bottom Test');
}

function bottomRatio(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 350, 160);
  const stave = f.Stave({ x: 10, y: 10 }).addTimeSignature('5/8');

  const notes = [
    { keys: ['f/4'], duration: '4' },
    { keys: ['c/4'], duration: '4' },
    { keys: ['d/4'], duration: '4' },
    { keys: ['d/5'], duration: '8' },
    { keys: ['g/5'], duration: '8' },
    { keys: ['b/4'], duration: '8' },
  ]
    .map(setStemDown)
    .map(f.StaveNote.bind(f));

  f.Beam({
    notes: notes.slice(3, 6),
  });

  f.Tuplet({
    notes: notes.slice(0, 3),
    options: {
      location: Tuplet.LOCATION_BOTTOM,
      ratioed: true,
    },
  });

  f.Tuplet({
    notes: notes.slice(3, 6),
    options: {
      location: Tuplet.LOCATION_BOTTOM,
      notesOccupied: 1,
    },
  });

  const voice = f
    .Voice({ time: { numBeats: 5, beatValue: 8 } })
    .setStrict(true)
    .addTickables(notes);

  new Formatter().joinVoices([voice]).formatToStave([voice], stave);

  f.draw();

  options.assert.ok(true, 'Bottom Ratioed Test');
}

function bottomSuffix(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 350, 160);
  const stave = f.Stave({ x: 10, y: 10 }).addTimeSignature('5/8');

  const notes = [
    { keys: ['f/4'], duration: '4' },
    { keys: ['c/4'], duration: '4' },
    { keys: ['d/4'], duration: '4' },
    { keys: ['d/5'], duration: '8' },
    { keys: ['g/5'], duration: '8' },
    { keys: ['b/4'], duration: '8' },
  ]
    .map(setStemDown)
    .map(f.StaveNote.bind(f));

  f.Beam({
    notes: notes.slice(3, 6),
  });

  f.Tuplet({
    notes: notes.slice(0, 3),
    options: {
      location: Tuplet.LOCATION_BOTTOM,
      ratioed: true,
      suffix: Glyphs.metNoteQuarterUp,
    },
  });

  f.Tuplet({
    notes: notes.slice(3, 6),
    options: {
      location: Tuplet.LOCATION_BOTTOM,
      notesOccupied: 1,
      suffix: Glyphs.metNote8thUp,
    },
  });

  const voice = f
    .Voice({ time: { numBeats: 5, beatValue: 8 } })
    .setStrict(true)
    .addTickables(notes);

  new Formatter().joinVoices([voice]).formatToStave([voice], stave);

  f.draw();

  options.assert.ok(true, 'Bottom Base Duration Test');
}

function awkward(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 370, 160);
  const stave = f.Stave({ x: 10, y: 10 });

  const notes = [
    { keys: ['g/4'], duration: '16' },
    { keys: ['b/4'], duration: '16' },
    { keys: ['a/4'], duration: '16' },
    { keys: ['a/4'], duration: '16' },
    { keys: ['g/4'], duration: '16' },
    { keys: ['f/4'], duration: '16' },
    { keys: ['e/4'], duration: '16' },
    { keys: ['c/4'], duration: '16' },
    { keys: ['g/4'], duration: '16' },
    { keys: ['a/4'], duration: '16' },
    { keys: ['f/4'], duration: '16' },
    { keys: ['e/4'], duration: '16' },
    { keys: ['c/4'], duration: '8' },
    { keys: ['d/4'], duration: '8' },
    { keys: ['e/4'], duration: '8' },
  ]
    .map(setStemUp)
    .map(f.StaveNote.bind(f));

  f.Beam({ notes: notes.slice(0, 12) });
  f.Tuplet({
    notes: notes.slice(0, 12),
    options: {
      notesOccupied: 142,
      ratioed: true,
    },
  });

  f.Tuplet({
    notes: notes.slice(12, 15),
    options: {
      ratioed: true,
    },
  }).setBracketed(true);

  const voice = f.Voice().setStrict(false).addTickables(notes);

  new Formatter().joinVoices([voice]).formatToStave([voice], stave);

  f.draw();

  options.assert.ok(true, 'Awkward Test');
}

function complex(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 600);
  const stave = f.Stave({ x: 10, y: 10 }).addTimeSignature('4/4');

  const notes1 = [
    { keys: ['b/4'], duration: '8d' },
    { keys: ['a/4'], duration: '16' },
    { keys: ['g/4'], duration: '8' },
    { keys: ['a/4'], duration: '16' },
    { keys: ['b/4'], duration: '16r' },
    { keys: ['g/4'], duration: '32' },
    { keys: ['f/4'], duration: '32' },
    { keys: ['g/4'], duration: '32' },
    { keys: ['f/4'], duration: '32' },
    { keys: ['a/4'], duration: '16' },
    { keys: ['f/4'], duration: '8' },
    { keys: ['b/4'], duration: '8' },
    { keys: ['a/4'], duration: '8' },
    { keys: ['g/4'], duration: '8' },
    { keys: ['b/4'], duration: '8' },
    { keys: ['a/4'], duration: '8' },
  ]
    .map(setStemUp)
    .map(f.StaveNote.bind(f));

  Dot.buildAndAttach([notes1[0]], { all: true });

  const notes2 = [{ keys: ['c/4'] }, { keys: ['c/4'] }, { keys: ['c/4'] }, { keys: ['c/4'] }]
    .map(setDurationToQuarterNote)
    .map(setStemDown)
    .map(f.StaveNote.bind(f));

  f.Beam({ notes: notes1.slice(0, 3) });
  f.Beam({ notes: notes1.slice(5, 9) });
  f.Beam({ notes: notes1.slice(11, 16) });

  f.Tuplet({
    notes: notes1.slice(0, 3),
  });

  f.Tuplet({
    notes: notes1.slice(3, 11),
    options: {
      numNotes: 7,
      notesOccupied: 4,
      ratioed: false,
    },
  });

  f.Tuplet({
    notes: notes1.slice(11, 16),
    options: {
      notesOccupied: 4,
    },
  });

  const voice1 = f.Voice().setStrict(true).addTickables(notes1);

  const voice2 = f.Voice().setStrict(true).addTickables(notes2);

  new Formatter().joinVoices([voice1, voice2]).formatToStave([voice1, voice2], stave);

  f.draw();

  options.assert.ok(true, 'Complex Test');
}

function mixedTop(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options);
  const stave = f.Stave({ x: 10, y: 10 });

  const notes = [
    { keys: ['a/4'], stemDirection: 1 },
    { keys: ['c/6'], stemDirection: -1 },
    { keys: ['a/4'], stemDirection: 1 },
    { keys: ['f/5'], stemDirection: 1 },
    { keys: ['a/4'], stemDirection: -1 },
    { keys: ['c/6'], stemDirection: -1 },
  ]
    .map(setDurationToQuarterNote)
    .map(f.StaveNote.bind(f));

  f.Tuplet({
    notes: notes.slice(0, 2),
    options: {
      notesOccupied: 3,
    },
  });

  f.Tuplet({
    notes: notes.slice(2, 4),
    options: {
      notesOccupied: 3,
    },
  });

  f.Tuplet({
    notes: notes.slice(4, 6),
    options: {
      notesOccupied: 3,
    },
  });

  const voice = f.Voice().setStrict(false).addTickables(notes);

  new Formatter().joinVoices([voice]).formatToStave([voice], stave);

  f.draw();

  options.assert.ok(true, 'Mixed Stem Direction Tuplet');
}

function mixedBottom(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options);
  const stave = f.Stave({ x: 10, y: 10 });

  const notes = [
    { keys: ['f/3'], stemDirection: 1 },
    { keys: ['a/5'], stemDirection: -1 },
    { keys: ['a/4'], stemDirection: 1 },
    { keys: ['f/3'], stemDirection: 1 },
    { keys: ['a/4'], stemDirection: -1 },
    { keys: ['c/4'], stemDirection: -1 },
  ]
    .map(setDurationToQuarterNote)
    .map(f.StaveNote.bind(f));

  f.Tuplet({
    notes: notes.slice(0, 2),
    options: {
      notesOccupied: 3,
    },
  });

  f.Tuplet({
    notes: notes.slice(2, 4),
    options: {
      notesOccupied: 3,
    },
  });

  f.Tuplet({
    notes: notes.slice(4, 6),
    options: {
      notesOccupied: 3,
    },
  });

  const voice = f.Voice().setStrict(false).addTickables(notes);

  new Formatter().joinVoices([voice]).formatToStave([voice], stave);

  f.draw();

  options.assert.ok(true, 'Mixed Stem Direction Bottom Tuplet');
}

function nested(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options);
  const stave = f.Stave({ x: 10, y: 10 }).addTimeSignature('4/4');

  const notes = [
    // Big triplet 1:
    { keys: ['b/4'], duration: '4' },
    { keys: ['a/4'], duration: '4' },
    { keys: ['g/4'], duration: '16' },
    { keys: ['a/4'], duration: '16' },
    { keys: ['f/4'], duration: '16' },
    { keys: ['a/4'], duration: '16' },
    { keys: ['g/4'], duration: '16' },
    { keys: ['b/4'], duration: '2' },
  ]
    .map(setStemUp)
    .map(f.StaveNote.bind(f));

  f.Beam({
    notes: notes.slice(2, 7),
  });

  f.Tuplet({
    notes: notes.slice(2, 7),
    options: {
      notesOccupied: 4,
      numNotes: 5,
    },
  });

  f.Tuplet({
    notes: notes.slice(0, 7),
    options: {
      notesOccupied: 2,
      numNotes: 3,
    },
  });

  // 4/4 time
  const voice = f.Voice().setStrict(true).addTickables(notes);

  new Formatter().joinVoices([voice]).formatToStave([voice], stave);

  f.draw();

  options.assert.ok(true, 'Nested Tuplets');
}

function nestedChildren(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options);
  const stave = f.Stave({ x: 10, y: 10 }).addTimeSignature('4/4');

  const notes = [
    // Big triplet 1:
    { keys: ['b/4'], duration: '4' },
    { keys: ['a/4'], duration: '4' },
    { keys: ['c/4'], duration: '4' },
    { keys: ['g/4'], duration: '8' },
    { keys: ['a/4'], duration: '8' },
    { keys: ['f/4'], duration: '8' },
  ]
    .map(setStemUp)
    .map(f.StaveNote.bind(f));

  f.Beam({
    notes: notes.slice(3),
  });

  f.Tuplet({
    notes: notes.slice(0, 3),
    options: {
      notesOccupied: 2,
      numNotes: 3,
    },
  });

  f.Tuplet({
    notes: notes.slice(3),
    options: {
      notesOccupied: 2,
      numNotes: 3,
    },
  });

  f.Tuplet({
    notes: notes.slice(),
    options: {
      notesOccupied: 4,
      numNotes: 3,
    },
  });

  // 4/4 time
  const voice = f.Voice().setStrict(true).addTickables(notes);

  new Formatter().joinVoices([voice]).formatToStave([voice], stave);

  f.draw();

  options.assert.ok(true, 'Nested Tuplets Only Tuplet Children');
}

function single(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options);
  const stave = f.Stave({ x: 10, y: 10 }).addTimeSignature('4/4');

  const notes = [
    // Big triplet 1:
    { keys: ['c/4'], duration: '4' },
    { keys: ['d/4'], duration: '8' },
    { keys: ['e/4'], duration: '8' },
    { keys: ['f/4'], duration: '8' },
    { keys: ['g/4'], duration: '8' },
    { keys: ['a/4'], duration: '2' },
    { keys: ['b/4'], duration: '4' },
  ]
    .map(setStemUp)
    .map(f.StaveNote.bind(f));

  f.Beam({
    notes: notes.slice(1, 4),
  });

  // first singleton
  f.Tuplet({
    notes: notes.slice(0, 1),
    options: {
      numNotes: 3,
      notesOccupied: 2,
      ratioed: true,
    },
  });

  // eighth note triplet
  f.Tuplet({
    notes: notes.slice(1, 4),
    options: {
      numNotes: 3,
      notesOccupied: 2,
    },
  });

  // second singleton
  f.Tuplet({
    notes: notes.slice(4, 5),
    options: {
      numNotes: 3,
      notesOccupied: 2,
      ratioed: true,
      bracketed: true,
    },
  });

  // big quartuplet
  f.Tuplet({
    notes: notes.slice(0, -1),
    options: {
      numNotes: 4,
      notesOccupied: 3,
      ratioed: true,
      bracketed: true,
    },
  });

  // 4/4 time
  const voice = f
    .Voice({ time: { numBeats: 4, beatValue: 4 } })
    .setStrict(true)
    .addTickables(notes);

  new Formatter().joinVoices([voice]).formatToStave([voice], stave);

  f.draw();

  options.assert.ok(true, 'Nested Tuplets');
}

VexFlowTests.register(TupletTests);
export { TupletTests };
