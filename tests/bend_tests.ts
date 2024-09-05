// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// Bend Tests

import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { Bend, BendPhrase } from '../src/bend';
import { Formatter } from '../src/formatter';
import { Metrics } from '../src/metrics';
import { ModifierContext } from '../src/modifiercontext';
import { Note } from '../src/note';
import { ContextBuilder } from '../src/renderer';
import { TabNote, TabNoteStruct } from '../src/tabnote';
import { TabStave } from '../src/tabstave';
import { TickContext } from '../src/tickcontext';

const BendTests = {
  Start(): void {
    QUnit.module('Bend');
    const run = VexFlowTests.runTests;
    run('Double Bends', doubleBends);
    run('Reverse Bends', reverseBends);
    run('Bend Phrase', bendPhrase);
    run('Double Bends With Release', doubleBendsWithRelease);
    run('Whako Bend', whackoBends);
    // TODO: Rename 'Whako Bend' => 'Whacko'
  },
};

// Helper functions for creating TabNote and Bend objects.
const note = (noteStruct: TabNoteStruct) => new TabNote(noteStruct);
const bendWithPhrase = (phrase: BendPhrase[]) => new Bend(phrase);

/**
 * Bend two strings at a time.
 */
function doubleBends(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 500, 240);
  ctx.scale(1.5, 1.5);

  ctx.font = '10pt Arial';
  const stave = new TabStave(10, 10, 450).addClef('tab').setContext(ctx).drawWithStyle();

  const notes = [
    note({
      positions: [
        { str: 2, fret: 10 },
        { str: 4, fret: 9 },
      ],
      duration: 'q',
    })
      .addModifier(bendWithPhrase([{ type: Bend.UP, text: 'Full' }]), 0)
      .addModifier(bendWithPhrase([{ type: Bend.UP, text: '1/2' }]), 1),

    note({
      positions: [
        { str: 2, fret: 5 },
        { str: 3, fret: 5 },
      ],
      duration: 'q',
    })
      .addModifier(bendWithPhrase([{ type: Bend.UP, text: '1/4' }]), 0)
      .addModifier(bendWithPhrase([{ type: Bend.UP, text: '1/4' }]), 1),

    // This note is not visible because it is pushed off to the right by the ctx.scale(1.5, 1.5) at the top.
    note({
      positions: [{ str: 4, fret: 7 }],
      duration: 'h',
    }),
  ];

  Formatter.FormatAndDraw(ctx, stave, notes);
  notes.forEach((note) => Note.plotMetrics(ctx, note, 140));

  options.assert.ok(true, 'Double Bends');
}

function doubleBendsWithRelease(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 550, 240);
  ctx.scale(1.0, 1.0);
  ctx.setBackgroundFillStyle('#FFF');
  ctx.setFont('Arial', VexFlowTests.Font.size);
  const stave = new TabStave(10, 10, 550).addClef('tab').setContext(ctx).drawWithStyle();

  const notes = [
    note({
      positions: [
        { str: 1, fret: 10 },
        { str: 4, fret: 9 },
      ],
      duration: 'q',
    })
      .addModifier(
        bendWithPhrase([
          { type: Bend.UP, text: '1/2' },
          { type: Bend.DOWN, text: '' },
        ]),
        0
      )
      .addModifier(
        bendWithPhrase([
          { type: Bend.UP, text: 'Full' },
          { type: Bend.DOWN, text: '' },
        ]),
        1
      ),

    note({
      positions: [
        { str: 2, fret: 5 },
        { str: 3, fret: 5 },
        { str: 4, fret: 5 },
      ],
      duration: 'q',
    })
      .addModifier(
        bendWithPhrase([
          { type: Bend.UP, text: '1/4' },
          { type: Bend.DOWN, text: '' },
        ]),
        0
      )
      .addModifier(
        bendWithPhrase([
          { type: Bend.UP, text: 'Monstrous' },
          { type: Bend.DOWN, text: '' },
        ]),
        1
      )
      .addModifier(
        bendWithPhrase([
          { type: Bend.UP, text: '1/4' },
          { type: Bend.DOWN, text: '' },
        ]),
        2
      ),

    note({
      positions: [{ str: 4, fret: 7 }],
      duration: 'q',
    }),
    note({
      positions: [{ str: 4, fret: 7 }],
      duration: 'q',
    }),
  ];

  Formatter.FormatAndDraw(ctx, stave, notes);
  notes.forEach((note) => Note.plotMetrics(ctx, note, 140));
  options.assert.ok(true, 'Bend Release');
}

