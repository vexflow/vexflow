// Patio al alba. A melodic call and two rasgueado answers over an Andalusian cadence.
(() => {
  const { guitarScore } = window.FeaturedScores;
  const title = 'Patio al alba';
  const credit = 'Example piece · Flamenco guitar';
  const intro =
    'Answer the melody with a–m–i downstrokes and an index return. Tap the soundboard with the accented second beat. Close with a freely rolled E chord.';
  const choices = ['String direction', 'Hand direction'];
  const control = 'Stroke arrows';
  function create(VF, score, choice) {
    const guitar = new VF.FrettedInstrument();
    const arrows = choice === 'Hand direction' ? 'hand' : 'strings';
    const note = (str, fret, duration) => guitar.attack([{ str, fret }], duration);
    const line = (last) => [
      note(1, 0, '8'),
      note(1, 1, '8'),
      note(1, 3, 'q'),
      note(2, 3, '8'),
      note(2, 1, '8'),
      note(2, last, 'q'),
    ];
    const grip = (frets) => frets.map((fret, i) => ({ str: 4 - i, fret }));
    const answer = (frets, final) =>
      guitar.rasgueado(
        grip(frets),
        ['a', 'm', 'i', 'i', 'i', 'p', 'i'].map((finger, i) => ({
          finger,
          arrows,
          duration: i < 4 ? '16' : 'q',
          direction: i === 3 ? 'treble-to-bass' : 'bass-to-treble',
          golpe: i === 4,
          roll: final && i === 6,
        }))
      );
    const bars = [[line(0)], [answer([3, 2, 1, 1], false)], [line(3)], [answer([2, 1, 0, 0], true)]];
    return {
      spec: guitarScore(score, bars, '4/4'),
      legend:
        'a ring · m middle · i index · p thumb · + golpe. ' +
        (arrows === 'strings' ? '↑ bass to treble' : '↓ bass to treble'),
      decorate(c) {
        for (const view of ['staff', 'tab'])
          for (const m of [1, 3]) {
            const n = (i) => c.getNote([view, m, 0, i].join('-'));
            score.beam([0, 1, 2, 3].map(n));
            n(4).addModifier(score.make.articulation({ type: 'accent', position: 'above' }));
          }
      },
    };
  }

  window.FeaturedScores.falseta = { title, credit, intro, choices, control, create };
})();
