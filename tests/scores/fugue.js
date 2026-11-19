// J. S. Bach, BWV 851. Both editions use the same 44-bar transcription.
// Source: Bach-Gesellschaft (1866), public-domain engraving by Stelios Samelis for Mutopia, no. 988.
// Each bar lists treble then bass. Parallel voices on a staff are ordered high to low.
// A null staff has a whole-measure rest. Spacers let a voice enter partway through a bar.
var BachFugue = (() => {
  const fugueBars = [
    // Bar 1
    ['B4/8/r, D4/8[dynamic="mp"], E4/8, F4/8, G4/8, E4/8', null],
    // Bar 2
    [
      'F4/16[id="r2-0-0"], D4/16, C#4/16, D4/16[id="r2-3-0"], Bb4/q[id="r2-4-0",articulations="staccatissimo.above"], G4/q[ornament="tr.above"]',
      null,
    ],
    // Bar 3
    [
      'A4/q[id="r3-0-0",dynamic="p"], A4/16[id="r3-4-0"], G4/16, F4/16, E4/16, G4/16, F4/16, E4/16, D4/16',
      'C4/8/r, A3/8, B3/8, C4/8, D4/8, B3/8',
    ],
    // Bar 4
    [
      [
        'E4/8, C5/8[id="r4-2-0"], C5/16[id="r4-4-0"], B4/16, A4/16, B4/16, B4/16, A4/16, G#4/16, A4/16',
        'B4/q/r[spacer="yes"], F4/q, D4/q[ornament="tr.below"]',
      ],
      'C4/16, A3/16, G#3/16, A3/16, D3/h/r[spacer="yes"]',
    ],
    // Bar 5
    [
      [
        'A4/16[id="r5-0-0"], G4/16, F#4/16, G4/16, E5/q[articulations="staccatissimo.above"], G4/q[id="r5-8-0"]',
        'E4/q[id="r5-0-1"], E4/16[id="r5-4-1"], D4/16, C#4/16, B3/16, D4/16, C#4/16, B3/16, A3/16',
      ],
      null,
    ],
    // Bar 6
    [
      [
        'F4/8, D5/8[id="r6-2-0"], D5/16[id="r6-4-0"], C5/16, Bb4/16, A4/16, C5/16, Bb4/16, A4/16, G4/16',
        'D4/q[dynamic="mf"], D4/q/r, D4/q/r',
      ],
      'D3/8/r, D3/8, E3/8, F3/8, G3/8, E3/8',
    ],
    // Bar 7
    [
      [
        'A4/q, G4/h[id="r7-4-0"]',
        'C4/8/r, F4/8[id="r7-2-1"], F4/16[id="r7-4-1"], E4/16, D4/16, E4/16, E4/16, D4/16, C#4/16, D4/16',
      ],
      'F3/16, D3/16, C#3/16, D3/16, Bb3/q[articulations="staccatissimo.above"], G3/q[ornament="tr.above"]',
    ],
    // Bar 8
    [
      ['G4/8[id="r8-0-0"], E4/8, F4/8, G4/8, A4/8, F4/8', 'C#4/q, D4/8, E4/8, C#4/8, D4/8'],
      'A3/q[id="l8-0-0"], A3/16[id="l8-4-0"], G3/16, F3/16, E3/16, G3/16, F3/16, E3/16, D3/16',
    ],
    // Bar 9
    [
      [
        'Bb4/16, G4/16, F#4/16, G4/16, Eb5/q[articulations="staccatissimo.above"], C#5/q[ornament="turn.above"]',
        'Eb4/8, D4/8, G4/q, E4/q',
      ],
      'G3/8, Bb3/8[id="l9-2-0"], Bb3/16[id="l9-4-0"], A3/16, G3/16, A3/16, A3/16, G3/16, F3/16, G3/16',
    ],
    // Bar 10
    [
      [
        'D5/q, D5/q[articulations="staccatissimo.above"], B4/q[ornament="turn.above"]',
        'E4/16/r, A4/16, G4/16, A4/16, F4/q, D4/q',
      ],
      'G3/16, F3/16, E3/16, F3/16, A3/16, G3/16, F3/16, G3/16, G3/16, F3/16, E3/16, F3/16',
    ],
    // Bar 11
    [
      [
        'C5/q, C5/q[articulations="staccatissimo.above"], A4/q[ornament="turn.above"]',
        'E4/16/r, G4/16, F4/16, G4/16, Eb4/q, C4/q',
      ],
      'F3/16, E3/16, D3/16, E3/16, G3/16, F3/16, Eb3/16, F3/16, F3/16, Eb3/16, D3/16, Eb3/16',
    ],
    // Bar 12
    [
      ['Bb4/h.[id="r12-0-0"]', 'E4/8/r, A4/8, G4/8, F4/8, E4/8, G4/8'],
      'Eb3/16, D3/16, C#3/16, D3/16, Bb3/q[articulations="staccatissimo.above"], G3/q[ornament="tr.above"]',
    ],
    // Bar 13
    [
      ['Bb4/8[id="r13-0-0"], A4/8, B4/8, C#5/8, D5/8, B4/8', 'C#4/q[dynamic="p"], D4/8, E4/8, B4/q/r[spacer="yes"]'],
      [
        'A3/q[id="l13-0-0"], A3/16[id="l13-4-0"], G3/16, F3/16, E3/16, A3/q',
        'D3/h/r[spacer="yes"], G3/16, F3/16, E3/16, D3/16',
      ],
    ],
    // Bar 14
    [
      [
        'C#5/16, A4/16, G#4/16, A4/16, F5/q[articulations="staccatissimo.above"], D5/q[ornament="tr.above"]',
        'C4/8/r, E4/8, D4/8, C#4/8, B3/8, D4/8',
      ],
      'E3/8, C#3/8, D3/8, E3/8, F3/8, D3/8',
    ],
    // Bar 15
    [
      [
        'E5/8, A5/8[id="r15-2-0"], A5/16[id="r15-4-0"], G5/16, F#5/16, E5/16, G5/16, F#5/16, E5/16, D5/16',
        'C#4/16, E4/16, F4/16, E4/16, B4/q/r[spacer="yes"], C4/q',
      ],
      ['A3/q, A3/q, D3/q/r[spacer="yes"]', 'D3/q/r[spacer="yes"], F#3/8, E3/8, D3/8, F#3/8'],
    ],
    // Bar 16
    [
      [
        'Eb5/16, C6/16, Bb5/8, G5/16/r, A5/16, G#5/16, F#5/16, A5/16, G#5/16, F#5/16, E5/16',
        'Bb3/16[dynamic="f"], D4/16, Eb4/16, D4/16, B3/q, E4/q[id="r16-8-1"]',
      ],
      'G3/q, G#3/8, F#3/8, E3/8, G#3/8',
    ],
    // Bar 17
    [
      [
        'D5/16, C5/16, B4/16, C5/16, C5/16, B4/16, A4/16, B4/16, B4/16, A4/16, G#4/16, A4/16',
        'E4/8[id="r17-0-1"], D4/8/r, D4/q/r, D4/q/r',
      ],
      'A3/8, A2/8, B2/8, C3/8, D3/8, B2/8',
    ],
    // Bar 18
    [
      'G4/q[id="r18-0-0"], G4/16[id="r18-4-0"], F4/16, E4/16, F4/16, F4/16, E4/16, D4/16, A4/16',
      ['B3/8/r, A3/8, B3/8, C#4/8, D4/8, B3/8', 'C#3/16, A2/16, G#2/16, A2/16, F3/q, D3/q[ornament="tr.below"]'],
    ],
    // Bar 19
    [
      [
        'A4/h.[id="r19-0-0"]',
        'B4/q/r[spacer="yes"], F4/q[articulations="staccatissimo.below"], D4/q[ornament="tr.below"]',
      ],
      [
        'C4/16, A3/16, G#3/16, A3/16, E3/16, D3/16, C3/16, D3/16, D3/16, C3/16, B2/16, C3/16',
        'E3/8, F3/8, D3/h/r[spacer="yes"]',
      ],
    ],
    // Bar 20
    [
      [
        'A4/q[id="r20-0-0"], A4/16[id="r20-4-0"], D#5/16, E5/16, A4/16, C5/16, B4/16, A4/16, G#4/16',
        'E4/8, F4/8, B4/q/r[spacer="yes"], B4/q/r[spacer="yes"]',
      ],
      ['D3/q/r[spacer="yes"], B3/h[ornament="tr.above"]', 'C3/8, D3/8, E3/8, D3/8, E3/q'],
    ],
    // Bar 21
    [
      'A4/q[id="r21-0-0",dynamic="mp",ornament="mordentInverted.above"], A4/16[id="r21-4-0"], G4/16, F4/16, E4/16, G4/16, F4/16, E4/16, D4/16',
      ['A3/q, B3/q/r, B3/q/r', 'A3/8[id="l21-0-1"], A2/8, B2/8[id="l21-4-1"], C#3/8, D3/8, B2/8'],
    ],
    // Bar 22
    [
      'E4/8, E5/8, D5/8, C#5/8, B4/8, D5/8',
      'C#3/16, A2/16, G#2/16, A2/16, F3/q[articulations="staccatissimo.above"], D3/q[ornament="tr.above"]',
    ],
    // Bar 23
    [
      'C#5/16, E5/16, F5/16, E5/16, G4/q[articulations="staccatissimo.below"], Bb4/q[id="r23-8-0"]',
      'A3/8, F3/8, E3/8, D3/8, C#3/8, E3/8',
    ],
    // Bar 24
    [
      'Bb4/16[id="r24-0-0"], A4/16, G4/16, A4/16, A4/16, G4/16, F4/16, G4/16, G4/16, F4/16, E4/16, F4/16',
      'D3/16, F3/16, G3/16, F3/16, A2/q[articulations="staccatissimo.above"], C#3/q[ornament="tr.above"]',
    ],
    // Bar 25
    [
      'F4/q[id="r25-0-0",dynamic="p"], F4/16[id="r25-4-0"], E4/16, F#4/16, G4/16, F#4/16, G4/16, A4/16, G4/16',
      ['C4/8/r, D4/8, C4/8, Bb3/8, A3/8, C4/8', 'D3/h.'],
    ],
    // Bar 26
    [
      'G4/16, A4/16, Bb4/16, A4/16, A4/16, B4/16, C5/16, B4/16, B4/16, C#5/16, D5/16, C#5/16',
      ['Bb3/q, D4/h', 'B2/8/r, G3/8, F#3/8, E3/8, D3/8, F3/8'],
    ],
    // Bar 27
    [
      'C#5/8, A5/8, G5/8, F5/8, E5/8, G5/8',
      [
        'G3/q, B3/q/r, B3/q/r',
        'E3/q[id="l27-0-1"], E3/16[id="l27-4-1"], D3/16, C#3/16, B2/16, D3/16, C#3/16, B2/16, A2/16',
      ],
    ],
    // Bar 28
    [
      ['F5/16, A5/16, Bb5/16, A5/16, C#5/q, E5/q[id="r28-8-0"]', 'E4/8/r, D4/8, E4/8, F4/8, G4/8, E4/8'],
      'D3/q[id="l28-0-0"], D3/q/r[id="l28-4-0"], D3/q/r',
    ],
    // Bar 29
    [
      [
        'E5/8[id="r29-0-0"], A4/8, D5/q, C5/q[id="r29-8-0"]',
        'F4/16, D4/16, C#4/16, D4/16, Bb4/q, G4/q[ornament="mordent.below"]',
      ],
      'D3/8/r, A3/8, G3/8, F3/8, E3/8, G3/8',
    ],
    // Bar 30
    [
      [
        'C5/8[id="r30-0-0"], Eb5/8[id="r30-2-0"], Eb5/16[id="r30-4-0"], D5/16, C5/16, D5/16, D5/16, C5/16, Bb4/16, C5/16',
        'A4/q, B4/h/r[spacer="yes"]',
      ],
      [
        'F#3/16, A3/16, Bb3/16, A3/16, F#3/q[articulations="staccatissimo.above"], A3/q[articulations="staccatissimo.above"]',
        'D3/q/r[spacer="yes"], D3/q, F#3/q',
      ],
    ],
    // Bar 31
    [
      'C5/16, Bb4/16, A4/16, Bb4/16, D5/16, C5/16, Bb4/16, C5/16, C5/16, Bb4/16, A4/16, Bb4/16',
      [
        'A3/16/r, G3/16, F#3/16, G3/16, E3/q[articulations="staccatissimo.above"], G3/q[articulations="staccatissimo.above"]',
        'G2/q, C3/q, E3/q',
      ],
    ],
    // Bar 32
    [
      'Bb4/16, A4/16, G4/16, A4/16, C5/16, Bb4/16, A4/16, Bb4/16, Bb4/16, A4/16, G4/16, A4/16',
      [
        'A3/16/r, F3/16, E3/16, F3/16, D3/q[articulations="staccatissimo.above"], F3/q[articulations="staccatissimo.above"]',
        'F2/q, Bb2/q, D3/q',
      ],
    ],
    // Bar 33
    [
      'A4/16, G4/16, F4/16, G4/16, E5/q[articulations="staccatissimo.above"], C#5/q[ornament="tr.above"]',
      ['C4/8/r, F3/8, G3/8, A3/8, Bb3/8, G3/8', 'E3/h.'],
    ],
    // Bar 34
    [
      'D5/q[id="r34-0-0",dynamic="mf"], D5/16[id="r34-4-0"], C5/16, Bb4/16, A4/16, C5/16, Bb4/16, A4/16, G4/16',
      ['A3/8, F3/8, G3/8, A3/8, G3/q', 'F3/8, D3/8, E3/8, F#3/8, G3/8, E3/8'],
    ],
    // Bar 35
    [
      'A4/8, F#4/8, G4/8, A4/8, Bb4/8, G4/8',
      ['C4/8/r, A3/8, G3/8, F3/8, E3/8, G3/8', 'F#3/16, D3/16, C#3/16, D3/16, Bb3/8, A3/8, G3/8, Bb3/8'],
    ],
    // Bar 36
    [
      'A4/16, C5/16, Eb5/8[id="r36-2-0"], Eb5/16[id="r36-4-0"], D5/16, C5/16, Bb4/16, D5/16, C5/16, Bb4/16, A4/16',
      ['F#3/8, Bb3/8, A3/8, G3/8, F#3/8, A3/8', 'A3/8, G3/8, F#3/8, E3/8, D3/8, F#3/8'],
    ],
    // Bar 37
    [
      'Bb4/16, D5/16, F5/8[id="r37-2-0"], F5/16[id="r37-4-0"], E5/16, D5/16, C#5/16, E5/16, D5/16, C#5/16, B4/16',
      ['G3/8, C4/8, B3/8, A3/8, G#3/8, B3/8', 'A2/8, A3/8, G#3/8, F#3/8, E3/8, G#3/8'],
    ],
    // Bar 38
    [
      'C#5/16[id="r38-0-0"], E5/16, Bb5/8[id="r38-2-0"], Bb5/16[id="r38-4-0"], A5/16, G5/16, F5/16, A5/16, G5/16, F5/16, E5/16[id="r38-11-0"]',
      ['A3/8, F4/8, E4/8, D4/8, C#4/8, E4/8', 'A2/8, D4/8, C#4/8, B3/8, A3/8, C#4/8'],
    ],
    // Bar 39
    [
      'G5/16[dynamic="f"], F5/16, E5/16, F5/16, F5/16, E5/16, D5/16, E5/16, E5/16, D5/16, C#5/16, D5/16',
      ['D4/8, D4/8/r, D4/q/r, D4/q/r', 'D4/8, D3/8, E3/8, F3/8, G3/8, E3/8'],
    ],
    // Bar 40
    [
      [
        'C5/q[id="r40-0-0"], C5/16[id="r40-4-0"], Bb4/16, A4/16, Bb4/16, Bb4/16, A4/16, G4/16, D5/16',
        'D4/8/r, D4/8, E4/8, F#4/8, G4/8, E4/8',
      ],
      'F#3/16, D3/16, C#3/16, D3/16, Bb3/q[articulations="staccatissimo.above"], G3/q[ornament="tr.above"]',
    ],
    // Bar 41
    [
      [
        'D5/h.[id="r41-0-0"]',
        'F4/16, D#4/16, C#4/16, D4/16, Bb4/q[articulations="staccatissimo.below"], G4/q[ornament="tr.below"]',
      ],
      'A3/8, Bb3/8, A3/16, G3/16, F3/16, G3/16, G3/16, F3/16, E3/16, F3/16',
    ],
    // Bar 42
    [
      [
        'D5/q[id="r42-0-0"], D5/16[id="r42-4-0"], G#5/16, A5/16, D5/16, F5/16, E5/16, D5/16, C#5/16',
        'A4/8, Bb4/8, E4/h[ornament="tr.below"]',
      ],
      'F3/8, G3/8, A3/8, G3/8, A3/q',
    ],
    // Bar 43
    [
      ['D5/h.[dynamic="mf"]', 'E4/8/r, (A4 C5)/8, (G4 Bb4)/8, (F#4 A4)/8, (E4 G4)/8, (G4 Bb4)/8'],
      ['D4/8/r, (D3 F#3)/8[id="l43-2-0"], (E3 G3)/8[id="l43-4-0"], (F#3 A3)/8, (G3 Bb3)/8, (E3 G3)/8', 'D3/h.'],
    ],
    // Bar 44
    [
      ['D5/h.[articulations="fermata.above"]', '(F#4 A4)/h.'],
      ['(F#3 A3)/h.', 'D3/h.[articulations="fermata.below"]'],
    ],
  ];

  // Named endpoints keep sustained notes connected when the music wraps to a new system.
  const fuguePhrases = [
    ['crescendo', 'r5-0-0', 'r5-8-0', 'below'],
    ['crescendo', 'r38-0-0', 'r38-11-0', 'below'],
    ['diminuendo', 'r2-0-0', 'r2-4-0', 'below'],
    ['slur', 'r2-0-0', 'r2-3-0', 'above'],
    ['tie', 'r3-0-0', 'r3-4-0', 'above'],
    ['tie', 'r4-2-0', 'r4-4-0', 'above'],
    ['tie', 'r6-2-0', 'r6-4-0', 'above'],
    ['tie', 'r7-4-0', 'r8-0-0', 'above'],
    ['tie', 'r12-0-0', 'r13-0-0', 'above'],
    ['tie', 'r15-2-0', 'r15-4-0', 'above'],
    ['tie', 'r5-0-1', 'r5-4-1', 'below'],
    ['tie', 'r7-2-1', 'r7-4-1', 'below'],
    ['tie', 'r16-8-1', 'r17-0-1', 'below'],
    ['tie', 'r18-0-0', 'r18-4-0', 'above'],
    ['tie', 'r19-0-0', 'r20-0-0', 'above'],
    ['tie', 'r20-0-0', 'r20-4-0', 'above'],
    ['tie', 'r21-0-0', 'r21-4-0', 'above'],
    ['tie', 'r23-8-0', 'r24-0-0', 'above'],
    ['tie', 'r25-0-0', 'r25-4-0', 'above'],
    ['tie', 'r28-8-0', 'r29-0-0', 'above'],
    ['tie', 'r29-8-0', 'r30-0-0', 'above'],
    ['tie', 'r30-2-0', 'r30-4-0', 'above'],
    ['tie', 'r34-0-0', 'r34-4-0', 'above'],
    ['tie', 'r36-2-0', 'r36-4-0', 'above'],
    ['tie', 'r37-2-0', 'r37-4-0', 'above'],
    ['tie', 'r38-2-0', 'r38-4-0', 'above'],
    ['tie', 'r40-0-0', 'r40-4-0', 'above'],
    ['tie', 'r41-0-0', 'r42-0-0', 'above'],
    ['tie', 'r42-0-0', 'r42-4-0', 'above'],
    ['tie', 'l8-0-0', 'l8-4-0', 'above'],
    ['tie', 'l9-2-0', 'l9-4-0', 'above'],
    ['tie', 'l13-0-0', 'l13-4-0', 'above'],
    ['tie', 'l27-0-1', 'l27-4-1', 'below'],
  ];

  /** Format the ornaments on their own voice's side of the staff. Spacers carry time through a hand change. */
  function fugueNoteMarks(VF) {
    return ({ ornament, spacer, dynamic }, note, builder) => {
      if (dynamic) {
        const text = [...dynamic].map((letter) => VF.TextDynamics.GLYPHS[letter]).join('');
        note.addModifier(
          builder
            .getFactory()
            .Annotation({ text, vJustify: 'bottom', font: { family: 'Bravura', size: 23 } })
            .setYShift(5)
        );
      }
      if (ornament) {
        const [type, position] = ornament.split('.');
        note.addModifier(builder.getFactory().Ornament(type, { position }));
      }
      if (spacer) note.setStyle({ fillStyle: 'transparent', strokeStyle: 'transparent' });
    };
  }

  /** Share the music through the requested bar, omitting ties that end beyond the excerpt.
   * @returns {import('../../src/easyscore').EasyScoreCompositionSpec}
   */
  function fugueMusic(VF, count) {
    const bars = fugueBars.slice(0, count);
    const staves = ['treble', 'bass'].map((clef, hand) => ({
      id: clef,
      clef,
      key: 'Dm',
      time: '3/4',
      ...(hand === 0 ? { name: 'Piano', shortName: 'Pno.' } : {}),
      measures: bars.map((bar, index) => {
        const music = bar[hand];
        if (music === null) {
          // A centered whole rest fills this silent 3/4 bar before the next subject entry.
          return {
            voices: [
              {
                notes: [
                  { keys: ['d/3'], clef, duration: 'wr', alignCenter: true, durationOverride: new VF.Fraction(3, 4) },
                ],
              },
            ],
          };
        }
        // Beam the five eighths of the opening subject and its two answers as a single gesture.
        const entrance = hand === 0 ? index === 0 : index === 2 || index === 5;
        const autoBeam = entrance ? { groups: [new VF.Fraction(3, 4)] } : true;
        const voices = Array.isArray(music)
          ? music.map((notes, i) => ({
              notes,
              stem: i === 0 ? 'up' : 'down',
              autoBeam: { autoStem: false },
            }))
          : [{ notes: music, autoBeam }];
        return { voices };
      }),
    }));
    // Give the moving voices room. Catch only the held bass and release at the next attack.
    const pedal = [
      [8, 'l8-0-0', 'l8-4-0'],
      [21, 'l21-0-1', 'l21-4-1'],
      [28, 'l28-0-0', 'l28-4-0'],
      [43, 'l43-2-0', 'l43-4-0'],
    ];
    const sections = [
      [1, 'Subject'],
      [3, 'Answer'],
      [6, 'Bass entry'],
      [22, 'Inversion'],
      [34, 'Stretto'],
      [43, 'Cadence'],
    ];
    const spans = fuguePhrases
      .filter(([, , to]) => Number(to.slice(1).split('-')[0]) <= count)
      .map(([kind, from, to, side]) => ({ kind, from, to, side, id: kind + '-' + from }));
    for (const [bar, from, to] of pedal) {
      if (bar <= count) spans.push({ kind: 'pedal', id: 'pedal-' + bar, from, to, text: 'Ped.' });
    }
    return {
      accidentals: 'key-aware',
      staves,
      sheet: { measurePadding: 15 },
      system: { spaceBetweenStaves: 9, details: { spacing: { mode: 'optical' } } },
      continuous: {
        measureNumbers: true,
        boundaries: sections
          .filter(([measure]) => measure <= count)
          .map(([measure, rehearsal]) => ({ measure, rehearsal })),
        groups: [{ first: 'treble', last: 'bass', type: 'brace', barlines: true }],
        spans,
      },
    };
  }

  return { music: fugueMusic, noteMarks: fugueNoteMarks };
})();
// Bundled and ESM tests use the same namespace as the standalone, file-based reader.
globalThis.BachFugue = BachFugue;
