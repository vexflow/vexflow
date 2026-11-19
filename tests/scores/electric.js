// High Wire. Eight bars of Drop D with independent ringing treble and muted bass.
(() => {
  const { guitarScore } = window.FeaturedScores;
  const title = 'High Wire';
  const credit = 'Example piece · Electric guitar in Drop D';
  const intro =
    'Mute only string six. In the final bar, bend the D on string three to meet the stationary E on string two. Reach unison halfway through the quarter, hold, then release.';
  const focus = 'tab-7-0-4';
  const action = 'Inspect the bend';

  function create(VF, score) {
    const guitar = new VF.FrettedInstrument('dropd');
    const play = (str, fret, duration) => guitar.attack([{ str, fret }], duration);
    const fifth = (fret) =>
      guitar.attack(
        [
          { str: 4, fret },
          { str: 3, fret: fret + 2 },
        ],
        'h'
      );
    const pedal = () => Array.from({ length: 4 }, () => play(6, 0, '8'));
    const lead = (frets) => frets.map((fret) => play(1, fret, '16'));
    const bend = guitar.bentAttack(
      [
        { str: 3, fret: 7 },
        { str: 2, fret: 5 },
      ],
      'q',
      { string: 3, semitones: 2, rise: [1, 2], hold: [3, 4], release: [1, 1] }
    );
    const bars = [
      [[fifth(0)], pedal()],
      [[play(3, 5, 'q'), play(3, 7, 'q')], pedal()],
      [[fifth(3)], pedal()],
      [
        [play(2, 6, 'q'), play(2, 5, 'q')],
        [play(6, 0, 'q'), 'q'],
      ],
      [[fifth(5)], pedal()],
      [[...lead([5, 8, 10, 8]), play(1, 5, 'q')], pedal()],
      [[fifth(0)], pedal()],
      [
        [...lead([7, 12, 7, 10]), bend],
        [play(6, 0, '8'), '8', 'q'],
      ],
    ];
    const spec = guitarScore(score, bars, '2/4', {
      spans: [
        { id: 'mute', kind: 'palmMute', strings: [6], from: 'tab-0-1-0', to: 'tab-7-1-0' },
        { id: 'legato', kind: 'slur', from: 'staff-5-0-0', to: 'staff-5-0-4' },
        { id: 'pull', kind: 'slur', from: 'staff-7-0-1', to: 'staff-7-0-2' },
        { id: 'hammer', kind: 'slur', from: 'staff-7-0-2', to: 'staff-7-0-3' },
      ],
    });
    return {
      spec,
      decorate(c) {
        for (const view of ['staff', 'tab']) {
          const note = (m, v, i) => c.getNote([view, m, v, i].join('-'));
          for (const m of [0, 1, 2, 4, 5, 6]) for (const i of [0, 2]) score.beam([note(m, 1, i), note(m, 1, i + 1)]);
          for (const m of [5, 7]) score.beam([0, 1, 2, 3].map((i) => note(m, 0, i)));
          note(0, 0, 0).addModifier(score.make.annotation({ text: 'let ring', vJustify: 'top' }));
        }
        // Pick the fifths down and the answering lines up. Slurs mark the unpicked notes.
        const upper = (bar, index = 0) => c.getNote('staff-' + bar + '-0-' + index);
        for (const m of [0, 2, 4, 6]) upper(m).addModifier(score.make.articulation({ type: 'am', position: 'above' }));
        for (const m of [1, 3, 7]) upper(m).addModifier(score.make.articulation({ type: 'a|', position: 'above' }));
        for (const [m, i, number] of [
          [1, 0, '1'],
          [1, 1, '3'],
          [5, 0, '1'],
          [7, 3, '4'],
        ])
          upper(m, i).addModifier(score.make.fingering({ number, position: 'left' }));
        const tap = (i) => c.getNote('tab-7-0-' + i);
        // The tapped attack appears on both staves. Only the tab uses the sans-serif technique alphabet.
        upper(7, 1).addModifier(score.make.annotation({ text: 'T', vJustify: 'top', font: { weight: 'bold' } }));
        tap(1).addModifier(score.make.annotation({ text: 'T', vJustify: 'top' }).setFont('Arial', 10, 'bold'));
        for (const [i, text] of [
          [1, 'P'],
          [2, 'H'],
        ])
          score.make.tabTie({ firstNote: tap(i), lastNote: tap(i + 1), firstIndexes: [0], lastIndexes: [0] }, text);
        tap(3).addModifier(score.make.vibrato());
      },
    };
  }

  window.FeaturedScores.electric = { title, credit, intro, focus, action, create };
})();
