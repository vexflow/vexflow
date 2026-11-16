// Pitched notation, duration, rhythm, and note-level modifiers.
import { example as e, number, select, staff, text } from './helpers.mjs';

const group = 'Notes & rhythm';
export const notes = [
  e(
    'notes',
    'Notes & stems',
    group,
    'A melody begins with pitch, duration, and a little space. Change the phrase or turn the stems.',
    'StaveNote Stem Flag EasyScore',
    staff('score.notes(params.phrase, { stem: params.stem })'),
    [
      text('phrase', 'Phrase', 'C5/q, D5/8, E5, G5/q, E5'),
      select('stem', 'Stem direction', 'auto', ['auto', 'up', 'down']),
    ],
    'EasyScore uses scientific pitch names. /q, /8, and /h select quarter, eighth, and half notes. Omitted durations carry forward.'
  ),
  e(
    'rests',
    'Rests',
    group,
    'Silence has shape. Compare rests across common durations.',
    'StaveNote EasyScore',
    staff("score.notes('B4/w/r, B4/h/r, B4/q/r, B4/8/r, B4/16/r')")
  ),
  e(
    'chords',
    'Chords & seconds',
    group,
    'Stack pitches and inspect how adjacent noteheads shift to avoid one another.',
    'StaveNote NoteHead',
    staff('score.notes(params.phrase, { stem: params.stem })'),
    [
      text('phrase', 'Chords', '(C4 E4 G4)/q, (D4 E4 F4), (C5 D5 E5), (G4 B4 D5)'),
      select('stem', 'Stems', 'up', ['up', 'down']),
    ]
  ),
  e(
    'noteheads',
    'Notehead shapes',
    group,
    'Crosses, diamonds, and slash notation give a note a different voice.',
    'StaveNote NoteHead',
    staff(
      "['c/4', 'd/4', 'e/4', 'f/4'].map(key => factory.StaveNote({ keys: [key + '/' + params.shape], duration: 'q' }))"
    ),
    [select('shape', 'Shape', 'D', ['D', 'X0', 'X1', 'X2', 'T0', 'S1'])]
  ),
  e(
    'dots',
    'Dotted notes',
    group,
    'Dots extend a duration and find their own vertical space beside a notehead.',
    'Dot StaveNote',
    staff("score.notes('C5/q., D5/8, E5/q.., G5/16')")
  ),
  e(
    'beams',
    'Beams',
    group,
    'A shared beam makes the rhythm visible. Try a rising or falling phrase.',
    'Beam StemmableNote',
    staff('score.notes(params.phrase)', 'score.beam(notes);'),
    [text('phrase', 'Eighth notes', 'C5/8, D5, E5, G5, A5, G5, E5, D5')]
  ),
  e(
    'tuplets',
    'Tuplets',
    group,
    'Fit a group of notes into a different rhythmic span.',
    'Tuplet',
    staff(
      "score.notes('C5/8, D5, E5, G5, E5, D5')",
      'factory.Tuplet({ notes, options: { numNotes: 6, notesOccupied: params.occupied, ratioed: true, bracketed: true } });'
    ),
    [select('occupied', 'Notes occupied', 4, [2, 4, 8])]
  ),
  e(
    'grace',
    'Grace notes',
    group,
    'Small notes lead into a full-sized note, with an optional slur.',
    'GraceNote GraceNoteGroup',
    staff(
      "score.notes('C5/q, E5, G5, C6')",
      `const grace = ['d/5', 'e/5'].map(key => factory.GraceNote({ keys: [key], duration: '16', slash: params.slash === 'yes' }));
notes[0].addModifier(factory.GraceNoteGroup({ notes: grace, slur: true }), 0);`
    ),
    [select('slash', 'Slash', 'yes', ['yes', 'no'])]
  ),
  e(
    'accidentals',
    'Accidentals',
    'Marks & expression',
    'Alter a pitch with sharps, flats, naturals, or a cautionary accidental.',
    'Accidental',
    staff(
      "score.notes('C5/q, D5, E5, F5')",
      `notes.forEach((note, index) => {
  const accidental = factory.Accidental({ type: params.type });
  if (index === 3) accidental.setAsCautionary();
  note.addModifier(accidental, 0);
});`
    ),
    [select('type', 'Accidental', '#', ['#', 'b', 'n', '##', 'bb'])]
  ),
  e(
    'microtones',
    'Microtonal accidentals',
    'Marks & expression',
    'Explore quarter-tone and other microtonal pitch marks.',
    'Accidental',
    staff(
      "score.notes('C5/q, D5, E5, F5')",
      "['+', '++', 'db', 'bbs'].forEach((type, i) => notes[i].addModifier(factory.Accidental({ type }), 0));"
    )
  ),
  e(
    'articulations',
    'Articulations',
    'Marks & expression',
    'Small marks describe the attack and length of a note.',
    'Articulation',
    staff(
      "score.notes('C5/q, D5, E5, G5')",
      'notes.forEach(note => note.addModifier(factory.Articulation({ type: params.type, position: params.position }), 0));'
    ),
    [
      select('type', 'Articulation', 'a.', ['a.', 'a-', 'a>', 'a^', 'a@a', 'a@u']),
      select('position', 'Position', 'above', ['above', 'below']),
    ]
  ),
  e(
    'ornaments',
    'Ornaments',
    'Marks & expression',
    'Turns, mordents, and trills add a gesture around the written pitch.',
    'Ornament',
    staff(
      "score.notes('C5/q, D5, E5, G5')",
      'notes.forEach(note => note.addModifier(factory.Ornament(params.type), 0));'
    ),
    [
      select('type', 'Ornament', 'tr', [
        'tr',
        'mordent',
        'mordentInverted',
        'turn',
        'turnInverted',
        'upprall',
        'doit',
        'fall',
      ]),
    ]
  ),
  e(
    'tremolo',
    'Tremolo',
    'Marks & expression',
    'Repeated strokes across a stem indicate rapid repetition.',
    'Tremolo',
    staff("score.notes('C5/h, E5, G5')", 'notes.forEach(note => note.addModifier(new VF.Tremolo(params.strokes), 0));'),
    [number('strokes', 'Strokes', 3, 1, 4)]
  ),
  e(
    'fingering',
    'Fingerings',
    'Marks & expression',
    'Place a finger number beside each pitch of a chord.',
    'FretHandFinger',
    staff(
      "score.notes('(C5 E5 G5)/h, (D5 F5 A5)')",
      "notes.forEach(note => ['1', '3', '5'].forEach((number, i) => note.addModifier(factory.Fingering({ number, position: params.position }), i)));"
    ),
    [select('position', 'Position', 'left', ['left', 'right', 'above', 'below'])]
  ),
  e(
    'parentheses',
    'Parentheses',
    'Marks & expression',
    'Parenthesize a pitch to indicate an optional or editorial note.',
    'Parenthesis',
    staff("score.notes('C5/q, D5, E5, G5')", 'VF.Parenthesis.buildAndAttach([notes[1], notes[3]]);')
  ),
];
