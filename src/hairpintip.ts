// Geometry shared by measured hairpins and their open niente circles at system boundaries.
import { BoundingBox } from './boundingbox';
import { RenderContext } from './rendercontext';

/** Center and radius of the open circle in score coordinates. */
export interface NienteTip {
  x: number;
  y: number;
  radius: number;
}

/** Seat the circle just outside the closed vertex so the wedge cannot cross its interior. */
export function nienteTip(closedX: number, y: number, space: number, side: 'left' | 'right'): NienteTip {
  const radius = space * 0.35;
  return { x: closedX + (side === 'left' ? -radius : radius), y, radius };
}

/** Include the outer half of the circle's stroke. */
export function nienteBounds(tip: NienteTip, halfStroke: number): BoundingBox {
  const r = tip.radius + halfStroke;
  return new BoundingBox(tip.x - r, tip.y - r, 2 * r, 2 * r);
}

/** Stroke a separate path so the center remains transparent on any background. */
export function drawNienteTip(ctx: RenderContext, tip: NienteTip): void {
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, tip.radius, 0, 2 * Math.PI, false);
  ctx.closePath();
  ctx.stroke();
}
