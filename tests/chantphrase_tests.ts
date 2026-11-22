// Verify the pitches, syllables and line breaks of a square-notation chant on SVG and Canvas.
import { ChantPhrase } from '../src/chantphrase';
import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

function lumina(options: TestOptions): void {
  const { assert } = options;
  const ctx = VexFlowTests.makeFactory(options, 400, 370).getContext();
  const text = [
    { pitches: ['c/4', 'd/4'], syllable: 'Lu-' },
    { pitches: ['e/4', 'd/4'], syllable: 'mi-' },
    { pitches: ['c/4'], syllable: 'na' },
  ];
  const phrase = new ChantPhrase(text);
  const draw = (y: number, width: number) => phrase.draw(ctx, { x: 10, y, width, clef: 'C', line: 3 });
  const wide = draw(0, 310);
  const first = wide[0];
  assert.equal(wide.length, 1);
  assert.deepEqual(
    first.groups.map((g) => g.kind),
    ['podatus', 'clivis', 'punctum']
  );
  // At this width the punctum moves to the next row.
  const narrow = draw(100, 123);
  assert.deepEqual(
    narrow.map((row) => row.groups.map((g) => g.syllable)),
    [['Lu-', 'mi-'], ['na']]
  );
  const groups = narrow.flatMap((row) => row.groups);
  assert.deepEqual(
    groups.map((g) => g.pitches),
    text.map((s) => s.pitches)
  );
  for (const { groups, stave, lyricY } of [...wide, ...narrow]) {
    for (const { pitches, ys } of groups) {
      assert.deepEqual(
        ys,
        pitches.map((p) => stave.getYForPitch(p))
      );
      assert.ok(ys.every((y) => y < lyricY));
    }
  }
  const again = draw(270, 310);
  assert.deepEqual(
    again[0].groups.map((g) => g.x),
    first.groups.map((g) => g.x)
  );
  assert.throws(() => new ChantPhrase([{ pitches: [], syllable: 'na' }]), /pitches/);
  assert.throws(
    () =>
      new ChantPhrase([{ pitches: ['c/4', 'c/4'], syllable: 'na' }]).draw(ctx, {
        x: 0,
        y: 0,
        width: 300,
        clef: 'C',
        line: 3,
      }),
    /rise or fall/
  );
}

const ChantPhraseTests = {
  Start(): void {
    QUnit.module('ChantPhrase');
    VexFlowTests.runTests('Lu-mi-na keeps each neume with its syllable', lumina, {}, ['Bravura']);
  },
};
VexFlowTests.register(ChantPhraseTests);
export { ChantPhraseTests };
