// Opening measures from the three scores whose headings share space with the first system.
export function openingStudy(kind) {
  const title = (name) => ({ kind: 'text', align: 'center', font: { size: 21, weight: 'bold' }, runs: [name] });
  const credit = (name) => ({ kind: 'text', align: 'center', font: { size: 13, style: 'italic' }, runs: [name] });
  const bar = (notes) => ({ voices: [{ notes, autoBeam: true }] });
  const staff = (id, clef, key, time, measures) => ({ id, clef, key, time, measures });
  const brace = [{ first: 'upper', last: 'lower', type: 'brace', barlines: true }];
  const sheet = { x: 12, y: 10, width: 560, rowGap: 25 };
  if (kind === 'consolation') {
    const top = ['B4/q/r', 'B4/h/r.', 'B4/h/r.', 'B4/h/r, G#4/8., C#5/16'];
    const bass = ['G#2/8., C#3/16', 'B2/q., F#3/8, E3, A3', 'G#3/8, C#4, B3, E4, G#3, C#4', 'B3/h, E4/8, B3'];
    const parts = [
      staff('upper', 'treble', 'E', '3/4', top.map(bar)),
      staff('lower', 'bass', 'E', '3/4', bass.map(bar)),
    ];
    for (const s of parts) s.measures[0].span = '1/4';
    return {
      sheet,
      staves: parts,
      continuous: {
        groups: brace,
        boundaries: [{ measure: 3, breakBefore: 'force' }],
        opening: { indent: 42, blocks: [title('Consolation No. 5'), credit('Franz Liszt (1811–1886)')] },
      },
    };
  }
  if (kind === 'guitar') {
    const frames = [
      ['G13', 9, ['x', 10, 9, 10, 'x', 12]],
      ['C6', 7, [8, 10, 7, 9, 'x', 'x']],
      ['E7♭9', 11, [0, 11, 12, 'x', 'x', 13]],
      ['A9', 9, ['x', 0, 9, 12, 'x', 9]],
      ['Am7', 10, ['x', 0, 10, 0, 10, 'x']],
      ['Dm7', 8, [10, 8, 10, 'x', 'x', 'x']],
      ['D7', 9, [10, 9, 10, 'x', 'x', 'x']],
    ];
    return {
      sheet,
      staves: [staff('guitar', 'treble', 'C', '4/4', [bar('B4/8/r, E5, F5, Ab5, (G3 B3 F4 E6), B5, D6, C6')])],
      continuous: {
        opening: {
          blocks: [
            title('All of Me'),
            credit('Gerald Marks and Seymour Simons'),
            {
              kind: 'diagrams',
              align: 'center',
              diagrams: frames.map(([label, firstFret, frets]) => ({ label, firstFret, frets })),
            },
          ],
        },
      },
    };
  }
  return {
    sheet,
    staves: [
      staff('upper', 'treble', 'F', '4/4', [bar('B4/8/r, A4, C5, D5, Eb5, E5, F5, F#5')]),
      staff('lower', 'bass', 'F', '4/4', [bar('B3/q/r, (F3 A3 D4)/q, B3/q/r, (F#3 C4 Eb4)/q')]),
    ],
    continuous: {
      groups: brace,
      opening: {
        blocks: [
          title('Pocket Change'),
          {
            kind: 'text',
            align: 'left',
            runs: [
              { text: 'Swing   ', font: { weight: 'bold' } },
              { notes: ['8', '8'], beam: true },
              '   =   ',
              { notes: ['q', '8'], tuplet: [3, 2] },
            ],
          },
        ],
      },
    },
  };
}
