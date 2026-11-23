// Measure event-owned alternate staves and traditional pedal signs before screen and page layout.
import { BoundingBox, type Bounds } from './boundingbox';
import { Clef } from './clef';
import type { SpanAnchor } from './continuousspan';
import type { PlacedCompositionMark } from './easyscore/engraving';
import { Element } from './element';
import { measureEngraving } from './engravinggeometry';
import { Factory } from './factory';
import { PedalMarking } from './pedalmarking';
import type { RenderContext } from './rendercontext';
import { Tables } from './tables';
import { RuntimeError } from './util';

/** A short EasyScore passage whose first attack follows an event in the main score. */
export interface InlineOssia {
  id: string;
  at: string;
  notes: string;
  clef?: string;
  label?: string;
  scale?: number;
  side?: 'above' | 'below';
  /** Group the short notes using native automatic beaming. */
  beam?: boolean;
}

/** A detail's intrinsic ink is measured once. Its host and the current row determine the translation. */
export interface AnchoredDetail {
  id: string;
  kind: 'ossia' | 'pedal-down' | 'pedal-up';
  anchor: SpanAnchor;
  above: boolean;
  ink: Bounds;
  /** Additional space above a shorter sign so both pedal glyphs share their native baseline. */
  topInset?: number;
  /** Horizontal origin of this drawing in the formatted system. */
  originX(): number;
  draw(context: RenderContext, x: number, y: number): void;
}

/** Engrave the alternative once, retaining the native notes, clef, accidentals, and beam for either backend. */
export function inlineOssia(spec: InlineOssia, anchor: SpanAnchor): AnchoredDetail {
  const scale = spec.scale ?? 0.65;
  if (!spec.notes?.trim() || !(scale > 0 && scale <= 1) || (spec.side && !['above', 'below'].includes(spec.side)))
    throw new RuntimeError('BadContinuousScore', 'An inline ossia needs notes, scale in (0, 1], and a valid side.');
  const factory = new Factory({
    renderer: { elementId: null, width: 1, height: 1 },
    stave: { space: anchor.note.checkStave().space(1) },
  });
  const score = factory.EasyScore({ throwOnError: true });
  const clef = spec.clef ?? anchor.note.checkStave().getClef();
  const notes = score.notes(spec.notes, { clef });
  const voice = score.voice(notes, { mode: 'soft' });
  const beams = spec.beam
    ? score.autoBeam(notes, { groups: [voice.getTicksUsed().clone().divide(Tables.RESOLUTION, 1)] })
    : [];
  const system = factory.System({ x: 0, y: 0 });
  const stave = system.addStave({ voices: [voice] }).addClef(clef);
  system.format();
  const label = new Element('Annotation').setText(spec.label ?? 'Ossia');
  const labelX = -label.getWidth() - stave.space(0.6);
  const labelY = stave.getYForLine(2);
  const top = stave.getYForLine(0) - 0.5;
  const total = new BoundingBox(-0.5, top, stave.getWidth() + 1, stave.getYForLine(4) + 0.5 - top);
  for (const box of [
    ...stave
      .getModifiers()
      .filter((m): m is Clef => m instanceof Clef)
      .map((clef) => clef.getInkBounds()),
    ...notes.flatMap((n) => measureEngraving(n).parts),
    ...beams.flatMap((b) => b.getStripBounds()),
    ...(label.getText() ? [label.getTextInk(labelX, labelY)] : []),
  ])
    total.mergeWith(new BoundingBox(box.x, box.y, box.w, box.h));
  const firstX = notes[0].getAbsoluteX() * scale;
  return {
    id: spec.id,
    kind: 'ossia',
    above: spec.side === 'above',
    anchor,
    ink: { x: total.x * scale, y: total.y * scale, w: total.w * scale, h: total.h * scale },
    originX: () => anchor.note.getAbsoluteX() - firstX,
    draw(ctx, x, y) {
      // SVG scaling is scoped to the inset group. Canvas uses the surrounding saved context.
      const group = ctx.openGroup('inline-ossia');
      try {
        if (group) group.setAttribute('transform', 'scale(' + scale + ')');
        else ctx.scale(scale, scale);
        system.setX(x / scale).setY(y / scale);
        factory.setContext(ctx).draw({ retain: true });
        label.renderText(ctx, x / scale + labelX, y / scale + labelY);
      } finally {
        ctx.closeGroup();
      }
    },
  };
}

/** Right-align release ink at the next timed attack or the end of the stave's music area. */
export function pedalSign(id: string, anchor: SpanAnchor, down: boolean): AnchoredDetail {
  const glyph = new Element('PedalMarking');
  const downY = glyph.setText(PedalMarking.GLYPHS.pedalDepress).getTextInk(0, 0).y;
  const upY = glyph.setText(PedalMarking.GLYPHS.pedalRelease).getTextInk(0, 0).y;
  glyph.setText(down ? PedalMarking.GLYPHS.pedalDepress : PedalMarking.GLYPHS.pedalRelease);
  const ink = glyph.getTextInk(0, 0);
  return {
    id,
    kind: down ? 'pedal-down' : 'pedal-up',
    above: false,
    anchor,
    ink,
    topInset: ink.y - Math.min(downY, upY),
    originX() {
      const note = anchor.note;
      if (down) return note.getAbsoluteX() - ink.x;
      const ticks = note.getVoice().getTickables();
      const next = ticks.slice(ticks.indexOf(note) + 1).find((tick) => !tick.shouldIgnoreTicks());
      return (next?.getAbsoluteX() ?? note.checkStave().getNoteEndX()) - ink.x - ink.w;
    },
    draw: (ctx, x, y) => glyph.renderText(ctx, x, y),
  };
}

/** Pack details that overlap horizontally; signs on different beats can use the same pedal baseline. */
export function placeDetails(
  details: AnchoredDetail[],
  row: number,
  left: number,
  right: number,
  envelopes: { top: number; bottom: number }[]
): { staff: number; top: number; mark: PlacedCompositionMark }[] {
  const placed: { staff: number; top: number; mark: PlacedCompositionMark }[] = [];
  for (const detail of details) {
    const { anchor, ink, above } = detail;
    const stave = anchor.note.checkStave();
    const x = Math.max(left, Math.min(detail.originX() + ink.x, right - ink.w));
    const gap = stave.space(0.5);
    const top = stave.getY();
    let edge = top + (above ? envelopes[anchor.staff].top : envelopes[anchor.staff].bottom);
    for (const prior of placed) {
      const b = prior.mark.bounds;
      if (prior.staff !== anchor.staff || b.x + b.w + gap <= x || x + ink.w + gap <= b.x) continue;
      edge = above ? Math.min(edge, b.y) : Math.max(edge, b.y + b.h);
    }
    const bounds = { x, y: above ? edge - gap - ink.h : edge + gap + (detail.topInset ?? 0), w: ink.w, h: ink.h };
    placed.push({
      staff: anchor.staff,
      top,
      mark: {
        id: detail.id,
        kind: detail.kind,
        source: anchor.note,
        row,
        bounds,
        draw: (ctx) => detail.draw(ctx, bounds.x - ink.x, bounds.y - ink.y),
      },
    });
  }
  return placed;
}
