// Choose page turns on measured system boundaries. Dimensions are in millimeters.
export interface PrintableSystem {
  measures: number[];
  height: number;
  /** Millimeters of compatible ink envelopes shared with the preceding system on the same page. */
  overlapBefore?: number;
  restAtEnd: boolean;
}

export interface PageConstraints {
  firstHeight: number;
  laterHeight: number;
  gap: number;
  maxExtraGap: number;
  justifyLast: boolean;
  part: boolean;
  forceBefore: ReadonlySet<number>;
  preferAfter: ReadonlySet<number>;
  forbidAfter: ReadonlySet<number>;
}

/** System indices and offsets from the top of the page's music area. */
export interface PageBreak {
  first: number;
  end: number;
  offsets: number[];
  overflow: number;
  forbiddenTurn: boolean;
}

/** Minimize forbidden turns, then pages, then turn difficulty and unused space. */
export function paginate(systems: PrintableSystem[], rules: PageConstraints): PageBreak[] {
  const count = systems.length;
  const costs = new Array<{ conflicts: number; pages: number; penalty: number }>(count + 1);
  const ends = new Array<number>(count);
  costs[count] = { conflicts: 0, pages: 0, penalty: 0 };
  for (let first = count - 1; first >= 0; first--) {
    const capacity = first === 0 ? rules.firstHeight : rules.laterHeight;
    let used = 0;
    for (let i = first; i < count; i++) {
      const row = systems[i];
      if (i > first && rules.forceBefore.has(row.measures[0])) break;
      used += row.height + (i === first ? 0 : rules.gap - (row.overlapBefore ?? 0));
      if (i > first && used > capacity + 1e-7) break;
      const after = row.measures[row.measures.length - 1];
      const turn = i + 1 < count;
      const rest = costs[i + 1];
      const conflicts = rest.conflicts + Number(turn && rules.forbidAfter.has(after));
      const pages = rest.pages + 1;
      const difficulty = !turn || rules.preferAfter.has(after) ? 0 : rules.part && !row.restAtEnd ? 4 : 1;
      const unused = Math.max(0, capacity - used) / capacity;
      const penalty = rest.penalty + difficulty + (turn ? unused * unused : 0);
      const best = costs[first];
      if (
        !best ||
        conflicts < best.conflicts ||
        (conflicts === best.conflicts && (pages < best.pages || (pages === best.pages && penalty <= best.penalty)))
      ) {
        costs[first] = { conflicts, pages, penalty };
        ends[first] = i + 1;
      }
    }
  }

  const pages: PageBreak[] = [];
  for (let first = 0; first < count; first = ends[first]) {
    const end = ends[first];
    const rows = systems.slice(first, end);
    const capacity = first === 0 ? rules.firstHeight : rules.laterHeight;
    const spare =
      capacity -
      rows.reduce((h, r, i) => h + r.height - (i ? (r.overlapBefore ?? 0) : 0), 0) -
      rules.gap * (rows.length - 1);
    const extra =
      rows.length > 1 && (end < count || rules.justifyLast)
        ? Math.min(rules.maxExtraGap, Math.max(0, spare) / (rows.length - 1))
        : 0;
    let y = 0;
    const offsets = rows.map((row, i) => {
      if (i) y -= row.overlapBefore ?? 0;
      const start = y;
      y += row.height + rules.gap + extra;
      return start;
    });
    const measures = rows[rows.length - 1].measures;
    pages.push({
      first,
      end,
      offsets,
      overflow: Math.max(0, -spare),
      forbiddenTurn: end < count && rules.forbidAfter.has(measures[measures.length - 1]),
    });
  }
  return pages;
}
