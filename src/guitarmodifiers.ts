// Engrave structured guitar actions using native note modifiers on either backend.
import { Annotation } from './annotation';
import { Bend } from './bend';
import type { GuitarStroke } from './guitargesture';
import { Metrics } from './metrics';
import type { Note } from './note';
import { Stroke } from './strokes';
import { isTabNote } from './typeguard';
import { RuntimeError } from './util';

/** Both arrow conventions describe the same order of physical strings. */
function printedStroke(stroke: GuitarStroke): number {
  const down = (stroke.direction === 'bass-to-treble') !== (stroke.arrows === 'hand');
  if (stroke.roll) return down ? Stroke.Type.RASGUEADO_DOWN : Stroke.Type.RASGUEADO_UP;
  return down ? Stroke.Type.BRUSH_DOWN : Stroke.Type.BRUSH_UP;
}

/** Attach native modifiers once, after a new note has initialized its heads or string positions. */
export function attachGuitarGestures(note: Note): void {
  for (const entry of note.notation) {
    const { stroke, bend } = entry;
    if (stroke) {
      note.addModifier(new Stroke(printedStroke(stroke), { allVoices: false }), 0);
      note.addModifier(
        new Annotation(stroke.finger + (stroke.golpe ? ' + golpe' : ''))
          .setFont(Metrics.getFontInfo('Annotation.guitarStroke'))
          .setVerticalJustification(Annotation.VerticalJustify.TOP),
        0
      );
    }
    if (bend && isTabNote(note)) {
      const index = note.getPositions().findIndex((p) => p.str === bend.string);
      if (index < 0) throw new RuntimeError('BadArguments', 'The bent string must occur in the chord.');
      note.addModifier(Bend.timed(bend), index);
    }
  }
}
