// Guitar tablature and string-instrument techniques.
import { example as e, number, select, setup, staff } from './helpers.mjs';

const group = 'Strings & tablature';
function tab(modifications = '', after = '') {
  return `${setup}
const notes = [3, 5, 7, 8].map(fret => factory.TabNote({ positions: [{ str: params.string ?? 2, fret }], duration: 'q' }));
${modifications}
const stave = factory.TabStave({ x: 30, y: 60, width: width - 60 }).addClef('tab');
const voice = factory.Voice().setStave(stave).addTickables(notes);
// Align the voice to the available space between the stave margins.
factory.Formatter().joinVoices([voice]).formatToStave([voice], stave);
factory.draw();
${after ? '\n// Draw the connection after the fret positions have been calculated.\n' + after : ''}`.trim();
}
export const strings = [
  e(
    'tablature',
    'Tablature',
    group,
    'Render fret numbers on a six-string tablature staff.',
    'TabNote TabStave',
    tab(),
    [number('string', 'String', 2, 1, 6)]
  ),
  e(
    'bends',
    'Bends',
    group,
    'Bend a string up to a target pitch, then release it.',
    'Bend',
    tab("notes[0].addModifier(new VF.Bend([{ type: VF.Bend.UP, text: 'Full' }, { type: VF.Bend.DOWN, text: '' }]), 0);")
  ),
  e(
    'vibrato',
    'Vibrato',
    group,
    'Attach a vibrato mark to a tablature note and adjust its width.',
    'Vibrato',
    tab('notes[1].addModifier(new VF.Vibrato().setVibratoWidth(params.length), 0);'),
    [number('length', 'Wave length', 45, 15, 90)]
  ),
  e(
    'tab-slides',
    'Tab slides',
    group,
    'Connect frets with an ascending slide.',
    'TabSlide',
    tab(
      '',
      `new VF.TabSlide({ firstNote: notes[0], lastNote: notes[1], firstIndexes: [0], lastIndexes: [0] }, 1)
  .setContext(factory.getContext()).setStyle({ strokeStyle: ink }).drawWithStyle();`
    )
  ),
  e(
    'tab-ties',
    'Hammer-ons & pull-offs',
    group,
    'Label a tablature tie as a hammer-on or pull-off.',
    'TabTie',
    tab(
      '',
      `new VF.TabTie({ firstNote: notes[0], lastNote: notes[1], firstIndexes: [0], lastIndexes: [0] }, params.label)
  .setContext(factory.getContext()).setStyle({ fillStyle: ink, strokeStyle: ink }).drawWithStyle();`
    ),
    [select('label', 'Gesture', 'H', ['H', 'P'])]
  ),
  e(
    'grace-tab',
    'Grace tablature',
    group,
    'Lead into a fretted note with a small grace-note group.',
    'GraceTabNote GraceNoteGroup',
    tab(
      "const grace = new VF.GraceTabNote({ positions: [{ str: 2, fret: 2 }], duration: '8' });\nnotes[0].addModifier(new VF.GraceNoteGroup([grace], true), 0);"
    )
  ),
  e(
    'string-numbers',
    'String numbers',
    group,
    'Circled string numbers sit beside pitches on a conventional staff.',
    'StringNumber',
    staff(
      "score.notes('C5/q, D5, E5, G5')",
      "notes.forEach((note, i) => note.addModifier(factory.StringNumber({ number: String(i + 1), position: 'above' }), 0));"
    )
  ),
  e(
    'strokes',
    'Arpeggios & brush strokes',
    group,
    'Spread the notes of a chord with a directional stroke.',
    'Stroke',
    staff(
      "score.notes('(C4 E4 G4 C5)/h, (D4 F4 A4 D5)')",
      'notes.forEach(note => note.addModifier(new VF.Stroke(params.type), 0));'
    ),
    [select('type', 'Stroke type', 3, [1, 2, 3, 4, 5, 6])]
  ),
];
