// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
// @author Raffaele Viglianti, 2012
//
// StaveHairpin Tests

import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { RenderContext } from '../src/rendercontext';
import { StaveHairpin, StaveHairpinRenderOptions } from '../src/stavehairpin';
import { StaveNote } from '../src/stavenote';

const StaveHairpinTests = {
  Start(): void {
    QUnit.module('StaveHairpin');
    const run = VexFlowTests.runTests;
    run('Simple StaveHairpin', simple);
    run('Horizontal Offset StaveHairpin', horizontal);
    run('Vertical Offset StaveHairpin', vertical);
    run('Height StaveHairpin', height);
  },
};

/**
 * Helper function to draw a single hairpin (either crescendo or decrescendo).
 * @param type is StaveHairpin.type.CRESC or StaveHairpin.type.DECRESC.
 * @param position is Modifier.Position.ABOVE or Modifier.Position.BELOW.
 */
function drawHairpin(
  firstNote: StaveNote,
  lastNote: StaveNote,
  ctx: RenderContext,
  type: number,
  position: number,
  options?: StaveHairpinRenderOptions
) {
  const hairpin = new StaveHairpin({ firstNote, lastNote }, type);
  hairpin.setContext(ctx);
  hairpin.setPosition(position);
  if (options) {
    hairpin.setRenderOptions(options);
  }
  hairpin.draw();
}

/**
 * Helper function
 */
function createTest(drawTwoHairpins: (ctx: RenderContext, notes: StaveNote[]) => void) {
  return (options: TestOptions) => {
    const factory = VexFlowTests.makeFactory(options);
    const ctx = factory.getContext();
    const stave = factory.Stave();

    const notes = [
      factory
        .StaveNote({ keys: ['c/4', 'e/4', 'a/4'], stemDirection: 1, duration: '4' })
        .addModifier(factory.Accidental({ type: 'b' }), 0)
        .addModifier(factory.Accidental({ type: '#' }), 1),
      factory.StaveNote({ keys: ['d/4'], stemDirection: 1, duration: '4' }),
      factory.StaveNote({ keys: ['e/4'], stemDirection: 1, duration: '4' }),
      factory.StaveNote({ keys: ['f/4'], stemDirection: 1, duration: '4' }),
    ];

    const voice = factory.Voice().addTickables(notes);

    factory.Formatter().joinVoices([voice]).formatToStave([voice], stave);
    factory.draw();

    drawTwoHairpins(ctx, notes);

    options.assert.ok(true, 'Simple Test');
  };
}

const simple = createTest((ctx, notes) => {
  drawHairpin(notes[0], notes[2], ctx, 1, 4);
  drawHairpin(notes[1], notes[3], ctx, 2, 3);
});

const horizontal = createTest((ctx, notes) => {
  drawHairpin(notes[0], notes[2], ctx, 1, 3, {
    height: 10,
    yShift: 0, // vertical offset
    leftShiftPx: 0, // left horizontal offset
    rightShiftPx: 0, // right horizontal offset
  });

  drawHairpin(notes[3], notes[3], ctx, 2, 4, {
    height: 10,
    yShift: 0, // vertical offset
    leftShiftPx: 0, // left horizontal offset
    rightShiftPx: 120, // right horizontal offset
  });
});

const vertical = createTest((ctx, notes) => {
  drawHairpin(notes[0], notes[2], ctx, 1, 4, {
    height: 10,
    yShift: 0, // vertical offset
    leftShiftPx: 0, // left horizontal offset
    rightShiftPx: 0, // right horizontal offset
  });
  drawHairpin(notes[2], notes[3], ctx, 2, 4, {
    height: 10,
    yShift: -15, // vertical offset
    leftShiftPx: 2, // left horizontal offset
    rightShiftPx: 0, // right horizontal offset
  });
});

const height = createTest((ctx, notes) => {
  drawHairpin(notes[0], notes[2], ctx, 1, 4, {
    height: 10,
    yShift: 0, // vertical offset
    leftShiftPx: 0, // left horizontal offset
    rightShiftPx: 0, // right horizontal offset
  });
  drawHairpin(notes[2], notes[3], ctx, 2, 4, {
    height: 15,
    yShift: 0, // vertical offset
    leftShiftPx: 2, // left horizontal offset
    rightShiftPx: 0, // right horizontal offset
  });
});

VexFlowTests.register(StaveHairpinTests);
export { StaveHairpinTests };
