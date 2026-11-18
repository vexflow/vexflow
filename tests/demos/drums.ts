// Pocket Change is an original drum-set groove with a two-beat triplet fill.
import { TestOptions, VexFlowTests } from '../vexflow_test_helpers';

import { BarlineType, Modifier, Stem } from '../../src/index';

/** The hands share an up-stem voice. The kick keeps its own down-stem rhythm beneath them. */
export function drums(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 900, 350);
  const score = f.EasyScore({ throwOnError: true });
  const hat = 'g/5/x2';
  const snare = 'c/5';
  const hand = (...keys: string[]) => score.make.note({ keys, duration: '8', stemDirection: Stem.UP });
  const kicks = [
    'F4/q, D4/q/r, F4/8, F4, D4/q/r',
    'F4/q., F4/8, F4/q, D4/q/r',
    'F4/q, D4/q/r, F4/8, F4, D4/q/r',
    'F4/q, D4/q/r, F4/q, F4',
  ];
  kicks.forEach((kick, i) => {
    const fill = i === 3;
    const hands = [hand(hat), hand(hat), hand(snare, hat), hand(hat)];
    hands[2].addModifier(score.make.articulation({ type: 'accent', position: 'above' }));
    score.beam(hands.slice());
    if (fill) {
      // Three strokes per quarter, descending from snare through the rack and floor toms.
      for (const run of [
        [snare, snare, 'e/5'],
        ['d/5', 'a/4', 'a/4'],
      ]) {
        const triplet = run.map((drum) => hand(drum));
        score.beam(triplet);
        score.make.tuplet({ notes: triplet, options: { numNotes: 3, notesOccupied: 2 } });
        hands.push(...triplet);
      }
    } else {
      const answer = [hand(hat), hand(snare, hat), hand(snare, hat), hand(hat)];
      // Parenthesize only the quiet snare head. The hi-hat still plays its ordinary eighth.
      answer[1].addModifier(score.make.parenthesis(Modifier.Position.LEFT), 0);
      answer[1].addModifier(score.make.parenthesis(Modifier.Position.RIGHT), 0);
      answer[2].addModifier(score.make.articulation({ type: 'accent', position: 'above' }));
      score.beam(answer);
      hands.push(...answer);
    }
    const feet = score.notes(kick, { stem: 'down' });
    if (i === 0 || i === 2) score.beam(feet.slice(2, 4));
    const stave = f
      .System({ x: 16 + (i % 2) * 432, y: 56 + Math.floor(i / 2) * 148, width: 432 })
      .addStave({ voices: [score.voice(hands), score.voice(feet)] });
    if (i % 2 === 0) stave.addClef('percussion');
    if (i === 0) stave.addTimeSignature('4/4').setTempo({ name: 'In the pocket', duration: 'q', bpm: 92 }, -43);
    if (fill) stave.setEndBarType(BarlineType.REPEAT_END);
  });
  f.draw();
  options.assert.ok(true, 'Independent kick and hands finish together after the triplet fill');
}
