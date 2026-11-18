// Pre-draw geometry of formatted VF5 notation. All coordinates are unscaled renderer pixels.
import { Accidental } from './accidental';
import { Annotation } from './annotation';
import { Articulation } from './articulation';
import { Beam } from './beam';
import { BoundingBox, Bounds } from './boundingbox';
import { Curve } from './curve';
import { Dot } from './dot';
import { Element } from './element';
import { GraceNote } from './gracenote';
import { GraceNoteGroup } from './gracenotegroup';
import { Ornament } from './ornament';
import { StaveNote } from './stavenote';
import { StaveTie } from './stavetie';
import { Stem } from './stem';
import { Tuplet } from './tuplet';
import { RuntimeError } from './util';

/** Enclosing rectangles can be conservative for strokes and curves. */
export interface EngravingShape {
  parts: Bounds[];
  anchors: Record<string, { x: number; y: number }>;
}

/** Codes are stable. Source IDs come from the native element or its author. */
export interface GeometryDiagnostic {
  code: 'UnsupportedGeometry' | 'UnformattedGeometry' | 'InvalidGeometry' | 'LayoutOverflow';
  phase: 'measure';
  severity: 'error' | 'warning';
  sourceId: string;
}

/** Return undefined from an extension adapter to delegate to the built-in participants. */
export interface GeometryOptions {
  extension?: (element: Element) => EngravingShape | undefined;
  paddingPx?: number;
  viewport?: Bounds;
}

/** Union and layout bounds are absent for empty or invalid geometry. Check diagnostics for partial results. */
export interface EngravingGeometry extends EngravingShape {
  ink?: BoundingBox;
  layout?: BoundingBox;
  diagnostics: GeometryDiagnostic[];
}

/** Symmetric padding also encloses the stroke around a sloping centerline. */
function inflate(box: Bounds, amount: number): BoundingBox {
  return new BoundingBox(box.x - amount, box.y - amount, box.w + 2 * amount, box.h + 2 * amount);
}

