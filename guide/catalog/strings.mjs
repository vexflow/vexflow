// Guitar tablature and string-instrument techniques.
import { example as e, number, select, setup, staff } from './helpers.mjs';

const group = 'Strings & tablature';
function tab(modifications = '', after = '') {
  return `${setup}
// Keep one string fixed so you can follow the fretting hand as the numbers rise.
const notes = [3, 5, 7, 8].map(fret => score.make.tabNote({ positions: [{ str: params.string ?? 2, fret }], duration: 'q' }));
${modifications}
const stave = score.make.tabStave({ x: 30, width: width - 60 }).addClef('tab');
// Place the four quarter-note frets in one voice on the tab stave.
score.system({ x: 30, y: 60, width: width - 60 }).addStave({ stave, voices: [score.voice(notes)] });
score.draw();
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
    tab(
      "// Read the bend in two stages. Raise the pitch a full step, then release it.\nnotes[0].addModifier(new VF.Bend([{ type: VF.Bend.UP, text: 'Full' }, { type: VF.Bend.DOWN, text: '' }]), 0);"
    )
  ),
  e(
    'vibrato',
    'Vibrato',
    group,
    'Attach a vibrato mark to a tablature note and adjust its width.',
    'Vibrato',
    tab(
      '// The wave begins at the second fret number. Its width controls the length of the printed mark.\nnotes[1].addModifier(new VF.Vibrato().setVibratoWidth(params.length), 0);'
    ),
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
      `// The line climbs from fret 3 to fret 5 on the same string.
new VF.TabSlide({ firstNote: notes[0], lastNote: notes[1], firstIndexes: [0], lastIndexes: [0] }, 1)
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
      `// H tells the player to hammer on. For a pull-off, choose P and make the second fret lower.
new VF.TabTie({ firstNote: notes[0], lastNote: notes[1], firstIndexes: [0], lastIndexes: [0] }, params.label)
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
      "// Lead into the first full-sized fret with a small fret 2 on the same string.\nconst grace = score.make.graceTabNote({ positions: [{ str: 2, fret: 2 }], duration: '8' });\nscore.attach(notes[0], score.make.graceNoteGroup({ notes: [grace], slur: true }));"
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
      "// Place a circled string number by each pitch to suggest where to play it.\nnotes.forEach((note, i) => note.addModifier(factory.StringNumber({ number: String(i + 1), position: 'above' }), 0));"
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
      '// The mark belongs to the whole chord and suggests the order in which to strike its strings.\nnotes.forEach(note => note.addModifier(new VF.Stroke(params.type), 0));'
    ),
    [select('type', 'Stroke type', 3, [1, 2, 3, 4, 5, 6])]
  ),
];
