// Keep a native beam's complete membership while fitting independent beam strips at system breaks.
import { Beam, BeamContinuation } from './beam';
import { BoundingBox } from './boundingbox';
import type { SpanAnchor, SpanFragment } from './continuousspan';
import type { EasyScoreComposition } from './easyscore/composition';
import { StaveNote } from './stavenote';
import { RuntimeError } from './util';

type Member = { note: StaveNote; measure: number };
type Piece = { beam: Beam; edges: BeamContinuation };

/** Resolve an inclusive interval of the same voice on the same staff, in score order. */
export function beamMembers(score: EasyScoreComposition, from: SpanAnchor, to: SpanAnchor): Member[] {
  const voice = score.notes[from.measure][from.staff].findIndex((group) => group.includes(from.note));
  if (voice < 0 || from.staff !== to.staff || !score.notes[to.measure][to.staff][voice]?.includes(to.note))
    throw new RuntimeError('BadContinuousScore', 'Beam anchors must belong to the same staff and voice.');
  const members: Member[] = [];
  for (let i = from.measure; i <= to.measure; i++) {
    const notes = score.notes[i][from.staff][voice];
    if (!notes?.length) throw new RuntimeError('BadContinuousScore', 'The beam voice is missing a measure.');
    const start = i === from.measure ? notes.indexOf(from.note) : 0;
    const end = i === to.measure ? notes.indexOf(to.note) + 1 : notes.length;
    for (const note of notes.slice(start, end)) {
      if (note.shouldIgnoreTicks()) continue;
      if (
        !(note instanceof StaveNote) ||
        note.isRest() ||
        !note.getBeamCount() ||
        note.getStave() !== score.staves[i][from.staff]
      )
        throw new RuntimeError('BadContinuousScore', 'Expected consecutive beamable pitched notes on one staff.');
      members.push({ note, measure: i });
    }
  }
  if (members.length < 2) throw new RuntimeError('BadContinuousScore', 'A beam needs at least two attacks.');
  const directions = members.filter(({ note }) => !note.isAutoStem()).map(({ note }) => note.getStemDirection());
  if (new Set(directions).size > 1) throw new RuntimeError('BadContinuousScore', 'Beam stems must agree in direction.');
  return members;
}

/** The source beam owns each note for the lifetime of the composition. Only the row pieces draw. */
export class ContinuousBeam extends Beam {
  // Reuse pieces for a given pair of cut points so a retained resize preserves IDs and registry entries.
  private readonly cache = new Map<string, Piece>();
  private placed: Beam[] = [];
  private complete = false;

  constructor(private readonly members: Member[]) {
    const notes = members.map(({ note }) => note);
    const fixed = notes.find((n) => !n.isAutoStem());
    if (fixed) for (const n of notes) if (n.isAutoStem()) n.setStemDirection(fixed.getStemDirection(), true);
    super(notes, !fixed);
  }

  /** An individual measure has incomplete coordinates. The row layout initiates each native fit. */
  override postFormat(): void {}

  /** Release the previous row fits before the next pass through the score. */
  clearRows(): void {
    this.placed.forEach((piece) => piece.resetLayout());
    this.placed = [];
    this.complete = false;
  }

  /** Expose the completed geometry after every measure has its final position. */
  finishRows(): void {
    this.complete = true;
  }

  /** Return final draw geometry to callers after all participating measures have settled. */
  override getStripBounds(): BoundingBox[] {
    return this.complete ? this.placed.flatMap((piece) => piece.getStripBounds()) : [];
  }

  override getBoundingBox(): BoundingBox {
    const bounds = new BoundingBox(0, 0, 0, 0);
    if (!this.complete || !this.placed.length) return bounds;
    return this.placed.map((b) => b.getBoundingBox()).reduce((a, b) => a.mergeWith(b));
  }

  /** A possible break can leave one note on a row. Its actual neighbor determines the continuing levels. */
  private fitPiece(first: number, last: number): Piece {
    const start = this.members.findIndex((m) => m.measure >= first);
    const members = this.members.slice(start).filter((m) => m.measure <= last);
    const end = start + members.length;
    const key = start + '-' + end;
    let piece = this.cache.get(key);
    const left = members[0].note,
      right = members[members.length - 1].note;
    if (!piece) {
      const before = this.members[start - 1]?.note,
        after = this.members[end]?.note;
      // Both ends of a system cut share one position in the logical fan, halfway between the two attacks.
      const progressAtCut = (index: number) => (index - 0.5) / (this.members.length - 1);
      const edges: BeamContinuation = {
        ...(before && { left: { levels: before.getBeamCount(), x: 0, progress: progressAtCut(start) } }),
        ...(after && { right: { levels: after.getBeamCount(), x: 0, progress: progressAtCut(end) } }),
      };
      const notes = members.map((m) => m.note);
      piece = { beam: new Beam(notes, false, edges), edges };
      // The local renderer uses the same stems, while getBeam() continues to expose the full source group.
      notes.forEach((n) => n.setBeam(this));
      this.cache.set(key, piece);
    }
    if (piece.edges.left) piece.edges.left.x = left.getStemX() - left.checkStave().space(1.25);
    if (piece.edges.right) piece.edges.right.x = right.checkStave().getNoteEndX() - 2;
    Object.assign(piece.beam.renderOptions, { feathered: undefined }, this.renderOptions);
    piece.beam.postFormat();
    return piece;
  }

  /** Fit the stems before the row measures its vertical ink. The caller releases this provisional fit. */
  measureRow(first: number, last: number): Beam {
    return this.fitPiece(first, last).beam;
  }

  /** Fit the final positions and report the same outer edge that will be drawn for this fragment. */
  placeRow(first: number, last: number, row: number, id: string): SpanFragment {
    const { beam, edges } = this.fitPiece(first, last);
    this.placed.push(beam);
    const notes = beam.getNotes(),
      firstStem = notes[0].getStemX();
    const x1 = edges.left?.x ?? firstStem,
      x2 = edges.right?.x ?? notes[notes.length - 1].getStemX();
    const y = (x: number) => beam.getSlopeY(x, firstStem, beam.getBeamYToDraw(), beam.slope);
    return {
      kind: 'beam',
      id,
      row,
      x1,
      x2,
      y1: y(x1),
      y2: y(x2),
      above: beam.getStemDirection() > 0,
      space: notes[0].checkStave().space(1),
      part: edges.left ? (edges.right ? 'middle' : 'last') : edges.right ? 'first' : 'single',
      progress: [0, 1],
    };
  }

  override draw(): void {
    const ctx = this.checkContext();
    this.placed.forEach((piece) => piece.setContext(ctx).drawWithStyle());
    this.setRendered();
  }
}
