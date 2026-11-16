// Complete teaching examples. Each runs in the shared Explorer preview environment.
const setup = `const factory = new VF.Factory({
  renderer: { elementId: 'score', width, height },
});
const score = factory.EasyScore({ throwOnError: true });`;

/** Keep beginner examples strict so rhythm errors are visible while learning. */
function stave(body, meter = '4/4') {
  return `${setup}\n${body}\nconst voice = score.voice(notes, { time: '${meter}' });
factory.System({ x: 20, y: 50, width: width - 40 })
  .addStave({ voices: [voice] })
  .addClef('treble').addTimeSignature('${meter}');
factory.draw();`;
}

/** Use the same example shape as Explorer; controls are optional. */
function example(id, title, code, api = 'Factory EasyScore System') {
  return { id, title, code, api: api.split(' '), controls: [], group: 'Guide examples', description: title, tips: '' };
}

export const teachingExamples = [
  example('first-notes', 'Your first four notes', stave("const notes = score.notes('C5/q, D5, E5, G5');")),
  example(
    'rhythm-basics',
    'Chords, rests, and dotted rhythm',
    stave("const notes = score.notes('(C4 E4 G4)/q., D4/8, B4/q/r, C5/q');")
  ),
  example('three-four', 'A complete bar in 3/4', stave("const notes = score.notes('C5/q, E5, G5');", '3/4')),
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
score.tuplet(triplet, { numNotes: 3, notesOccupied: 2 });
score.beam(triplet);
const notes = [...triplet, ...score.notes('G5/q, E5, C5')];`),
    'EasyScore Tuplet Beam Voice'
  ),
  example(
    'grand-staff',
    'Treble and bass together',
    `${setup}
const system = factory.System({ x: 20, y: 25, width: width - 40, spaceBetweenStaves: 10 });
system.addStave({ voices: [score.voice(score.notes('C5/h, E5'))] })
  .addClef('treble').addTimeSignature('4/4');
system.addStave({ voices: [score.voice(score.notes('C3/h, G2', { clef: 'bass' }))] })
  .addClef('bass').addTimeSignature('4/4');
system.addConnector('brace');
factory.getContext().resize(width, 300);
factory.draw();`,
    'EasyScore System StaveConnector'
  ),
  example(
    'facade',
    'Compose with EasyScore.create()',
    `const score = VF.EasyScore.create({
  renderer: { elementId: 'score', width, height },
});
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
factory.System({ x: 20, y: 50, width: width - 40 })
  .addStave({ voices: [score.voice(score.notes('C4/w'))] }).addClef('treble');
factory.draw();`,
    'EasyScore'
  ),
  example(
    'native-stave',
    'Draw an empty stave',
    `const renderer = new VF.Renderer(document.getElementById('score'), VF.Renderer.Backends.SVG);
renderer.resize(width, height);
const context = renderer.getContext();
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
factory.System({ x: 20, y: 50, width: width - 40 })
  .addStave({ voices: [score.voice(notes)] }).addClef('treble');
factory.draw({ retain: true });
// A retained draw keeps objects available for the next pass.
factory.getContext().clear();
factory.setStyle({ fillStyle: '#38614e', strokeStyle: '#38614e' });
factory.draw({ retain: true });`,
    'Factory Element'
  ),
];
