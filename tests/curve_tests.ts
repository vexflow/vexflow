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
    run('Opening Direction - up', openingDirUp);
    run('Opening Direction - down', openingDirDown);
    run('Rounded Curve', rounded);
    run('Thick Thin Curves', thickThin);
    run('Top Curve', top);
    run('Bounding Box', boundingBox);
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

const openingDirUp = createTest(
  ['c4/8, f5, d5, g5', { stem: 'up' }], // beamGroup1
  ['d6/8, f5, d5, g5', { stem: 'down' }], // beamGroup2
  (f, notes) => {
    f.Curve({
      from: notes[0],
      to: notes[3],
      options: {
        openingDirection: 'up',
      },
    });

    f.Curve({
      from: notes[4],
      to: notes[7],
      options: {
        openingDirection: 'up',
      },
    });
  }
);

const openingDirDown = createTest(
  ['c4/8, f5, d5, g5', { stem: 'up' }], // beamGroup1
  ['d6/8, f5, d5, g5', { stem: 'down' }], // beamGroup2
  (f, notes) => {
    f.Curve({
      from: notes[0],
      to: notes[3],
      options: {
        openingDirection: 'down',
      },
    });

    f.Curve({
      from: notes[4],
      to: notes[7],
      options: {
        openingDirection: 'down',
      },
    });
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
    }).setStyle({ lineDash: '20' });
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

/** The bounding box of a curve must enclose exactly what is drawn, thickness included. */
function boundingBox(options: TestOptions): void {
  const factory = VexFlowTests.makeFactory(options, 350, 200);
  const stave = factory.Stave({ y: 50 });
  const score = factory.EasyScore();
  const notes = score.notes('c4/8, f5, d5, g5, d6, f5, d5, g5', { stem: 'up' });

  const curves = [
    factory.Curve({
      from: notes[0],
      to: notes[3],
      options: {
        cps: [
          { x: 0, y: 10 },
          { x: 0, y: 50 },
        ],
      },
    }),
    factory.Curve({ from: notes[4], to: notes[7], options: { invert: true, xShift: -10, thickness: 5 } }),
    factory
      .Curve({
        from: notes[4],
        to: notes[7],
        options: {
          cps: [
            { x: 20, y: 30 },
            { x: -20, y: -30 },
          ],
        },
      })
      .setStyle({ lineDash: '10 10' }),
    factory.Curve({ from: notes[1], to: undefined, options: {} }), // partial curve
    factory.Curve({ from: notes[5], to: notes[6], options: { position: 'nearTop', positionEnd: 'nearTop' } }),
  ];

  const voices = [score.voice(notes, { time: '4/4' })];
  factory.Formatter().joinVoices(voices).formatToStave(voices, stave);

  // Sample the bezier curves that are actually drawn.
  const ctx = factory.getContext();
  let current = { x: 0, y: 0 };
  let points: { x: number; y: number }[] = [];
  const moveTo = ctx.moveTo.bind(ctx);
  const bezierCurveTo = ctx.bezierCurveTo.bind(ctx);
  ctx.moveTo = (x: number, y: number) => {
    current = { x, y };
    return moveTo(x, y);
  };
  ctx.bezierCurveTo = (cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number) => {
    for (let i = 0; i <= 1000; i++) {
      const t = i / 1000;
      const u = 1 - t;
      const b = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
      points.push({
        x: b[0] * current.x + b[1] * cp1x + b[2] * cp2x + b[3] * x,
        y: b[0] * current.y + b[1] * cp1y + b[2] * cp2y + b[3] * y,
      });
    }
    current = { x, y };
    return bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
  };

  const sampled: { x: number[]; y: number[] }[] = [];
  for (const curve of curves) {
    const draw = curve.draw.bind(curve);
    curve.draw = () => {
      points = [];
      const result = draw();
      sampled.push({ x: points.map((p) => p.x), y: points.map((p) => p.y) });
      return result;
    };
  }

  factory.draw();

  const near = (a: number, b: number) => Math.abs(a - b) < 0.05;
  curves.forEach((curve, i) => {
    VexFlowTests.drawBoundingBox(ctx, curve);
    const bb = curve.getBoundingBox();
    const { x, y } = sampled[i];
    const minX = Math.min(...x);
    const minY = Math.min(...y);
    options.assert.ok(near(bb.getX(), minX), `curve ${i} x ${bb.getX()} ~ ${minX}`);
    options.assert.ok(near(bb.getY(), minY), `curve ${i} y ${bb.getY()} ~ ${minY}`);
    options.assert.ok(near(bb.getW(), Math.max(...x) - minX), `curve ${i} w ${bb.getW()}`);
    options.assert.ok(near(bb.getH(), Math.max(...y) - minY), `curve ${i} h ${bb.getH()}`);
  });
}

VexFlowTests.register(CurveTests);
export { CurveTests };
