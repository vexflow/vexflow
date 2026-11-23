// A renderer-independent reading order and hit index for a formatted EasyScore composition.
import { Accidental } from './accidental';
import { BoundingBox, Bounds } from './boundingbox';
import type { EasyScoreComposition, EasyScoreStaveSpec } from './easyscore/composition';
import { GeometryDiagnostic, measureEngraving } from './engravinggeometry';
import { Fraction } from './fraction';
import { nienteBounds } from './hairpintip';
import { collectHeads, HeadOccurrenceIndex } from './headoccurrences';
import { StaveNote } from './stavenote';
import { Tables } from './tables';
import { TabNote } from './tabnote';
import { TextNote } from './textnote';
import { RuntimeError } from './util';

/** Rational times are in whole notes. Measure and voice numbers start at one. */
export interface ScoreReadingEvent {
  id: string;
  source?: string;
  /** Authored logical attack ID, when several visual projections share the event. */
  sourceEvent?: string;
  staff: string;
  measure: number;
  voice: number;
  onset: string;
  duration: string;
  label: string;
}

/** Layout coordinates belong to one snapshot. A wrapped relationship can have several regions. */
export interface ScoreHitRegion extends Bounds {
  id: string;
  kind: 'event' | 'span';
  source?: string;
  /** Targeted strings for a technique span. */
  strings?: readonly number[];
  /** Row index of a continuous span fragment, counted from zero. */
  row?: number;
}

/** Names for common explicitly written signs. Custom notation identities can describe other conventions. */
const signs: Record<string, string> = {
  '#': 'sharp',
  '##': 'double sharp',
  b: 'flat',
  bb: 'double flat',
  n: 'natural',
  '+': 'quarter sharp',
  d: 'quarter flat',
  o: 'sori',
  k: 'koron',
};
const lengths: Record<string, string> = {
  '1/1': 'whole',
  '1/2': 'half',
  '1/4': 'quarter',
  '1/8': 'eighth',
  '1/16': 'sixteenth',
  '3/4': 'dotted half',
  '3/8': 'dotted quarter',
  '3/16': 'dotted eighth',
};

/** Speak the explicit head accidental when present, otherwise use the authored key spelling. */
function spokenPitch(key: string, sign?: Accidental): string {
  const [name, octave] = key.split('/');
  const accidental = sign?.type ?? name.slice(1).toLowerCase();
  return [name[0].toUpperCase(), signs[accidental] ?? accidental, octave].filter(Boolean).join(' ');
}

/** Describe written attacks. Unpitched instruments are named in place of their display keys. */
function describe(note: StaveNote | TabNote | TextNote): string {
  if (note instanceof TextNote) return note.getText();
  if (note.isRest()) return '';
  const marks = note.notation.map((n) => n.label);
  if (note instanceof TabNote) {
    const positions = note.getPositions().map((p) => 'string ' + p.str + ' fret ' + p.fret);
    return [...positions, ...note.notation.filter((n) => n.kind !== 'tuning').map((n) => n.label)].join(', ');
  }
  // A dead string in a mixed chord has a display position but no sounding pitch.
  const unpitched = note.notation.filter((entry) => entry.kind === 'unpitched');
  if (unpitched.some((entry) => entry.index === undefined)) return marks.join(', ');
  const accidentals = note.getModifiers().filter((m): m is Accidental => m instanceof Accidental);
  return [
    ...note.getKeys().flatMap((key, i) =>
      unpitched.some((entry) => entry.index === i)
        ? []
        : [
            spokenPitch(
              key,
              accidentals.find((a) => a.getIndex() === i)
            ),
          ]
    ),
    ...marks,
  ].join(', ');
}

/** Get the painted note envelope or the string/fret target on TAB. Hidden events remain in reading order. */
function noteRegion(note: StaveNote | TabNote | TextNote, diagnostics: GeometryDiagnostic[]): Bounds | undefined {
  if (note instanceof StaveNote || note instanceof TextNote) {
    const measured = measureEngraving(note);
    diagnostics.push(...measured.diagnostics);
    return measured.ink;
  }
  const ys = note.getYs();
  const half = note.checkStave().getSpacingBetweenLines() / 2;
  return {
    x: note.getAbsoluteX() - note.getWidth() / 2,
    y: Math.min(...ys) - half,
    w: note.getWidth(),
    h: Math.max(...ys) - Math.min(...ys) + 2 * half,
  };
}

/** Build after layout; rebuild after reflow and retain selection by authored ID across snapshots. */
export class ScoreNavigation {
  readonly events: readonly ScoreReadingEvent[];
  readonly heads: HeadOccurrenceIndex;
  readonly regions: readonly ScoreHitRegion[];
  readonly diagnostics: readonly GeometryDiagnostic[];

