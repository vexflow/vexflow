// Continuous-score review material, shared by the release comparison and reflow contracts.
export function makeContinuousStudy(VF, factory, kind, width, mode = 'balanced') {
  const score = factory.EasyScore();
  const measure = (notes, changes = {}) => ({ ...changes, voices: [{ notes }] });
  const event = (key, duration, id, stave, clef) => ({
    note: { keys: Array.isArray(key) ? key : [key], duration, ...(clef ? { clef } : {}) },
    id,
    stave,
  });
  const main = typeof VF.Sheet.prototype.getContinuousLayout === 'function';
  let staves,
    spans = [],
    boundaries = [],
    groups = [];
  if (kind === 'choir') {
    const pitches = [
      ['g/4', 'a/4'],
      ['b/4', 'a/4'],
      ['g/4', 'e/4'],
      ['a/4', 'b/4'],
      ['a/4', 'g/4'],
      ['f#/4', 'g/4'],
    ];
    staves = [
      {
        id: 'voice',
        name: 'Voice',
        shortName: 'V.',
        measures: pitches.map((p, i) =>
          measure(
            p.map((k, j) => event(k, 'h', 'v' + i + j)),
            i === 2 ? { key: 'D' } : {}
          )
        ),
      },
    ];
    spans = [
      { id: 'sung-word', kind: 'lyric', text: 'Sing', from: 'v00', to: 'v51' },
      { id: 'phrase', kind: 'slur', from: 'v00', to: 'v51', side: 'above' },
    ];
  } else if (kind === 'keyboard') {
    const upper = [
      ['e/5', 'd/5'],
      ['c/5', 'b/4'],
      ['a/4', 'g/4'],
      ['f/4', 'e/4'],
    ];
    const lower = ['c/3', 'e/3', 'f/3', 'c/3'];
    staves = [
      {
        id: 'right',
        name: 'Piano',
        shortName: 'Pno.',
        measures: upper.map((p, i) => measure(p.map((k, j) => event(k, 'h', 'r' + i + j)))),
      },
      { id: 'left', clef: 'bass', measures: lower.map((k, i) => measure([event(k, 'w', 'l' + i)])) },
    ];
    // A beamed figure changes staves inside the first measure.
    staves[0].measures[0].voices = [
      {
        autoBeam: true,
        stem: 'down',
        notes: [
          event('e/5', '8', 'r00'),
          event('b/3', '8', 'cross', 'left', 'bass'),
          event('d/5', 'q', 'r01'),
          event('c/5', 'h', 'rch'),
        ],
      },
    ];
    spans = [
      { id: 'swell', kind: 'crescendo', from: 'r01', to: 'r31' },
      { id: 'sustain', kind: 'pedal', from: 'l0', to: 'l3' },
    ];
    groups = [{ first: 'right', last: 'left', type: 'brace', barlines: true }];
    boundaries = [{ measure: 3, breakBefore: 'force', rehearsal: 'B' }];
  } else if (kind === 'chord') {
    const part = (staff, clef, pitches) => ({
      id: staff,
      clef,
      measures: pitches.map((pair, i) =>
        measure(pair.map((key, k) => ({ id: staff + i + k, note: { keys: [key], duration: 'h', stemDirection: 1 } })))
      ),
    });
    staves = [
      part('rh', 'treble', [
        ['e/4', 'g/4'],
        ['a/4', 'b/4'],
      ]),
      part('lh', 'bass', [
        ['c/3', 'e/3'],
        ['f/3', 'g/3'],
      ]),
    ];
    groups = [{ first: 'rh', last: 'lh', type: 'brace', barlines: true }];
  } else if (kind === 'ensemble') {
    const rest = () => measure([event('b/4', 'wr')]);
    const make = (staff, pitches) => pitches.map((p, i) => (p ? measure([event(p, 'w', staff + i)]) : rest()));
    staves = [
      { id: 'fl', name: 'Flute', shortName: 'Fl.', measures: make('fl', ['e/5', null, null, null, 'd/5', 'e/5']) },
      {
        id: 'vc',
        clef: 'bass',
        name: 'Cello',
        shortName: 'Vc.',
        measures: make('vc', [null, null, null, null, 'g/2', 'c/3']),
      },
    ];
    boundaries = [
      { measure: 5, breakBefore: 'force', rehearsal: 'B', repeatStart: true },
      { measure: 6, repeatEnd: true },
    ];
    groups = [{ first: 'fl', last: 'vc', type: 'bracket' }];
  } else {
    const content = ['C4/q, D4/q, E4/q, F4/q', 'G4/w', 'F4/w', 'E4/w', 'D4/w', 'C4/w', 'G4/w'];
    staves = [{ id: 'line', measures: content.map((n) => measure(n)) }];
  }
  const result = score.compose({
    sheet: { width, x: 12, y: 8, rowGap: 14, measurePadding: 14 },
    system: { spaceBetweenStaves: 8 },
    accidentals: 'key-aware',
    staves,
    continuous: {
      mode,
      groups,
      spans,
      boundaries,
      measureNumbers: true,
      hideEmptyStaves: kind === 'ensemble',
      splitChords: kind === 'chord' ? [{ id: 'split', upper: 'rh00', lower: 'lh00' }] : [],
      compressRests: kind === 'ensemble',
    },
  });
  if (kind === 'chord') {
    const arpeggio = factory
      .Stroke(VF.Stroke.Type.ARPEGGIO_DIRECTIONLESS, { allVoices: false })
      .addEndNote(result.getNote('lh00'));
    result.getNote('rh00').addModifier(arpeggio, 0);
  }
  if (kind === 'keyboard') {
    const cross = result.getNote('cross'),
      beam = cross.getBeam();
    if (beam) cross.setStemDirection(1).setBeam(beam);
  }
  if (!main && kind === 'choir') result.getNote('v00').addModifier(factory.Annotation({ text: 'Sing' }), 0);
  return result;
}

