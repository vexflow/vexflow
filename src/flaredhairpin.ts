// Draw smooth flared hairpins, including the portion visible on a single system.
import { RenderContext } from './rendercontext';

/** Position on the centerline. Progress runs from zero at the closed tip to one at the loud end. */
interface HairpinPoint {
  x: number;
  y: number;
  progress: number;
}

/** The aperture grows with the square of progress. Each fragment is an exact section of the same parabola. */
export function drawFlaredHairpin(
  ctx: RenderContext,
  start: HairpinPoint,
  end: HairpinPoint,
  halfHeight: number
): void {
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  // For t² on [a, b], the quadratic Bézier ordinates are a², ab and b².
  const left = halfHeight * start.progress ** 2;
  const control = halfHeight * start.progress * end.progress;
  const right = halfHeight * end.progress ** 2;
  ctx.beginPath();
  for (const side of [-1, 1]) {
    ctx.moveTo(start.x, start.y + side * left);
    ctx.quadraticCurveTo(midX, midY + side * control, end.x, end.y + side * right);
  }
  ctx.stroke();
}
