// Project declarative EasyScore music into an independent printed score or part.
import type { ContinuousBoundary } from './continuouslayout';
import type { EasyScoreComposition, EasyScoreCompositionSpec, EasyScoreStaveSpec } from './easyscore';
import { Note } from './note';
import { condenseStaves, PublicationCondense } from './publicationcondense';
import type { CueTransposition } from './publicationcue';
import { Tickable } from './tickable';
import { RuntimeError } from './util';

/** A small written-pitch reference staff over source measures. Cues do not change the player's rest. */
export interface PublicationRegion {
  kind: 'cue' | 'ossia';
  staff: string;
  measure: number;
  /** Last source measure of an ossia, inclusive. Defaults to the starting measure. */
  endMeasure?: number;
  label: string;
  scale?: number;
  /** Written interval applied to the quoted pitches and their key signature. */
  transpose?: CueTransposition;
}

/** All measure references are one-based. A page turn follows its named measure. */
export interface PublicationView {
  staves?: readonly string[];
  /** Engrave two source players on one conductor staff. */
  condense?: PublicationCondense;
  systemBreaks?: readonly number[];
  pageBreaks?: readonly number[];
  preferredTurns?: readonly number[];
  forbiddenTurns?: readonly number[];
  regions?: readonly PublicationRegion[];
}

export function invalidPage(message: string): never {
  throw new RuntimeError('BadPublication', message);
}

/** Validate view references before a new rendering replaces an existing one. */
export function checkView(source: EasyScoreCompositionSpec, view: PublicationView): void {
  const staffIds = new Set(source.staves.map((s) => s.id));
  const count = source.staves[0]?.measures.length ?? 0;
  if (!count) invalidPage('Expected at least one measure.');
  const validMeasure = (n: number) => Number.isInteger(n) && n >= 1 && n <= count;
  if (view.condense?.measures) {
    const [first, last] = view.condense.measures;
    if (!validMeasure(first) || !validMeasure(last) || last < first) invalidPage('Invalid condensed passage.');
  }
  for (const values of [view.systemBreaks, view.pageBreaks, view.preferredTurns, view.forbiddenTurns])
    if (values?.some((n) => !validMeasure(n))) invalidPage('Break or turn outside the score.');
  if (
    view.staves &&
    (!view.staves.length ||
      new Set(view.staves).size !== view.staves.length ||
      view.staves.some((id) => !staffIds.has(id)))
  )
    invalidPage('Expected distinct source staff IDs.');
  for (const region of view.regions ?? []) {
    if (
      region.transpose !== undefined &&
      (region.kind !== 'cue' ||
        !Number.isSafeInteger(region.transpose?.semitones) ||
        !Number.isSafeInteger(region.transpose?.steps))
    )
      invalidPage('A transposed cue needs integer semitones and diatonic steps.');
    const scale = region.scale ?? 0.7;
    if (
      !validMeasure(region.measure) ||
      (region.endMeasure !== undefined &&
        (region.kind !== 'ossia' || !validMeasure(region.endMeasure) || region.endMeasure < region.measure)) ||
      !staffIds.has(region.staff) ||
      !region.label.trim() ||
      !['cue', 'ossia'].includes(region.kind) ||
      !Number.isFinite(scale) ||
      scale <= 0 ||
      scale > 1
    )
      invalidPage('Expected a labeled cue or ossia on a source staff and measure with scale in (0, 1].');
  }
  for (const staff of source.staves)
    for (const measure of staff.measures)
      for (const voice of measure.voices)
        if (typeof voice.notes !== 'string' && voice.notes.some((n) => n instanceof Tickable))
          invalidPage('Use declarative events for independently rendered publication views.');
}

