// One melody, two harmonic readings. Event IDs keep the reader on the same syllable.
(() => {
  const title = 'When the Saints Go Marching In';
  const credit = 'Traditional African American spiritual · Petaluma lead sheet';
  const intro =
    'Follow the held “in.” Compare the traditional dominant with the D♭7(♭9) turnaround, then narrow the page to carry the lyric across a system.';
  const choices = ['Reharmonized', 'Traditional'];
  const control = 'Harmony';
  const focus = 'v6-0';
  const fonts = ['Petaluma', 'Petaluma Script'];

  // The opening pickup and final quarter together complete a bar.
  const bars = [
    ['C4/q, E4, F4', 'Oh when the', '', ''],
    ['G4/w', 'saints', 'C', 'C:6/9'],
    ['B4/q/r, C4/q, E4, F4', '_ go march- ing', 'C', 'Am:7'],
    ['G4/w', 'in', 'C', 'Dm:11'],
    ['B4/q/r, C4/q, E4, F4', '_ Oh when the', 'C', 'G:13'],
    ['G4/q, E4, C4, E4', 'saints go march- ing', 'C', 'C:maj9'],
    ['D4/w', '', 'G:7', 'Am:11'],
    ['D4/w', '', 'G:7', 'D:9'],
    ['B4/q/r, E4/q, E4, D4', '_ Oh Lord I', 'G:7', 'G:13'],
    ['C4/h, C4/q, E4', 'want to be', 'C', 'Gm:13'],
    ['G4/h, G4/q, G4', 'in that num-', 'C:7', 'C:9'],
    ['F4/w', 'ber', 'F', 'F:maj9'],
    ['B4/q/r, C4/q, E4, F4', '_ Oh when the', 'F', 'Fm:maj7'],
    ['G4/h, E4/q, C4', 'saints go march-', 'C', 'Em:7'],
    ['D4/w', 'ing', 'G:7', 'Db:7b9'],
    ['C4/w', '', 'C', 'C:6/9'],
    ['C4/q', '', '', ''],
  ];

  function create(VF, score, choice) {
    const lyricSize = 15;
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
    const spans = [6, 15].flatMap((m) =>
      ['lyric', 'tie'].map((kind) => ({
        id: kind + m,
        kind,
        from: 'v' + m + '-0',
        to: 'v' + (m + 1) + '-0',
        ...(kind === 'lyric' ? { text: 'in', labelFontSize: lyricSize } : {}),
      }))
    );
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
          const syllables = bar[1]
            .split(' ')
            .flatMap((text, i) =>
              text && text !== '_' ? [{ text, note: composition.getNote('v' + m + '-' + i) }] : []
            );
          if (syllables.length) {
            const verse = composition.systems[m].getPhraseLayout().addVerse(composition.staves[m][0], syllables);
            for (const syllable of verse) syllable.setFontSize(lyricSize);
          }
        });
      },
    };
  }

  window.FeaturedScores.saints = { title, credit, intro, choices, control, focus, fonts, create };
})();
