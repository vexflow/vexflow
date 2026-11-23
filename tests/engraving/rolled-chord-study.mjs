// A three-voice excerpt from the second system of Liszt’s Consolation No. 5 in E major.
export function rolledChordStudy(VF) {
  const voice = (notes, stem) => ({ notes, stem, autoBeam: true });
  return {
    accidentals: 'key-aware',
    sheet: { x: 14, y: 12, width: 460 },
    staves: [
      {
        id: 'upper',
        clef: 'treble',
        time: '3/4',
        key: 'E',
        measures: [
          {
            voices: [
              {
                ...voice('G#5/q, G#5/q, (G#4 E5)/8, (E4 C#5)/8, (G#4 E5)/8, (F#4 D#5)/8', 'up'),
                tuplets: [
                  { start: 1, count: 2, options: { numNotes: 3, notesOccupied: 2 } },
                  { start: 3, count: 3 },
                ],
              },
              voice('(E4 A#4)/q[id="roll"], B4/h/r', 'down'),
            ],
          },
        ],
      },
      {
        id: 'lower',
        clef: 'bass',
        time: '3/4',
        key: 'E',
        measures: [{ voices: [voice('C#3/8, E3, A#3, F#2, F#3, A#3', 'down')] }],
      },
    ],
    continuous: { verticalSpacing: 'profile', groups: [{ first: 'upper', last: 'lower', type: 'brace' }] },
    engraving: {
      prepareNote({ id }, note) {
        if (id === 'roll') note.addModifier(new VF.Stroke(VF.Stroke.Type.ROLL_UP, { allVoices: false }), 0);
      },
    },
  };
}
