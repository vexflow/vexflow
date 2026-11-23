// A chamber score and a cello part share the same events on A4 and Letter paper.
export function publicationStudy(part, paper) {
  const count = 26;
  const melody = [
    ['g/4', 'b/4', 'd/5'],
    ['e/5', 'd/5', 'b/4'],
    ['a/4', 'c/5', 'b/4'],
    ['g/4', 'a/4', 'd/5'],
    ['d/5', 'c/5', 'a/4'],
    ['b/4', 'a/4', 'g/4'],
    ['e/4', 'g/4', 'a/4'],
    ['d/5', 'b/4', 'g/4'],
  ];
  const bass = ['g/2', 'e/3', 'a/2', 'd/3', 'b/2', 'g/2', 'c/3', 'd/3'];
  const middle = ['b/3', 'g/3', 'e/4', 'a/3', 'd/4', 'b/3', 'c/4', 'a/3'];
  const make = (id, name, shortName, clef) => ({
    id,
    name,
    shortName,
    clef,
    key: 'G',
    time: '3/4',
    measures: Array.from({ length: count }, (_, i) => {
      let keys, ds;
      if (id === 'fl') {
        keys = melody[i % melody.length];
        ds = i % 3 === 0 ? ['q', '8', '8', 'q'] : ['q', 'q', 'q'];
      } else if (id === 'va') {
        keys = [middle[i % 8], middle[(i + 2) % 8]];
        ds = ['h', 'q'];
      } else {
        keys = [bass[i % 8], bass[(i + 3) % 8]];
        ds = i === 15 || i === 17 ? ['hr', 'qr'] : i % 3 === 0 ? ['q', '8', '8', 'q'] : ['h', 'q'];
      }
      if (i === count - 1) {
        keys = [id === 'fl' ? 'g/4' : id === 'va' ? 'b/3' : 'g/2'];
        ds = ['h', 'q'];
      }
      return {
        voices: [
          {
            autoBeam: true,
            notes: ds.map((d, j) => ({
              id: id + '-' + (i + 1) + '-' + (j + 1),
              note: { keys: [keys[j % keys.length]], duration: d },
            })),
          },
        ],
      };
    }),
  });
  const source = {
    staves: [
      make('fl', 'Flute', 'Fl.', 'treble'),
      make('va', 'Viola', 'Va.', 'alto'),
      make('vc', 'Violoncello', 'Vc.', 'bass'),
    ],
    accidentals: 'key-aware',
    continuous: {
      measureNumbers: true,
      spans: [
        { id: 'opening', kind: 'slur', from: 'fl-1-1', to: 'fl-2-3', side: 'above' },
        { id: 'cello-swell', kind: 'crescendo', from: 'vc-9-1', to: 'vc-12-2' },
      ],
      boundaries: [
        { measure: 9, rehearsal: 'B' },
        { measure: 19, rehearsal: 'C' },
      ],
      groups: [{ first: 'fl', last: 'vc', type: 'bracket' }],
    },
  };
  const options = {
    paper,
    title: 'Andante in G',
    subtitle: part ? 'Violoncello' : 'Flute, viola and violoncello',
    header: part ? 'Andante in G · Violoncello' : 'Andante in G · Score',
    footer: 'Andante in G',
    staffSize: part ? 7.2 : 7.8,
    systemGap: part ? 6 : 7,
    maxExtraGap: 8,
    systemBreaks: part
      ? [3, 6, 9, 12, 14, 17, 19, 21, 23, 25]
      : Array.from({ length: count }, (_, i) => i + 1).filter((n) => n > 1 && (n - 1) % 4 === 0),
    ...(part
      ? {
          staves: ['vc'],
          preferredTurns: [16],
          forbiddenTurns: [13],
          regions: [
            { kind: 'cue', staff: 'fl', measure: 16, label: 'Flute cue' },
            { kind: 'ossia', staff: 'va', measure: 21, label: 'Ossia · viola' },
          ],
        }
      : {}),
  };
  return { source, options };
}

/** A two-bar compound-meter lead sheet with independent harmony and lyric anchors. */
export function leadSheetStudy() {
  const measure = (id, pitches) => ({
    voices: [
      {
        notes: pitches.map((key, i) => ({ id: id + i, note: { keys: [key], duration: '8' } })),
        autoBeam: true,
      },
    ],
  });
  const first = measure('a', ['c/4', 'd/4', 'e/4', 'g/4', 'a/4', 'g/4']);
  const second = measure('b', ['e/4', 'f/4', 'g/4', 'f/4', 'e/4', 'c/4']);
  first.chords = [{ note: 'a0', text: 'Cmaj7' }];
  first.verses = [
    [
      { note: 'a0', text: 'Day', hyphenAfter: true },
      { note: 'a3', text: 'light', extendTo: 'a5' },
    ],
  ];
  first.endBarline = VexFlow.Barline.type.DOUBLE;
  second.endBarline = VexFlow.Barline.type.END;
  const lead = { id: 'lead', time: '6/8', showTimeSignature: false, measures: [first, second] };
  const bass = {
    id: 'bass',
    clef: 'bass',
    time: '6/8',
    showTimeSignature: false,
    measures: [0, 1].map(() => ({ voices: [{ notes: 'C3/q., G3/q.' }] })),
  };
  return { staves: [lead, bass], continuous: {} };
}

