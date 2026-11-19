// BWV 846, bars 1–8. Editorial hand distribution follows the existing gallery arrangement.
(() => {
  const title = 'Prelude in C major';
  const credit = 'Johann Sebastian Bach · The Well-Tempered Clavier, BWV 846';
  const intro =
    'Andante, legato · ♩ = 72. Follow the first arpeggio from the bass staff into the treble. Select a note and narrow the page to follow the same attack after reflow.';
  const focus = 'arp-0-1';
  const action = 'Inspect the arpeggio';
  const harmony = [
    ['c/4', 'e/4', 'g/4', 'c/5', 'e/5'],
    ['c/4', 'd/4', 'a/4', 'd/5', 'f/5'],
    ['b/3', 'd/4', 'g/4', 'd/5', 'f/5'],
    ['c/4', 'e/4', 'g/4', 'c/5', 'e/5'],
    ['c/4', 'e/4', 'a/4', 'e/5', 'a/5'],
    ['c/4', 'd/4', 'f#/4', 'a/4', 'd/5'],
    ['b/3', 'd/4', 'g/4', 'd/5', 'g/5'],
    ['b/3', 'c/4', 'e/4', 'g/4', 'c/5'],
  ];

  function create(VF, score) {
    const measures = harmony.map(([bass, inner, a, b, c], m) => {
      const half = [bass, inner, a, b, c, a, b, c];
      const notes = [...half, ...half].map((key, i) => ({
        id: 'arp-' + m + '-' + i,
        stave: i % 8 < 2 ? 'lh' : 'rh',
        note: { keys: [key], clef: i % 8 < 2 ? 'bass' : 'treble', duration: '16', stemDirection: i % 8 < 2 ? 1 : -1 },
      }));
      return { voices: [{ notes }] };
    });
    const dynamics = ['p', '', 'mf', 'p', 'mp', '', 'mf', 'p'];
    return {
      spec: {
        // Optical spacing fits two evenly pulsed arpeggios per line at a reading width.
        system: { spaceBetweenStaves: 8, details: { spacing: { mode: 'optical' } } },
        staves: [
          { id: 'rh', name: 'Piano', shortName: '', measures },
          {
            id: 'lh',
            clef: 'bass',
            // Keep the space between the hands free for their shared beams.
            measures: dynamics.map((text) => ({
              voices: [
                {
                  notes: [
                    text
                      ? score.make.textDynamics({ text, line: 10, duration: 'w' })
                      : score.make.ghostNote({ duration: 'w' }),
                  ],
                },
              ],
            })),
          },
        ],
        continuous: {
          boundaries: [3, 5, 7].map((measure) => ({ measure, breakBefore: 'force' })),
          groups: [{ first: 'rh', last: 'lh', type: 'brace', barlines: true }],
        },
      },
      decorate(c) {
        for (const [m] of harmony.entries())
          for (let i = 0; i < 16; i += 4) {
            const group = [0, 1, 2, 3].map((j) => c.getNote('arp-' + m + '-' + (i + j)));
            score.beam(group, { autoStem: false });
            const beam = group[0].getBeam();
            beam.renderOptions.flatBeams = i % 8 === 4;
            beam.renderOptions.minSlope = -0.035;
            beam.renderOptions.maxSlope = 0.035;
          }
        c.staves[0][0].setTempo({ name: 'Andante, legato', duration: 'q', bpm: 72 }, -22);
        c.getNote('arp-5-2').addModifier(score.make.accidental({ type: '#' }));
        c.getNote('arp-2-4').addModifier(score.make.articulation({ type: 'accent', position: 'above' }));
        c.getNote('arp-3-4').addModifier(score.make.articulation({ type: 'tenuto', position: 'above' }));
        // The wedges follow the bass-staff notes in the first half of each measure.
        for (const [m, type] of [
          [1, VF.StaveHairpin.type.CRESC],
          [2, VF.StaveHairpin.type.DECRESC],
        ]) {
          score.make.hairpin({
            from: c.getNote('arp-' + m + '-0'),
            to: c.getNote('arp-' + m + '-8'),
            type,
            options: { leftShiftPx: m === 2 ? 30 : 0, yShift: -6, height: 7 },
          });
        }
      },
    };
  }

  window.FeaturedScores.prelude = { title, credit, intro, focus, action, create };
})();
