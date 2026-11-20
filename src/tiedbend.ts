// Layout and painting for a string bend sustained into a second written TAB event.
import { BoundingBox } from './boundingbox';
import type { Element } from './element';
import type { TiedBend } from './guitargesture';
import { Note } from './note';
import type { RenderContext } from './rendercontext';

/** A single system's portion of the bend. Only the attack owns a rise and only the arrival owns a release. */
export interface TiedBendDrawing {
  envelope: TiedBend;
  left: number;
  right: number;
  targetY: number;
  stringY: number;
  peakX?: number;
  releaseX?: number;
  bounds: BoundingBox;
}

/** End of the space occupied by a written event. Leave ink clearance at the following fret or barline. */
function eventEnd(note: Note, space: number): number {
  const ticks = note.getVoice().getTickables();
  const following = ticks.slice(ticks.indexOf(note) + 1).find((t) => !t.shouldIgnoreTicks());
  return following instanceof Note
    ? following.getTieLeftX() - space * 0.25
    : note.checkStave().getNoteEndX() - space * 0.35;
}

/** Place each phase against its owner's duration, independently of how the available row widths change. */
export function layoutTiedBend(
  envelope: TiedBend,
  first: Note | undefined,
  last: Note | undefined,
  left: number,
  rowEnd: number,
  stringY: number,
  targetY: number,
  space: number,
  label: Element
): TiedBendDrawing {
  const phase = (start: number, end: number, ratio: readonly [number, number]) =>
    start + ((end - start) * ratio[0]) / ratio[1];
  const peakX = first ? phase(left, eventEnd(first, space), envelope.rise) : undefined;
  const arrival = last?.getTieRightX() ?? 0;
  const extent = last ? eventEnd(last, space) : rowEnd;
  const releaseX = last ? phase(arrival, extent, envelope.hold) : undefined;
  const right = last ? phase(arrival, extent, envelope.release) : rowEnd;
  const arrowWidth = space * 0.3;
  const minX = Math.min(left, peakX === undefined ? left : peakX - arrowWidth) - 1;
  const maxX = Math.max(right + (last ? arrowWidth : 0), (peakX ?? left) + arrowWidth) + 1;
  const box = new BoundingBox(minX, targetY - 1, maxX - minX, stringY - targetY + 2);
  if (peakX !== undefined) {
    const ink = label.getTextInk(peakX - label.getWidth() / 2, targetY - space * 0.3);
    box.mergeWith(new BoundingBox(ink.x, ink.y, ink.w, ink.h));
  }
  return { envelope, left, right, stringY, targetY, peakX, releaseX, bounds: box };
}

/** Mark the direction once at the rise or release. The continuation at the row edge is horizontal. */
function arrow(ctx: RenderContext, x: number, y: number, size: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - Math.abs(size), y + size);
  ctx.lineTo(x + Math.abs(size), y + size);
  ctx.closePath();
  ctx.fill();
}

/** The same curves, arrows and target label are used by SVG and Canvas. */
export function drawTiedBend(ctx: RenderContext, drawing: TiedBendDrawing, space: number, label: Element): void {
  const { left, right, stringY, targetY, peakX, releaseX } = drawing;
  ctx.openGroup('tied-bend');
  ctx.beginPath();
  if (peakX !== undefined) {
    ctx.moveTo(left, stringY);
    ctx.quadraticCurveTo(peakX, stringY, peakX, targetY);
  } else ctx.moveTo(left, targetY);
  ctx.lineTo(releaseX ?? right, targetY);
  if (releaseX !== undefined) ctx.quadraticCurveTo(right, targetY, right, stringY);
  ctx.stroke();
  if (peakX !== undefined) {
    arrow(ctx, peakX, targetY, space * 0.3);
    label.renderText(ctx, peakX - label.getWidth() / 2, targetY - space * 0.3);
  }
  if (releaseX !== undefined) arrow(ctx, right, stringY, -space * 0.3);
  ctx.closeGroup();
}