/** An independent source supplies two bars of eighth notes above the printed quarter-note melody. */
export function ossiaRangeStudy() {
  function staff(id, bars) {
    return {
      id,
      time: '3/4',
      measures: bars.map((keys, m) => ({
        voices: [
          {
            autoBeam: true,
            notes: keys.split(' ').map((key, i, notes) => ({
              id: id + '-' + (m + 1) + '-' + (i + 1),
              note: { keys: [key + '/4'], duration: notes.length === 6 ? '8' : 'q' },
            })),
          },
        ],
      })),
    };
  }
  const source = {
    staves: [
      staff('melody', ['c d e', 'a g e', 'f e d', 'c e c']),
      staff('alternate', ['c d e', 'a b a g f e', 'f g f e d c', 'c e c']),
    ],
  };
  const options = {
    staves: ['melody'],
    paper: { width: 195, height: 130 },
    margins: { top: 7, left: 7, right: 7, bottom: 7 },
    pageNumbers: false,
    regions: [{ kind: 'ossia', staff: 'alternate', measure: 2, endMeasure: 3, label: 'Ossia' }],
  };
  return { source, options };
}

/** A clarinet quotes a flute in its written key while the performing voice retains its whole rest. */
export function transposedCueStudy() {
  const source = {
    accidentals: 'key-aware',
    staves: [
      { id: 'fl', key: 'C', measures: [{ voices: [{ notes: 'E4/q, F4, G4, A4' }] }] },
      {
        id: 'cl',
        key: 'D',
        measures: [{ voices: [{ notes: [{ id: 'silence', note: { keys: ['b/4'], duration: 'wr' } }] }] }],
      },
    ],
  };
  const region = {
    kind: 'cue',
    staff: 'fl',
    measure: 1,
    label: 'Flute',
    scale: 0.7,
    transpose: { steps: 1, semitones: 2 },
  };
  return {
    source,
    region,
    options: {
      staves: ['cl'],
      regions: [region],
      paper: { width: 120, height: 65 },
      margins: { top: 5, bottom: 4, left: 4, right: 4 },
      pageNumbers: false,
    },
  };
}

/** Two flute desks pass from solo to unison and then divide over the same three bars. */
export function condensedFlutesStudy() {
  const pitches = [
    [['g/4', 'a/4'], ['b/4', 'c/5'], ['d/5', 'c/5']],
    [[], ['b/4', 'c/5'], ['b/4', 'a/4']],
  ];
  const staves = pitches.map((bars, player) => ({
    id: 'fl' + (player + 1),
    name: 'Flute ' + (player + 1),
    time: '2/4',
    measures: bars.map((keys, bar) => ({
      voices: [{
        notes: (keys.length ? keys : ['b/4']).map((key, attack) => ({
          id: 'f' + (player + 1) + 'm' + (bar + 1) + 'n' + (attack + 1),
          note: { keys: [key], duration: keys.length ? 'q' : 'hr' },
        })),
      }],
    })),
  }));
  return { source: { staves }, condense: { players: ['fl1', 'fl2'], name: 'Flutes' } };
}

/** Compare the Friska's independent hand engraving and fully and partly beamed triplets. */
export function voiceBeamStudy() {
  const group = (start, count, flatBeams) => ({ start, count, flatBeams });
  const triplets = [
    { start: 0, count: 3 },
    { start: 3, count: 3 },
  ];
  return {
    continuous: {},
    staves: [
      {
        id: 'right',
        time: '2/4',
        measures: [
          {
            voices: [
              {
                stem: 'up',
                notes: 'C4/8, D4, G4, D4, E4, A4',
                beams: [group(0, 3, false), group(3, 3, false)],
                tuplets: triplets,
              },
            ],
          },
        ],
      },
      {
        id: 'left',
        clef: 'bass',
        time: '2/4',
        measures: [
          {
            voices: [
              {
                stem: 'down',
                notes: ['E3/8, G3, B3, D3, F3', { skip: '8' }],
                beams: [group(0, 3, true), group(3, 3, true)],
                tuplets: triplets,
              },
            ],
          },
        ],
      },
    ],
  };
}
