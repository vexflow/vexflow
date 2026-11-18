// Narrow Steps is an original unaccompanied viola miniature in 24 equal divisions of the octave.
import { TestOptions, VexFlowTests } from '../vexflow_test_helpers';

import { BarlineType, StaveHairpin } from '../../src/index';

/** Repeated letters let the listener follow a single pitch bending in quarter-tone steps. */
export function quartertones(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 900, 340);
  const score = f.EasyScore({ throwOnError: true });
  score.set({ time: '5/8', clef: 'alto' });
  // Each mark belongs to one attack. Stein's half-sharp (+) and half-flat (d) are 50 cents.
  const bars = [
    { music: 'D4/8, D4, E4, F4/q', signs: ['', '+', 'd', ''] },
    { music: 'F4/8, F4, G4, A4/q', signs: ['', '+', '', 'd'] },
    { music: 'A4/q., G4/q', signs: ['n', '+'] },
    { music: 'G4/8, G4, F4, E4/q', signs: ['', 'd', '+', ''] },
    { music: 'E4/8, E4, D4, C4/q', signs: ['', 'd', '+', '++'] },
    { music: 'D4/q., D4/q', signs: ['d', 'n'] },
  ];
  bars.forEach(({ music, signs }, i) => {
    const notes = score.notes(music);
    signs.forEach((type, n) => {
      if (!type) return;
      const mark = score.make.accidental({ type });
      if (i === 2 && n === 0) mark.setAsCautionary();
      notes[n].addModifier(mark);
    });
    if (notes.length === 4) {
      score.beam(notes.slice(0, 3));
      score.make.curve({ from: notes[0], to: notes[2] });
    }
    if (i === 0 || i === 4)
      score.make.hairpin({
        from: notes[0],
        to: notes[3],
        type: i === 0 ? StaveHairpin.type.CRESC : StaveHairpin.type.DECRESC,
        options: { height: 7, yShift: -4 },
      });
    const stave = f
      .System({ x: 16 + (i % 3) * 288, y: 24 + Math.floor(i / 3) * 154, width: 288 })
      .addStave({ voices: [score.voice(notes)] });
    if (i % 3 === 0) stave.addClef('alto');
    if (i === 0) stave.addTimeSignature('5/8').setTempo({ name: 'Sotto voce', duration: '8', bpm: 108 }, -4);
    if (i === 5) {
      notes[1].addModifier(score.make.articulation({ type: 'fermata', position: 'above' }));
      stave.setEndBarType(BarlineType.END);
    }
  });
  f.draw();
  options.assert.ok(true, 'Quarter-tone inflections in two phrases of three measures');
}
