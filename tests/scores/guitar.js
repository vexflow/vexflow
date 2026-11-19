// Project each fretted attack into written staff notation and rhythmic tablature.
(() => {
  function guitarScore(score, bars, time, continuous = {}) {
    return {
      continuous,
      staves: ['staff', 'tab'].map((view) => ({
        id: view,
        name: view === 'tab' ? 'TAB' : 'Guitar',
        shortName: view === 'tab' ? 'TAB' : 'Gtr.',
        kind: view === 'tab' ? 'tab' : 'stave',
        time,
        spaceAbove: view === 'tab' ? 6 : 0,
        measures: bars.map((voices, m) => ({
          voices: voices.map((events, v) => ({
            notes: events.map((attack, i) => {
              const id = [view, m, v, i].join('-');
              const stemDirection = v === 0 ? 1 : -1;
              // A silent bass subdivision balances the voice without drawing a fret number.
              if (typeof attack === 'string')
                return view === 'tab'
                  ? score.make.ghostNote({ duration: attack })
                  : { id, note: { keys: ['b/4'], duration: attack + 'r', stemDirection } };
              return view === 'tab'
                ? { id, tab: { ...attack.tab, stemDirection }, drawStem: true }
                : { id, note: { ...attack.note, stemDirection } };
            }),
          })),
        })),
      })),
    };
  }

  window.FeaturedScores.guitarScore = guitarScore;
})();
