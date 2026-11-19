// Run the first printed page of Chopin's third Ballade on every visual test backend.
import { TestOptions, VexFlowTests } from '../vexflow_test_helpers';

import {
  Accidental,
  Factory,
  Fraction,
  PedalMarking,
  StaveHairpin,
  Stroke,
  TextDynamics,
  Tuplet,
} from '../../src/index';

import '../scores/ballade';

/** The reference turns the page after bar 24, with six bars in each of the first two systems. */
export function ballade(options: TestOptions): void {
  const { draw, width, height } = globalThis.ChopinBallade;
  const factory = VexFlowTests.makeFactory(options, width, Math.ceil(height));
  const systems = draw(
    { Accidental, Factory, Fraction, PedalMarking, StaveHairpin, Stroke, TextDynamics, Tuplet },
    factory
  );
  options.assert.deepEqual(
    systems.map((system) => system.measures),
    [
      [1, 2, 3, 4, 5, 6],
      [7, 8, 9, 10, 11, 12],
      [13, 14, 15, 16],
      [17, 18, 19, 20],
      [21, 22, 23, 24],
    ],
    'All five systems retain the breaks of the printed page'
  );
}
