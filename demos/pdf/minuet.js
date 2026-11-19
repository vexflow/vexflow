// Print edition of Petzold's Minuet in G, BWV Anh. 114. Each pair is one bar of the two hands.
// Pitch and rhythm reference: Allen Garvin's public-domain Mutopia edition, Mutopia-2017/01/19-75.
// Dynamics, pedal, articulations and fingerings are editorial suggestions for piano.
function renderMinuet(VF, paper) {
  const bars = [
    // First strain. Lift the pedal as the left hand leaves the opening G chord.
    [
      'D5/q[id="opening",tempo="Allegretto (♩ = 132)",dynamic="p",fingerings="5.left"], G4/8, A4, B4, C5',
      '(G3 B3 D4)/h[id="ped1"], A3/q[id="lift1"]',
    ],
    ['D5/q[id="answer",articulations="staccato"], G4[articulations="staccato"], G4[articulations="staccato"]', 'B3/h.'],
    ['E5/q, C5/8[ornament="mordent"], D5, E5, F#5', 'C4/h.'],
    ['G5/q[articulations="staccato"], G4, G4', 'B3/h.'],
    ['C5/q[id="rise",fingerings="4.left"], D5/8, C5, B4, A4', 'A3/h.'],
    ['B4/q, C5/8, B4, A4, G4[id="apex"]', 'G3/h.'],
    ['F#4/q[articulations="tenuto",dynamic="mf"], G4/8, A4, B4, G4', 'D4/q, B3, G3'],
    ['A4/h.[grace="b/4"]', 'D4/q, D3/8, C4, B3, A3'],
    ['D5/q[dynamic="pp"], G4/8, A4, B4, C5', 'B3/h, A3/q'],
    ['D5/q[articulations="staccato"], G4, G4', 'G3/q, B3, G3'],
    ['E5/q, C5/8[ornament="mordent"], D5, E5, F#5', 'C4/h.'],
    ['G5/q, G4, G4', 'B3/q, C4/8, B3, A3, G3'],
    ['C5/q[id="return"], D5/8, C5, B4, A4', 'A3/h, F#3/q'],
    ['B4/q, C5/8, B4, A4, G4[id="release"]', 'G3/h, B3/q'],
    ['A4/q, B4/8, A4, G4, F#4', 'C4/q, D4, D3'],
    ['G4/h.[articulations="tenuto"]', 'G3/h[id="ped16"], G2/q[id="lift16"]'],

    // Second strain. The C sharps lead to D major before the return to G.
    ['B5/q[dynamic="mf",fingerings="5.left"], G5/8, A5, B5, G5', 'G3/h.'],
    ['A5/q, D5/8, E5, F#5, D5', 'F#3/h.'],
    ['G5/q, E5/8, F#5, G5, D5', 'E3/q, G3, E3'],
    ['C#5/q, B4/8, C#5, A4/q', 'A3/h, A2/q'],
    ['A4/8[id="scale"], B4, C#5, D5, E5, F#5', 'A3/h.'],
    ['G5/q[id="peak",articulations="accent"], F#5, E5', 'B3/q, D4, C#4'],
    ['F#5/q, A4, C#5', 'D4/q, F#3, A3'],
    ['D5/h.[ornament="turn"]', 'D4/q[id="ped24"], D3, C4[id="lift24"]'],
    ['D5/q[dynamic="p"], G4/8, F#4, G4/q', ['D4/q/r, D4/h', 'B3/h, B3/q']],
    ['E5/q, G4/8, F#4, G4/q', ['D4/q/r, E4/h', 'C4/h, C4/q']],
    ['D5/q, C5, B4', 'B3/q, A3, G3'],
    ['A4/8, G4, F#4, G4, A4/q', 'D4/h, D4/q/r'],
    ['D4/8[id="finalScale"], E4, F#4, G4, A4, B4', ['D4/q/r, D4/q/r, F#3/q', 'D3/h.']],
    ['C5/q[id="finalPeak"], B4[ornament="mordentInverted"], A4', 'E3/q, G3, F#3'],
    ['B4/8, D5, G4/q, F#4', 'G3/q, B2, D3'],
    ['(B3 D4 G4)/h.', 'G3/q[id="ped32"], D3, G2[id="lift32"]'],
  ];

  // A note hook constructs fresh native modifiers in the factory of the printed edition.
  function performanceMarks({ dynamic, ornament, grace, tempo }, note, builder) {
    const f = builder.getFactory();
    if (tempo)
      note.addModifier(
        f
          .Annotation({ text: tempo, vJustify: 'top', font: { family: 'Academico, serif', size: 12, weight: 'bold' } })
          .setYShift(-8)
      );
    if (ornament) note.addModifier(f.Ornament(ornament));
    if (grace) {
      const lead = f.GraceNote({ keys: [grace], duration: '8', slash: true });
      note.addModifier(f.GraceNoteGroup({ notes: [lead], slur: true }));
    }
    if (dynamic) {
      const text = [...dynamic].map((letter) => VF.TextDynamics.GLYPHS[letter]).join('');
      note.addModifier(f.Annotation({ text, vJustify: 'bottom', font: { family: 'Bravura', size: 23 } }));
    }
  }

  // The lower voices keep independent stems where the bass sustains under a moving inner part.
  function staff(hand, id, clef) {
    return {
      id,
      clef,
      ...(hand === 0 ? { name: 'Piano', shortName: 'Pno.' } : {}),
      key: 'G',
      time: '3/4',
      measures: bars.map((bar) => {
        const music = bar[hand];
        return {
          voices: Array.isArray(music)
            ? music.map((notes, i) => ({ notes, stem: i === 0 ? 'up' : 'down', autoBeam: true }))
            : [{ notes: music, autoBeam: true }],
        };
      }),
    };
  }

  const spans = [
    { id: 'opening-phrase', kind: 'slur', from: 'opening', to: 'answer' },
    { id: 'first-swell', kind: 'crescendo', from: 'rise', to: 'apex' },
    { id: 'first-cadence', kind: 'diminuendo', from: 'return', to: 'release' },
    { id: 'scale-phrase', kind: 'slur', from: 'scale', to: 'peak' },
    { id: 'closing-phrase', kind: 'slur', from: 'finalScale', to: 'finalPeak' },
    ...[1, 16, 24, 32].map((m) => ({ id: 'pedal-' + m, kind: 'pedal', text: 'Ped.', from: 'ped' + m, to: 'lift' + m })),
  ];
  const music = {
    staves: [staff(0, 'right', 'treble'), staff(1, 'left', 'bass')],
    accidentals: 'key-aware',
    system: { details: { spacing: { mode: 'optical' } } },
    continuous: {
      measureNumbers: true,
      groups: [{ first: 'right', last: 'left', type: 'brace', barlines: true }],
      boundaries: [
        { measure: 16, repeatEnd: true },
        { measure: 17, repeatStart: true },
        { measure: 32, repeatEnd: true },
      ],
      spans,
    },
  };
  return new VF.Publication(music).render(paper, {
    paper: 'Letter',
    title: 'Minuet in G major',
    subtitle: 'Christian Petzold  ·  BWV Anh. 114  ·  Piano',
    header: 'Minuet in G major  ·  Christian Petzold',
    footer: 'Notebook for Anna Magdalena Bach (1725)  ·  Editorial markings for piano',
    pageNumbers: true,
    noteHooks: [performanceMarks],
    staffSize: 6.6,
    systemBreaks: [5, 9, 13, 21, 25, 29],
    pageBreaks: [17],
    justifyLast: true,
    maxExtraGap: 32,
  });
}
