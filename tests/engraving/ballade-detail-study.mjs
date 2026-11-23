// Reflow the concert demo's full 24-bar transcription as an independent Letter edition.
export function balladeDetailStudy(bars) {
  // A change of clef occupies no time. Quiet rests in the original are timed skips.
  function voice(music, measure, hand, index, count) {
    let tick = 0;
    const notes = music.split(' ;treble; ').flatMap((segment, part) => [
      ...(part ? [{ change: { clef: 'treble' } }] : []),
      ...segment.split(', ').map((event) => {
        const id = [hand, measure, index, tick++].join('-');
        if (event.includes('[quiet='))
          return {
            id,
            skip: event
              .match(/\/(\w+)\/r(\.?)/)
              .slice(1)
              .join('')
              .replace('.', 'd'),
          };
        return event + '[id="' + id + '"]';
      }),
    ]);
    const result = { notes, autoBeam: true, stem: count > 1 ? (index === 0 ? 'up' : 'down') : 'auto' };
    if (hand === 'upper' && measure === 14) {
      result.autoBeam = false;
      result.tuplets = [{ start: 2, count: 8, options: { numNotes: 7, notesOccupied: 5, bracketed: false } }];
      result.beams = [{ start: 2, count: 8 }];
    }
    return result;
  }
  const staves = ['upper', 'lower'].map((hand, staff) => ({
    id: hand,
    key: 'Ab',
    time: '6/8',
    clef: staff ? 'bass' : 'treble',
    measures: bars.map((bar, i) => {
      const voices = [bar[staff]].flat();
      return { clef: staff ? 'bass' : 'treble', voices: voices.map((v, j) => voice(v, i + 1, hand, j, voices.length)) };
    }),
  }));
  const spans = Array.from({ length: 16 }, (_, i) => {
    const bar = i + 9;
    const release = bar === 13 || bar === 14 || bar >= 21 ? 3 : 2;
    return {
      id: 'pedal-' + bar,
      kind: 'pedal',
      pedalStyle: 'text',
      from: 'lower-' + bar + '-0-0',
      to: 'lower-' + bar + '-0-' + release,
    };
  });
  return {
    accidentals: 'key-aware',
    staves,
    continuous: {
      measureNumbers: true,
      spans,
      ossias: [
        {
          id: 'alternative',
          at: 'lower-3-0-3',
          notes: 'Bb3/8, An3/8, Bb3/8',
          clef: 'bass',
          label: 'Ossia',
          scale: 0.68,
          beam: true,
        },
      ],
    },
  };
}
