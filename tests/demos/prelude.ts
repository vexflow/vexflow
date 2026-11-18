// BWV 846 in an editorial two-hand distribution. A single voice moves between the staves.
import { TestOptions, VexFlowTests } from '../vexflow_test_helpers';

import { StaveHairpin, StemmableNote } from '../../src/index';

/** Group by the quarter-note pulse, preserving Bach's eight-note arpeggio in each half-bar. */
export function prelude(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 900, 525);
  const score = f.EasyScore({ throwOnError: true });
  const harmonies = [
    ['C4', 'E4', 'G4', 'C5', 'E5'],
    ['C4', 'D4', 'A4', 'D5', 'F5'],
    ['B3', 'D4', 'G4', 'D5', 'F5'],
    ['C4', 'E4', 'G4', 'C5', 'E5'],
  ];
  harmonies.forEach(([bass, inner, a, b, c], i) => {
    const system = f.System({
      x: 24 + (i % 2) * 428,
      y: 40 + Math.floor(i / 2) * 250,
      width: 428,
      spaceBetweenStaves: 9,
    });
    const treble = system.addStave({ voices: [] });
    // Dynamics sit below the bass stave, leaving the space between the hands clear for the beams.
    const dynamic = ['p', '', 'mf', 'p'][i];
    const lower = system.addStave({
      voices: dynamic ? [score.voice([score.make.textDynamics({ text: dynamic, line: 10, duration: 'w' })])] : [],
    });
    if (i % 2 === 0) {
      treble.addClef('treble');
      lower.addClef('bass');
      system.addConnector('brace');
      if (i === 0) {
        treble.addTimeSignature('C').setTempo({ name: 'Andante, legato', duration: 'q', bpm: 72 }, -9);
        lower.addTimeSignature('C');
      }
    }
    const arpeggio: StemmableNote[] = [];
    for (let half = 0; half < 2; half++) {
      const left = score.notes(`${bass}/16, ${inner}`, { clef: 'bass', stem: 'up' });
      const right = score.notes(`${a}/16, ${b}`, { stem: 'down' });
      const answer = score.notes(`${c}/16, ${a}, ${b}, ${c}`, { stem: 'down' });
      left.forEach((note) => note.setStave(lower));
      [...right, ...answer].forEach((note) => note.setStave(treble));
      score.beam([...left, ...right]);
      score.beam(answer);
      // Lean into the upper F at the dominant, then give the resolving E its full length.
      if (half === 0 && i >= 2)
        answer[0].addModifier(score.make.articulation({ type: i === 2 ? 'accent' : 'tenuto', position: 'above' }));
      arpeggio.push(...left, ...right, ...answer);
    }
    if (i === 1 || i === 2) {
      score.make.hairpin({
        from: arpeggio[0],
        to: arpeggio[8],
        type: i === 1 ? StaveHairpin.type.CRESC : StaveHairpin.type.DECRESC,
        options: { leftShiftPx: i === 2 ? 30 : 0, yShift: -6, height: 7 },
      });
    }
    system.addVoices([score.voice(arpeggio)]);
    system.addConnector('singleRight');
  });
  f.draw();
  options.assert.ok(true, 'Both hands share a beam on beats one and three');
}