/**
 * Add the bend for note 1 before adding the bend for note 0,
 * by swapping the two indexes in .addModifier(modifier, index).
 * As a result, the bend curves intersect.
 */
function reverseBends(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 500, 240);

  ctx.scale(1.5, 1.5);

  ctx.setFont('10pt Arial');

  const stave = new TabStave(10, 10, 450).addClef('tab').setContext(ctx).drawWithStyle();

  const notes = [
    note({
      positions: [
        { str: 2, fret: 10 },
        { str: 4, fret: 9 },
      ],
      duration: 'w',
    })
      .addModifier(bendWithPhrase([{ type: Bend.UP, text: 'Full' }]), 1)
      .addModifier(bendWithPhrase([{ type: Bend.UP, text: '1/2' }]), 0),

    note({
      positions: [
        { str: 2, fret: 5 },
        { str: 3, fret: 5 },
      ],
      duration: 'w',
    })
      .addModifier(bendWithPhrase([{ type: Bend.UP, text: '1/4' }]), 1)
      .addModifier(bendWithPhrase([{ type: Bend.UP, text: '1/4' }]), 0),

    note({
      positions: [{ str: 4, fret: 7 }],
      duration: 'w',
    }),
  ];

  for (let i = 0; i < notes.length; ++i) {
    const note = notes[i];
    const mc = new ModifierContext();
    note.addToModifierContext(mc);

    const tickContext = new TickContext();
    tickContext
      .addTickable(note)
      .preFormat()
      .setX(75 * i);

    note.setStave(stave).setContext(ctx).drawWithStyle();
    Note.plotMetrics(ctx, note, 140);
    options.assert.ok(true, 'Bend ' + i);
  }
}

function bendPhrase(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 500, 240);
  ctx.scale(1.5, 1.5);

  ctx.font = Metrics.get('Bend.fontSize') + Metrics.get('Bend.fontFamily'); // Optionally use constants defined in Font.
  const stave = new TabStave(10, 10, 450).addClef('tab').setContext(ctx).drawWithStyle();

  const phrase1 = [
    { type: Bend.UP, text: 'Full' },
    { type: Bend.DOWN, text: 'Monstrous' },
    { type: Bend.UP, text: '1/2' },
    { type: Bend.DOWN, text: '' },
  ];
  const bend1 = bendWithPhrase(phrase1).setContext(ctx);

  const notes = [
    note({
      positions: [{ str: 2, fret: 10 }],
      duration: 'w',
    }).addModifier(bend1, 0),
  ];

  for (let i = 0; i < notes.length; ++i) {
    const note = notes[i];
    note.addToModifierContext(new ModifierContext());

    const tickContext = new TickContext();
    tickContext
      .addTickable(note)
      .preFormat()
      .setX(75 * i);

    note.setStave(stave).setContext(ctx).drawWithStyle();
    Note.plotMetrics(ctx, note, 140);
    options.assert.ok(true, 'Bend ' + i);
  }
}

function whackoBends(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 400, 240);
  ctx.scale(1.0, 1.0);
  ctx.setBackgroundFillStyle('#FFF');
  ctx.setFont('Arial', VexFlowTests.Font.size);
  const stave = new TabStave(10, 10, 350).addClef('tab').setContext(ctx).drawWithStyle();

  const phrase1 = [
    { type: Bend.UP, text: 'Full' },
    { type: Bend.DOWN, text: '' },
    { type: Bend.UP, text: '1/2' },
    { type: Bend.DOWN, text: '' },
  ];

  const phrase2 = [
    { type: Bend.UP, text: 'Full' },
    { type: Bend.UP, text: 'Full' },
    { type: Bend.UP, text: '1/2' },
    { type: Bend.DOWN, text: '' },
    { type: Bend.DOWN, text: 'Full' },
    { type: Bend.DOWN, text: 'Full' },
    { type: Bend.UP, text: '1/2' },
    { type: Bend.DOWN, text: '' },
  ];

  const notes = [
    note({
      positions: [
        { str: 2, fret: 10 },
        { str: 3, fret: 9 },
      ],
      duration: 'q',
    })
      .addModifier(bendWithPhrase(phrase1), 0)
      .addModifier(bendWithPhrase(phrase2), 1),
  ];

  Formatter.FormatAndDraw(ctx, stave, notes);
  Note.plotMetrics(ctx, notes[0], 140);
  options.assert.ok(true, 'Whacko Bend & Release');
}

VexFlowTests.register(BendTests);
export { BendTests };