/** Two quarter-note chords reorder their tab positions but sustain string two across the barline. */
export function tabEndingStudy() {
  const positions = [
    { str: 1, fret: 12 },
    { str: 2, fret: 10 },
  ];
  return {
    staves: [
      {
        id: 'guitar',
        kind: 'tab',
        time: '1/4',
        measures: [positions, [...positions].reverse()].map((chord, i) => ({
          voices: [{ notes: [{ id: 'tab' + i, tab: { duration: 'q', positions: chord } }] }],
        })),
      },
    ],
    continuous: {
      spans: [
        { id: 'hold', kind: 'tie', from: 'tab0', to: 'tab1', fromHead: 1 },
        { id: 'ending', kind: 'volta', from: 'tab0', to: 'tab1', text: '1.' },
      ],
    },
  };
}

/** Four aligned eighths across a grand staff. Either voice can own the single native beam. */
export function beamedSplitChordStudy(VF, stemDirection, spaceBetweenStaves, beamStaff = 'upper') {
  const staves = ['upper', 'lower'].map((id) => {
    const octave = id === 'upper' ? 4 : 3;
    const notes = ['e', 'f', 'g', 'a'].map((pitch, index) => ({
      id: id + index,
      note: { keys: [pitch + '/' + octave], duration: '8', stemDirection },
    }));
    return {
      id,
      clef: id === 'upper' ? 'treble' : 'bass',
      time: '2/4',
      measures: [{ voices: [{ notes, autoBeam: id === beamStaff && { groups: [new VF.Fraction(1, 2)] } }] }],
    };
  });
  return {
    sheet: { x: 12, y: 8, width: 280 },
    system: { spaceBetweenStaves },
    staves,
    continuous: {
      groups: [{ first: 'upper', last: 'lower', type: 'brace', barlines: true }],
      splitChords: Array.from({ length: 4 }, (_, i) => ({ id: 'split' + i, upper: 'upper' + i, lower: 'lower' + i })),
    },
  };
}

/** Four eighths straddling the barline. The two neighboring quarters stay outside the beam. */
export function continuousBeamStudy(boundaries = []) {
  const event = (id, pitch, duration) => ({ id, note: { keys: [pitch], duration, stemDirection: -1 } });
  return {
    sheet: { width: 450, measurePadding: 12, rowGap: 22 },
    staves: [
      {
        id: 'melody',
        time: '2/4',
        measures: [
          { voices: [{ notes: [event('g', 'g/4', 'q'), event('b', 'b/4', '8'), event('c', 'c/5', '8')] }] },
          { voices: [{ notes: [event('d', 'd/5', '8'), event('e', 'e/5', '8'), event('f', 'f/5', 'q')] }] },
        ],
      },
    ],
    continuous: { boundaries, spans: [{ id: 'phrase-beam', kind: 'beam', from: 'b', to: 'e' }] },
  };
}

