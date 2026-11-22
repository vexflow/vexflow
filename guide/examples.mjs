// Complete teaching examples. Each runs in the guide preview environment.
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

/** Use the playground example format; controls are optional. */
function example(id, title, code, api = 'EasyScore System') {
  return { id, title, code, api: api.split(' '), controls: [], group: 'Guide examples', description: title, tips: '' };
}

/** Keep the print document at physical size and scale only its on-screen preview. */
function publicationStudy(viewName) {
  const view =
    viewName === 'condensed'
      ? `// Merge matching attacks and keep separate voices when the two players divide.
const options = { title: 'Flutes 1 and 2', condense: { players: ['one', 'two'] }, systemBreaks: [2] };`
      : viewName === 'part'
        ? `// Select one player. To print both, change staves to ['one', 'two'].
const options = { staves: ['two'], title: 'Flute 2', systemBreaks: [2] };`
        : `// Start a new page at measure two. The first page contains only measure one.
const options = { title: 'Flute duet', subtitle: 'Four measures for two players', pageBreaks: [2] };`;
  return `// Both players use EasyScore note strings and share the same measure boundaries.
const player = (id, name, phrases) => ({
  id, name, clef: 'treble', measures: phrases.map(notes => ({ voices: [{ notes }] })),
});
const music = { staves: [
  player('one', 'Flute 1', ['C5/h, E5', 'D5/h, G5', 'E5/h, D5', 'C5/w']),
  player('two', 'Flute 2', ['C5/h, C5', 'B4/h, D5', 'C5/h, B4', 'C5/w']),
] };
${view}
const book = new VF.Publication(music).render(document.createElement('div'), {
  paper: 'Letter', staffSize: 8.5, pageNumbers: true, footer: 'Flute duet', ...options,
});
// Change the page number to inspect another printed page of this edition.
const pageNumber = 1;
const page = book.pages[pageNumber - 1].svg.cloneNode(true);
const previewWidth = Math.min(width, 640);
page.setAttribute('width', previewWidth);
page.setAttribute('height', Math.round(previewWidth * book.paper.height / book.paper.width));
document.getElementById('score').append(page);
console.log('Printed pages:', book.pages.length);`;
}

