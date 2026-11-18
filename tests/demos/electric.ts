// High Wire is an original four-bar electric guitar étude in A minor pentatonic.
import { TestOptions, VexFlowTests } from '../vexflow_test_helpers';

import { BarlineType, Bend, Stem } from '../../src/index';

/** Keep the rhythmic stems below the tab so bends, legato marks and vibrato read above it. */
export function electric(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 900, 380);
  const score = f.EasyScore({ throwOnError: true });
  const makeNote = (duration: string, ...frets: [number, number][]) =>
    score.make.tabNote(
      { duration, stemDirection: Stem.DOWN, positions: frets.map(([str, fret]) => ({ str, fret })) },
      true
    );
  // A5 power chord, then a single-string call. The second bar answers with a bend up to E.
  const bars = [
    [
      makeNote('q', [6, 5], [5, 7], [4, 7]),
      makeNote('8', [3, 5]),
      makeNote('8', [3, 7]),
      makeNote('q', [2, 5]),
      makeNote('q', [2, 8]),
    ],
    [makeNote('h', [3, 7]), makeNote('8', [3, 5]), makeNote('8', [3, 7]), makeNote('q', [4, 7])],
    [5, 8, 12, 8, 5, 8, 12, 8].map((fret) => makeNote('8', [1, fret])),
    [makeNote('q', [1, 5]), makeNote('8', [2, 8]), makeNote('8', [2, 5]), makeNote('h', [4, 7], [3, 9], [2, 10])],
  ];
  bars.forEach((notes, i) => {
    const x = 16 + (i % 2) * 432;
    const y = 35 + Math.floor(i / 2) * 176;
    const stave = score.make.tabStave({ x, y, width: 432 });
    if (i % 2 === 0) stave.addClef('tab');
    if (i === 0) stave.addTimeSignature('4/4').setTempo({ duration: 'q', bpm: 96 }, -8);
    if (i === 3) stave.setEndBarType(BarlineType.END);
    const legato = (start: number, label: string) =>
      score.make
        .tabTie({ firstNote: notes[start], lastNote: notes[start + 1] }, label)
        .setFont('Arial, Helvetica, sans-serif', 9, 'bold');
    if (i === 0) {
      score.beam(notes.slice(1, 3));
      legato(1, 'H');
      notes[4].addModifier(score.make.vibrato().setVibratoWidth(30));
    } else if (i === 1) {
      notes[0].addModifier(
        score.make.bend([
          { type: Bend.UP, text: 'Full' },
          { type: Bend.DOWN, text: '' },
        ])
      );
      score.beam(notes.slice(1, 3));
      score.make.tabSlide({ firstNote: notes[1], lastNote: notes[2] });
    } else if (i === 2) {
      // Fret 12 is tapped by the picking hand. Pull off to 8, then to the held fret 5.
      score.beam(notes.slice(0, 4));
      score.beam(notes.slice(4));
      for (const start of [0, 4]) {
        legato(start, 'H');
        legato(start + 1, 'T');
        legato(start + 2, 'P');
      }
      legato(3, 'P');
    } else {
      score.beam(notes.slice(1, 3));
      legato(1, 'P');
    }
    f.System({ x, y, width: 432 }).addStave({ stave, voices: [score.voice(notes)] });
  });
  f.draw();
  options.assert.ok(true, 'Four bars of rhythmic tab with native guitar techniques');
}
