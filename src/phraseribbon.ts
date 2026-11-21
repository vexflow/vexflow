// Bézier subdivision for engraving ribbon bounds and mixed dashed/solid slur strokes.
import { BoundingBox } from './boundingbox';
import type { RenderContext } from './rendercontext';

export interface RibbonPoint {
  x: number;
  y: number;
}

/** De Casteljau subdivision preserves both the original curve and its tangent at the join. */
function splitBezier(points: RibbonPoint[], t = 0.5): [RibbonPoint[], RibbonPoint[]] {
  const left = [points[0]],
    right = [points[points.length - 1]];
  let row = points;
  while (row.length > 1) {
    row = row.slice(1).map((p, i) => ({ x: (1 - t) * row[i].x + t * p.x, y: (1 - t) * row[i].y + t * p.y }));
    left.push(row[0]);
    right.unshift(row[row.length - 1]);
  }
  return [left, right];
}

/** Stroke the dashed opening and solid ending of a single fitted slur, including any system fragments. */
export function drawHalfDashedSlur(
  ctx: RenderContext,
  points: RibbonPoint[],
  [start, end]: [number, number] = [0, 1],
  dash: number[] = [4, 3]
): void {
  function stroke([p0, p1, p2, p3]: RibbonPoint[], pattern: number[]): void {
    ctx.setLineDash(pattern);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
    ctx.stroke();
  }
  ctx.save();
  try {
    if (end <= 0.5) stroke(points, dash);
    else if (start >= 0.5) stroke(points, []);
    else {
      const [opening, ending] = splitBezier(points, (0.5 - start) / (end - start));
      stroke(opening, dash);
      stroke(ending, []);
    }
  } finally {
    ctx.restore();
  }
}

/** Both boundaries run from the first attachment to the last. Never sample past a thin obstacle. */
export function ribbonParts(upper: RibbonPoint[], lower: RibbonPoint[], padding = 0): BoundingBox[] {
  const parts: BoundingBox[] = [];
  function divide(a: RibbonPoint[], b: RibbonPoint[], depth: number) {
    const hull = [...a, ...b];
    const xs = hull.map((p) => p.x),
      ys = hull.map((p) => p.y);
    const x = Math.min(...xs),
      y = Math.min(...ys),
      w = Math.max(...xs) - x;
    if (depth === 6 || w <= 6) {
      parts.push(new BoundingBox(x - padding, y - padding, w + 2 * padding, Math.max(...ys) - y + 2 * padding));
      return;
    }
    const [a1, a2] = splitBezier(a),
      [b1, b2] = splitBezier(b);
    divide(a1, b1, depth + 1);
    divide(a2, b2, depth + 1);
  }
  divide(upper, lower, 0);
  return parts;
}