/** Track only declared IDs for relationships. The score's native lookup also handles IDs in EasyScore strings. */
export function projectScore(
  source: EasyScoreCompositionSpec,
  view: PublicationView,
  width: number,
  reference?: EasyScoreComposition,
  omitted?: (id: string, measures: number[]) => void
): EasyScoreCompositionSpec {
  const selected = new Set(view.staves ?? view.condense?.players ?? source.staves.map((s) => s.id));
  const staves = source.staves
    .filter((s) => selected.has(s.id))
    .map((s) => (view.staves || view.condense ? homeStaff(s, selected) : s));
  const printedStaves = view.condense ? condenseStaves(staves, view.condense) : staves;
  const printedIds = new Set(printedStaves.map((s) => s.id));
  // Follow rhythmic ownership when a note is displayed on a different staff.
  const owners = new Map<Tickable, { staff: string; measure: number }>();
  reference?.notes.forEach((parts, m) =>
    parts.forEach((voices, j) => {
      for (const event of voices.flat()) owners.set(event, { staff: source.staves[j].id, measure: m + 1 });
    })
  );
  const keep = (a?: string, b?: string, id?: string) => {
    if (!reference) return true;
    const ends = [a, b].flatMap((name) => (name ? [owners.get(reference.getNote(name))!] : []));
    const included = ends.filter((e) => selected.has(e.staff));
    if (included.length && included.length < ends.length)
      omitted?.(
        id ?? a ?? b ?? '',
        ends.map((e) => e.measure)
      );
    return ends.length === included.length;
  };
  const original = source.continuous ?? {};
  const boundaries = new Map<number, ContinuousBoundary>((original.boundaries ?? []).map((b) => [b.measure, { ...b }]));
  if (boundaries.size !== (original.boundaries?.length ?? 0)) invalidPage('Expected unique source boundary measures.');
  function boundary(n: number) {
    let b = boundaries.get(n);
    if (!b) {
      b = { measure: n };
      boundaries.set(n, b);
    }
    return b;
  }
  for (const n of [...(view.systemBreaks ?? []), ...(view.pageBreaks ?? [])]) boundary(n).breakBefore = 'force';
  if (view.condense?.measures) {
    const [first, last] = view.condense.measures;
    boundary(first).breakBefore = 'force';
    if (last < source.staves[0].measures.length) boundary(last + 1).breakBefore = 'force';
  }
  // Cued rests must remain individually addressable even when their neighbours form a multi-measure rest.
  for (const region of view.regions ?? [])
    for (let m = region.measure; m <= (region.endMeasure ?? region.measure); m++) boundary(m).keepRest = true;
  return {
    ...source,
    staves: printedStaves,
    sheet: { ...source.sheet, x: 0, y: 0, rowGap: 150, width },
    spans: source.spans?.filter((s) => keep(s.from, s.to)),
    continuous: {
      ...original,
      boundaries: [...boundaries.values()],
      spans: original.spans?.filter((s) => keep(s.from, s.to, s.id)),
      tuplets: original.tuplets?.filter((t) => keep(t.members[0], t.members[t.members.length - 1], t.id)),
      splitChords: original.splitChords?.filter((c) => keep(c.upper, c.lower, c.id)),
      groups:
        !view.staves && !view.condense
          ? original.groups
          : original.groups?.flatMap((g) => {
              const start = source.staves.findIndex((s) => s.id === g.first),
                end = source.staves.findIndex((s) => s.id === g.last);
              const members = source.staves.slice(start, end + 1).filter((s) => printedIds.has(s.id));
              return members.length >= 2 ? [{ ...g, first: members[0].id, last: members[members.length - 1].id }] : [];
            }),
    },
  };
}

/** Return a cross-staff event to its rhythmic staff when its display staff is absent in this view. */
function homeStaff(staff: EasyScoreStaveSpec, selected: ReadonlySet<string>): EasyScoreStaveSpec {
  return {
    ...staff,
    measures: staff.measures.map((m) => ({
      ...m,
      voices: m.voices.map((v) => ({
        ...v,
        notes:
          typeof v.notes === 'string'
            ? v.notes
            : v.notes.map((n) => {
                if (typeof n !== 'object' || !('stave' in n) || !n.stave || selected.has(n.stave)) return n;
                if ('note' in n) {
                  const note = { ...n.note };
                  delete note.clef;
                  return { ...n, stave: staff.id, note };
                }
                return { ...n, stave: staff.id };
              }),
      })),
    })),
  };
}

/** Carry written clef, key and meter into a reference fragment, including preceding inline changes. */
export function insetStaff(staff: EasyScoreStaveSpec, measure: number, endMeasure = measure): EasyScoreStaveSpec {
  const state = { clef: staff.clef, key: staff.key, time: staff.time, showTimeSignature: staff.showTimeSignature };
  for (const m of staff.measures.slice(0, measure - 1)) {
    state.clef = m.clef ?? state.clef;
    state.key = m.key ?? state.key;
    state.time = m.time ?? state.time;
    state.showTimeSignature = m.showTimeSignature ?? state.showTimeSignature;
    for (const v of m.voices.slice(0, 1))
      if (typeof v.notes !== 'string')
        for (const item of v.notes) if (typeof item === 'object' && 'change' in item) Object.assign(state, item.change);
  }
  return homeStaff(
    {
      ...staff,
      ...state,
      name: undefined,
      shortName: undefined,
      measures: staff.measures.slice(measure - 1, endMeasure),
    },
    new Set([staff.id])
  );
}

/** Conservative playable turn: every timed event in every performing voice is a rest in the preceding measure. */
export function restingMeasure(score: EasyScoreComposition, number: number): boolean {
  const notes = score.notes[number - 1].flat(2).filter((n) => !n.shouldIgnoreTicks());
  return notes.length > 0 && notes.every((n) => n instanceof Note && n.isRest());
}
