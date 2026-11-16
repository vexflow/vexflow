// Text, dynamics, and marks that span notes.
import { example as e, number, select, setup, staff, text } from './helpers.mjs';

const group = 'Marks & expression';
export const expression = [
  e(
    'annotations',
    'Lyrics & annotations',
    group,
    'Align lyrics below notes or annotations above them.',
    'Annotation',
    staff(
      "score.notes('C5/q, E5, G5, C6')",
      `params.words.split(' ').slice(0, notes.length).forEach((word, i) => {
  notes[i].addModifier(factory.Annotation({ text: word, vJustify: params.position }), 0);
});`
    ),
    [text('words', 'Words', 'One two three four'), select('position', 'Position', 'bottom', ['bottom', 'top'])]
  ),
  e(
    'chord-symbols',
    'Chord symbols',
    group,
    'Build harmonic labels from text, accidentals, and superscripts.',
    'ChordSymbol',
    staff(
      "score.notes('C5/h, G4')",
      `notes[0].addModifier(factory.ChordSymbol().addText(params.root).addGlyphOrText('maj7'), 0);
notes[1].addModifier(factory.ChordSymbol().addText('G').addGlyphOrText('7').addGlyphOrText('b9', { symbolModifier: VF.ChordSymbol.symbolModifiers.SUPERSCRIPT }), 0);`
    ),
    [text('root', 'Root', 'C')]
  ),
  e(
    'chord-kerning',
    'Chord kerning',
    group,
    'Compare default spacing with opt-in font-specific kerning and stacked scripts.',
    'ChordSymbol',
    `${setup}
// The two rows use identical notes and chord content. Only the kerning mode changes.
const ctx = factory.getContext();
ctx.resize(width, 360);
const chords = [];
const sup = { symbolModifier: VF.ChordSymbol.symbolModifiers.SUPERSCRIPT };
const sub = { symbolModifier: VF.ChordSymbol.symbolModifiers.SUBSCRIPT };
['none', 'auto'].forEach((mode, row) => {
  const notes = score.notes('C5/q, D5, E5, G5');
  const make = () => factory.ChordSymbol({ fontSize: params.size, hJustify: 'left' }).setKerning(mode);
  const symbols = [
    make().addText(params.root).addGlyph('diminished', sup),
    make().addGlyphOrText('C#7'),
    make().addText('F7').addGlyphOrText('b9', sup).addGlyphOrText('#11', sub),
    make().addText(params.root).addGlyph('majorSeventh', sup),
  ];
  notes.forEach((note, i) => note.addModifier(symbols[i], 0));
  chords.push(...symbols);
  const voice = factory.Voice().addTickables(notes);
  factory.System({ x: 30, y: 70 + row * 150, width: width - 60 })
    .addStave({ voices: [voice] }).addClef('treble');
});
factory.draw();
ctx.setFont('sans-serif', 10);
ctx.fillText('Default: none', 30, 22);
ctx.fillText('Opt-in: auto', 30, 172);
// Inspect the complete chord's ink bounds, including both script rows.
if (params.bounds === 'yes') {
  ctx.save().setStrokeStyle('#b74632').setLineWidth(0.5);
  chords.forEach(chord => {
    const box = chord.getBoundingBox();
    ctx.beginPath().rect(box.x, box.y, box.w, box.h).stroke();
  });
  ctx.restore();
}`,
    [
      text('root', 'Root', 'A'),
      number('size', 'Font size (pt)', 18, 10, 28),
      select('bounds', 'Chord bounds', 'no', ['no', 'yes']),
    ],
    'Auto supports regular Academico/Bravura and Petaluma Script/Petaluma. Other font combinations keep the default layout. Set the chord font before formatting.'
  ),
  e(
    'dynamics',
    'Dynamics',
    group,
    'From pianissimo to fortissimo, draw music-font dynamic marks.',
    'TextDynamics',
    `${setup}
const dynamics = ['pp', 'p', 'mp', 'mf', 'f', 'ff'].map(text => factory.TextDynamics({ text, duration: 'q' }));
const voice = factory.Voice().setMode(VF.Voice.Mode.SOFT).addTickables(dynamics);
factory.System({ x: 30, y: 55, width: width - 60 }).addStave({ voices: [voice] });
factory.draw();`
  ),
  e(
    'text-notes',
    'Text notes',
    group,
    'Place rhythmically aligned text alongside music.',
    'TextNote',
    `${setup}
const notes = ['dolce', 'poco', 'a', 'poco'].map(text => factory.TextNote({ text, duration: 'q', line: params.line }));
const voice = factory.Voice().addTickables(notes);
factory.System({ x: 30, y: 65, width: width - 60 }).addStave({ voices: [voice] });
factory.draw();`,
    [number('line', 'Text line', 2, -2, 6)]
  ),
  e(
    'ties',
    'Ties',
    group,
    'Connect the same pitch across successive notes. Chord ties can select individual keys.',
    'StaveTie',
    staff(
      "score.notes('(C5 E5)/h, (C5 E5)')",
      'factory.StaveTie({ from: notes[0], to: notes[1], firstIndexes: [0, 1], lastIndexes: [0, 1] });'
    )
  ),
  e(
    'slurs',
    'Slurs & curves',
    group,
    'Connect notes with a slur and adjust its thickness.',
    'Curve',
    staff(
      "score.notes('C5/q, D5, E5, G5')",
      'factory.Curve({ from: notes[0], to: notes[3], options: { thickness: params.thickness } });'
    ),
    [number('thickness', 'Thickness', 2, 1, 6, 0.5)]
  ),
  e(
    'hairpins',
    'Hairpins',
    group,
    'Draw crescendo and decrescendo hairpins below the staff.',
    'StaveHairpin',
    staff(
      "score.notes('C5/q, D5, E5, G5')",
      '',
      `new VF.StaveHairpin({ firstNote: notes[0], lastNote: notes[3] }, params.direction === 'crescendo' ? 1 : 2)
  .setPosition(VF.Modifier.Position.BELOW)
  .setStyle({ fillStyle: ink, strokeStyle: ink })
  .setContext(factory.getContext()).drawWithStyle();`
    ),
    [select('direction', 'Direction', 'crescendo', ['crescendo', 'decrescendo'])]
  ),
  e(
    'pedal',
    'Pedal markings',
    group,
    'Choose between text, brackets, and a mixture of the two.',
    'PedalMarking',
    staff(
      "score.notes('C5/q, E5, G5, C6')",
      'factory.PedalMarking({ notes: [notes[0], notes[3]], options: { style: params.style } });'
    ),
    [select('style', 'Style', 'mixed', ['mixed', 'bracket', 'text'])]
  ),
  e(
    'octaves',
    'Octave brackets',
    group,
    'An octave instruction spans a passage without changing its written pitches.',
    'TextBracket',
    staff(
      "score.notes('C5/q, E5, G5, C6')",
      "factory.TextBracket({ from: notes[0], to: notes[3], text: params.text, options: { superscript: 'va', position: 'top', line: 2 } });"
    ),
    [select('text', 'Interval', '8', ['8', '15'])]
  ),
  e(
    'glissando',
    'Glissando lines',
    group,
    'Draw a line between selected pitches and add a label.',
    'StaveLine',
    staff(
      "score.notes('C4/h, C6')",
      "factory.StaveLine({ from: notes[0], to: notes[1], firstIndexes: [0], lastIndexes: [0], options: { text: 'gliss.' } });"
    )
  ),
  e(
    'vibrato-bracket',
    'Vibrato brackets',
    group,
    'Draw a vibrato bracket spanning several notes.',
    'VibratoBracket',
    staff(
      "score.notes('C5/q, D5, E5, G5')",
      'factory.VibratoBracket({ from: notes[0], to: notes[3], options: { line: 2 } });'
    )
  ),
];
