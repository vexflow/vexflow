// Playable guitar examples in the guide playground. Each snippet runs independently.
const setup = `// Draw into the guide's score container at the available width.
const score = VF.EasyScore.create({
  renderer: { elementId: 'score', width, height },
});`;

function example(id, title, description, code, api) {
  return {
    id,
    title,
    description,
    code,
    api: api.split(' '),
    group: 'Strings & tablature',
    controls: [],
    tips: description,
  };
}

export const guitar = [
  example(
    'rasgueado-golpe',
    'Rasgueado with a simultaneous golpe',
    'Play a measured rasgueado, reverse the arrow convention and keep the golpe on beat two.',
    `${setup}
const guitar = new VF.FrettedInstrument();
const grip = [
  { str: 4, fret: 2 },
  { str: 3, fret: 1 },
  { str: 2, fret: 0 },
  { str: 1, fret: 0 },
];
// A physical downstroke travels bass to treble. Try 'hand' to reverse the printed arrows.
const arrows = 'strings';
const fan = guitar.rasgueado(
  grip,
  ['a', 'm', 'i', 'i', 'i', 'p', 'i'].map((finger, i) => ({
    finger,
    duration: i < 4 ? '16' : 'q',
    direction: i === 3 ? 'treble-to-bass' : 'bass-to-treble',
    arrows,
    golpe: i === 4,
    roll: i === 6,
  }))
);
// Give the arrows, 11 pt finger labels, and chord grips room before scaling this single bar to a phone.
const logicalWidth = Math.max(width, 520);
const spec = {
  sheet: { width: logicalWidth - 32, x: 16, y: 35 },
  continuous: {},
  accidentals: 'key-aware',
  staves: ['staff', 'tab'].map((view) => ({
    id: view,
    kind: view === 'tab' ? 'tab' : 'stave',
    time: '4/4',
    spaceAbove: view === 'tab' ? 5 : 0,
    measures: [
      {
        voices: [
          {
            autoBeam: true,
            notes: fan.map((p, i) =>
              view === 'tab'
                ? { id: 'tab-' + i, tab: p.tab, drawStem: true }
                : { id: 'staff-' + i, note: p.note }
            ),
          },
        ],
      },
    ],
  })),
};
const composition = score.compose(spec);
for (const view of ['staff', 'tab']) {
  score.attach(composition.getNote(view + '-4'), score.make.articulation({ type: 'a>', position: 'above' }), 0);
}
composition.sheet.format();
const scale = width / logicalWidth;
const ctx = score.factory.getContext();
ctx.resize(width, Math.ceil((composition.sheet.getHeight() + 70) * scale)).scale(scale, scale);
ctx.save().setFont('Arial', 12);
ctx.fillText('a ring · m middle · i index · p thumb · + golpe = tap', 16, 15);
ctx.fillText(
  arrows === 'strings'
    ? '↑ bass to treble · ↓ treble to bass'
    : '↓ bass to treble · ↑ treble to bass',
  16,
  32
);
ctx.restore();
score.draw({ retain: true });`,
    'FrettedInstrument Stroke ScoreNavigation'
  ),
  example(
    'string-mute-bend',
    'Drop D pedal and timed unison bend',
    'Follow the palm mute on string 6 across a break and bend string 3 against a stationary E.',
    `${setup}
const guitar = new VF.FrettedInstrument('dropd');
const play = (str, fret, duration) => guitar.attack([{ str, fret }], duration);
const pedal = () => play(6, 0, '8');
const ringing = guitar.attack(
  [
    { str: 3, fret: 2 },
    { str: 2, fret: 3 },
  ],
  'h'
);
// Reach E halfway through the quarter, hold to three quarters, then release to D.
const bend = guitar.bentAttack(
  [
    { str: 3, fret: 7 },
    { str: 2, fret: 5 },
  ],
  'q',
  {
    string: 3,
    semitones: 2,
    rise: [1, 2],
    hold: [3, 4],
    release: [1, 1],
  }
);
const lead = [7, 12, 7, 10].map((fret) => play(1, fret, '16'));
const measures = [
  [[ringing], [pedal(), pedal(), pedal(), pedal()]],
  [
    [...lead, bend],
    [pedal(), '8', 'q'],
  ],
];
const spec = {
  sheet: { width: width - 32, x: 16, y: 35, rowGap: 25 },
  continuous: {
    spans: [{ kind: 'palmMute', id: 'mute-six', strings: [6], from: 'tab-0-1-0', to: 'tab-1-1-0' }],
  },
  staves: ['staff', 'tab'].map((view) => ({
    id: view,
    kind: view === 'tab' ? 'tab' : 'stave',
    time: '2/4',
    spaceAbove: view === 'tab' ? 6 : 0,
    measures: measures.map((bar, m) => ({
      voices: bar.map((events, v) => ({
        notes: events.map((e, i) => {
          const id = [view, m, v, i].join('-'),
            stemDirection = v === 0 ? 1 : -1;
          if (typeof e === 'string')
            return view === 'tab'
              ? score.make.ghostNote({ duration: e })
              : { keys: ['b/4'], duration: e + 'r', stemDirection };
          return view === 'tab'
            ? { id, tab: { ...e.tab, stemDirection }, drawStem: true }
            : { id, note: { ...e.note, stemDirection } };
        }),
      })),
    })),
  })),
};
const composition = score.compose(spec);
for (const view of ['staff', 'tab']) {
  const get = (m, v, i) => composition.getNote([view, m, v, i].join('-'));
  score.beam([get(0, 1, 0), get(0, 1, 1)]);
  score.beam([get(0, 1, 2), get(0, 1, 3)]);
  score.beam([0, 1, 2, 3].map((i) => get(1, 0, i)));
  score.attach(get(0, 0, 0), score.make.annotation({ text: 'let ring', vJustify: 'top' }), 0);
  score.attach(get(1, 0, 1), score.make.annotation({ text: 'T', vJustify: 'top' }), 0);
}
for (const [from, to, text] of [
  [1, 2, 'P'],
  [2, 3, 'H'],
]) {
  score.make.tabTie(
    {
      firstNote: composition.getNote('tab-1-0-' + from),
      lastNote: composition.getNote('tab-1-0-' + to),
      firstIndexes: [0],
      lastIndexes: [0],
    },
    text
  );
}
composition.sheet.format();
score.factory.getContext().resize(width, composition.sheet.getHeight() + 70);
score.draw({ retain: true });`,
    'FrettedInstrument Bend ContinuousLayout'
  ),
  example(
    'bossa-anticipation',
    'Bossa nova bass and tied anticipation',
    'Keep the bass sounding under the tied anticipation and the muted upper-string attack.',
    `${setup}
const guitar = new VF.FrettedInstrument();
const chord = [
  { str: 3, fret: 0 },
  { str: 2, fret: 1 },
  { str: 1, fret: 0 },
];
const struck = () => guitar.attack(chord, '8');
const dead = guitar.attack(
  chord.map((p, i) => ({ str: p.str, fret: 'X', displayKey: ['g/4', 'c/5', 'e/5'][i] })),
  '8'
);
const bass = (str, d) => guitar.attack([{ str, fret: 0 }], d);
const bars = [
  [['rest', struck(), 'rest', struck()], [bass(5, 'h')]],
  [
    [struck(), dead, 'rest', struck()],
    [bass(6, 'q'), bass(5, 'q')],
  ],
];
// Keep the two ends of the native three-head tie on one system.
const logicalWidth = Math.max(width, 420);
const spec = {
  sheet: { width: logicalWidth - 32, x: 16, y: 35 },
  staves: ['staff', 'tab'].map((view) => ({
    id: view,
    kind: view === 'tab' ? 'tab' : 'stave',
    time: '2/4',
    spaceAbove: view === 'tab' ? 5 : 0,
    measures: bars.map((bar, m) => ({
      voices: bar.map((events, v) => ({
        notes: events.map((e, i) => {
          const id = [view, m, v, i].join('-'),
            stemDirection = v === 0 ? 1 : -1;
          if (e === 'rest')
            return view === 'tab'
              ? score.make.ghostNote({ duration: '8' })
              : { keys: ['b/4'], duration: '8r' };
          return view === 'tab'
            ? { id, tab: { ...e.tab, stemDirection }, drawStem: true }
            : { id, note: { ...e.note, stemDirection } };
        }),
      })),
    })),
  })),
};
const composition = score.compose(spec);
for (const view of ['staff', 'tab']) {
  const firstNote = composition.getNote(view + '-0-0-3'),
    lastNote = composition.getNote(view + '-1-0-0');
  const indices = [0, 1, 2];
  if (view === 'tab')
    score.make.tabTie({ firstNote, lastNote, firstIndexes: indices, lastIndexes: indices });
  else
    score.make.tie({
      from: firstNote,
      to: lastNote,
      firstIndexes: indices,
      lastIndexes: indices,
      options: { direction: -1 },
    });
}
composition.sheet.format();
const scale = width / logicalWidth;
score.factory.getContext().resize(width, Math.ceil((composition.sheet.getHeight() + 70) * scale)).scale(scale, scale);
score.draw({ retain: true });`,
    'FrettedInstrument TabTie StaveTie'
  ),
];
