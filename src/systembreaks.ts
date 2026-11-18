// Select continuous-score rows from measured boundary costs and hard musical breaks.

/** One drawable measure or one compressed rest, with its extra width at a row boundary. */
export interface BreakUnit {
  width: number;
  start: number;
  end: number;
  breakBefore?: 'force' | 'keep';
}

/** Both modes use identical reservations. An inseparable oversized group occupies a row by itself. */
export function chooseSystemBreaks(
  units: BreakUnit[],
  width: number,
  gap: number,
  indent: (first: number) => number,
  mode: 'balanced' | 'greedy'
): number[][] {
  const n = units.length;
  const next = Array<number>(n);
  const costs = Array<number>(n + 1).fill(Infinity);
  const clipped = Array<number>(n + 1).fill(Infinity);
  costs[n] = 0;
  clipped[n] = 0;
  for (let i = n - 1; i >= 0; i--) {
    let body = indent(i) + units[i].start;
    let found = false;
    for (let j = i; j < n; j++) {
      if (j > i && units[j].breakBefore === 'force') break;
      body += units[j].width + (j > i ? gap : 0);
      if (units[j + 1]?.breakBefore === 'keep') continue;
      const spare = width - body - units[j].end;
      if (spare < 0 && found) {
        // A long courtesy ending can disappear if the following measure joins this row.
        if (body >= width) break;
        continue;
      }
      const overflow = Math.max(0, -spare);
      // Squared unused width discourages a very short final row. Breaking costs keep tiny rows rare.
      const cost =
        costs[j + 1] + width * width * 0.12 + (spare >= 0 ? spare * spare : width * width + 16 * overflow * overflow);
      const clippedWidth = overflow + clipped[j + 1];
      const improves = clippedWidth < clipped[i] || (clippedWidth === clipped[i] && cost <= costs[i]);
      if (!found || (mode === 'greedy' ? spare >= 0 : improves)) {
        clipped[i] = clippedWidth;
        next[i] = j + 1;
        costs[i] = cost;
      }
      found = true;
      if (body >= width) break;
    }
  }
  const rows: number[][] = [];
  for (let i = 0; i < n; i = next[i]) rows.push(Array.from({ length: next[i] - i }, (_, k) => i + k));
  return rows;
}
