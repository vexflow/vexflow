// Validate manual dash patterns and plan bounded paths for every rendering backend.
import { RuntimeError } from './util';

/** Limit the number of path commands for one line, including zero-length gaps. */
const MAX_DASH_SEGMENTS = 16_384;

/** A zero-length dash or gap is valid if the repeating pattern advances overall. */
export function validateDashPattern(pattern: number[]): void {
  if (!Array.isArray(pattern)) throw new RuntimeError('BadDashPattern', 'Expected an array of dash lengths.');
  let advances = false;
  for (const length of pattern) {
    if (!Number.isFinite(length) || length < 0) {
      throw new RuntimeError('BadDashPattern', 'Dash lengths must be finite and nonnegative.');
    }
    if (length > 0) advances = true;
  }
  if (!advances) throw new RuntimeError('BadDashPattern', 'A dash pattern must contain a positive length.');
}

/** Plan distances before modifying the context so an over-budget line leaves no partial path. */
export function dashStops(lineLength: number, pattern: number[]): number[] {
  validateDashPattern(pattern);
  const stops: number[] = [];
  let distance = 0;
  while (distance < lineLength) {
    if (stops.length === MAX_DASH_SEGMENTS) {
      throw new RuntimeError('BadDashPattern', `A dashed line may use at most ${MAX_DASH_SEGMENTS} segments.`);
    }
    distance = Math.min(lineLength, distance + pattern[stops.length % pattern.length]);
    stops.push(distance);
  }
  return stops;
}
