// Source-linked guitar projections and an extracted quartet cue for head-level navigation and print geometry.
export function headOccurrenceStudy(kind) {
  if (kind === 'quartet') {
    // Preserve the source measure number. The compact opening bars stand in for the first page of the quartet.
    const staff = (id, clef, phrase) => ({
      id,
      clef,
      key: 'G',
      measures: Array.from({ length: 23 }, (_, m) => ({
        voices: [{ notes: m === 22 ? phrase : 'B4/w/r' }],
      })),
    });
    return {
      staves: [
        staff('violin-ii', 'treble', 'B4/q[id="vln-23"], A4, C5, B4'),
        staff('cello', 'bass', 'D3/w/r[id="vc-rest"]'),
      ],
    };
  }
  const guitar = new VexFlow.FrettedInstrument();
  // The G13 and following three melody notes come from the opening of the All of Me chord melody.
  const shapes = [
    [
      { str: 5, fret: 10 },
      { str: 4, fret: 9 },
      { str: 3, fret: 10 },
      { str: 1, fret: 12 },
    ],
    [{ str: 1, fret: 7 }],
    [{ str: 1, fret: 10 }],
    [{ str: 1, fret: 8 }],
  ];
  const notes = [],
    tabs = [];
  shapes.forEach((shape, i) => {
    const event = i ? 'melody-' + i : 'g13';
    const heads = shape.map((p) => 'string-' + p.str);
    const attack = guitar.attack(shape, '8');
    notes.push({ id: event, note: { ...attack.note, headSource: { event, heads } } });
    // TAB uses a different position order; string identities still address the correct sounding head.
    tabs.push({
      id: 'tab-' + event,
      tab: {
        ...attack.tab,
        positions: [...shape].reverse(),
        headSource: { event, heads: [...heads].reverse(), projection: true },
      },
    });
  });
  return {
    staves: [
      {
        id: 'guitar',
        time: '2/4',
        measures: [{ voices: [{ notes, autoBeam: true }], chords: [{ note: 'g13', text: 'G13' }] }],
      },
      { id: 'tab', kind: 'tab', time: '2/4', measures: [{ voices: [{ notes: tabs }] }] },
    ],
    continuous: {},
    engraving: {
      place(score, add) {
        const source = score.getElement('g13');
        if (!source) return;
        const b = source.getHeadInk()[0];
        const bounds = { x: b.x + b.w + 1, y: b.y + b.h + 4, w: 4, h: 2 };
        add({ source, head: 0, bounds, draw: (ctx) => ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h) });
      },
    },
  };
}
