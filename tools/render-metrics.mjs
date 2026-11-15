// Geometry diagnostics for curated rendering fixtures, independent of fonts or backends.

/**
 * Check finite bounds, viewport overflow, and overlap within explicit comparison groups.
 * Boxes are { id, group, x, y, width, height }. Only boxes with the same group collide.
 * Use separate groups for voices that intentionally share space. This is a heuristic,
 * not an engraving judge: bounding rectangles include empty space around glyphs.
 */
export function analyzeLayout(boxes, viewport, tolerance = 0.5) {
  const invalid = [];
  const overflow = [];
  const collisions = [];
  const valid = [];
  for (const box of boxes) {
    if (![box.x, box.y, box.width, box.height].every(Number.isFinite) || box.width < 0 || box.height < 0) {
      invalid.push(box.id);
      continue;
    }
    valid.push(box);
    const excess = Math.max(
      0,
      -box.x,
      -box.y,
      box.x + box.width - viewport.width,
      box.y + box.height - viewport.height
    );
    if (excess > tolerance) overflow.push({ id: box.id, excess });
  }
  for (let i = 0; i < valid.length; i++) {
    const a = valid[i];
    if (a.group === undefined) continue;
    for (let j = i + 1; j < valid.length; j++) {
      const b = valid[j];
      if (a.group !== b.group) continue;
      const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      if (width > tolerance && height > tolerance) collisions.push({ ids: [a.id, b.id], area: width * height });
    }
  }
  return { invalid, overflow, collisions };
}

/** Compare decoded RGBA pixels; PNG metadata and compression do not affect results. */
export function comparePixels(a, b, channelTolerance = 0) {
  if (a.length !== b.length || a.length % 4) throw new Error('RGBA buffers must have equal lengths.');
  let changed = 0;
  let maxDelta = 0;
  const diff = new Uint8ClampedArray(a.length);
  for (let i = 0; i < a.length; i += 4) {
    let delta = 0;
    for (let c = 0; c < 4; c++) delta = Math.max(delta, Math.abs(a[i + c] - b[i + c]));
    maxDelta = Math.max(maxDelta, delta);
    const differs = delta > channelTolerance;
    if (differs) changed++;
    diff.set(differs ? [224, 45, 87, 255] : [245, 247, 250, 255], i);
  }
  return { changed, ratio: a.length ? changed / (a.length / 4) : 0, maxDelta, diff };
}
