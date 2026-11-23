// Logical head identities and snapshots of the ink they occupy on screen and on a physical page.
import type { Bounds } from './boundingbox';
import type { EasyScoreComposition, EasyScoreStaveSpec } from './easyscore/composition';
import type { PlacedCompositionMark } from './easyscore/engraving';
import { Note } from './note';
import { StaveNote } from './stavenote';
import { TabNote } from './tabnote';

/** One drawn occurrence. Event-wide marks omit sourceHead. Systems, measures and pages start at one. */
export interface HeadOccurrence {
  sourceEvent: string;
  sourceHead?: number | string;
  /** Kind of ink. A cue or ossia preserves the identity of its underlying notehead, fret or mark. */
  role: 'notehead' | 'fret' | 'mark';
  reference?: 'cue' | 'ossia';
  projection: boolean;
  /** Physical display staff and original rhythmic staff, respectively. */
  staff: string;
  sourceStaff: string;
  measure: number;
  system: number;
  space: 'score' | 'page-mm';
  page?: number;
  bounds: Bounds;
}

/** Lookup never depends on SVG markup. Keep a source ID across formats and rebuild the screen snapshot after reflow. */
export class HeadOccurrenceIndex {
  private readonly byEvent = new Map<string, HeadOccurrence[]>();

  constructor(readonly occurrences: readonly HeadOccurrence[]) {
    for (const occurrence of occurrences) {
      const entries = this.byEvent.get(occurrence.sourceEvent) ?? [];
      entries.push(occurrence);
      this.byEvent.set(occurrence.sourceEvent, entries);
    }
  }

  /** Omitting the head returns the whole event, including drawings registered on the event itself. */
  get(event: string, head?: string | number): readonly HeadOccurrence[] {
    const entries = this.byEvent.get(event) ?? [];
    return head === undefined ? entries : entries.filter((entry) => entry.sourceHead === head);
  }

  /** The smallest enclosing ink box wins where a head overlaps an event-wide mark. */
  hitTest(x: number, y: number): HeadOccurrence | undefined {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
    let best: HeadOccurrence | undefined;
    for (const entry of this.occurrences) {
      const b = entry.bounds;
      if (x < b.x || y < b.y || x > b.x + b.w || y > b.y + b.h) continue;
      if (!best || b.w * b.h < best.bounds.w * best.bounds.h) best = entry;
    }
    return best;
  }
}

/** Independently built cue fragments and condensed parts retain the original event's staff-local address. */
interface SourceView {
  measureOffset?: number;
  players?: readonly [string, string];
}

/** Associate each native head and each engraving mark with its logical source head. */
function appendNoteInk(
  result: HeadOccurrence[],
  tick: Note,
  owner: Omit<HeadOccurrence, 'role' | 'bounds'>,
  marks: PlacedCompositionMark[]
): void {
  const identity = (index: number) => tick.headSource?.heads?.[index] ?? index;
  if (!tick.isRest() && tick.renderOptions.draw !== false && (tick instanceof StaveNote || tick instanceof TabNote)) {
    const tab = tick instanceof TabNote;
    const ink = tab ? tick.getFretInk() : tick.getHeadInk();
    ink.forEach((bounds, i) =>
      result.push({ ...owner, role: tab ? 'fret' : 'notehead', sourceHead: identity(i), bounds: { ...bounds } })
    );
  }
  for (const mark of marks)
    result.push({
      ...owner,
      role: 'mark',
      sourceHead: mark.head === undefined ? undefined : identity(mark.head),
      bounds: { ...mark.bounds },
    });
}

/** Collect geometry after native formatting, in the same logical units for Canvas and SVG. */
export function collectHeads(
  score: EasyScoreComposition,
  staves: readonly Pick<EasyScoreStaveSpec, 'id'>[],
  view: SourceView = {}
): HeadOccurrence[] {
  const result: HeadOccurrence[] = [];
  const systems = new Map(score.sheet.getRows().flatMap((row, i) => row.systems.map((s) => [s, i + 1] as const)));
  const hidden = score.sheet.getContinuousLayout()?.hidden;
  const marks = new Map<Note, PlacedCompositionMark[]>();
  for (const mark of score.sheet.getEngravingMarks()) {
    const owned = marks.get(mark.source) ?? [];
    owned.push(mark);
    marks.set(mark.source, owned);
  }
  score.notes.forEach((staffNotes, m) => {
    const system = systems.get(score.systems[m]);
    if (system === undefined) return;
    staffNotes.forEach((voices, j) =>
      voices.forEach((ticks, v) => {
        const condensed = staves[j].id === view.players?.[0];
        let event = 0;
        for (const tick of ticks) {
          if (tick.shouldIgnoreTicks()) continue;
          const eventIndex = event++;
          if (!(tick instanceof Note) || hidden?.has(tick)) continue;
          const meter = score.meterPositions?.get(tick);
          const sourceStaff = tick.headSource?.staff ?? meter?.staff ?? (condensed ? view.players![v] : staves[j].id);
          const measure = (meter?.measure ?? m + 1) + (view.measureOffset ?? 0);
          const stave = tick.getStave();
          const physical = stave ? score.staves[m].indexOf(stave) : -1;
          const address = JSON.stringify([
            sourceStaff,
            measure,
            meter?.voice ?? (condensed ? 0 : v),
            meter?.event ?? eventIndex,
          ]);
          const owner = {
            sourceEvent: tick.getSourceEventId(address),
            projection: tick.headSource?.projection ?? false,
            staff: staves[physical < 0 ? j : physical].id,
            sourceStaff,
            measure,
            system,
            space: 'score' as const,
          };
          appendNoteInk(result, tick, owner, marks.get(tick) ?? []);
        }
      })
    );
  });
  // A paired TAB figure has its own physical staff, but shares the notation staff's source event.
  const principal = new Map(result.filter((h) => !h.projection).map((h) => [h.sourceEvent, h.sourceStaff]));
  for (const head of result)
    if (head.projection) head.sourceStaff = principal.get(head.sourceEvent) ?? head.sourceStaff;
  return result;
}

/** Apply the same uniform scale and translation used to mount a score or inset on the final page. */
export function placedHead(head: HeadOccurrence, dx: number, dy: number, scale: number): HeadOccurrence {
  const { x, y, w, h } = head.bounds;
  return { ...head, bounds: { x: dx + x * scale, y: dy + y * scale, w: w * scale, h: h * scale } };
}
