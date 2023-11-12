// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// Curve Tests

import { concat, TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { CurvePosition } from '../src/curve';
import { BuilderOptions } from '../src/easyscore';
import { Factory } from '../src/factory';
import { StemmableNote } from '../src/stemmablenote';

const CurveTests = {
  Start(): void {
    QUnit.module('Curve');
    const run = VexFlowTests.runTests;
    run('Simple Curve', simple);
    run('Rounded Curve', rounded);
    run('Thick Thin Curves', thickThin);
    run('Top Curve', top);
  },
};

// Will be used as params for EasyScore.notes(...).
type NoteParams = [string, BuilderOptions];

/**
 * Helper function. Each test case passes in a set of notes and
 * a setupCurves() callback which uses Factory.Curve(...) to build the curves.
 * Curves can be used to indicate slurs (legato articulation).
 */
function createTest(
  noteGroup1: NoteParams,
  noteGroup2: NoteParams,
  setupCurves: (f: Factory, n: StemmableNote[]) => void
) {
  return (options: TestOptions) => {
    const factory = VexFlowTests.makeFactory(options, 350, 200);
    const stave = factory.Stave({ y: 50 });
    const score = factory.EasyScore();

    // Use .reduce(concat) to flatten the two StaveNote[] into a single StaveNote[].
    const staveNotes = [
      score.beam(score.notes(...noteGroup1)), // group 1
      score.beam(score.notes(...noteGroup2)), // group 2
    ].reduce(concat);

    setupCurves(factory, staveNotes);

    const voices = [score.voice(staveNotes, { time: '4/4' })];
    factory.Formatter().joinVoices(voices).formatToStave(voices, stave);
    factory.draw();

    options.assert.ok('Simple Curve');
  };
}

const simple = createTest(
  ['c4/8, f5, d5, g5', { stem: 'up' }], // beamGroup1
  ['d6/8, f5, d5, g5', { stem: 'down' }], // beamGroup2
  (f, notes) => {
    f.Curve({
      from: notes[0],
      to: notes[3],
      options: {
        cps: [
          { x: 0, y: 10 },
          { x: 0, y: 50 },
        ],
      },
    });

    f.Curve({
      from: notes[4],
      to: notes[7],
      options: {
        cps: [
          { x: 0, y: 10 },
          { x: 0, y: 20 },
        ],
      },
    }).setStyle({ lineDash: '10 10' });
  }
);

const rounded = createTest(
  ['c5/8, f4, d4, g5', { stem: 'up' }], // beamGroup1
  ['d5/8, d6, d6, g5', { stem: 'down' }], // beamGroup2
  (f, notes) => {
    f.Curve({
      from: notes[0],
      to: notes[3],
      options: {
        xShift: -10,
        yShift: 30,
        cps: [
          { x: 0, y: 20 },
          { x: 0, y: 50 },
        ],
      },
    });

    f.Curve({
      from: notes[4],
      to: notes[7],
      options: {
        cps: [
          { x: 0, y: 50 },
          { x: 0, y: 50 },
        ],
      },
    }).setStyle({ lineDash: '20' });;
  }
);

const thickThin = createTest(
  ['c5/8, f4, d4, g5', { stem: 'up' }], // beamGroup1
  ['d5/8, d6, d6, g5', { stem: 'down' }], // beamGroup2
  (f, notes) => {
    f.Curve({
      from: notes[0],
      to: notes[3],
      options: {
        thickness: 10,
        xShift: -10,
        yShift: 30,
        cps: [
          { x: 0, y: 20 },
          { x: 0, y: 50 },
        ],
      },
    });

    f.Curve({
      from: notes[4],
      to: notes[7],
      options: {
        thickness: 0,
        cps: [
          { x: 0, y: 50 },
          { x: 0, y: 50 },
        ],
      },
    });
  }
);

const top = createTest(
  ['c5/8, f4, d4, g5', { stem: 'up' }], // beamGroup1
  ['d5/8, d6, d6, g5', { stem: 'down' }], // beamGroup2
  (f, notes) => {
    f.Curve({
      from: notes[0],
      to: notes[7],
      options: {
        xShift: -3,
        yShift: 10,
        position: CurvePosition.NEAR_TOP,
        positionEnd: CurvePosition.NEAR_HEAD,
        cps: [
          { x: 0, y: 20 },
          { x: 40, y: 80 },
        ],
      },
    });
  }
);

VexFlowTests.register(CurveTests);
export { CurveTests };
