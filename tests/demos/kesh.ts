// The Kesh Jig, arranged as a session chart with chord changes and alternate endings.
import { TestOptions, VexFlowTests } from '../vexflow_test_helpers';

import { BarlineType, VoltaType } from '../../src/index';

/** Each dotted-quarter beat has its own music and optional change of harmony. */
type JigBar = [firstBeat: string, secondBeat: string, chord: string, nextChord?: string];

/** Play each strain twice. The last eighth of each ending leads into the next strain or repeat. */
export function kesh(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 900, 580);
  const score = f.EasyScore({ throwOnError: true });
  score.set({ time: '6/8' });
  // Use the same upright lettering for a change on either beat of the bar.
  const chordFont = { fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 12 };
  // The McNeela chart suggests two changes within some bars and different pickups at the repeats.
  const strains: JigBar[][] = [
    [
      ['G4/q, G4/8', 'G4/8, A4, B4', 'G'],
      ['A4/q, A4/8', 'A4/8, B4, D5', 'D'],
      ['E5/8, D5, D5', 'G5/8, D5, D5', 'G'],
      ['E5/8, D5, B4', 'D5/8, B4, A4', '', 'D'],
      ['G4/q, G4/8', 'G4/8, A4, B4', 'G'],
      ['A4/q, A4/8', 'A4/8, B4, D5', 'D'],
      ['E5/8, D5, D5', 'G5/8, D5, B4', 'G'],
      ['A4/8, G4, F4', 'G4/q, D4/8', 'D', 'G'],
      ['A4/8, G4, F4', 'G4/q, A4/8', 'D', 'G'],
    ],
    [
      ['B4/q, B4/8', 'D5/8, B4, D5', 'G'],
      ['E5/8, G5, E5', 'D5/8, B4, G4', 'C', 'G'],
      ['B4/q, B4/8', 'D5/8, B4, G4', ''],
      ['A4/8, B4, A4', 'A4/8, G4, A4', 'Am'],
      ['B4/8, A4, B4', 'D5/8, B4, D5', 'G'],
      ['E5/8, G5, E5', 'D5/8, B4, D5', 'C', 'G'],
      ['E5/q.', 'A5/8, G5, A5', 'C', 'D'],
      ['B5/8, G5, G5', 'G5/q, A4/8', 'G'],
      ['B5/8, G5, G5', 'G5/q', 'G'],
    ],
  ];

  // The upbeat precedes the first repeat and shares a full measure with the shortened final bar.
  const pickupWidth = 130;
  const firstY = 36;
  f.System({ x: 16, y: firstY, width: pickupWidth })
    .addStave({ voices: [score.voice(score.notes('D4/8'), { time: '1/8' })] })
    .addClef('treble')
    .addKeySignature('G')
    .addTimeSignature('6/8');
  strains.forEach((bars, part) =>
    bars.forEach(([firstBeat, secondBeat, chord, nextChord], i) => {
      const beats = [score.notes(firstBeat), score.notes(secondBeat)];
      const notes = beats.flat();
      for (const beat of beats) {
        if (beat.length === 3) score.beam(beat);
      }
      if (chord) beats[0][0].addModifier(score.make.chordSymbol(chordFont).addText(chord));
      if (nextChord) beats[1][0].addModifier(score.make.chordSymbol(chordFont).addText(nextChord));
      if (i === 0 || i === 4) {
        const grace = score.make.graceNote({ keys: [part ? 'd/5' : 'b/4'], duration: '8', slash: true });
        notes[1].addModifier(score.make.graceNoteGroup({ notes: [grace], slur: true }));
      }
      if (i === 2 || i === 6) {
        const bow = beats[0].length === 3 ? beats[0] : beats[1];
        score.make.curve({ from: bow[0], to: bow[2] });
      }

      const firstLine = i < 4;
      const pickup = part === 0 && firstLine ? pickupWidth : 0;
      const width = (868 - pickup) / (firstLine ? 4 : 5);
      const x = 16 + pickup + (firstLine ? i : i - 4) * width;
      const row = part * 2 + (firstLine ? 0 : 1);
      const lastBar = part === 1 && i === 8;
      const stave = f
        .System({ x, y: firstY + row * 142, width })
        .addStave({ voices: [score.voice(notes, { time: lastBar ? '5/8' : '6/8' })], options: { topTextPosition: 2 } });
      if (i === 4 || (part === 1 && i === 0)) stave.addClef('treble').addKeySignature('G');
      if (i === 0) stave.setBegBarType(BarlineType.REPEAT_BEGIN).setSection(part ? 'B' : 'A', 0);
      if (i === 7) stave.setVoltaType(VoltaType.BEGIN_END, '1.', 0).setEndBarType(BarlineType.REPEAT_END);
      if (i === 8) stave.setVoltaType(VoltaType.BEGIN, '2.', 0);
      if (lastBar) stave.setEndBarType(BarlineType.END);
    })
  );
  f.draw();
  options.assert.ok(true, 'Accompanied A and B strains with first and second endings');
}
