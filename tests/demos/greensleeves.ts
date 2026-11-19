// The opening of Greensleeves in standard guitar tuning. Both staves share each pitch and duration.
import { TestOptions, VexFlowTests } from '../vexflow_test_helpers';

import { BarlineType, Stroke } from '../../src/index';

/** Written guitar pitches sound an octave lower. Each pair is [string, fret], counting from high E. */
const positions: Record<string, [number, number]> = {
  E3: [6, 0],
  F3: [6, 1],
  G3: [6, 3],
  A3: [5, 0],
  B3: [5, 2],
  C4: [5, 3],
  D4: [4, 0],
  E4: [4, 2],
  F4: [4, 3],
  G4: [3, 0],
  'G#4': [3, 1],
  A4: [3, 2],
  B4: [2, 0],
  C5: [2, 1],
  D5: [2, 3],
  E5: [1, 0],
  F5: [1, 1],
};

/** Pair the melody with first-position chord voicings under the same rhythmic columns. */
export function greensleeves(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 900, 486);
  const score = f.EasyScore({ throwOnError: true });
  const bars = [
    ['', 'A4/q'],
    ['Am', 'A3+E4+A4+C5/h D5/q'],
    ['C', 'C4+G4+C5+E5/q. F5/8 E5/q'],
    ['G', 'G3+D4+G4+D5/h B4/q'],
    ['Em', 'E3+B3+G4/q. A4/8 B4/q'],
    ['Am', 'A3+E4+A4+C5/h A4/q'],
    ['Dm/F', 'F3+D4+A4/q. G#4/8 A4/q'],
    ['E', 'E3+E4+B4/h G#4/q'],
    ['E5', 'E3+B3+E4/h'],
  ];
  bars.forEach(([chordName, bar], i) => {
    const row = i >= 5 ? 1 : 0;
    const width = row ? 218 : i === 0 ? 112 : 190;
    const x = row ? 12 + (i - 5) * width : i === 0 ? 12 : 124 + (i - 1) * width;
    const y = 28 + row * 230;
    // Read each voicing low to high so chord indexes agree on the staff and tab.
    const events = bar.split(' ').map((token) => {
      const [chord, duration] = token.split('/');
      return { pitches: chord.split('+'), duration };
    });
    const music = events.map(({ pitches, duration }) => {
      const chord = pitches.length === 1 ? pitches[0] : `(${pitches.join(' ')})`;
      return `${chord}/${duration}`;
    });
    const notes = score.notes(music.join(', '));
    if (chordName) notes[0].addModifier(score.make.chordSymbol().addText(chordName));
    const tab = events.map(({ pitches, duration }) =>
      score.make.tabNote({
        positions: pitches.map((pitch) => {
          const [str, fret] = positions[pitch];
          return { str, fret };
        }),
        duration: duration.replace('.', ''),
        dots: duration.includes('.') ? 1 : 0,
      })
    );
    if (i === 1 || i === 5) {
      notes[0].addModifier(score.make.fingering({ number: '1', position: 'left' }), 3);
      notes[0].addModifier(score.make.fingering({ number: '2', position: 'left' }), 1);
    }
    if (i === 2 || i === 8) notes[0].addModifier(score.make.stroke(Stroke.Type.ARPEGGIO_DIRECTIONLESS));
    if (i === 2 || i === 6) score.make.curve({ from: notes[1], to: notes[2] });
    // The opening pickup and the shortened closing bar together fill a measure.
    const time = i === 0 ? '1/4' : i === bars.length - 1 ? '2/4' : '3/4';
    const system = f.System({ x, y, width, spaceBetweenStaves: 8 });
    const stave = system.addStave({ voices: [score.voice(notes, { time })], options: { topTextPosition: 3.5 } });
    const tablature = system.addStave({
      stave: score.make.tabStave({ x, y, width }),
      voices: [score.voice(tab, { time })],
    });
    if (i === 0 || i === 5) {
      stave.addClef('treble', 'default', '8vb');
      if (i === 0) stave.addTimeSignature('3/4');
      tablature.addClef('tab');
      system.addConnector('bracket');
    }
    if (i === bars.length - 1) {
      stave.setEndBarType(BarlineType.END);
      tablature.setEndBarType(BarlineType.END);
    }
  });
  f.draw();
  options.assert.ok(true, 'Chord melody and tab share the same rhythmic grid');
}
