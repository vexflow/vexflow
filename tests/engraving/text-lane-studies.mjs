// Short reading studies for system-wide underlay, guitar harmonies and independently timed performance directions.
export function textLaneStudy(kind, systemLanes = true) {
  const voice = (notes, stem) => ({ notes, stem });
  const note = (id, key, duration) => ({ id, note: { keys: key.split(' '), duration } });
  const word = (note, text, marks) => ({ note, text, ...marks });
  const continuous = systemLanes ? { textLanes: 'system' } : {};
  const sheet = { width: 720, x: 15, y: 15, rowGap: 18 };
  if (kind === 'blues') {
    // Divide Handy's four sixteenths and held G at a break so the second verse changes syllable across the line.
    const first = {
      span: '1/4',
      voices: [voice(['b/4', 'd/5', 'b/4', 'g/4'].map((k, i) => note('a' + i, k, '16')))],
      chords: [word('a0', 'G7')],
      verses: [
        ['I', 'hate', 'to', 'see'].map((text, i) =>
          word('a' + i, text, i === 3 && systemLanes ? { extendTo: 'b0' } : {})
        ),
        ['Been', 'to', 'de', 'Gyp'].map((text, i) => word('a' + i, text, { hyphenAfter: i === 3 && systemLanes })),
      ],
    };
    first.verses = first.verses.map((syllables, i) => ({ id: String(i + 1), syllables }));
    const second = {
      span: '1/4',
      voices: [voice([note('b0', 'g/4', 'q')])],
      verses: [{ id: '2', syllables: [word('b0', 'sy')] }],
    };
    return { sheet, continuous, staves: [{ id: 'voice', key: 'G', time: '2/4', measures: [first, second] }] };
  }
  if (kind === 'guitar') {
    const measures = [
      { melody: ['d/5', 'e/5', 'g/5', 'e/5'], bass: 'g/3 b/3 f/4', chord: 'G13' },
      { melody: ['e/6', 'g/5', 'b/5', 'a/5'], bass: 'c/3 g/3 a/3 e/4', chord: 'C6' },
    ].map(({ melody, bass, chord }, i) => ({
      voices: [
        voice(
          melody.map((k, j) => note('m' + i + j, k, 'q')),
          'up'
        ),
        voice([note('bass' + i, bass, 'w')], 'down'),
      ],
      chords: [word('bass' + i, chord)],
    }));
    return {
      sheet,
      staves: [{ id: 'guitar', measures }],
      continuous: {
        ...continuous,
        spans: [{ id: 'guitar-slur', kind: 'slur', side: 'above', from: 'm01', to: 'm13' }],
      },
    };
  }
  // Liszt's left-hand instruction has a time of its own while the lower voice sustains a half note.
  const direction = (id, text, duration, align, anchor, line) => ({
    id,
    direction: { text, duration, align, anchor, line, font: { style: 'italic' } },
  });
  return {
    sheet,
    continuous,
    staves: [
      { id: 'upper', measures: [{ voices: [voice('C5/w')] }] },
      {
        id: 'lower',
        clef: 'bass',
        measures: [
          {
            voices: [
              voice([note('bass-downbeat', 'c/3', 'h'), note('bass-answer', 'g/2', 'h')]),
              voice(
                systemLanes
                  ? [
                      direction('start', 'sempre', 'q', 'left', 'start', 1),
                      direction('instruction', 'il basso sempre stacc.', 'h', 'center', 'beat', 11),
                      direction('end', 'poco rit.', 'q', 'right', 'end', 1),
                    ]
                  : [{ skip: 'w' }]
              ),
            ],
          },
        ],
      },
    ],
  };
}
