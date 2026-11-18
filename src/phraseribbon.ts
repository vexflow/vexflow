// Small conservative collision bounds for a filled quadratic or cubic engraving ribbon.
import { BoundingBox } from './boundingbox';

export interface RibbonPoint {
  x: number;
  y: number;
}

/** Split a Bézier at its midpoint. The control hull of each half encloses that half of the ink. */
function halves(points: RibbonPoint[]): [RibbonPoint[], RibbonPoint[]] {
  const left = [points[0]],
    right = [points[points.length - 1]];
  let row = points;
  while (row.length > 1) {
    row = row.slice(1).map((p, i) => ({ x: (p.x + row[i].x) / 2, y: (p.y + row[i].y) / 2 }));
    left.push(row[0]);
    right.unshift(row[row.length - 1]);
  }
  return [left, right];
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
    const [a1, a2] = halves(a),
      [b1, b2] = halves(b);
    divide(a1, b1, depth + 1);
    divide(a2, b2, depth + 1);
  }
  divide(upper, lower, 0);
  return parts;
}
