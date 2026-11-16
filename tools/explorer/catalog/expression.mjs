// Text, dynamics, and marks that span notes.
import { example as e, number, select, setup, staff, text } from './helpers.mjs';

const group = 'Marks & expression';
export const expression = [
  e(
    'annotations',
    'Lyrics & annotations',
    group,
    'Align words beneath the melody, or float an instruction above it.',
    'Annotation',
    staff(
      "score.notes('C5/q, E5, G5, C6')",
      `params.words.split(' ').slice(0, notes.length).forEach((word, i) => {
  notes[i].addModifier(factory.Annotation({ text: word, vJustify: params.position }), 0);
});`
    ),
    [text('words', 'Words', 'Let the music flow'), select('position', 'Position', 'bottom', ['bottom', 'top'])]
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
    'Shape a musical phrase with a curved line.',
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
    'A growing or shrinking wedge describes a change in loudness.',
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
    'A wavy line extends a gesture over several notes.',
    'VibratoBracket',
    staff(
      "score.notes('C5/q, D5, E5, G5')",
      'factory.VibratoBracket({ from: notes[0], to: notes[3], options: { line: 2 } });'
    )
  ),
];
