// Higher-level formatting, invisible timing, and unusual rhythmic glyphs.
import { renderEasyScoreComposition } from '../../easyscore-composition.mjs';
import { createEasyScoreExample } from '../../easyscore-example.mjs';
import { renderEasyScoreFamilies } from '../../easyscore-families.mjs';
import { createEasyScoreReferencesExample } from '../../easyscore-references-example.mjs';
import { renderEasyScoreStructure } from '../../easyscore-structure.mjs';
import { renderEasyScoreRhythm } from '../../easyscore-rhythm.mjs';
import { example as e, number, select, setup, staff, text } from './helpers.mjs';

const group = 'Layout & composition';
export const layout = [
  e(
    'easyscore-first-score',
    'EasyScore: first score',
    group,
    'Create notes, an annotation, a tie, a voice, and a system through EasyScore.',
    'EasyScore Annotation StaveTie Voice System',
    `// The function body is shared with the tested user-guide example.
(${createEasyScoreExample.toString()})(VF, { elementId: 'score', width, height }, ink);`,
    [],
    'EasyScore.create() validates before construction. Helpers return native VexFlow objects. This is the first API slice; other notation families remain available through Factory.'
  ),
  e(
    'easyscore-references',
    'EasyScore: references & extensions',
    group,
    'Resolve named notes, adopt native extensions, and click parsed notes to select their source.',
    'EasyScore getElement getNote getSource adopt Annotation StaveTie Curve',
    `// Click either C4 note to select its notation in this editor.
(${createEasyScoreReferencesExample.toString()})(VF, { elementId: 'score', width, height }, ink);`,
    [],
    'IDs are local to each score. Adopted notes and drawables share the normal retained lifecycle. Native objects have no notation source. Inspector selection requires one unescaped matching literal; computed or ambiguous input is shown without guessing an editor location.'
  ),
  e(
    'easyscore-families',
    'EasyScore: notes & modifiers',
    group,
    'Typed notes, percussion heads, native modifiers, and grace groups through one score.',
    'EasyScore StaveNote Accidental Articulation Ornament Tremolo Vibrato Parenthesis Dot ChordSymbol GraceNoteGroup NoteSubGroup Stroke TextNote',
    `(${renderEasyScoreFamilies.toString()})(VF, { elementId: 'score', width, height }, params.family, ink);`,
    [select('family', 'Family', 'modifiers', ['modifiers', 'accidentals', 'text', 'grace', 'percussion', 'sequence'])],
    'Typed notes preserve native fields and head codes. Grace/subnote groups own their children. Set note duration dots explicitly; a Dot modifier alone changes only the appearance.'
  ),
  e(
    'easyscore-rhythm',
    'EasyScore: rhythm & relationships',
    group,
    'Odd-meter voices, nested tuplets, owned spans, partial endpoints, and timed dynamics.',
    'EasyScore Beam Tuplet StaveTie Curve StaveHairpin StaveLine TextBracket VibratoBracket PedalMarking TextDynamics Crescendo',
    `(${renderEasyScoreRhythm.toString()})(VF, { elementId: 'score', width, height }, params.family, ink);`,
    [
      select('family', 'Family', 'odd-meter', [
        'odd-meter',
        'tuplets',
        'ties',
        'curves',
        'hairpins',
        'lines',
        'brackets',
        'pedal',
        'partial-spans',
        'dynamics',
      ]),
    ],
    'Beam groups use exact Fractions and preserve explicit stems by default. Create tuplets before voices. Spans draw through the score; row-break segments remain explicit.'
  ),
  e(
    'easyscore-structure', 'EasyScore: tablature & staff structure', group,
    'Tablature, bends, grace groups, inline changes, rests, repeats, and staff markings.',
    'EasyScore TabNote GraceTabNote TabSlide TabTie Bend Stave Clef KeySignature TimeSignature MultiMeasureRest RepeatNote GlyphNote',
    `(${renderEasyScoreStructure.toString()})(VF, { elementId: 'score', width, height }, params.family, ink);`,
    [select('family', 'Family', 'tab', ['tab', 'grace-tab', 'rest', 'inline', 'repeat', 'labels', 'endings'])],
    'Staff modifiers draw through their stave. Inline clefs and signatures change appearance; update note options explicitly. Tab tuning stays a separate native utility.'
  ),
  e(
    'easyscore-composition', 'EasyScore: responsive composition', group,
    'A grand staff with pickup, opposing voices, triplets, changing meter, key-aware accidentals, and inline state.',
    'EasyScore compose Sheet System Voice Fraction Accidental',
    `(${renderEasyScoreComposition.toString()})(VF, { elementId: 'score', width: params.sheetWidth, height }, params.spacing, ink);`,
    [number('sheetWidth', 'Width', 640, 320, 1000, 20), select('spacing', 'Spacing', 'engraving', ['engraving', 'proportional'])],
    'Each measure is a native System. Tuplets precede voices; all voices share the actual span. Signatures repeat at every measure here, so any measure can begin a row. Use Sheet.getRows() to inspect overflow.'
  ),
  e(
    'proportional-spacing',
    'Proportional spacing',
    group,
    'Compare engraving spacing with an exact musical-time grid. Equal durations occupy equal widths.',
    'Formatter Voice TickContext System Tuplet',
    `${setup}
const ctx = factory.getContext();
// Auto width preserves the chosen scale. Resize the surface to fit both rows.
const systems = [];
const rows = [];
['engraving', 'proportional'].forEach((mode, row) => {
  const notes = score.notes('C5/16, D5, E5, F5, G5/8, A5, B5/q, C6', { stem: 'up' });
  score.beam(notes.slice(0, 4));
  score.beam(notes.slice(4, 6));
  const voices = [score.voice(notes)];
  if (params.voices === 'two') {
    voices.push(score.voice(score.notes('C4/q, E4, G4, E4', { stem: 'down' })));
  }
  const spacing = mode === 'proportional'
    ? { mode: 'proportional', pixelsPerQuarter: params.scale }
    : undefined;
  const system = factory.System({
    x: 30, y: 45 + row * 155,
    ...(mode === 'engraving' ? { width: params.scale * 4 + 100 } : {}),
    details: { spacing },
  });
  system.addStave({ voices }).addClef('treble').addTimeSignature('4/4');
  system.format();
  systems.push(system);
  rows.push(notes);
});
ctx.resize(Math.max(width, ...systems.map(system => system.getWidth() + 60)), 360);
factory.draw();
ctx.setFont('sans-serif', 10);
ctx.fillText('Default engraving', 30, 20);
ctx.fillText('Strict proportional spacing', 30, 175);
// Guides mark quarter-note onsets, plus the end of the four-beat span.
const origin = rows[1][0].getAbsoluteX();
ctx.save().setStrokeStyle('#b6c4c0').setLineWidth(0.5);
for (let beat = 0; beat <= 4; beat++) {
  const x = origin + beat * params.scale;
  ctx.beginPath().moveTo(x, 210).lineTo(x, 310).stroke();
}
ctx.restore();`,
    [number('scale', 'Pixels per quarter', 140, 120, 180, 10), select('voices', 'Voices', 'two', ['one', 'two'])],
    'Set spacing on Formatter, or System.details. Omit pixelsPerQuarter to fit a supplied width. Crowded notation reports the minimum scale and width instead of moving notes off the grid.'
  ),
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
