// Measure chord ink at adjacent barlines after the native formatters have placed their notes.
import { Annotation } from './annotation';
import { ChordSymbol } from './chordsymbol';
import type { System } from './system';

/** EasyScore lead-sheet chords are ordinary annotations with native phrase-lane placement. */
export const leadChordAnnotations = new WeakSet<Annotation>();

/** Absolute ink edges on one side of one staff. */
interface Edges {
  left: number;
  right: number;
  clearance: number;
}

/** Ignore other annotations, including lyrics that share a chord's note. */
function chordEdges(system: System): Map<number, Edges> {
  const lanes = new Map<number, Edges>();
  for (const voice of system.getVoices()) {
    for (const note of voice.getTickables()) {
      for (const mark of note.getModifiers()) {
        let left: number, right: number;
        let above = true;
        if (mark instanceof ChordSymbol) {
          ({ left, right } = mark.getHorizontalInk());
          above = mark.getVertical() === ChordSymbol.VerticalJustify.TOP;
        } else if (mark instanceof Annotation && leadChordAnnotations.has(mark)) {
          const ink = mark.getTextInk(mark.computeX().x, 0);
          left = ink.x;
          right = ink.x + ink.w;
          above = mark.getVerticalJustification() === Annotation.VerticalJustify.TOP;
        } else continue;
        if (!(right > left)) continue;
        const owner = mark.checkAttachedNote();
        if (owner.renderOptions.draw === false) continue;
        const stave = owner.checkStave();
        const staff = system.getStaves().indexOf(stave);
        if (staff < 0) continue;
        const key = staff * 2 + Number(above);
        const edges = lanes.get(key);
        if (edges) {
          edges.left = Math.min(edges.left, left);
          edges.right = Math.max(edges.right, right);
        } else lanes.set(key, { left, right, clearance: stave.space(0.5) });
      }
    }
  }
  return lanes;
}

/** Increase only the space inside a bar that still collides with the following bar on this row.
 * Each reservation moves the next measure while preserving the preceding note anchors. Repacking can
 * spend some of the row's justification surplus or move the boundary to a break, where it costs zero.
 */
export function reserveChordSpacing(rows: readonly { systems: System[] }[], padding: Map<System, number>): boolean {
  let changed = false;
  for (const { systems } of rows) {
    if (systems.length < 2) continue;
    let prior = chordEdges(systems[0]);
    for (let i = 1; i < systems.length; i++) {
      const next = chordEdges(systems[i]);
      let missing = 0;
      for (const [lane, first] of prior) {
        const second = next.get(lane);
        if (second)
          missing = Math.max(missing, first.right + Math.max(first.clearance, second.clearance) - second.left);
      }
      if (missing > 0.01) {
        const previous = systems[i - 1];
        padding.set(previous, (padding.get(previous) ?? 0) + Math.ceil(missing));
        changed = true;
      }
      prior = next;
    }
  }
  return changed;
}
