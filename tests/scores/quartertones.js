// Narrow Steps. The same 5/8 viola phrase written with explicit signs and with an ordered signature.
(() => {
  const title = 'Narrow Steps';
  const credit = 'Example piece · Solo viola in 24 equal divisions of the octave';
  const intro =
    'Swell from silence at the circled tip of the opening hairpin. In the second phrase the signature raises D and lowers E by a quarter tone. The natural cancels the raised D. A bracketed quarter-flat reminds the player to keep E lowered.';
  const focus = 'viola-3-2';
  const action = 'Find the cancellation';
  const motif = [
    [
      ['d/4', '+'],
      ['e/4', 'd'],
      ['d/4', 'n'],
      ['e/4', 'd'],
    ],
    [
      ['f/4', 'n'],
      ['e/4', 'd'],
      ['d/4', '+'],
      ['c/4', 'n'],
    ],
    [
      ['c/4', 'n'],
      ['d/4', '+'],
      ['e/4', 'd'],
      ['d/4', '+'],
    ],
  ];
  function create(VF, score) {
    const measures = [...motif, ...motif].map((bar, m) => ({
      voices: [
        {
          autoBeam: true,
          notes: bar.map(([key, sign], i) => ({
            id: 'viola-' + m + '-' + i,
            note: {
              keys: [key],
              duration: i === 3 ? 'q' : '8',
              clef: 'alto',
              notation: [
                {
                  kind: 'accidental',
                  id: sign,
                  label: { '+': 'quarter sharp', d: 'quarter flat', n: 'natural' }[sign],
                },
              ],
            },
          })),
        },
      ],
    }));
    return {
      spec: {
        staves: [{ id: 'Viola', clef: 'alto', time: '5/8', measures }],
        continuous: {
          boundaries: [{ measure: 4, breakBefore: 'force' }],
          spans: [{ id: 'opening-swell', kind: 'crescendo', from: 'viola-0-0', to: 'viola-0-3', niente: true }],
        },
      },
      decorate(c) {
        for (let m = 0; m < 6; m++) {
          const signed = m >= 3;
          const state = new VF.WrittenAccidentalState(signed ? { d: '+', e: 'd' } : {});
          motif[m % 3].forEach(([key, sign], i) => {
            const courtesy = m === 3 && i === 3;
            const printed = state.sign(key, sign, courtesy);
            if (printed) {
              const mark = score.make.accidental({ type: printed });
              c.getNote('viola-' + m + '-' + i).addModifier(courtesy ? mark.setAsCautionary('brackets') : mark);
            }
          });
          // Repeat the two-sign signature at each signed bar so it survives any mobile line break.
          if (signed)
            c.staves[m][0].addModifier(
              new VF.KeySignature('C').setOrdered([
                { type: '+', line: 1.5 },
                { type: 'd', line: 1 },
              ])
            );
        }
      },
    };
  }

  window.FeaturedScores.quartertones = { title, credit, intro, focus, action, create };
})();
