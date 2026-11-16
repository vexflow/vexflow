// Higher-level formatting, invisible timing, and unusual rhythmic glyphs.
import { example as e, number, select, setup, staff, text } from './helpers.mjs';

const group = 'Layout & composition';
export const layout = [
  e(
    'voices',
    'Multiple voices',
    group,
    'Independent voices share a staff and align at common musical times.',
    'Voice Formatter ModifierContext TickContext',
    `${setup}
const upper = score.voice(score.notes('C5/h, D5', { stem: 'up' }));
const lower = score.voice(score.notes('G4/q, A4, B4, A4', { stem: 'down' }));
factory.System({ x: 30, y: 65, width: width - 60 })
  .addStave({ voices: [upper, lower] }).addClef('treble');
factory.draw();`
  ),
  e(
    'sheet',
    'Responsive sheets',
    group,
    'Wrap measures into rows at a configurable width.',
    'Sheet System Factory',
    `${setup}
const sheet = factory.Sheet({ width: Math.min(params.rowWidth, width - 60), x: 30, y: 25, rowGap: 15 });
for (const notes of score.measures('C5/h, E5 | G5/q, E5, D5, C5 | E5/h, G5 | C5/w')) {
  sheet.addSystem().addStave({ voices: [score.voice(notes)] }).addClef('treble');
}
// Format first so the renderer can use the height of the wrapped rows.
sheet.format();
factory.getContext().resize(width, sheet.getHeight() + 30);
factory.draw();`,
    [number('rowWidth', 'Row width', 620, 200, 900, 20)]
  ),
  e(
    'styles',
    'Color & highlighting',
    group,
    'Set a foreground for the score and keep individual highlights.',
    'Element Factory',
    staff(
      "score.notes('C5/q, E5, G5, C6')",
      'notes[params.index].setStyle({ fillStyle: params.color, strokeStyle: params.color });'
    ),
    [number('index', 'Note index', 1, 0, 3), text('color', 'Highlight color', '#b74632')]
  ),
  e(
    'ghosts',
    'Ghost notes',
    group,
    'An invisible tickable reserves rhythmic space without drawing a note.',
    'GhostNote',
    staff("[...score.notes('C5/q'), factory.GhostNote({ duration: 'q' }), ...score.notes('E5/q, G5')]"),
    [],
    'The empty second beat is intentional. GhostNote contributes time and spacing without a visible notehead.'
  ),
  e(
    'repeat-notes',
    'Measure-repeat symbols',
    group,
    'A repeat glyph can stand in for a repeated measure.',
    'RepeatNote',
    staff("[factory.RepeatNote(params.type, { duration: 'w' })]"),
    [select('type', 'Repeat', '1', ['1', '2', '4', 'slash'])]
  ),
  e(
    'glyph-notes',
    'Glyph notes',
    group,
    'Use a music glyph as a rhythmically positioned note.',
    'GlyphNote',
    staff(
      "[factory.GlyphNote(VF.Glyphs.segno, { duration: 'h' }), factory.GlyphNote(VF.Glyphs.coda, { duration: 'h' })]"
    )
  ),
  e(
    'subgroups',
    'Note subgroups',
    group,
    'Attach a small inline group, such as a clef change, to a note.',
    'NoteSubGroup ClefNote',
    staff(
      "score.notes('C5/q, E5, G5, C6')",
      "notes[1].addModifier(factory.NoteSubGroup({ notes: [new VF.ClefNote('bass', 'small')] }), 0);"
    )
  ),
  e(
    'crescendo-note',
    'Rhythmic crescendo',
    group,
    'A crescendo can occupy musical time inside a voice.',
    'Crescendo',
    `${setup}
const crescendo = new VF.Crescendo({ duration: 'w' }).setLine(params.line);
const voice = factory.Voice().addTickables([crescendo]);
factory.System({ x: 30, y: 60, width: width - 60 }).addStave({ voices: [voice] });
factory.draw();`,
    [number('line', 'Line', 2, 0, 6)]
  ),
];
