// Fit continuous pitched slurs to their selected chord heads and to the ink around both ends.
import { Beam } from './beam';
import type { Bounds } from './boundingbox';
import { fitSpan, ResolvedSpan, SpanFragment } from './continuousspan';
import { Element } from './element';
import { measureEngraving } from './engravinggeometry';
import type { Note } from './note';
import type { RibbonPoint as Point } from './phraseribbon';
import { StaveNote } from './stavenote';
import { StaveTie } from './stavetie';
import { TabNote } from './tabnote';

/** Measure small pieces of curves and beams so the space under a grace slur or sloping beam stays usable. */
export function slurInk(notes: (TabNote | StaveNote)[], exclude?: (owner: Element) => boolean): Bounds[] {
  const beams = new Set<Beam>();
  const options = {
    extension(owner: Element) {
      if (exclude?.(owner)) return { parts: [], anchors: {} };
      if (owner instanceof StaveTie && !owner.text) return { parts: owner.getRouteParts(), anchors: {} };
      if (owner instanceof Beam) return { parts: owner.getStripBounds(), anchors: {} };
      if (owner instanceof TabNote) return { parts: owner.getFretInk(), anchors: {} };
    },
  };
  const parts = notes.flatMap((note) => {
    const beam = note.getBeam();
    if (beam) beams.add(beam);
    if (note instanceof TabNote)
      return [...note.getFretInk(), ...note.getModifiers().flatMap((mark) => measureEngraving(mark, options).parts)];
    return measureEngraving(note, options).parts;
  });
  for (const beam of beams) parts.push(...beam.getStripBounds());
  return parts;
}

/** Keep a requested chord head even if another pitch is farther outside. Automatic chords use their outside head. */
export function slurHead(note: Note, index: number | undefined, above: boolean): number {
  if (index !== undefined) return index;
  const ys = note.getYs();
  return ys.indexOf(above ? Math.min(...ys) : Math.max(...ys));
}

/** Try the normal attachment first, then the corner and crown of the same head, staying on the authored side. */
function attachments(note: StaveNote, head: number | undefined, start: boolean, f: SpanFragment): Point[] {
  const box = note.getHeadInk()[slurHead(note, head, f.above)];
  const sign = f.above ? -1 : 1;
  const tip = f.above ? box.y : box.y + box.h;
  const x = box.x + (start ? box.w : 0);
  const corner = { x, y: tip + sign * f.space * 0.25 };
  const options = [corner];
  if (head === undefined) {
    const stemSide = note.hasStem() && note.getStemDirection() === -sign;
    options.unshift({
      x: start ? note.getTieRightX() : note.getTieLeftX(),
      y: stemSide ? note.getStemExtents().topY + sign * f.space * 0.4 : tip,
    });
  }
  for (const lift of [0.5, 1, 1.75, 2.5]) {
    options.push({ x: box.x + box.w / 2, y: tip + sign * f.space * lift });
    options.push({ x: x + (start ? 1 : -1) * f.space * 0.3, y: tip + sign * f.space * lift });
  }
  return options;
}

/** A continuation carries its source pitch and clears nearby ink where it enters or leaves the row. */
function openEnd(x: number, y: number, f: SpanFragment, ink: Bounds[]): Point {
  const near = ink.filter((b) => b.x < x + f.space && b.x + b.w > x - f.space);
  const height = f.above
    ? Math.min(y, ...near.map((b) => b.y - f.space * 0.4))
    : Math.max(y, ...near.map((b) => b.y + b.h + f.space * 0.4));
  return { x, y: height };
}

// First preserve the continuation pitch. A busy row can require a higher opening to clear its stems.
function continuationEnds(x: number, y: number, f: SpanFragment, ink: Bounds[]): Point[] {
  const local = openEnd(x, y, f, ink);
  const within = ink.filter((b) => b.x + b.w > f.x1 && b.x < f.x2);
  const outer = f.above
    ? Math.min(local.y, ...within.map((b) => b.y - f.space * 0.6))
    : Math.max(local.y, ...within.map((b) => b.y + b.h + f.space * 0.6));
  return [
    { x, y: local.y },
    { x, y: outer },
  ];
}

/** Build attachments for each closed or continuing end at the selected pitch. */
export function fitPitchedSlur(f: SpanFragment, span: ResolvedSpan, ink: Bounds[]): boolean {
  const start = f.part === 'single' || f.part === 'first';
  const end = f.part === 'single' || f.part === 'last';
  const left = start
    ? attachments(span.first.note as StaveNote, span.spec.fromHead, true, f)
    : continuationEnds(f.x1, f.y1, f, ink);
  const right = end
    ? attachments(span.last.note as StaveNote, span.spec.toHead, false, f)
    : continuationEnds(f.x2, f.y2, f, ink);
  return fitSlurEndpoints(f, left, right, ink);
}

/** Keep each closed TAB endpoint beside its digit. If crowded, try its outside corner and upper or lower edge. */
export function fitTabSlur(f: SpanFragment, ink: Bounds[], start: Bounds, end: Bounds): boolean {
  const sign = f.above ? -1 : 1;
  function ends(point: Point, box: Bounds, opening: boolean) {
    const outside = (f.above ? box.y : box.y + box.h) + sign * f.space * 0.3;
    const edge = opening ? box.x + box.w : box.x;
    return [point, { x: edge, y: outside }, { x: box.x + box.w / 2, y: outside + sign * f.space * 0.25 }];
  }
  const a = { x: f.x1, y: f.y1 },
    b = { x: f.x2, y: f.y2 };
  const left = f.part === 'single' || f.part === 'first' ? ends(a, start, true) : [a];
  const right = f.part === 'single' || f.part === 'last' ? ends(b, end, false) : [b];
  return fitSlurEndpoints(f, left, right, ink);
}

/** Search independent endpoints by increasing total displacement. Keep the first fitted ribbon if none clears. */
function fitSlurEndpoints(f: SpanFragment, left: Point[], right: Point[], ink: Bounds[]): boolean {
  const gap = f.space * 0.1;
  const xmin = Math.min(...left.map((p) => p.x)),
    xmax = Math.max(...right.map((p) => p.x));
  const obstacles = ink
    .filter((b) => b.x + b.w >= xmin - gap && b.x <= xmax + gap)
    .map((b) => ({ x: b.x - gap, y: b.y - gap, w: b.w + 2 * gap, h: b.h + 2 * gap }));
  // Raising the interior cannot rescue an endpoint already inside a fixed mark.
  const blocked = (p: Point) => obstacles.some((b) => b.x < p.x && p.x < b.x + b.w && b.y < p.y && p.y < b.y + b.h);
  let firstFit: SpanFragment | undefined;
  for (let total = 0; total < left.length + right.length - 1; total++) {
    for (let i = Math.max(0, total - right.length + 1); i <= Math.min(total, left.length - 1); i++) {
      const a = left[i],
        b = right[total - i];
      if (a.x >= b.x) continue;
      const trial = { ...f, x1: a.x, y1: a.y, x2: b.x, y2: b.y };
      if (firstFit && (blocked(a) || blocked(b))) continue;
      if (fitSpan(trial, obstacles)) {
        Object.assign(f, trial);
        return true;
      }
      firstFit ??= trial;
    }
  }
  if (firstFit) Object.assign(f, firstFit);
  return false;
}
