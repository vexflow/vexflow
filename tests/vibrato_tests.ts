// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// Vibrato Tests

import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { Bend, ContextBuilder, Formatter, TabNote, TabNoteStruct, TabStave, Vibrato } from '../src/index';

import { Metrics } from '../src/metrics';

const VibratoTests = {
  Start(): void {
    QUnit.module('Vibrato');
    const run = VexFlowTests.runTests;
    run('Simple Vibrato', simple);
    run('Harsh Vibrato', harsh);
    run('Vibrato with Bend', withBend);
  },
};

// Helper function to create TabNote objects.
const tabNote = (noteStruct: TabNoteStruct) => new TabNote(noteStruct);

/**
 * Default vibrato symbol (wavy line) on top of a tab with two notes fretted.
 */
function simple(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 500, 240);
  ctx.scale(1.5, 1.5);

  ctx.font = '10pt Arial';
  const stave = new TabStave(10, 10, 450).addTabGlyph().setContext(ctx).drawWithStyle();

  const notes = [
    tabNote({
      positions: [
        { str: 2, fret: 10 },
        { str: 4, fret: 9 },
      ],
      duration: 'h',
    }).addModifier(new Vibrato(), 0),
    tabNote({
      positions: [{ str: 2, fret: 10 }],
      duration: 'h',
    }).addModifier(new Vibrato(), 0),
  ];

  Formatter.FormatAndDraw(ctx, stave, notes);
  options.assert.ok(true, 'Simple Vibrato');
}

/**
 * The harsh vibrato symbol is a zig zag line with sharp points.
 * This test is nearly identical to the 'simple' test above.
 * The only difference is that we call .setHarsh(true) on each Vibrato object.
 */
function harsh(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 500, 240);
  ctx.scale(1.5, 1.5);

  ctx.font = '10pt Arial';
  const stave = new TabStave(10, 10, 450).addTabGlyph().setContext(ctx).drawWithStyle();

  const notes = [
    tabNote({
      positions: [
        { str: 2, fret: 10 },
        { str: 4, fret: 9 },
      ],
      duration: 'h',
    }).addModifier(new Vibrato().setVibratoCode(0xeae2), 0),
    tabNote({
      positions: [{ str: 2, fret: 10 }],
      duration: 'h',
    }).addModifier(new Vibrato().setVibratoCode(0xeac0), 0),
  ];

  Formatter.FormatAndDraw(ctx, stave, notes);
  options.assert.ok(true, 'Harsh Vibrato');
}

function withBend(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 500, 240);
  ctx.scale(1.3, 1.3);

  ctx.setFont(Metrics.get('fontFamily'), VexFlowTests.Font.size);
  const stave = new TabStave(10, 10, 450).addTabGlyph().setContext(ctx).drawWithStyle();

  const notes = [
    tabNote({
      positions: [
        { str: 2, fret: 9 },
        { str: 3, fret: 9 },
      ],
      duration: 'q',
    })
      .addModifier(
        new Bend([
          { type: Bend.UP, text: '1/2' },
          { type: Bend.DOWN, text: '' },
        ]),
        0
      )
      .addModifier(
        new Bend([
          { type: Bend.UP, text: '1/2' },
          { type: Bend.DOWN, text: '' },
        ]),
        1
      )
      .addModifier(new Vibrato(), 0),
    tabNote({
      positions: [{ str: 2, fret: 10 }],
      duration: 'q',
    })
      .addModifier(new Bend([{ type: Bend.UP, text: 'Full' }]), 0)
      .addModifier(new Vibrato().setVibratoWidth(60), 0),
    tabNote({
      positions: [{ str: 2, fret: 10 }],
      duration: 'h',
    }).addModifier(new Vibrato().setVibratoWidth(120).setVibratoCode(0xeae2), 0),
  ];

  Formatter.FormatAndDraw(ctx, stave, notes);
  options.assert.ok(true, 'Vibrato with Bend');
}

VexFlowTests.register(VibratoTests);
export { VibratoTests };