export const teachingExamples = [
  example(
    'cross-staff-line',
    'Move the last half note to the lower stave',
    `${setup}
const result = score.compose({
  sheet: { x: 20, y: 20, width: width - 40 },
  staves: [
    { id: 'upper', clef: 'treble', measures: [{ voices: [{ notes: [
      'G4/h',
      // The melody stays in this voice while the second note prints on the bass stave.
      { note: { keys: ['e/3'], duration: 'h', clef: 'bass' }, stave: 'lower' },
    ] }] }] },
    { id: 'lower', clef: 'bass', measures: [{ voices: [{ notes: 'C3/w' }] }] },
  ],
});
result.sheet.format();
score.factory.getContext().resize(width, result.sheet.getHeight() + 45);
score.draw();`,
    'EasyScore Sheet'
  ),
  example(
    'edition-marks',
    'Mark an editorial turn and a written trill partner',
    stave(`const notes = score.notes('G4/h, A4/h');
// Parentheses distinguish an editorial addition from an unmarked source ornament.
score.attach(notes[0], score.make.ornament('turn', { parenthesized: true }));
// This cue-sized B-flat tells the player which pitch alternates with A.
score.attach(notes[1], score.make.ornament('tr', { auxiliaryPitch: 'bb/4' }));`),
    'EasyScore Ornament'
  ),
  example(
    'option-validation',
    'Validate an option before emphasizing a note',
    `// Declare which application options may appear inside the brackets.
const score = VF.EasyScore.create({ renderer: { elementId: 'score', width, height } }, {
  extensions: ['mark'],
  validate: ({ options }) => {
    if (options.mark && options.mark !== 'entry') throw new Error('Expected mark="entry"');
  },
});
// Validation checks the spelling. The hook applies it to the constructed note.
score.addCommitHook((options, note) => {
  if (options.mark === 'entry') note.setStyle({ fillStyle: '#923a28', strokeStyle: '#923a28' });
});
const notes = score.notes('C5/h[mark="entry"], E5/h');
score.system({ x: 20, y: 50, width: width - 40 }).addStave({ voices: [score.voice(notes)] }).addClef('treble');
score.draw();`,
    'EasyScore'
  ),
  example(
    'lute-courses',
    'Read a French lute course and its open bass',
    `${setup}
// The first three attacks move up the same course. The last uses an open bass course.
const positions = [{ str: 2, fret: 0 }, { str: 2, fret: 1 }, { str: 2, fret: 2 }, { str: 7, fret: 0 }];
const notes = positions.map(position => score.factory.FrenchLuteNote({ positions: [position], duration: 'q' }));
const stave = score.make.tabStave({ x: 20, y: 40, width: width - 40 });
score.system({ x: 20, y: 40, width: width - 40 }).addStave({ stave, voices: [score.voice(notes)] });
score.draw();`,
    'EasyScore FrenchLuteNote'
  ),
  example(
    'chant-syllables',
    'Group square notes by sung syllable',
    `${setup}
// One pitch takes one square. A rising or falling pair forms one neume.
const syllables = [
  { syllable: 'Do', pitches: ['c/4'] },
  { syllable: 'mi', pitches: ['c/4', 'd/4'] },
  { syllable: 'ne', pitches: ['e/4', 'd/4'] },
];
// Chant has no counted measures. Use the score context for the four-line phrase.
new VF.ChantPhrase(syllables).draw(score.factory.getContext(), { x: 20, y: 40, width: width - 40, clef: 'C', line: 3 });`,
    'EasyScore ChantPhrase'
  ),

  example(
    'sung-phrase',
    'Place chord changes and syllables on the melody',
    `${setup}
// Name the attacks once so the lyrics and chord changes follow the same notes.
score.compose({
  sheet: { x: 20, y: 54, width: width - 40 },
  staves: [{ id: 'singer', clef: 'treble', measures: [{
    time: '6/8',
    voices: [{ notes: 'C5/q.[id="day"], G4/q.[id="light"]' }],
    chords: [{ note: 'day', harmony: { root: 'C', quality: 'maj7' } },
      { note: 'light', harmony: { root: 'G', quality: '7', bass: 'B' } }],
    verses: [[{ note: 'day', text: 'Day', hyphenAfter: true }, { note: 'light', text: 'light' }]],
  }] }],
});
score.draw();`,
    'EasyScore ChordSymbol'
  ),
  example(
    'pedal-octave',
    'Place a pedal change below an octave bracket',
    stave(`const notes = score.notes('C5/q, E5, G5, C6');
// Repeating the midpoint lifts and depresses the pedal at the same attack.
score.make.pedalMarking({ notes: [notes[0], notes[2], notes[2], notes[3]], options: { style: 'mixed' } });
score.make.textBracket({ from: notes[0], to: notes[3], text: '8', options: { superscript: 'va', position: 'top' } });`),
    'EasyScore PedalMarking TextBracket'
  ),
  example(
    'written-signs',
    'Place key signs at written pitches',
    `${setup}
const melody = score.voice(score.notes('Gb4/h, E#4/h'));
const staff = score.system({ x: 20, y: 50, width: width - 40 }).addStave({ voices: [melody] }).addClef('treble');
// Preserve the order and written positions supplied by the edition.
const signs = [{ type: 'b', pitch: 'g/4' }, { type: '#', pitch: 'e/4' }];
staff.addModifier(score.make.keySignature('C').setOrdered(signs));
score.draw();`,
    'EasyScore KeySignature'
  ),
  example(
    'guitar-frames',
    'Compare open and barred C major',
    `${setup}
// Draw the same sounding chord above the two fingerings.
const notes = score.notes('(C4 E4 G4)/h, (C4 E4 G4)/h');
score.system({ x: 20, y: 20, width: width - 40 }).addStave({ voices: [score.voice(notes)] }).addClef('treble');
const ctx = score.factory.getContext();
ctx.resize(width, 225);
score.draw();
// Formatting has established the x position of each chord on the staff.
for (const [i, name] of ['open', 'third-position'].entries()) {
  const frame = VF.FretDiagram.lookupVoicing({ root: 'C' }, 'standard', name);
  new VF.FretDiagram({ ...frame, orientation: 'vertical' })
    .setContext(ctx).setX(notes[i].getAbsoluteX() - 42).setY(120).draw();
}`,
    'EasyScore FretDiagram'
  ),
  example(
    'snare-sticking',
    'Write a paradiddle on one line',
    `${setup}
// Eight equal strokes use four different hand-to-hand transitions.
const hands = ['R', 'L', 'R', 'R', 'L', 'R', 'L', 'L'];
const kit = new VF.PercussionMap([{ id: 'snare', label: 'Snare', line: 5, stem: 'up' }]);
const notes = hands.map(() => score.make.note(kit.note(['snare'], '8')));
score.beam(notes.slice(0, 4));
score.beam(notes.slice(4));
const sheet = score.sheet({ x: 20, y: 35, width: width - 40 });
sheet.addSystem().addStave({ voices: [score.voice(notes)], options: { numLines: 1, barlineSpan: { top: -0.8, bottom: 0.8 } } });
// Anchor the hand to the attack so the labels follow any change in spacing.
sheet.addStickingLine(notes.map((note, i) => ({ note, hand: hands[i] })));
score.draw();`,
    'EasyScore Sheet'
  ),
  example(
    'flute-keys',
    'Mark a single moving flute key',
    stave(`const notes = score.notes('D5/h, D5/h');
// Filled circles show the keys held closed. Omitted keys are open.
const base = { L1: 'closed', L2: 'closed', L3: 'closed' };
score.attach(notes[0], new VF.FluteFingering(base));
const trill = new VF.FluteFingering(base).setTrillKey({ key: 'R1', start: 'open', alternate: 'closed' });
score.attach(notes[1], trill);`),
    'EasyScore FluteFingering'
  ),
  example(
    'accordion-ranks',
    'Change accordion register on the second chord',
    stave(`const notes = score.notes('(C4 E4 G4)/h, (C4 E4 G4)/h');
// Select the sounding reed ranks, keeping pitch and rhythm constant.
score.attach(notes[0], new VF.AccordionRegister({ middle: 1 }));
score.attach(notes[1], new VF.AccordionRegister({ low: true, middle: 1, high: true }));`),
    'EasyScore AccordionRegister'
  ),
  example(
    'piping-graces',
    'Attach Highland embellishments to two attacks',
    stave(`const notes = score.notes('A4/h, D5/h');
// Each named pattern belongs to its following melody note.
score.attach(notes[0], VF.GraceNoteGroup.highland('grip'));
score.attach(notes[1], VF.GraceNoteGroup.highland('taorluath'));`),
    'EasyScore GraceNoteGroup'
  ),
  example(
    'four-shapes',
    'Read scale degrees from the noteheads',
    stave(`const notes = score.notes('C5/8, D5, E5, F5, G5, A5, B5, C6');
// The tonic determines the fa, sol, la, and mi shapes before formatting.
VF.StaveNote.applyFourShape('C', notes);
score.beam(notes.slice(0, 4));
score.beam(notes.slice(4));`),
    'EasyScore StaveNote'
  ),
  example(
    'figured-line',
    'Continue a bass figure across the next attack',
    `${setup}
const notes = score.notes('C3/q, D3, E3, F3', { clef: 'bass' });
score.system({ x: 20, y: 30, width: width - 40 }).addStave({ voices: [score.voice(notes)] }).addClef('bass');
score.draw();
// Figures are intervals above the bass. Their rows follow the formatted notes.
new VF.FiguredBass({ rows: [
  [{ note: notes[0], figure: '6', extendTo: notes[1] }, { note: notes[2], figure: '5' }],
  [{ note: notes[0], figure: '3' }, { note: notes[2], figure: '3' }],
] }).setContext(score.factory.getContext()).draw();`,
    'EasyScore FiguredBass'
  ),
  example('paper-edition', 'Set a page break in a Letter edition', publicationStudy('score'), 'EasyScore Publication'),
  example('flute-parts', 'Extract a flute part from the same duet', publicationStudy('part'), 'EasyScore Publication'),
  example('condensed-duet', 'Condense two flutes on one staff', publicationStudy('condensed'), 'EasyScore Publication'),
  example(
    'score-reader',
    'Read the formatted notes in time order',
    `${setup}
// Stable note IDs connect a text reader or keyboard selection to a printed attack.
const staves = [{ id: 'melody', measures: [{ voices: [{ notes: 'C5/h[id="start"], G4/h[id="end"]' }] }] }];
const composition = score.compose({ sheet: { x: 20, y: 30, width: width - 40 }, staves });
score.draw({ retain: true });
const reader = new VF.ScoreNavigation(composition, staves);
for (const event of reader.events) console.log(event.id, event.onset, event.label);`,
    'EasyScore ScoreNavigation'
  ),

  example(
    'harp-setting',
    'Read the seven harp pedals',
    stave(`// The seven ticks describe the strings available before the melody begins.
const notes = score.notes('C4/q, D4, E4, G4');
const setting = { D: 'natural', C: 'natural', B: 'natural', E: 'natural',
  F: 'sharp', G: 'natural', A: 'natural' };
notes[0].addModifier(new VF.HarpPedalDiagram(setting), 0);`),
    'HarpPedalDiagram EasyScore'
  ),
  example(
    'harp-changes',
    'Mark only the pedals that move',
    stave(`// Start with natural pedals. Use the rest to prepare the next entrance.
const notes = score.notes('D4/q, B4/q/r, A4/q, C5/q');
const pedals = new VF.HarpPedalChanges({ D: 'natural', C: 'natural', B: 'natural',
  E: 'natural', F: 'natural', G: 'natural', A: 'natural' });
pedals.apply(notes[1], { B: 'flat', F: 'sharp' });
pedals.apply(notes[2], { F: 'sharp' }); // Already sharp, so no label appears.
pedals.apply(notes[3], { F: 'natural' });`),
    'HarpPedalChanges EasyScore'
  ),
  example(
    'mensural-values',
    'Count three mensural long values',
    `const factory = new VF.Factory({ renderer: { elementId: 'score', width, height } });
// Print the sign, then supply the written durations for this binary reading.
const staff = factory.Stave({ x: 20, y: 50, width: width - 40 }).addTimeSignature('mensural-semicircle');
const values = [['b/4', 'm'], ['c/5', 'l'], ['b/4', '1/2']];
const notes = values.map(([pitch, duration]) =>
  factory.StaveNote({ keys: [pitch], duration, whiteMensural: true }));
// Four plus two plus one breve totals fourteen whole notes.
const voice = factory.Voice({ time: '14/1' }).addTickables(notes);
factory.Formatter().joinVoices([voice]).formatToStave([voice], staff);
factory.draw();`,
    'StaveNote TimeSignature Factory'
  ),
  example(
    'kievan-pitches',
    'Follow a Kievan melody',
    `const factory = new VF.Factory({ renderer: { elementId: 'score', width, height } });
// The clef puts middle C on the middle line. D sits in the next space.
const staff = factory.Stave({ x: 20, y: 50, width: width - 40 }).addClef('kievan');
const pitches = ['c/4', 'd/4', 'e/4', 'f/4', 'e/4', 'd/4', 'c/4'];
const notes = pitches.map(pitch => factory.KievanNote({ pitch, duration: 'h' }));
// Keep all seven half notes in a single voice as the melody climbs and returns.
const voice = factory.Voice({ time: '7/2' }).addTickables(notes);
factory.Formatter().joinVoices([voice]).formatToStave([voice], staff);
factory.draw();`,
    'KievanNote Clef Factory'
  ),
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
    'feathered-group',
    'Fan a measured beam',
    stave(`// Four sixteenths fill the first beat. The fan changes only the beam spacing.
const notes = score.notes('C5/16, D5, E5, F5, G5/q, E5, C5');
score.beam(notes.slice(0, 4), { feathered: 'right' });`),
    'EasyScore Beam'
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