  constructor(
    score: EasyScoreComposition,
    staves: readonly Pick<EasyScoreStaveSpec, 'id' | 'name'>[],
    sources: Readonly<Record<string, string>> = {}
  ) {
    const regions: ScoreHitRegion[] = [],
      diagnostics: GeometryDiagnostic[] = [];
    const events: ScoreReadingEvent[] = [];
    const sourceFor = (id: string) => (Object.prototype.hasOwnProperty.call(sources, id) ? sources[id] : undefined);
    const seen = new Set<string>();
    const layout = score.sheet.getContinuousLayout();
    const techniqueLabels = new Map<string, string[]>();
    for (const fragment of layout?.fragments ?? []) {
      if (!fragment.strings) continue;
      const strings = (fragment.strings.length === 1 ? 'string ' : 'strings ') + fragment.strings.join(', ');
      if (fragment.kind !== 'palmMute' && !fragment.bend) continue;
      const amount = fragment.bend?.envelope.semitones;
      const labels =
        amount !== undefined
          ? [`Bend ${amount} semitone${amount === 1 ? '' : 's'} on `, 'Sustain and release tied ']
          : ['Begin palm mute on ', 'Last palm-muted attack on '];
      for (const [id, text] of [
        [fragment.from, labels[0]],
        [fragment.to, labels[1]],
      ]) {
        if (id) techniqueLabels.set(id, [...(techniqueLabels.get(id) ?? []), text + strings]);
      }
    }
    for (const [measure, staffNotes] of score.notes.entries()) {
      if (staffNotes.length !== staves.length)
        throw new RuntimeError('BadArguments', 'Pass the staves in composition order.');
      const ordered: { time: Fraction; event: ScoreReadingEvent }[] = [];
      for (const [index, voices] of staffNotes.entries()) {
        const staff = staves[index];
        for (const [voice, notes] of voices.entries()) {
          const clock = new Fraction(0, 1);
          for (const note of notes) {
            if (note.shouldIgnoreTicks()) continue;
            const time = clock.clone();
            clock.add(note.getTicks());
            if (!(
              note instanceof StaveNote ||
              note instanceof TabNote ||
              (note instanceof TextNote && note.getDirectionAnchor())
            ))
              continue;
            const id = note.getAttribute('id');
            if (seen.has(id)) throw new RuntimeError('DuplicateID', 'Duplicate score event: ' + id);
            seen.add(id);
            const onset = time.clone().divide(Tables.RESOLUTION).simplify().toString();
            const duration = note.getTicks().clone().divide(Tables.RESOLUTION).simplify().toString();
            const length = lengths[duration] ?? duration + ' of a whole';
            const label = [
              `Measure ${measure + 1}`,
              staff.name || staff.id,
              `voice ${voice + 1}`,
              describe(note),
              note instanceof TextNote ? length + ' direction' : length + (note.isRest() ? ' rest' : ' note'),
              ...(techniqueLabels.get(id) ?? []),
            ]
              .filter(Boolean)
              .join(', ');
            if (!note.headSource?.projection)
              ordered.push({
                time,
                event: {
                  id,
                  source: sourceFor(id),
                  ...(note.headSource && { sourceEvent: note.headSource.event }),
                  staff: staff.id,
                  measure: measure + 1,
                  voice: voice + 1,
                  onset,
                  duration,
                  label,
                },
              });
            if (layout?.hidden.has(note)) continue;
            const box = noteRegion(note, diagnostics);
            if (box) regions.push({ id, source: sourceFor(id), kind: 'event', x: box.x, y: box.y, w: box.w, h: box.h });
          }
        }
      }
      ordered.sort((a, b) => (a.time.equals(b.time) ? 0 : a.time.lessThan(b.time) ? -1 : 1));
      events.push(...ordered.map((entry) => entry.event));
    }
    for (const fragment of layout?.fragments ?? []) {
      if (seen.has(fragment.id)) throw new RuntimeError('DuplicateID', 'Span shares a score event ID: ' + fragment.id);
      // A conservative target includes the curve and enough space to select a thin stroke.
      const pad = Math.max(fragment.space, Math.abs(fragment.rise ?? 0));
      const bounds = new BoundingBox(
        Math.min(fragment.x1, fragment.x2),
        Math.min(fragment.y1, fragment.y2) - pad,
        Math.abs(fragment.x2 - fragment.x1),
        Math.abs(fragment.y2 - fragment.y1) + 2 * pad
      );
      if (fragment.bend) bounds.mergeWith(fragment.bend.bounds);
      if (fragment.nienteTip) bounds.mergeWith(nienteBounds(fragment.nienteTip, 0.5));
      regions.push({
        id: fragment.id,
        row: fragment.row,
        ...(fragment.strings && { strings: [...fragment.strings] }),
        source: sourceFor(fragment.id),
        kind: 'span',
        ...bounds,
      });
    }
    this.heads = new HeadOccurrenceIndex(collectHeads(score, staves));
    this.events = events;
    this.regions = regions;
    this.diagnostics = diagnostics;
  }

  /** Points use score coordinates. Event targets precede spanners; prefer the smallest overlapping target. */
  hitTest(x: number, y: number): ScoreHitRegion | undefined {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
    let best: ScoreHitRegion | undefined;
    for (const r of this.regions) {
      if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) continue;
      if (
        !best ||
        (best.kind === 'span' && r.kind === 'event') ||
        (best.kind === r.kind && r.w * r.h < best.w * best.h)
      )
        best = r;
    }
    return best;
  }
}
