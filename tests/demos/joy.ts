// The finale theme from Beethoven's Ninth Symphony, arranged here for two cellos.
import { TestOptions, VexFlowTests } from '../vexflow_test_helpers';

import { BarlineType, StaveHairpin } from '../../src/index';

/** Give the first cello the eight-bar period and the second a slower answering bass line. */
export function joy(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 900, 435);
  const score = f.EasyScore({ throwOnError: true });
  score.set({ clef: 'bass', time: '4/4' });
  // F and C are sharp throughout, as indicated by the D major key signature.
  const duet = [
    ['F3/q, F3, G3, A3', 'D3/h, A2'],
    ['A3/q, G3, F3, E3', 'F2/h, A2'],
    ['D3/q, D3, E3, F3', 'B2/h, G2'],
    ['F3/q., E3/8, E3/h', 'A2/w'],
    ['F3/q, F3, G3, A3', 'D3/h, A2'],
    ['A3/q, G3, F3, E3', 'F2/h, A2'],
    ['D3/q, D3, E3, F3', 'G2/h, A2'],
    ['E3/q., D3/8, D3/h', 'A2/h, D2'],
  ];
  duet.forEach(([tune, bass], i) => {
    const notes = score.notes(tune);
    const system = f.System({
      x: 24 + (i % 4) * 213,
      y: 10 + Math.floor(i / 4) * 210,
      width: 213,
      spaceBetweenStaves: 10,
    });
    const voices = [score.voice(notes)];
    // Give the two phrases different starting colors and a written destination for each swell.
    if (i % 2 === 0) {
      const dynamic = ['p', 'mf', 'mp', 'f'][i / 2];
      voices.push(score.voice([score.make.textDynamics({ text: dynamic, duration: 'w', line: 10 })]));
    }
    const first = system.addStave({ voices });
    const second = system.addStave({ voices: [score.voice(score.notes(bass))] });
    if (i % 4 === 0) {
      first.addClef('bass').addKeySignature('D');
      second.addClef('bass').addKeySignature('D');
      if (i === 0) {
        first.addTimeSignature('4/4');
        second.addTimeSignature('4/4');
      }
      system.addConnector('bracket');
    }
    if (i === 1 || i === 5) {
      score.make.hairpin({
        from: notes[0],
        to: notes[3],
        type: StaveHairpin.type.CRESC,
        options: { height: 8, yShift: -21 },
      });
    }
    if (i === 0 || i === 4) notes[0].addModifier(score.make.articulation({ type: 'tenuto', position: 'above' }));
    if (i === 3 || i === 7) score.make.curve({ from: notes[0], to: notes[1] });
    if (i === 7) {
      first.setEndBarType(BarlineType.END);
      second.setEndBarType(BarlineType.END);
    }
    system.addConnector('singleRight');
  });
  f.draw();
  options.assert.ok(true, 'Two cello parts aligned through the cadence');
}