function rectangle(x1: number, y1: number, x2: number, y2: number): BoundingBox {
  return new BoundingBox(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
}

/** A note owns heads, flag, stem, ledgers and modifiers. A beam owns the filled strips. */
function noteShape(note: StaveNote): EngravingShape {
  if (note.renderOptions.draw === false) return { parts: [], anchors: {} };
  note.getBeam()?.postFormat();
  const parts = note.getHeadInk();
  const anchors: EngravingShape['anchors'] = {};
  parts.forEach((box, i) => {
    anchors[`head${i}`] = { x: box.x + box.w / 2, y: note.getYs()[i] };
  });
  const segment = note.getStemSegment();
  if (segment) {
    const { x, baseY, tipY } = segment;
    parts.push(new BoundingBox(x - Stem.WIDTH / 2, Math.min(baseY, tipY), Stem.WIDTH, Math.abs(tipY - baseY)));
    anchors.stemBase = { x, y: baseY };
    anchors.stemTip = { x, y: tipY };
  }
  const flag = note.getFlagInk();
  if (flag) parts.push(flag);
  const lineWidth = note.getLedgerLineStyle().lineWidth ?? note.checkStave().getDefaultLedgerLineStyle().lineWidth ?? 1;
  for (const { x, y, width } of note.getLedgerLines())
    parts.push(new BoundingBox(x, y - lineWidth / 2, width, lineWidth));
  if (note instanceof GraceNote) {
    const slash = note.getSlash();
    if (slash) parts.push(inflate(rectangle(slash.x1, slash.y1, slash.x2, slash.y2), note.getFontScale() / 2));
  }
  return { parts, anchors };
}

/** Measure after formatting and assigning staves. Never calls draw or touches a renderer. */
export function measureEngraving(element: Element, options: GeometryOptions = {}): EngravingGeometry {
  const diagnostics: GeometryDiagnostic[] = [];
  const report = (owner: Element, code: GeometryDiagnostic['code']) => {
    diagnostics.push({
      code,
      phase: 'measure',
      severity: code === 'LayoutOverflow' ? 'warning' : 'error',
      sourceId: owner.getAttribute('id'),
    });
  };
  function collect(owner: Element): EngravingShape {
    const shape: EngravingShape = { parts: [], anchors: {} };
    const children = (elements: Element[]) => {
      for (const child of elements) shape.parts.push(...collect(child).parts);
    };
    try {
      const kind = Object.getPrototypeOf(owner).constructor;
      const custom = options.extension?.(owner);
      if (custom) Object.assign(shape, custom);
      else if (kind === StaveNote || kind === GraceNote) {
        const note = owner as StaveNote;
        Object.assign(shape, noteShape(note));
        if (note.renderOptions.draw !== false) children(note.getModifiers());
      } else if (kind === GraceNoteGroup) children((owner as GraceNoteGroup).getLayoutElements());
      else if (kind === Articulation) {
        const box = (owner as Articulation).getInkBounds();
        shape.parts.push(box);
        shape.anchors.center = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
      } else if (kind === Accidental || kind === Dot) {
        shape.parts.push((owner as Accidental | Dot).getInkBounds());
      } else if (kind === Tuplet || kind === Ornament) {
        shape.parts.push(owner.getBoundingBox());
      } else if (kind === Beam) {
        const beam = owner as Beam;
        shape.parts.push(beam.getBoundingBox());
        for (const [i, note] of beam.getNotes().entries())
          shape.anchors[`stem${i}`] = { x: note.getStemX(), y: note.getStemExtents().topY };
      } else if (kind === Curve) {
        const curve = owner as Curve;
        shape.parts.push(inflate(curve.getBoundingBox(), (curve.getStyle().lineWidth ?? 1) / 2));
        shape.anchors = curve.getAnchors();
      } else if (kind === Annotation) {
        const mark = owner as Annotation;
        const { x } = mark.computeX();
        const { y } = mark.computeY();
        shape.parts.push(mark.getTextInk(x, y));
        shape.anchors.baseline = { x: x + mark.getXShift(), y: y + mark.getYShift() };
      } else if (kind === StaveTie && !owner.text) shape.parts.push((owner as StaveTie).getRibbonBounds());
      else report(owner, 'UnsupportedGeometry');
      const finiteBox = (b: Bounds) => [b.x, b.y, b.w, b.h].every(Number.isFinite) && b.w >= 0 && b.h >= 0;
      if (
        !shape.parts.every(finiteBox) ||
        !Object.values(shape.anchors).every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
      ) {
        report(owner, 'InvalidGeometry');
        return { parts: [], anchors: {} };
      }
    } catch (error) {
      if (!(error instanceof RuntimeError)) throw error;
      report(owner, 'UnformattedGeometry');
    }
    return shape;
  }

  const shape = collect(element);
  const padding = options.paddingPx ?? 0;
  if (!Number.isFinite(padding) || padding < 0) throw new RangeError('Expected finite nonnegative layout padding.');
  let ink: BoundingBox | undefined;
  for (const part of shape.parts) {
    const box = new BoundingBox(part.x, part.y, part.w, part.h);
    ink = ink ? ink.mergeWith(box) : box;
  }
  const layout = ink && inflate(ink, padding);
  if (ink && element instanceof GraceNoteGroup) {
    shape.anchors.left = { x: ink.x, y: element.checkAttachedNote().getYs()[element.checkIndex()] };
    shape.anchors.right = { x: ink.x + ink.w, y: shape.anchors.left.y };
  }
  const v = options.viewport;
  if (
    v &&
    layout &&
    (layout.x < v.x || layout.y < v.y || layout.x + layout.w > v.x + v.w || layout.y + layout.h > v.y + v.h)
  )
    report(element, 'LayoutOverflow');
  return { ...shape, ink, layout, diagnostics };
}
