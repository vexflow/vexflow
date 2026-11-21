// Fit every fragment of a TAB tie to the same side of its string, using the actual fret text on each row.
import type { Bounds } from './boundingbox';
import { fitSpan, SpanFragment } from './continuousspan';

/** Evaluate both sides from the same string anchors. Prefer the shallower clear fit, retaining the default on a tie. */
export function fitTabTie(fragments: SpanFragment[], obstacles: Bounds[][], automatic: boolean): SpanFragment[] {
  function candidate(reverse: boolean) {
    const missed: number[] = [];
    let lift = 0;
    const curves = fragments.map((fragment, i) => {
      const curve = { ...fragment };
      if (reverse) {
        curve.above = !curve.above;
        // The authored endpoints sit 0.3 staff spaces on either side of their string.
        const shift = (curve.above ? -1 : 1) * curve.space * 0.6;
        curve.y1 += shift;
        curve.y2 += shift;
      }
      if (!fitSpan(curve, obstacles[i])) missed.push(i);
      lift += curve.rise!;
      return curve;
    });
    return { curves, missed, lift };
  }
  let best = candidate(false);
  if (automatic && obstacles.some((ink) => ink.length)) {
    const other = candidate(true);
    if (
      other.missed.length < best.missed.length ||
      (other.missed.length === best.missed.length && other.lift < best.lift)
    )
      best = other;
  }
  best.curves.forEach((curve, i) => Object.assign(fragments[i], curve));
  return best.missed.map((i) => fragments[i]);
}
