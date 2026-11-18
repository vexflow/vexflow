// Complete teaching examples. Each runs in the shared Explorer preview environment.
const setup = `// Draw into the guide's score container at the available width.
const score = VF.EasyScore.create({
  renderer: { elementId: 'score', width, height },
});`;

/** Keep beginner examples strict so rhythm errors are visible while learning. */
function stave(body, meter = '4/4') {
  return `${setup}\n${body}\n// Count the beats in a voice, then place that voice on the five staff lines.\nconst voice = score.voice(notes, { time: '${meter}' });
score.system({ x: 20, y: 50, width: width - 40 })
  .addStave({ voices: [voice] })
  .addClef('treble').addTimeSignature('${meter}');
score.draw();`;
}

/** Use the same example shape as Explorer; controls are optional. */
function example(id, title, code, api = 'EasyScore System') {
  return { id, title, code, api: api.split(' '), controls: [], group: 'Guide examples', description: title, tips: '' };
}

export const teachingExamples = [
  example(
    'held-note',
    'Hold one note',
    stave(
      "// Middle C lasts all four beats. Change C4 to C5 to move it up an octave.\nconst notes = score.notes('C4/w');"
    )
  ),
  example(
    'two-pitches',
    'Divide the bar',
    stave(
      "// Each half note takes two beats. The comma puts the second pitch after the first.\nconst notes = score.notes('C4/h, G4/h');"
    )
  ),
  example(
    'chord-and-answer',
    'Stack three pitches',
    stave(
      "// Play C, E, and G together for two beats. The single G answers on beat three.\nconst notes = score.notes('(C4 E4 G4)/h, G4/h');"
    )
  ),
  example(
    'first-notes',
    'Your first four notes',
    stave(
      "// Each pitch follows the previous one. The /q gives all four notes one beat each.\nconst notes = score.notes('C5/q, D5, E5, G5');"
    )
  ),
  example(
    'rhythm-basics',
    'Chords, rests, and dotted rhythm',
    stave(
      "// The dotted chord and the eighth note fill beats one and two. Beat three is silent.\nconst notes = score.notes('(C4 E4 G4)/q., D4/8, B4/q/r, C5/q');"
    )
  ),
  example(
    'three-four',
    'A complete bar in 3/4',
    stave(
      "// Count one, two, three. G lands on the last beat of the bar.\nconst notes = score.notes('C5/q, E5, G5');",
      '3/4'
    )
  ),
  example(
    'beam-groups',
    'Beams on each beat',
    stave(`const notes = score.notes('C5/8, D5, E5, F5, G5, A5, G5, E5');
// Each pair occupies one quarter-note beat.
for (let i = 0; i < notes.length; i += 2) {
  score.beam(notes.slice(i, i + 2));
}`),
    'EasyScore Beam'
  ),
  example(
    'triplet-bar',
    'Triplets inside a complete bar',
    stave(`const triplet = score.notes('C5/8, D5, E5');
// Adjust ticks before creating the voice.
const tuplet = score.make.tuplet({ notes: triplet, options: { numNotes: 3, notesOccupied: 2 } });
score.autoBeam(triplet);
// Apply display overrides after automatic beaming.
tuplet.setBracketed(true);
const notes = [...triplet, ...score.notes('G5/q, E5, C5')];`),
    'EasyScore Tuplet Beam Voice'
  ),
  example(
    'grand-staff',
    'Treble and bass together',
    `${setup}
// Put both hands in one system so their downbeats share the same horizontal position.
const system = score.system({ x: 20, y: 25, width: width - 40, spaceBetweenStaves: 10 });
system.addStave({ voices: [score.voice(score.notes('C5/h, E5'))] })
  .addClef('treble').addTimeSignature('4/4');
system.addStave({ voices: [score.voice(score.notes('C3/h, G2', { clef: 'bass' }))] })
  .addClef('bass').addTimeSignature('4/4');
system.addConnector('brace');
score.factory.getContext().resize(width, 300);
score.draw();`,
    'EasyScore System StaveConnector'
  ),
  example(
    'facade',
    'Compose with EasyScore.create()',
    `const score = VF.EasyScore.create({
  renderer: { elementId: 'score', width, height },
});
// The inner pitches change, but the low C can ring through both chords.
const notes = score.notes('(C4 E4 G4)/h, (C4 F4 A4)/h');
score.attach(notes[0], score.make.annotation({ text: 'dolce', vJustify: 'top' }), 0);
score.make.tie({ from: notes[0], to: notes[1], firstIndexes: [0], lastIndexes: [0] });
score.system({ x: 20, y: 65, width: width - 40 })
  .addStave({ voices: [score.voice(notes)] }).addClef('treble');
score.draw();`,
    'EasyScore Annotation StaveTie'
  ),
  example(
    'parse-diagnostics',
    'Check notation before drawing',
    `${setup}
const result = score.parseNotation('C4/q, invalid');
console.log(JSON.stringify(result.diagnostics, null, 2));
// The invalid request creates no notation. Draw a valid bar afterward.
score.system({ x: 20, y: 50, width: width - 40 })
  .addStave({ voices: [score.voice(score.notes('C4/w'))] }).addClef('treble');
score.draw();`,
    'EasyScore'
  ),
  example(
    'native-stave',
    'Draw an empty stave',
    `const renderer = new VF.Renderer(document.getElementById('score'), VF.Renderer.Backends.SVG);
renderer.resize(width, height);
const context = renderer.getContext();
// Leave a margin on either side of the five lines. Coordinates are in pixels.
const stave = new VF.Stave(20, 50, width - 40);
stave.addClef('treble').addTimeSignature('4/4');
stave.setContext(context).draw();`,
    'Renderer Stave'
  ),
  example(
    'native-notes',
    'Notes, voice, formatter, draw',
    `const renderer = new VF.Renderer(document.getElementById('score'), VF.Renderer.Backends.SVG);
renderer.resize(width, height);
const context = renderer.getContext();
const stave = new VF.Stave(20, 50, width - 40).addClef('treble');
stave.setContext(context).draw();
const notes = [
  new VF.StaveNote({ keys: ['c/5'], duration: 'q' }),
  new VF.StaveNote({ keys: ['d/5'], duration: 'q' }),
  new VF.StaveNote({ keys: ['b/4'], duration: 'qr' }),
  new VF.StaveNote({ keys: ['c/4', 'e/4', 'g/4'], duration: 'q' }),
];
const voice = new VF.Voice({ numBeats: 4, beatValue: 4 }).addTickables(notes);
// Assign a horizontal position to each beat before drawing the notes.
new VF.Formatter().joinVoices([voice]).formatToStave([voice], stave);
voice.draw(context, stave);`,
    'Renderer Stave StaveNote Voice Formatter'
  ),
  example(
    'native-modifiers',
    'Attach accidentals and dots',
    `const factory = new VF.Factory({ renderer: { elementId: 'score', width, height } });
const notes = [
  factory.StaveNote({ keys: ['f#/4'], duration: 'qd' }),
  factory.StaveNote({ keys: ['g/4'], duration: '8' }),
  factory.StaveNote({ keys: ['a/4', 'c/5'], duration: 'h' }),
];
// Pitch spelling and a displayed accidental are separate in the native API.
notes[0].addModifier(new VF.Accidental('#'), 0);
VF.Dot.buildAndAttach([notes[0]], { all: true });
const voice = factory.Voice({ time: '4/4' }).addTickables(notes);
factory.System({ x: 20, y: 50, width: width - 40 })
  .addStave({ voices: [voice] }).addClef('treble');
factory.draw();`,
    'StaveNote Accidental Dot Factory'
  ),
  example(
    'native-beams',
    'Automatic beam grouping',
    `const factory = new VF.Factory({ renderer: { elementId: 'score', width, height } });
const notes = ['c/5', 'd/5', 'e/5', 'g/5', 'a/5', 'g/5', 'e/5', 'd/5']
  .map(key => factory.StaveNote({ keys: [key], duration: '8' }));
const beams = VF.Beam.generateBeams(notes, { groups: [new VF.Fraction(2, 8)] });
const voice = factory.Voice().addTickables(notes);
factory.System({ x: 20, y: 50, width: width - 40 })
  .addStave({ voices: [voice] }).addClef('treble');
factory.draw();
// These beams were made directly, so they have no Factory drawing owner.
for (const beam of beams) beam.setContext(factory.getContext()).draw();`,
    'Beam Fraction Factory'
  ),
  example(
    'redraw',
    'Retain, recolor, and redraw',
    `${setup}
const notes = score.notes('C5/q, E5, G5, C6');
notes[1].setStyle({ fillStyle: '#b74632', strokeStyle: '#b74632' });
score.system({ x: 20, y: 50, width: width - 40 })
  .addStave({ voices: [score.voice(notes)] }).addClef('treble');
score.draw({ retain: true });
// A retained draw keeps objects available for the next pass.
score.factory.getContext().clear();
score.setStyle({ fillStyle: '#38614e', strokeStyle: '#38614e' });
score.draw({ retain: true });`,
    'Factory Element'
  ),
  example(
    'typed-sequence',
    'Mix strings, typed notes, and native objects',
    stave(`const notes = score.sequence([
  'C5/q',
  { keys: ['d/5/x'], duration: 'q' },
  score.make.note({ keys: ['e/5'], duration: 'q', dots: 1 }),
  'G5/8',
]);
score.attach(notes[0], score.make.articulation({ type: 'fermata' }));
// The typed note has dotted time; this modifier draws its dot.
score.attach(notes[2], score.make.dot());
score.attach(notes[3], score.make.annotation({ text: 'dolce', vJustify: 'top' }));`),
    'EasyScore StaveNote Dot Articulation'
  ),
  example(
    'automatic-beams',
    'Group seven eighth notes as 2 + 2 + 3',
    stave(
      `score.set({ time: '7/8' });
const notes = score.notes('C5/8, D5, E5, F5, G5, A5, B5');
const beams = score.autoBeam(notes, {
  groups: [new VF.Fraction(2, 8), new VF.Fraction(2, 8), new VF.Fraction(3, 8)],
});
// Returned native beams are owned and drawn by the score.
beams[2].setStyle({ fillStyle: '#b74632', strokeStyle: '#b74632' });`,
      '7/8'
    ),
    'EasyScore Beam Fraction'
  ),
  example(
    'named-notes',
    'Look up notes and inspect their notation source',
    stave(`const notes = score.notes('C5/h[id="start"], C5/h[id="end"]');
// A name keeps the tie attached to the same note when earlier notes are inserted.
const from = score.getNote('start');
score.make.tie({ from, to: score.getNote('end') });
score.attach(from, score.make.annotation({ text: 'hold', vJustify: 'top' }));
const source = score.getSource(from);
console.log(source.input.slice(source.start, source.end));`),
    'EasyScore getNote getSource StaveTie'
  ),
  example(
    'managed-batch',
    'Recover a failed batch and scope bass defaults',
    `${setup}
try {
  // A failed batch also discards the temporary note's ID.
  score.build(s => {
    s.notes('C5/w[id="discarded"]');
    throw new Error('Cancel this batch');
  });
} catch (error) { console.log(error.message); }
console.log('Rolled back:', score.getElement('discarded') === undefined);
const bass = score.withDefaults({ clef: 'bass', stem: 'down' }, s => s.notes('C3/h, G2'));
const melody = score.notes('C5/h, E5'); // Treble defaults were restored.
// Put both hands in one system so their downbeats share the same horizontal position.
const system = score.system({ x: 20, y: 25, width: width - 40, spaceBetweenStaves: 10 });
system.addStave({ voices: [score.voice(melody)] }).addClef('treble');
system.addStave({ voices: [score.voice(bass)] }).addClef('bass');
system.addConnector('brace');
score.factory.getContext().resize(width, 300);
score.draw();`,
    'EasyScore build withDefaults System'
  ),
  example(
    'owned-spans',
    'Draw a slur and hairpin through EasyScore',
    stave(`const notes = score.notes('C5/q, D5, E5, G5');
// Use the first and last attacks as endpoints for both the phrase and its crescendo.
score.make.curve({ from: notes[0], to: notes[3] });
score.make.hairpin({ from: notes[0], to: notes[3], type: VF.StaveHairpin.type.CRESC });
score.attach(notes[0], score.make.annotation({ text: 'dolce', vJustify: 'top' }));`),
    'EasyScore Curve StaveHairpin Annotation'
  ),
  example(
    'easy-tab',
    'Create tablature and attach staff markings',
    `${setup}
// Stay on string two. Slide from fret 5 to 7, then hammer on to fret 8.
const notes = [3, 5, 7, 8].map(fret => score.make.tabNote({
  positions: [{ str: 2, fret }], duration: 'q',
}));
score.attach(notes[0], score.make.bend([{ type: VF.Bend.UP, text: 'Full' }]));
score.make.tabSlide({ firstNote: notes[1], lastNote: notes[2] });
score.make.tabTie({ firstNote: notes[2], lastNote: notes[3] }, 'H');
const stave = score.make.tabStave({ x: 20, width: width - 40 });
score.attachToStave(stave, score.make.clef('tab'));
score.system({ x: 20, y: 60, width: width - 40 })
  .addStave({ stave, voices: [score.voice(notes)] });
score.draw();`,
    'EasyScore TabNote TabSlide TabTie Bend'
  ),
  example(
    'compose-measures',
    'Compose a pickup and changing meter',
    `${setup}
const result = score.compose({
  sheet: { width: width - 40, x: 20, y: 25, rowGap: 50 },
  signatures: 'every-measure',
  accidentals: 'key-aware',
  staves: [{ id: 'melody', clef: 'treble', key: 'G', time: '4/4', measures: [
    // The pickup lasts just one beat even though the opening signature is 4/4.
    { span: '1/4', voices: [{ notes: 'D5/q' }] },
    { time: '2/4', voices: [{ notes: 'F#5/q[id="a"], G5[id="b"]' }] },
    { voices: [{ notes: 'F#5/q, F5' }] },
  ] }],
  spans: [{ kind: 'curve', from: 'a', to: 'b' }],
});
result.sheet.format();
score.factory.getContext().resize(width, result.sheet.getHeight() + 35);
score.draw({ retain: true });
console.log('Rows:', result.sheet.getRows().length);`,
    'EasyScore compose Sheet'
  ),
  example(
    'rasgueado-golpe',
    'Rasgueado with a simultaneous golpe',
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
// Fit the entire one-bar fan, even on a phone.
const logicalWidth = Math.max(width, 480);
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
  example(
    'accidental-policy',
    'Compare literal and key-aware accidentals',
    `${setup}
const result = score.compose({
  sheet: { width: width - 40, x: 20, y: 25, rowGap: 45 },
  signatures: 'every-measure',
  accidentals: 'key-aware', // Try 'literal'. Written pitches remain the same.
  staves: [{ id: 'melody', key: 'G', time: '4/4', measures: [
    // The key signature supplies the sharps. The first F natural needs a sign.
    { voices: [{ notes: 'F#5/q, F#5, F5, F5' }] },
    { voices: [{ notes: ['F#5/h', { change: { key: 'C', clef: 'bass' } }, 'G3/q, C4'] }] },
  ] }],
});
result.sheet.format();
score.factory.getContext().resize(width, result.sheet.getHeight() + 35);
score.draw({ retain: true });`,
    'EasyScore compose Accidental KeySignature'
  ),
];
