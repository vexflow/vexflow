// Source-owned engraving callbacks shared by screen scores, extracted parts, and reference staves.
import type { Bounds } from '../boundingbox';
import type { CommitHook } from '../easyscore';
import { Note } from '../note';
import type { RenderContext } from '../rendercontext';
import type { SheetRow } from '../sheet';
import type { EasyScoreComposition } from './composition';

/** A custom drawing registered at final layout coordinates, in the same units as its source note. */
export interface CompositionMark {
  source: Note;
  bounds: Bounds;
  draw: (context: RenderContext) => void;
}

/** Preparation happens once per newly constructed event. Placement repeats for each new layout. */
export interface CompositionEngraving {
  prepareNote?: CommitHook;
  place?: (score: EasyScoreComposition, addMark: (mark: CompositionMark) => void) => void;
}

/** Measured custom ink, associated with its visible system after reflow. Row indices start at zero. */
export interface PlacedCompositionMark extends CompositionMark {
  row: number;
}

/** Resolve the caller's source notes against this view; each formatting pass replaces the previous marks. */
export function placeCompositionMarks(
  score: EasyScoreComposition,
  rows: readonly SheetRow[],
  place: NonNullable<CompositionEngraving['place']>
): PlacedCompositionMark[] {
  const owners = new Map<Note, number>();
  const rowOf = new Map(rows.flatMap((row, index) => row.systems.map((system) => [system, index] as const)));
  const hidden = score.sheet.getContinuousLayout()?.hidden;
  score.systems.forEach((system, measure) => {
    const row = rowOf.get(system);
    for (const voices of score.notes[measure])
      for (const notes of voices)
        for (const note of notes)
          if (note instanceof Note) owners.set(note, row === undefined || hidden?.has(note) ? -1 : row);
  });
  const marks: PlacedCompositionMark[] = [];
  place(score, ({ source, bounds, draw }) => {
    const row = owners.get(source);
    if (row === undefined) throw new RangeError('A custom mark must belong to a note in this composition.');
    if (row < 0) return;
    const { x, y, w, h } = bounds;
    if (![x, y, w, h].every(Number.isFinite) || w < 0 || h < 0)
      throw new RangeError('Expected finite custom ink bounds and nonnegative dimensions.');
    marks.push({ row, source, bounds: { x, y, w, h }, draw });
  });
  return marks;
}
