// Short source scores shared by the screen and fresh publication layout regressions.
export function pairedLayoutStudy(example, options = {}) {
  const note = (id, key, duration) => ({ id, note: { keys: [key], duration, autoStem: true } });
  const fret = (id, value, duration, str = 4) => ({ id, tab: { positions: [{ str, fret: value }], duration } });
  const staff = (id, time, voices, state = {}) => ({ id, ...state, measures: [{ time, voices }] });
  const phrase = (from, to, side) => ({ id: 'phrase', kind: 'slur', from, to, side });
  if (example === 'tab-break') {
    const measures = [
      [0, 2],
      [3, 2],
    ].map((values, i) => ({
      time: '2/4',
      clef: 'tab',
      voices: [{ notes: values.map((v, j) => fret((i ? 'b' : 'a') + j, v, 'q')) }],
    }));
    return {
      staves: [{ id: 'tab', kind: 'tab', measures }],
      continuous: {
        boundaries: [{ measure: 2, breakBefore: 'force' }],
        spans: [phrase('a0', 'b1', 'below')],
      },
    };
  }
  if (example === 'harmony') {
    const upper = staff('notation', '2/4', [{ notes: [note('n', 'c/4', 'h')] }]);
    upper.measures[0].chords = [{ note: 'n', text: 'C' }];
    return {
      sheet: { width: 550 },
      continuous: { textLanes: 'system' },
      staves: [
        upper,
        staff('tab', '2/4', [{ notes: [fret('f0', 0, 'q'), fret('f1', 2, 'q')] }], { kind: 'tab', clef: 'tab' }),
      ],
    };
  }
  if (example === 'violin') {
    const notes = ['c/5', 'b/4', 'a/4', 'b/4', 'g/4'].map((key, i) => note('n' + i, key, i < 3 ? 'q' : '8'));
    return {
      sheet: { width: options.width ?? 200 },
      stemPolicy: 'active-voices',
      staves: [staff('v', '4/4', [{ notes, autoBeam: true }])],
      continuous: { spans: [phrase('n2', 'n4', options.side)] },
    };
  }
  if (example === 'directions') {
    const signs = [
      ['solo', 'Solo', 'start'],
      ['tempo', 'Andante', 'start'],
      ['beat', 'dolce', 'beat'],
      ['hold', 'ten.', 'end'],
      ['fine', 'Fine', 'end'],
    ];
    return {
      sheet: { width: options.width ?? 520 },
      continuous: { textLanes: 'system' },
      staves: [
        staff('lead', '4/4', [
          { notes: 'C4/w' },
          ...signs.map(([id, text, anchor]) => ({
            notes: [{ id, direction: { text, anchor, duration: 'w', line: 0 } }],
          })),
        ]),
      ],
    };
  }
  if (example === 'hairpin') {
    const voice = (prefix, keys) => ({ notes: keys.map((key, i) => note(prefix + i, key, 'q')) });
    const upper = options.near ? ['c/2', 'd/5', 'c/5', 'e/5'] : ['c/5', 'd/5', 'c/2', 'e/5'];
    return {
      sheet: { width: 560 },
      continuous: {
        verticalSpacing: 'profile',
        spans: options.omit ? [] : [{ id: 'wedge', kind: 'crescendo', from: 't0', to: 't1', side: 'below' }],
      },
      staves: [
        staff('treble', '4/4', [voice('t', upper)]),
        staff('bass', '4/4', [voice('b', ['g/3', 'a/3', 'c/2', 'c/2'])], { clef: 'bass' }),
      ],
    };
  }
  // Both triplets face into the gap, including the one attached to rhythmic TAB.
  const rhythm = (location) => ({
    beams: [{ start: 0, count: 3 }],
    tuplets: [
      {
        start: 0,
        count: 3,
        options: { numNotes: 3, notesOccupied: 2, location, bracketed: options.bracketed ?? false },
      },
    ],
  });
  return {
    sheet: { width: 310 },
    system: { spaceBetweenStaves: 9 },
    continuous: { verticalSpacing: 'profile' },
    staves: [
      staff('notation', '6/8', [
        {
          ...rhythm(-1),
          notes: ['e/5', 'f#/5', 'g/5', 'f#/5', 'b/4', 'c#/5', 'd/5'].map((k, i) => note('n' + i, k, '8')),
        },
      ]),
      staff(
        'tab',
        '6/8',
        [
          {
            ...rhythm(1),
            notes: [0, 2, 3, 2, 0, 2, 3].map((v, i) => ({ ...fret('f' + i, v, '8', 1), drawStem: true })),
          },
        ],
        { kind: 'tab', clef: 'tab' }
      ),
    ],
  };
}
