// Fit every fragment of a TAB curve to the same side of its string, using the actual fret text on each row.
import type { Bounds } from './boundingbox';
import { fitSpan, SpanFragment } from './continuousspan';
import { fitTabSlur } from './slurfit';

// The two candidates start the same distance from the string on opposite sides.
export function oppositeTabCurve(curve: SpanFragment): SpanFragment {
  const shift = (curve.above ? 1 : -1) * curve.space * 0.6;
  return { ...curve, above: !curve.above, y1: curve.y1 + shift, y2: curve.y2 + shift };
}

/** Evaluate both sides from the same string anchors. Prefer the shallower clear fit, retaining the default on a tie. */
export function fitTabCurve(
  fragments: SpanFragment[],
  obstacles: Bounds[][],
  automatic: boolean,
  ends?: [Bounds, Bounds]
): SpanFragment[] {
  function candidate(reverse: boolean) {
    const missed: number[] = [];
    let lift = 0;
    const curves = fragments.map((fragment, i) => {
      const curve = reverse ? oppositeTabCurve(fragment) : { ...fragment };
      const clear = ends ? fitTabSlur(curve, obstacles[i], ...ends) : fitSpan(curve, obstacles[i]);
      if (!clear) missed.push(i);
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
