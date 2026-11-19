// Engrave Bach's opening eight bars on each backend using the print edition's source.
import { TestOptions, VexFlowTests } from '../vexflow_test_helpers';

import { Fraction, TextDynamics } from '../../src/index';

import '../scores/fugue';

/** The excerpt includes the subject, answer, and third entrance in the bass. */
export function fugue(options: TestOptions): void {
  const width = 1300;
  const factory = VexFlowTests.makeFactory(options, width, 640);
  const score = factory.EasyScore({ throwOnError: true, extensions: ['spacer', 'ornament', 'dynamic'] });
  const notation = { Fraction, TextDynamics };
  score.addCommitHook(globalThis.BachFugue.noteMarks(notation));
  const music = globalThis.BachFugue.music(notation, 8);
  music.system = { ...music.system, spaceBetweenStaves: 6 };
  music.sheet = { x: 18, y: 18, width: width - 36, measurePadding: 18, rowGap: 18 };
  const { sheet, systems, staves } = score.compose(music);
  sheet.format();
  factory.getContext().resize(width, Math.ceil(sheet.getHeight() + 24));
  factory.draw();
  options.assert.equal(systems.length, 8, 'Eight complete measures');
  options.assert.ok(
    staves.every((pair) => pair.length === 2),
    'Both hands share the grand staff throughout'
  );
}