/** Two chord attacks joined by a straight slide, with a quarter note on either side. */
export function glissandoStudy(descending = false, forceBreak = false) {
  const low = ['a/4', 'b/4'];
  const high = ['e/5', 'f/5'];
  const event = (id, keys) => ({ id, note: { keys, duration: 'q', stemDirection: 1 } });
  return {
    sheet: { width: 430 },
    staves: [{
      id: 'violin', time: '2/4', measures: [
        { voices: [{ notes: [event('lead', ['g/4']), event('from', descending ? high : low)] }] },
        { voices: [{ notes: [event('to', descending ? low : high), event('end', ['a/4'])] }] },
      ],
    }],
    continuous: {
      boundaries: forceBreak ? [{ measure: 2, breakBefore: 'force' }] : [],
      spans: [{ id: 'slide', kind: 'glissando', from: 'from', fromHead: 1, to: 'to', toHead: 0 }],
    },
  };
}

/** Six written eighths on beat four and the following downbeat. */
export function sextupletStudy() {
  const member = (i) => ({
    id: 't' + i,
    note: { keys: [['g/4', 'a/4', 'b/4', 'c/5', 'b/4', 'a/4'][i]], duration: '8' },
  });
  return {
    sheet: { width: 530, rowGap: 18 },
    staves: [
      {
        id: 'flute',
        time: '4/4',
        measures: [
          { voices: [{ notes: ['G4/q, A4/q, B4/q', ...[0, 1, 2].map(member)] }] },
          {
            voices: [
              {
                notes: [...[3, 4, 5].map(member), { id: 'next', note: { keys: ['g/4'], duration: 'q' } }, 'F4/q, G4/q'],
              },
            ],
          },
        ],
      },
    ],
    continuous: {
      tuplets: [{ id: 'six', members: [0, 1, 2, 3, 4, 5].map((i) => 't' + i), numNotes: 6, notesOccupied: 4 }],
    },
  };
}

/** Two excerpts from Chopin's Ballade No. 3 with the ossia at m. 3 and the pedal change at m. 9. */
export function balladeSpacingStudy() {
  const event = (id, keys, duration) => ({ id, note: { keys: keys.split(' '), duration } });
  const bar = (notes, autoBeam = false) => ({ voices: [{ notes, autoBeam }] });
  return {
    sheet: { width: 580, rowGap: 24 },
    staves: [
      {
        id: 'ossia',
        clef: 'bass',
        key: 'Ab',
        time: '6/8',
        options: { spacingBetweenLinesPx: 7 },
        measures: [bar('Bb3/8, An3, Bb3, B3/q/r, B3/8/r', true), bar('B3/h/r, B3/q/r')],
      },
      {
        id: 'upper',
        clef: 'treble',
        key: 'Ab',
        time: '6/8',
        measures: [
          bar('Eb5/h.'),
          bar([
            event('octave', 'ab/5 ab/6', 'qd'),
            event('upper-rest', 'b/4', 'qr'),
            event('upper-rest2', 'b/4', '8r'),
          ]),
        ],
      },
      {
        id: 'lower',
        clef: 'bass',
        key: 'Ab',
        time: '6/8',
        measures: [
          bar('Db4/8, C4, Bb3, Bb3, An3, Bb3', true),
          bar([
            event('pedal-down', 'ab/1 ab/2', '8'),
            event('lower-rest', 'd/3', '8r'),
            event('pedal-up', 'gb/4 ab/4 eb/5', '8'),
            event('lower-chord', 'f/4 ab/4 d/5', 'q'),
            event('lower-rest2', 'd/3', '8r'),
          ]),
        ],
      },
    ],
    continuous: {
      verticalSpacing: 'profile',
      hideEmptyStaves: true,
      groups: [{ first: 'upper', last: 'lower', type: 'brace', barlines: true }],
      boundaries: [{ measure: 2, breakBefore: 'force' }],
      spans: [{ id: 'pedal', kind: 'pedal', from: 'pedal-down', to: 'pedal-up' }],
    },
  };
}
