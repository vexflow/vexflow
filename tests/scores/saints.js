// Two stanzas share one melody and two harmonic readings. Event IDs keep the reader on the same syllable.
(() => {
  const title = 'When the Saints Go Marching In';
  const credit = 'Traditional African American spiritual · Petaluma lead sheet';
  const intro =
    'Sing either numbered stanza over the traditional changes or the D♭7(♭9) turnaround. Narrow the page and follow the held “in” and “sky” across the system break.';
  const choices = ['Reharmonized', 'Traditional'];
  const control = 'Harmony';
  const focus = 'v6-0';
  const fonts = ['Petaluma', 'Academico'];

  // The opening pickup and final quarter together complete a bar.
  const bars = [
    ['C4/q, E4, F4', ['Oh when the', 'Oh when the'], '', ''],
    ['G4/w', ['saints', 'stars'], 'C', 'C:6/9'],
    ['B4/q/r, C4/q, E4, F4', ['_ go march- ing', '_ fall from the'], 'C', 'Am:7'],
    ['G4/w', ['in', 'sky'], 'C', 'Dm:11'],
    ['B4/q/r, C4/q, E4, F4', ['_ Oh when the', '_ Oh when the'], 'C', 'G:13'],
    ['G4/q, E4, C4, E4', ['saints go march- ing', 'stars fall from the'], 'C', 'C:maj9'],
    ['D4/w', ['in', 'sky'], 'G:7', 'Am:11'],
    ['D4/w', ['', ''], 'G:7', 'D:9'],
    ['B4/q/r, E4/q, E4, D4', ['_ Oh Lord I', '_ Oh Lord I'], 'G:7', 'G:13'],
    ['C4/h, C4/q, E4', ['want to be', 'want to be'], 'C', 'Gm:13'],
    ['G4/h, G4/q, G4', ['in that num-', 'in that num-'], 'C:7', 'C:9'],
    ['F4/w', ['ber', 'ber'], 'F', 'F:maj9'],
    ['B4/q/r, C4/q, E4, F4', ['_ Oh when the', '_ Oh when the'], 'F', 'Fm:maj7'],
    ['G4/h, E4/q, C4', ['saints go march-', 'stars fall from'], 'C', 'Em:7'],
    ['D4/w', ['ing', 'the'], 'G:7', 'Db:7b9'],
    ['C4/w', ['in', 'sky'], 'C', 'C:6/9'],
    ['C4/q', ['', ''], '', ''],
  ];

  function create(VF, score, choice) {
    const measures = bars.map(([music], m) => ({
      span: m === 0 ? '3/4' : m === 16 ? '1/4' : undefined,
      voices: [
        {
          notes: music
            .split(',')
            .map((token, i) => token.trim() + '[id="v' + m + '-' + i + '"]')
            .join(', '),
        },
      ],
    }));
    const heldBars = [6, 15];
    const spans = heldBars.flatMap((m) => {
      const ends = { from: 'v' + m + '-0', to: 'v' + (m + 1) + '-0' };
      return [
        { ...ends, id: 'tie' + m, kind: 'tie' },
        ...['in', 'sky'].map((word) => ({
          ...ends,
          id: 'extend-' + word + '-' + m,
          kind: 'lyric',
          syllableId: 'held-' + word + '-' + m,
        })),
      ];
    });
    return {
      spec: { staves: [{ id: 'Voice', time: '4/4', measures }], continuous: { spans } },
      decorate(composition) {
        bars.forEach((bar, m) => {
          const harmony = bar[choice === 'Traditional' ? 2 : 3];
          if (harmony) {
            const [root, extension] = harmony.split(':');
            const symbol = score.make.chordSymbol().addGlyphOrText(root);
            if (extension)
              symbol.addGlyphOrText(extension, { symbolModifier: VF.ChordSymbol.symbolModifiers.SUPERSCRIPT });
            composition.getNote('v' + m + '-0').addModifier(symbol);
          }
          // The pickup carries the stanza numbers. Each held word owns the extender on its baseline.
          bar[1].forEach((lyrics, verse) => {
            const syllables = lyrics
              .split(' ')
              .flatMap((text, i) =>
                text && text !== '_' ? [{ text, note: composition.getNote('v' + m + '-' + i) }] : []
              );
            if (!syllables.length) return;
            const words = composition.systems[m].getPhraseLayout().addVerse(composition.staves[m][0], syllables, {
              baselineSpaces: verse === 0 ? 7.5 : 9.5,
              stanza: m === 0 ? verse + 1 + '.' : undefined,
            });
            if (heldBars.includes(m)) words[0].setAttribute('id', 'held-' + syllables[0].text + '-' + m);
          });
        });
      },
    };
  }

  window.FeaturedScores.saints = { title, credit, intro, choices, control, focus, fonts, create };
})();
