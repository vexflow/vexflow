// The Kesh Jig, with bowing, cuts and alternate endings. Publication projects this same score into the flute part.
(() => {
  const title = 'The Kesh Jig';
  const credit = 'Traditional Irish jig · Fiddle, flute and cello';
  const intro =
    'The fiddle leads strain A. The flute counts its rest, reads the fiddle’s second ending as a cue, then joins at B. Print either edition.';
  const choices = ['Full score', 'Flute part'];
  const control = 'Edition';

  // A pair of dotted-quarter beats per bar. A chord can change on either beat.
  const strains = [
    [
      ['G4/q, G4/8', 'G4/8, A4, B4', 'G'],
      ['A4/q, A4/8', 'A4/8, B4, D5', 'D'],
      ['E5/8, D5, D5', 'G5/8, D5, D5', 'G'],
      ['E5/8, D5, B4', 'D5/8, B4, A4', '', 'D'],
      ['G4/q, G4/8', 'G4/8, A4, B4', 'G'],
      ['A4/q, A4/8', 'A4/8, B4, D5', 'D'],
      ['E5/8, D5, D5', 'G5/8, D5, B4', 'G'],
      ['A4/8, G4, F#4', 'G4/q, D4/8', 'D', 'G'],
      ['A4/8, G4, F#4', 'G4/q, A4/8', 'D', 'G'],
    ],
    [
      ['B4/q, B4/8', 'D5/8, B4, D5', 'G'],
      ['E5/8, G5, E5', 'D5/8, B4, G4', 'C', 'G'],
      ['B4/q, B4/8', 'D5/8, B4, G4'],
      ['A4/8, B4, A4', 'A4/8, G4, A4', 'Am'],
      ['B4/8, A4, B4', 'D5/8, B4, D5', 'G'],
      ['E5/8, G5, E5', 'D5/8, B4, D5', 'C', 'G'],
      ['E5/q.', 'A5/8, G5, A5', 'C', 'D'],
      ['B5/8, G5, G5', 'G5/q, A4/8', 'G'],
      ['B5/8, G5, G5', 'G5/q.', 'G'],
    ],
  ];

  /** Build the native marks in the factory that owns this particular score or cue. */
  function fiddleMarks({ chord, cut }, note, builder) {
    const f = builder.getFactory();
    if (chord)
      note.addModifier(f.ChordSymbol({ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 12 }).addText(chord));
    if (cut) {
      const grace = f.GraceNote({ keys: [cut], duration: '8', slash: true });
      note.addModifier(f.GraceNoteGroup({ notes: [grace], slur: true }));
    }
  }

  /** Keep the printed harmony and bow marks attached to the beat that owns them. */
  function fiddleStrain(bars, strain, spans) {
    return bars.map(([first, second, chord, change], bar) => {
      const beats = [first.split(', '), second.split(', ')];
      const id = (beat, i) => ['bow', strain, bar, beat, i].join('-');
      if (bar === 2 || bar === 6) {
        const beat = beats[0].length === 3 ? 0 : 1;
        spans.push({ id: id(beat, 0), kind: 'slur', from: id(beat, 0), to: id(beat, 2) });
      }
      if (bar >= 7)
        spans.push({
          id: 'ending-' + strain + '-' + bar,
          kind: 'volta',
          text: bar === 7 ? '1.' : '2.',
          from: id(0, 0),
          to: id(1, beats[1].length - 1),
        });
      return beats
        .flatMap((notes, beat) =>
          notes.map((token, i) => {
            const marks = ['id="' + id(beat, i) + '"'];
            const harmony = beat === 0 ? chord : change;
            if (i === 0 && harmony) marks.push('chord="' + harmony + '"');
            if (beat === 0 && i === 1 && (bar === 0 || bar === 4 || bar === 8))
              marks.push('cut="' + (strain ? 'd/5' : 'b/4') + '"');
            return token + '[' + marks.join(',') + ']';
          })
        )
        .join(', ');
    });
  }
  const flute = [
    'G4/q., B4/q.',
    'C5/q., B4/q.',
    'G4/q., B4/q.',
    'E5/q., D5/q.',
    'G4/q., B4/q.',
    'C5/q., B4/q.',
    'G4/q., F#5/q.',
    'G5/q., A4/q.',
    'G5/q., G4/q.',
  ];
  const roots = [
    'G2',
    'D3',
    'G2',
    'D3',
    'G2',
    'D3',
    'G2',
    'D3',
    'D3',
    'G2',
    'C3',
    'G2',
    'A2',
    'G2',
    'C3',
    'D3',
    'G2',
    'G2',
  ];

  /** The cue belongs to the printed flute view. Its performing staff still rests through the second ending of A. */
  function publication(choice, VF) {
    const staff = (id, name, clef, bars) => ({
      id,
      name,
      shortName: name.slice(0, 2) + '.',
      clef,
      key: 'G',
      time: '6/8',
      measures: bars.map((notes) => ({ voices: [{ notes, autoBeam: true }] })),
    });
    // A whole-bar rest has the duration of this 6/8 measure and no attached dot.
    // This lets Publication collect silent bars into a counted rest before the cue.
    const silence = [{ keys: ['d/5'], duration: 'wr', durationOverride: new VF.Fraction(6, 8) }];
    const spans = [];
    const melody = strains.flatMap((bars, i) => fiddleStrain(bars, i, spans));
    const spec = {
      accidentals: 'key-aware',
      continuous: {
        measureNumbers: true,
        compressRests: true,
        spans,
        boundaries: [
          { measure: 1, rehearsal: 'A', repeatStart: true },
          { measure: 8, repeatEnd: true },
          { measure: 10, rehearsal: 'B', repeatStart: true, breakBefore: 'force' },
          { measure: 17, repeatEnd: true },
        ],
      },
      staves: [
        staff('vn', 'Fiddle', 'treble', melody),
        staff('fl', 'Flute', 'treble', [...Array(9).fill(silence), ...flute]),
        staff(
          'vc',
          'Cello',
          'bass',
          roots.map((root, i) => root + '/q., ' + (i === 17 ? 'G2' : i % 2 ? 'A2' : 'D3') + '/q.')
        ),
      ],
    };
    const part = choice === 'Flute part';
    return {
      spec,
      options: {
        paper: 'A4',
        noteHooks: [fiddleMarks],
        title,
        subtitle: part ? 'Flute part' : 'Fiddle, flute and cello',
        header: title,
        staffSize: part ? 8 : 6.5,
        ...(part
          ? {
              staves: ['fl'],
              systemBreaks: [14],
              regions: [{ kind: 'cue', staff: 'vn', measure: 9, label: 'Fiddle cue' }],
            }
          : { systemBreaks: [5, 10, 14] }),
      },
    };
  }

  window.FeaturedScores.kesh = { title, credit, intro, choices, control, publication };
})();
