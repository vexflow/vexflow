// Frédéric Chopin, Ballade No. 3, Op. 47. A reading of the supplied opening page.
// Pitch and rhythm cross-check: Fryderyk Chopin Institute, first-edition encoding 047-1-BH.krn.
// Each pair is one 6/8 measure, right hand then left. Arrays hold independently stemmed voices.
var ChopinBallade = (() => {
  const bars = [
    // First system. The F and D in the two hands lead into the first crescendo.
    ['Eb4/q, F4/8, (Eb4 G4)/8, (Eb4 Ab4)/8, (Eb4 Bb4)/8', 'D3/q/r, D4/8, Db4/8, C4/8, G3/8'],
    ['(Eb4 C5)/q, (F4 Ab4 F5)/8, (Eb4 Ab4 Eb5)/q.', 'Ab3/q, (Eb3 B3 D4)/8, (Eb3 C4)/q.'],
    [['Eb5/h.', '(Eb4 G4)/q., (Eb4 G4 Db5)/q.'], 'Db4/8, C4/8, Bb3/8, Bb3/8, A3/8, Bb3/8'],
    ['(Eb4 Ab4 C5 Eb5)/h.', 'C4/8, Ab3/8., Eb3/16, Eb3/q.'],
    [['Eb4/h.', 'G3/q, Ab3/8, Bb3/8, C4/8, G3/8', 'Db4/q., B4/q/r.[quiet="yes"]'], 'Eb2/q, F2/8, G2/8, Ab2/8, Bb2/8'],
    ['(Ab3 Eb4)/q, (Ab3 B3 D4)/8, (Ab3 C4 Eb4)/q.', 'C3/q, F3/8, Eb3/q.'],
    // Second system. Small inline clefs keep the high left-hand chords on the lower staff.
    ['(Ab3 C4 Eb4)/8, (C4 Eb4 Ab4)/8, (Db4 Eb4 Bb4)/8, (Eb4 Ab4 C5)/q, (Db4 Eb4 Bb4)/8', 'Eb3/q., Eb3/q, Eb2/8'],
    ['(Eb4 Ab4 C5)/q, (C4 Eb4 Ab4)/8, (C4 Eb4 Ab4)/q, B4/8/r', 'Ab2/q, Eb3/8, Ab3/q, D3/8/r'],
    ['(Ab5 Ab6)/q., B4/q/r, B4/8/r', '(Ab1 Ab2)/8, D3/8/r ;treble; (Gb4 Ab4 Eb5)/8, (F4 Ab4 D5)/q, B4/8/r'],
    ['(Ab4 Ab5)/q., B4/8/r., (C4 C5)/16, (F4 F5)/8', '(Ab1 Ab2)/8, D3/8/r, (Fb3 Ab3 Db4)/8, (Eb3 Ab3 C4)/q, D3/8/r'],
    [
      'B4/8/r., (Eb4 Eb5)/16, (Eb4 Eb5)/8, B4/8/r., (Eb4 Eb5)/16, (Eb4 Eb5)/8',
      '(Eb1 Eb2)/8, D3/8/r, (Eb3 C4)/8, (D3 F3 B3)/q, D3/8/r',
    ],
    [
      'B4/8/r., (Eb4 Eb5)/16, (Eb4 Eb5)/8, B4/8/r., (Eb4 Eb5)/16, (Eb4 Eb5)/8',
      'Eb2/8, D3/8/r, (D3 F3 B3)/8, (Db3 G3 Bb3)/q, D3/8/r',
    ],
    // Third system. Bar 14 compresses the chromatic octave flourish into the second dotted beat.
    [
      '(Ab5 Ab6)/q., B4/q/r, B4/8/r',
      '(Ab1 Ab2)/8, D3/16/r ;treble; (Gb4 Ab4 Eb5)/16, (Gb4 Ab4 Eb5)/8, (F4 Ab4 D5)/q, B4/8/r',
    ],
    [
      '(Ab4 Ab5)/q., B4/16/r, (C4 C5)/16, (Db4 Db5)/16, (D4 D5)/16, (Eb4 Eb5)/16, (E4 E5)/16, (G4 G5)/16, B4/32/r, (F4 F5)/32',
      '(Ab1 Ab2)/8, D3/16/r, (Fb3 Ab3 Db4)/16, (Fb3 Ab3 Db4)/8, (Eb3 Ab3 C4)/8, D3/q/r',
    ],
    [
      '(F4 F5)/8., (Eb4 Eb5)/16, (Eb4 Eb5)/8, B4/8/r., (Eb4 Eb5)/16, (Eb4 Eb5)/8',
      '(Eb1 Eb2)/8, D3/8/r, (Eb3 C4)/8, (D3 F3 B3)/q, D3/8/r',
    ],
    [
      '(Eb4 Eb5)/8., (Eb4 Eb5)/16, (Eb4 Eb5)/8, B4/8/r., (Eb4 Eb5)/16, (Eb4 Eb5)/8',
      'Eb2/8, D3/8/r, (D3 F3 B3)/8, (Db3 G3 Bb3)/q, D3/8/r',
    ],
    // Fourth system. Keep the long upper notes sounding over the repeated chords in bars 19–20.
    [
      '(Eb4 Eb5)/8., Ab4/16, (F4 F5)/8, (F4 F5)/8., (Eb4 Eb5)/16, (D4 D5)/8',
      '(Ab1 Ab2)/8, D3/8/r, (C3 Gb3 Ab3)/8, (B2 F3 Ab3)/q.',
    ],
    [
      'B4/8/r., Db5/16, (Db4 G4 Db5)/8, B4/8/r., (C4 Ab4 C5)/16, (Db4 Ab4 Db5)/8',
      '(Ab1 Ab2)/8, D3/8/r, (Ab2 Eb3 Bb3)/8, (Ab2 Eb3 Ab3)/q.',
    ],
    [
      ['(Ab4 C5)/8., Bb4/16, Bb4/8, Bb4/q.', 'C4/8, E4/8/r, (Bb3 D4 Ab4)/8, E4/8/r., (Bb3 D4 Ab4)/16, (Bb3 D4 Ab4)/8'],
      '(F1 F2)/8, D3/8/r, (G2 G3)/8, (F2 F3)/q, D3/8/r',
    ],
    [
      [
        'Bb4/q., B4/q/r.[quiet="yes"]',
        'E4/8/r., (Bb3 Db4 G4)/16, (Bb3 Db4 G4)/8, E4/8/r., (G3 Db4 Eb4)/16, (G3 Db4 Eb4)/8',
      ],
      '(Eb1 Eb2)/8, D3/8/r, (F2 F3)/8, (Eb2 Eb3)/q, D3/8/r',
    ],
    // Fifth system. The same figure returns an octave higher, with a little grace chord in bar 22.
    [
      '(Ab3 C4 Ab4)/8, B4/16/r, (Eb5 Ab5 Eb6)/16, (Eb5 Ab5 Eb6)/8, (Eb5 Ab5 Eb6)/8., (D5 D6)/16, (Ab5 Ab6)/8',
      '(Ab1 Ab2)/8, D3/16/r, (Gb3 Ab3 Gb4)/16, (Gb3 Ab3 Gb4)/8, (F3 Ab3 F4)/q, D3/8/r',
    ],
    [
      'B4/8/r., (Db5 Ab5 Db6)/16, (Db5 Ab5 Db6)/8, (Db5 Ab5 Db6)/8., (C5 C6)/16, (Db5 Ab5 Db6)/8',
      '(Ab1 Ab2)/8, D3/16/r, (Fb3 Ab3 Fb4)/16, (Fb3 Ab3 Fb4)/8, (Eb3 Ab3 Eb4)/q, D3/8/r',
    ],
    [
      [
        'B4/q/r[quiet="yes"], Bb5/8, Bb5/q.',
        '(C5 Ab5 C6)/8., (Bb4 D5 Ab5 Bb5)/16, (Bb4 D5 Ab5)/8, E5/8/r., (Bb4 D5 Ab5)/16, (Bb4 D5 Ab5)/8',
      ],
      '(F1 F2)/8, D3/16/r, (G3 G4)/16, (G3 G4)/8, (F3 F4)/q, D3/8/r',
    ],
    [
      [
        'Bb5/q., B4/q/r.[quiet="yes"]',
        'E5/8/r., (Bb4 Db5 G5)/16, (Bb4 Db5 G5)/8, E5/8/r., (G4 Db5 Eb5)/16, (G4 Db5 Eb5)/8',
      ],
      '(Eb1 Eb2)/8, D3/16/r, (F3 F4)/16, (F3 F4)/8, (Eb3 Eb4)/q, D3/8/r',
    ],
  ];

  // Barline positions follow the five systems of the scan. Only the first system is indented.
  // Coordinates use the reference page at 888 units wide; the staves are drawn at normal VexFlow size.
  const rows = [
    { first: 1, top: 164, bass: 242, edges: [102, 288, 380, 506, 600, 721, 828] },
    { first: 7, top: 358, bass: 428, edges: [55, 242, 340, 480, 589, 707, 830] },
    { first: 13, top: 545, bass: 614, edges: [55, 285, 546, 690, 832] },
    { first: 17, top: 732, bass: 811, edges: [55, 302, 467, 645, 833] },
    { first: 21, top: 942, bass: 1010, edges: [55, 311, 504, 658, 837] },
  ];
  const scale = 1.5;
  const width = 1332;
  const height = (width * 11) / 8.5;

  /** Make each voice in order; inline clefs take no time. The source does not number its octave flourish. */
  function makeVoice(VF, factory, score, music, clef, stem, flourish) {
    const [first, treble] = music.split(' ;treble; ');
    const notes = score.notes(first, { clef, stem });
    const items = [...notes];
    if (treble) {
      const high = score.notes(treble, { clef: 'treble', stem });
      items.push(factory.ClefNote({ type: 'treble', options: { size: 'small' } }), ...high);
      notes.push(...high);
    }
    // The low bass octaves have a short downward stem, leaving room for the pedal glyph below.
    if (clef === 'bass' && (first.startsWith('(') || first.startsWith('Eb2/8,')))
      notes[0].setStemLength(16).setStemDirection(-1);
    if (flourish) {
      notes[0].setStemDirection(-1);
      const run = notes.slice(2);
      new VF.Tuplet(run, { numNotes: 7, notesOccupied: 5 });
      score.beam(run, { autoStem: false });
    } else {
      score.autoBeam(notes, { groups: [new VF.Fraction(3, 8)] });
    }
    return { notes, voice: score.voice(items, { time: '6/8' }) };
  }

  /** Engrave both hands on a common rhythmic grid. Spelling is reset at each barline. */
  function measure(VF, factory, score, row, offset) {
    const bar = row.first + offset;
    const system = factory.System({
      x: row.edges[offset] * scale,
      y: row.top * scale - 40,
      width: (row.edges[offset + 1] - row.edges[offset]) * scale,
      spaceBetweenStaves: ((row.bass - row.top) * scale) / 10,
    });
    const hands = bars[bar - 1].map((music, hand) => {
      const clef = hand ? 'bass' : 'treble';
      const parts = Array.isArray(music) ? music : [music];
      const voices = parts.map((part, i) =>
        makeVoice(
          VF,
          factory,
          score,
          part,
          clef,
          parts.length > 1
            ? i
              ? 'down'
              : 'up'
            : (hand && bar >= 9 && bar <= 20) || (!hand && bar === 14)
              ? 'up'
              : 'auto',
          bar === 14 && !hand
        )
      );
      const stave = system.addStave({ voices: voices.map((v) => v.voice) });
      if (!offset) {
        stave.addClef(clef).addKeySignature('Ab');
        if (bar === 1) stave.addTimeSignature('6/8');
      }
      if (hand && (bar === 9 || bar === 13)) stave.addEndClef('bass', 'small');
      VF.Accidental.applyAccidentals(
        voices.map((v) => v.voice),
        'Ab'
      );
      return { stave, voices };
    });
    if (!offset) system.addConnector('brace');
    system.addConnector('singleRight');
    return hands;
  }

  /** Phrase endpoints are written as [bar, note, optional voice], all notes counted from zero. */
  function decorate(VF, factory, measures) {
    const note = (hand, [bar, index, voice = 0]) => measures[bar - 1][hand].voices[voice].notes[index];
    const right = (bar, i, v) => note(0, [bar, i, v]);
    const left = (bar, i) => note(1, [bar, i]);
    function slur(hand, start, end, side, rise, clearance = 5) {
      factory.Curve({
        from: note(hand, start),
        to: note(hand, end),
        options: {
          openingDirection: side === 'above' ? 'down' : 'up',
          position: 'auto',
          positionEnd: 'auto',
          // Widen short two-note slurs to reach over the stems of a beamed octave pair.
          xShift: rise <= 6 ? -6 : 0,
          yShift: clearance,
          cps: [
            { x: 0, y: rise },
            { x: 0, y: rise },
          ],
        },
      });
    }
    function tie(from, to, heads, endHeads = heads, direction = 1) {
      factory.StaveTie({ from, to, firstIndexes: heads, lastIndexes: endHeads, options: { direction } });
    }
    // Where a phrase turns the line, use partial ties at the two actual system edges.
    const chordTie = (bar, a, b, heads) => {
      const last = right(bar, a),
        next = right(bar + 1, b);
      if (rows.some((row) => row.first === bar + 1)) {
        tie(last, null, heads);
        tie(null, next, heads);
      } else tie(last, next, heads);
    };
    slur(0, [1, 0], [2, 2], 'above', 20);
    slur(1, [1, 0], [2, 2], 'below', 24);
    tie(right(2, 2), right(3, 0), [2], [0], -1);
    tie(right(3, 0), right(4, 0), [0], [3], -1);
    slur(1, [3, 0], [4, 3], 'above', 18);
    slur(0, [5, 0], [6, 2], 'above', 15);
    tie(right(5, 0), right(6, 0), [0], [1], -1);
    slur(1, [5, 0], [6, 2], 'below', 18);
    chordTie(6, 2, 0, [0, 1, 2]);
    tie(left(6, 2), null, [0], [0], -1);
    tie(null, left(7, 0), [0], [0], -1);
    tie(left(7, 0), left(7, 1), [0], [0], -1);
    slur(0, [7, 0], [8, 2], 'above', 19);
    slur(1, [7, 2], [8, 2], 'above', 25);
    for (let bar = 9; bar <= 24; bar++) {
      if (bar <= 16) slur(1, [bar, 2], [bar, bar === 13 || bar === 14 ? 4 : 3], 'above', 6);
      else if (bar <= 20) slur(1, [bar, 2], [bar, 3], 'below', 8);
      else slur(1, [bar, 3], [bar, 4], 'above', 7);
      left(bar, 0).addModifier(factory.Articulation({ type: 'a.', position: 'above' }));
    }
    for (const bar of [9, 10, 13, 14])
      right(bar, 0).addModifier(factory.Articulation({ type: 'a^', position: 'above' }));
    left(2, 2).addModifier(factory.Stroke(VF.Stroke.Type.ARPEGGIO_DIRECTIONLESS, { allVoices: false }));
    for (const [bar, index, voice] of [
      [6, 2, 0],
      [15, 0, 0],
      [19, 2, 1],
    ]) {
      right(bar, index, voice).addModifier(factory.Stroke(VF.Stroke.Type.ARPEGGIO_DIRECTIONLESS, { allVoices: false }));
    }
    slur(0, [10, 0], [10, 3], 'above', 15);
    slur(0, [11, 1], [12, 5], 'above', 22);
    slur(0, [14, 0], [14, 9], 'above', 17);
    slur(0, [15, 0], [16, 5], 'above', 12, 1);
    slur(0, [17, 2], [18, 4], 'above', 34);
    slur(0, [19, 0], [20, 5, 1], 'above', 22, 18);
    slur(0, [21, 3], [21, 6], 'above', 16);
    slur(0, [22, 2], [22, 5], 'above', 15);
    slur(0, [23, 0, 1], [24, 5, 1], 'above', 40, 17);
    for (const [bar, last] of [
      [15, 5],
      [16, 5],
    ])
      chordTie(bar, last, 0, [0, 1]);
    // Short paired articulations inside the longer octave phrases.
    for (const [bar, a, b] of [
      [10, 2, 3],
      [11, 1, 2],
      [11, 4, 5],
      [12, 1, 2],
      [12, 4, 5],
      [18, 1, 2],
      [21, 5, 6],
    ]) {
      slur(0, [bar, a], [bar, b], 'above', 5);
    }
    chordTie(14, 9, 0, [0, 1]);
    tie(right(17, 2), right(17, 3), [0, 1]);
    tie(right(19, 2), right(19, 3), [0], [0], -1);
    tie(right(21, 3), right(21, 4), [0, 1, 2]);
    tie(right(22, 2), right(22, 3), [0, 1, 2]);
    tie(right(23, 1), right(23, 2), [0], [0], -1);

    const grace = (host, keys, clef) =>
      host.addModifier(
        factory.GraceNoteGroup({
          notes: [factory.GraceNote({ keys, clef, duration: '8', slash: true })],
          slur: true,
        })
      );
    grace(left(3, 3), ['c/4'], 'bass');
    grace(right(22, 5), ['eb/5', 'ab/5', 'eb/6'], 'treble');

    fingerings(factory, right, left);
    hairpins(VF, factory, right, left);
  }

  /** Fingerings apply to specific chord heads. Keep the alternating fingers of each octave pair together. */
  function fingerings(factory, right, left) {
    function mark(note, number, position, head = 0) {
      note.addModifier(factory.Fingering({ number, position }).setFont('Times New Roman', 10, 'bold'), head);
    }
    // prettier-ignore
    const upper = [
      [1,0,'3'],[1,3,'5'],[1,4,'3'],[2,2,'45'],[5,0,'5'],[7,1,'5'],[7,2,'5'],[7,4,'4'],[8,1,'4'],
      [10,2,'4'],[10,3,'5'],[11,1,'4'],[11,2,'5'],[11,4,'4'],[11,5,'5'],[12,1,'4'],[12,2,'5'],[12,4,'4'],[12,5,'5'],
      [14,2,'5'],[14,3,'4'],[14,5,'3'],[14,9,'5'],[15,1,'4'],[15,2,'5'],[15,4,'4'],[15,5,'5'],
      [16,1,'4'],[16,2,'5'],[16,4,'4'],[16,5,'5'],[17,1,'2'],[17,4,'4'],[18,1,'4'],[18,2,'5'],
      [19,0,'5'],[19,1,'4'],[19,2,'5'],[20,1,'4',1],[20,4,'4',1],[20,5,'3',1],
      [21,5,'4'],[22,5,'4'],[23,0,'5',1],[23,4,'3',1],[23,5,'4',1],[24,4,'4',1],[24,5,'3',1]
    ];
    for (const [bar, i, finger, voice] of upper) {
      const n = right(bar, i, voice);
      mark(n, finger, 'above', n.keys.length - 1);
    }
    // prettier-ignore
    const lower = [
      [1,1,'1'],[1,3,'1'],[1,4,'4'],[3,0,'2'],[4,2,'4'],[5,0,'3'],[6,2,'21'],[8,0,'4'],
      [9,2,'3'],[10,2,'4'],[11,2,'4'],[12,2,'5'],[13,2,'4'],[17,2,'4'],[19,2,'4'],[20,2,'4']
    ];
    for (const [bar, i, finger] of lower) mark(left(bar, i), finger, 'below');
  }

  /** Wedges sit between the hands, except for the left hand's rising entry in measure 5. */
  function hairpins(VF, factory, right, left) {
    for (const [from, to, baseline] of [
      [left(5, 1), left(6, 0), 281],
      [right(10, 2), right(10, 3), 386],
      [right(18, 4), right(19, 1), 788],
      [right(22, 4), right(23, 1, 1), 977],
    ])
      factory
        .StaveHairpin({ from, to, type: VF.StaveHairpin.type.CRESC, options: { height: 9 } })
        .setLayoutBaseline(baseline * scale);

    // Wedges use the same between-staff baselines as the edition's expression words.
    for (const [bar, a, b, growing, voice = 0] of [
      [1, 0, 4, true],
      [2, 0, 2, false],
      [7, 0, 4, true],
      [8, 0, 2, false],
      [14, 2, 7, true],
      [15, 0, 2, false],
      [16, 0, 2, false],
      [17, 1, 3, true],
      [19, 2, 3, false],
      [20, 4, 5, true, 1],
      [21, 5, 6, true],
    ]) {
      const row = rows.findLast((r) => r.first <= bar);
      factory
        .StaveHairpin({
          from: right(bar, a, voice),
          to: right(bar, b, voice),
          type: growing ? VF.StaveHairpin.type.CRESC : VF.StaveHairpin.type.DECRESC,
          options: { height: 8, leftShiftPx: bar === 1 ? 32 : 0 },
        })
        .setLayoutBaseline((row.top + 45) * scale);
    }
  }

  /** Place the pedal glyph below the actual low-octave stem after the music has been formatted. */
  function pedals(VF, ctx, measures) {
    for (let bar = 9; bar <= 24; bar++) {
      const bass = measures[bar - 1][1].voices[0].notes;
      const row = rows.findLast((row) => row.first <= bar);
      // A text-style release is anchored to the end of the preceding note.
      const beforeRelease = bar === 13 || bar === 14 || bar >= 21 ? 3 : 2;
      const pedal = new VF.PedalMarking([bass[0], bass[beforeRelease]]).setContext(ctx).setFontSize(27);
      pedal.setLayoutBaseline(Math.max((row.bass + 66) * scale, bass[0].getStemExtents().topY + 23));
      pedal.drawWithStyle();
    }
  }

  /** Use the same physical page coordinates for the scan's title, dedication, tempo, and dynamic words. */
  function lettering(VF, ctx, measures) {
    function text(label, x, y, size, weight = 'normal', style = 'normal', align = 'left', family = 'Times New Roman') {
      ctx.save().setFont(family, size, weight, style);
      const advance = ctx.measureText(label).width;
      ctx.fillText(label, x - (align === 'center' ? advance / 2 : align === 'right' ? advance : 0), y);
      ctx.restore();
    }
    text('3ᵐᵉ Ballade.', width / 2, 132, 34, 'bold', 'normal', 'center');
    text('À Mˡˡᵉ Pauline de Noailles.', 82, 171, 18, 'bold', 'italic');
    text('Allegretto.', 243, 207, 23, 'bold');
    text('Fr. Chopin, Op. 47.', 1237, 214, 19, 'bold', 'normal', 'right');
    for (const [bar, label] of [
      [1, 'm. v.'],
      [3, 'dolce'],
      [9, 'f'],
      [10, 'meno f'],
      [11, 'p'],
      [13, 'f'],
      [14, 'meno f'],
      [15, 'p'],
      [18, 'poco cresc.'],
      [20, 'dim.'],
      [21, 'rf'],
      [24, 'poco dim.'],
    ]) {
      const row = rows.findLast((r) => r.first <= bar);
      const n = measures[bar - 1][0].voices[0].notes[0];
      const x = n.getAbsoluteX();
      const y = (row.top + (bar === 21 ? 62 : bar === 24 ? 45 : 52)) * scale;
      if (['f', 'p', 'rf', 'meno f'].includes(label)) {
        const glyphs = [...(label === 'meno f' ? 'f' : label)].map((letter) => VF.TextDynamics.GLYPHS[letter]).join('');
        if (label === 'meno f') text('meno', x + 3, y - 3, 17, 'normal', 'italic', 'right');
        text(glyphs, x + (label === 'meno f' ? 11 : 0), y, 30, 'normal', 'normal', 'left', 'Bravura');
      } else {
        text(label, x - 4, y, 18, 'normal', 'italic');
      }
    }
  }

  /** The small alternative in measure 3 replaces the grace note with a mordent on B-flat. */
  function ossia(VF, ctx, bar) {
    const small = 0.63,
      x = bar[1].voices[0].notes[3].getAbsoluteX() - 8,
      y = bar[1].stave.getYForLine(6.2);
    ctx.save();
    const group = ctx.openGroup('ossia');
    if (group) group.setAttribute('transform', 'scale(' + small + ')');
    else ctx.scale(small, small);
    const f = new VF.Factory({ renderer: { elementId: null } }).setContext(ctx);
    const score = f.EasyScore();
    const notes = score.notes('Bb3/8, A3/8, Bb3/8', { clef: 'bass', stem: 'down' });
    notes[0].addModifier(f.Ornament('mordent', { position: 'above' }));
    score.beam(notes, { autoStem: false });
    const system = f.System({ x: x / small, y: y / small - 40, width: 125 });
    const voice = score.voice(notes, { time: '3/8' });
    VF.Accidental.applyAccidentals([voice], 'Ab');
    system.addStave({ voices: [voice] });
    f.draw();
    ctx.setFont('Times New Roman', 21, 'bold').fillText('Ossia.', x / small - 75, y / small + 30);
    ctx.closeGroup();
    ctx.restore();
  }

  /** Render the complete opening page with the native Canvas or SVG backend. */
  function draw(VF, factory) {
    const score = factory.EasyScore({ throwOnError: true, extensions: ['quiet'] });
    score.set({ time: '6/8' });
    score.addCommitHook(({ quiet }, n) => {
      // An inaudible gap lets a secondary voice enter at its written rhythmic position.
      if (quiet) n.setStyle({ fillStyle: 'transparent', strokeStyle: 'transparent' });
    });
    const measures = rows.flatMap((row) =>
      row.edges.slice(1).map((_, offset) => measure(VF, factory, score, row, offset))
    );
    decorate(VF, factory, measures);
    factory.draw();
    const ctx = factory.getContext();
    pedals(VF, ctx, measures);
    lettering(VF, ctx, measures);
    ossia(VF, ctx, measures[2]);
    return rows.map(({ first, edges }) => ({ measures: edges.slice(1).map((_, i) => first + i) }));
  }
  return { draw, width, height };
})();
globalThis.ChopinBallade = ChopinBallade;
