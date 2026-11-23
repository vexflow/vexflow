// Short passages for continuous slur routing on screen and in extracted parts.

/** The fourth-string 2–3 ligado and surrounding chord attacks from the Soleá guitar study. */
export function soleaSlurStudy() {
  const event = (id, duration, positions) => ({
    id,
    tab: { duration, positions: positions.map(([str, fret]) => ({ str, fret })) },
  });
  return {
    sheet: { width: 480, y: 28 },
    staves: [
      {
        id: 'guitar',
        kind: 'tab',
        time: '3/8',
        measures: [
          { voices: [{ notes: [event('C', 'q', [[5, 3]]), event('ligado-start', '8', [[4, 2]])] }] },
          {
            voices: [
              {
                notes: [
                  event('ligado-end', '8', [[4, 3]]),
                  event('answer', 'q', [
                    [3, 0],
                    [2, 1],
                  ]),
                ],
              },
            ],
          },
        ],
      },
    ],
    continuous: {
      spans: [{ id: 'ligado', kind: 'slur', from: 'ligado-start', to: 'ligado-end', string: 4, side: 'above' }],
    },
  };
}

/** The marked right-hand phrase across the first barline of Liszt's Friska, in the written six-sharp key. */
export function friskaSlurStudy(VF) {
  const notes = (bar) =>
    [
      ['8', ['b#/4', 'e/5', 'b#/5']],
      ['8', ['c/5', 'g/5', 'c/6']],
      ['8d', ['b/4', 'e/5', 'b/5']],
      ['16', ['c/5', 'c/6']],
    ].map(([duration, keys], i) => ({ id: 'rh' + bar + i, note: { keys, duration, stemDirection: -1 } }));
  return {
    sheet: { width: 680, y: 60 },
    staves: [
      {
        id: 'piano',
        key: 'F#',
        time: '2/4',
        measures: [0, 1].map((i) => ({
          voices: [
            {
              notes: notes(i),
              beams: [
                { start: 0, count: 2 },
                { start: 2, count: 2 },
              ],
            },
          ],
        })),
      },
    ],
    continuous: { spans: [{ id: 'friska', kind: 'slur', from: 'rh02', to: 'rh10', side: 'above' }] },
    engraving: {
      prepareNote({ id }, n) {
        const last = n.getKeys().length - 1;
        n.addModifier(
          new VF.FretHandFinger(id.endsWith('3') ? '4' : '5').setPosition(VF.Modifier.Position.ABOVE),
          last
        );
        if (!id.endsWith('3'))
          n.addModifier(
            new VF.Articulation(id.endsWith('2') ? 'a>' : 'a.').setPosition(VF.Modifier.Position.ABOVE),
            last
          );
      },
    },
  };
}
