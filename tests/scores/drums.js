// Pocket Change. The legend, staff and accessible event names use one percussion map.
(() => {
  const title = 'Pocket Change';
  const credit = 'Example piece · Drum kit';
  const intro =
    'Keep the hi-hat in eighths and the kick independent. Select the backbeat to read both instruments, then follow the two triplets down the toms in the sixth bar.';
  const action = 'Inspect the backbeat';
  const focus = 'hands-0-2';

  function create(VF, score) {
    const kit = new VF.PercussionMap([
      ...VF.PercussionMap.kit,
      { id: 'rack', label: 'Rack tom', line: 4, stem: 'up' },
      { id: 'floor', label: 'Floor tom', line: 2, stem: 'up' },
    ]);
    const feet = [
      ['q', 'qr', '8', '8', 'qr'],
      ['qd', '8', 'q', 'qr'],
      ['q', 'qr', '8', '8', 'qr'],
      ['8', '8', 'qr', 'q', '8', '8r'],
      ['q', 'qr', 'qd', '8'],
      ['q', 'qr', 'q', 'q'],
    ];
    const measures = feet.map((rhythm, m) => {
      const beat = [['hat'], ['hat'], ['snare', 'hat'], ['hat']];
      const fill = [['snare'], ['snare'], ['rack'], ['rack'], ['floor'], ['floor']];
      const hands = [
        ...beat,
        ...(m === feet.length - 1 ? fill : [['hat'], ['snare', 'hat'], ['snare', 'hat'], ['hat']]),
      ];
      return {
        voices: [
          {
            notes: hands.map((ids, i) => ({ id: 'hands-' + m + '-' + i, note: kit.note(ids, '8') })),
            ...(m === feet.length - 1
              ? { tuplets: [4, 7].map((start) => ({ start, count: 3, options: { numNotes: 3, notesOccupied: 2 } })) }
              : {}),
          },
          {
            notes: rhythm.map((duration, i) => ({
              id: 'feet-' + m + '-' + i,
              note: duration.endsWith('r')
                ? { keys: ['d/4'], duration, clef: 'percussion' }
                : kit.note(['kick'], duration),
            })),
          },
        ],
      };
    });
    return {
      spec: {
        staves: [{ id: 'kit', clef: 'percussion', time: '4/4', measures }],
        continuous: {
          boundaries: [
            { measure: 4, breakBefore: 'force' },
            { measure: 6, repeatEnd: true },
          ],
        },
      },
      legend:
        'Kit key · ' +
        kit.instruments
          .map((d) => d.label + ' (' + (d.head === 'cross' ? '×, ' : '') + 'line ' + d.line + ')')
          .join(' · '),
      decorate(c) {
        c.staves[0][0].setTempo({ name: 'In the pocket', duration: 'q', bpm: 92 }, -54);
        // Beam the kick's pairs independently of the backbeat.
        for (const [m, i] of [
          [0, 2],
          [2, 2],
          [3, 0],
        ])
          score.beam([c.getNote('feet-' + m + '-' + i), c.getNote('feet-' + m + '-' + (i + 1))]);
        VF.Dot.buildAndAttach([c.getNote('feet-4-2')]);
        VF.Dot.buildAndAttach([c.getNote('feet-1-0')]);
        for (let m = 0; m < feet.length; m++) {
          const hand = (i) => c.getNote('hands-' + m + '-' + i);
          for (const group of m === feet.length - 1
            ? [
                [0, 1, 2, 3],
                [4, 5, 6],
                [7, 8, 9],
              ]
            : [
                [0, 1, 2, 3],
                [4, 5, 6, 7],
              ])
            score.beam(group.map(hand));
          hand(2).addModifier(score.make.articulation({ type: 'accent', position: 'above' }));
          if (m !== feet.length - 1) {
            for (const side of [VF.Modifier.Position.LEFT, VF.Modifier.Position.RIGHT])
              hand(5).addModifier(score.make.parenthesis(side), 0);
            hand(6).addModifier(score.make.articulation({ type: 'accent', position: 'above' }));
          }
        }
      },
    };
  }

  window.FeaturedScores.drums = { title, credit, intro, action, focus, create };
})();
