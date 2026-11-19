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
