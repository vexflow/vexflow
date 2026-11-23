// Row-dependent notation for a responsive EasyScore composition. Source measures and notes keep their identity.
import { Accidental } from './accidental';
import { Annotation } from './annotation';
import type { Bounds } from './boundingbox';
import { reserveChordSpacing } from './chordspacing';
import { Clef } from './clef';
import { beamMembers, ContinuousBeam } from './continuousbeam';
import {
  continuationPitch,
  ContinuousSpan,
  curveParts,
  drawSpan,
  fitSpan,
  glissandoY,
  ResolvedSpan,
  spanAbove,
  SpanAnchor,
  SpanFragment,
  spanLabel,
} from './continuousspan';
import type { EasyScoreComposition, EasyScoreCompositionSpec, EasyScoreStaffState } from './easyscore/composition';
import type { InteriorBar } from './easyscore/independentmeter';
import type { SystemTextLanes } from './easyscore/textlanes';
import { Element } from './element';
import { measureEngraving } from './engravinggeometry';
import { Fraction } from './fraction';
import { Glyphs } from './glyphs';
import { bendAmount, copyTiedBend } from './guitargesture';
import { nienteTip } from './hairpintip';
import { InkProfile } from './inkprofile';
import { KeySignature } from './keysignature';
import { MultiMeasureRest } from './multimeasurerest';
import { Note } from './note';
import { RenderContext } from './rendercontext';
import type { SheetOptions, SheetRow } from './sheet';
import { fitPitchedSlur, fitTabSlur, slurHead, slurInk } from './slurfit';
import { beamStave, linkSplitStem, splitStemFor } from './splitstem';
import type { Stave } from './stave';
import { Barline, BarlineType } from './stavebarline';
import { StaveConnector } from './staveconnector';
import { StaveModifier, StaveModifierPosition as Position } from './stavemodifier';
import { StaveNote } from './stavenote';
import { Stem } from './stem';
import type { System } from './system';
import { BreakUnit, chooseSystemBreaks } from './systembreaks';
import { fitTabCurve, oppositeTabCurve } from './tabcurvefit';
import { TabNote } from './tabnote';
import { TextNote } from './textnote';
import { layoutTiedBend } from './tiedbend';
import { TimeSignature } from './timesignature';
import { RuntimeError } from './util';

export interface ContinuousBoundary {
  /** One-based source measure number, independent of rest compression. */
  measure: number;
  breakBefore?: 'force' | 'keep';
  rehearsal?: string;
  navigation?:
    | { kind: 'segno' | 'coda'; id: string }
    | { kind: 'dalSegno' | 'toCoda'; target: string }
    | { kind: 'daCapo' | 'fine' };
  repeatStart?: boolean;
  repeatEnd?: boolean;
  keepRest?: boolean;
}
export interface ContinuousOptions {
  /** Align lead harmonies and verses across each printed system and continue their connectors across breaks. */
  textLanes?: 'system';
  /** Fit horizontal ink profiles of adjacent staves and rows. Defaults to the traditional full-width envelope. */
  verticalSpacing?: 'profile' | 'envelope';
  /** Extra measured ink on this stave, in current score coordinates. Measure numbers are one-based. */
  inkBounds?: (stave: Stave, measure: number) => readonly Bounds[];
  /** Reflow staff-local measure grids on a common rhythmic timeline. */
  independentMeters?: boolean;
  mode?: 'balanced' | 'greedy';
  boundaries?: readonly ContinuousBoundary[];
  /** Ordered event IDs share one native duration ratio and a bracket that follows them across systems. */
  tuplets?: readonly {
    id: string;
    members: readonly string[];
    numNotes: number;
    notesOccupied: number;
    side?: 'above' | 'below';
  }[];
  spans?: readonly ContinuousSpan[];
  hideEmptyStaves?: boolean;
  compressRests?: boolean;
  measureNumbers?: boolean;
  courtesy?: boolean;
  /** Aligned half or quarter notes, or eighth notes with a native beam on one of the two staves. */
  splitChords?: readonly { id: string; upper: string; lower: string }[];
  groups?: readonly { first: string; last: string; type: 'brace' | 'bracket'; barlines?: boolean }[];
}
export interface ContinuousRow extends SheetRow {
  measures: number[];
  visibleStaves: string[];
  restGroups: number[][];
}
type State = Required<EasyScoreStaffState>;
type Marks = { start: StaveModifier[]; end: StaveModifier[] };
interface Unit extends BreakUnit {
  first: number;
  last: number;
}
type PlacedMeasure = { u: Unit; sys: System; endPadding: number };
type Draw = (context: RenderContext) => void;
function invalid(message: string): never {
  throw new RuntimeError('BadContinuousScore', message);
}

/** Resolve each end independently because chord positions can be reordered between attacks. */
function resolveTabCurve(span: ContinuousSpan, first: TabNote, last: TabNote): ContinuousSpan {
  const start = first.getPositions();
  const end = last.getPositions();
  for (const head of [span.fromHead, span.toHead]) {
    if (head !== undefined && (!Number.isInteger(head) || head < 0))
      invalid('Invalid tab ' + span.kind + ' position index.');
  }
  const selected =
    span.fromHead === undefined && span.toHead !== undefined ? end[span.toHead] : start[span.fromHead ?? 0];
  const string = span.string ?? selected?.str;
  if (string === undefined || !Number.isInteger(string) || string < 1 || string > first.checkStave().getNumLines())
    invalid('A tab ' + span.kind + ' needs a string on its staff.');
  const openingMatch = start.findIndex((p) => p.str === string);
  const fromHead =
    span.fromHead ?? (span.kind === 'slur' && span.string === undefined && openingMatch < 0 ? 0 : openingMatch);
  // On a slur an explicitly selected arrival can use a different string. Prefer the opening string if present.
  const matching = end.findIndex((p) => p.str === string);
  const toHead = span.toHead ?? (span.kind === 'slur' && span.string === undefined && matching < 0 ? 0 : matching);
  const from = start[fromHead],
    to = end[toHead];
  if (!from || !to || (span.string !== undefined && (from.str !== string || to.str !== string)))
    invalid('Invalid tab ' + span.kind + ' endpoints on the selected string.');
  if (span.kind === 'tie' && (to.str !== string || String(from.fret) !== String(to.fret)))
    invalid('Tab tie endpoints must play the same string and fret.');
  if (span.bend && !Number.isFinite(Number(from.fret))) invalid('A tied bend needs a pitched fret.');
  return { ...span, fromHead, toHead, string: from.str };
}

/** A string sustains into the immediately following event of the same rhythmic voice. */
function adjacentBendEvents(score: EasyScoreComposition, first: SpanAnchor, last: SpanAnchor): boolean {
  const parts = score.notes[first.measure][first.staff];
  const voice = parts.findIndex((notes) => notes.includes(first.note));
  if (voice < 0 || last.measure > first.measure + 1) return false;
  const members = parts[voice].filter((n) => !n.shouldIgnoreTicks());
  const index = members.indexOf(first.note);
  if (first.measure === last.measure) return members[index + 1] === last.note;
  return (
    index === members.length - 1 &&
    score.notes[last.measure][last.staff][voice]?.find((n) => !n.shouldIgnoreTicks()) === last.note
  );
}

/** A row has one shared staff map. A compressed rest maps back to every original measure. */
export class ContinuousLayout {
  readonly hidden = new Set<Element>();
  readonly diagnostics: {
    code: 'RowOverflow' | 'CurveCollision' | 'SplitStemAlignment' | 'SpanOverflow' | 'StaffSpacingLimit';
    measures: number[];
    source?: string;
  }[] = [];
  readonly fragments: SpanFragment[] = [];
  readonly rows: ContinuousRow[] = [];
  private readonly rowInk = new WeakMap<ContinuousRow, InkProfile>();
  private readonly marks: Marks[][];
  private readonly boundaries = new Map<number, ContinuousBoundary>();
  private readonly spans: ResolvedSpan[] = [];
  private readonly names: { full?: Element; short?: Element }[][];
  private readonly groups: { first: number; last: number; type: 'brace' | 'bracket'; barlines?: boolean }[];
  private drawing: Draw[] = [];
  private readonly headerLabels = new Map<string, Element>();

  /** Reuse measured labels when a resize moves a measure to another row. */
  private headerLabel(text: string, symbol = false) {
    const key = (symbol ? 'glyph:' : 'text:') + text;
    let mark = this.headerLabels.get(key);
    if (!mark) {
      mark = new Element(symbol ? 'Repetition' : 'Annotation').setText(text);
      if (symbol) mark.setFontSize(18);
      this.headerLabels.set(key, mark);
    }
    return mark;
  }
  private headerParts(i: number, atStart: boolean) {
    const boundary = this.boundaries.get(i),
      kind = boundary?.navigation?.kind;
    const nav = kind
      ? { segno: Glyphs.segno, coda: Glyphs.coda, dalSegno: 'D.S.', toCoda: 'To Coda', daCapo: 'D.C.', fine: 'Fine' }[
          kind
        ]
      : '';
    const texts = [
      this.options.measureNumbers && atStart ? String(i + 1) : '',
      boundary?.rehearsal,
      ...(!atStart ? this.spec.staves.map((s) => s.measures[i].instrument?.name) : []),
      nav,
    ];
    return texts.flatMap((text, k) =>
      text
        ? [
            {
              mark: this.headerLabel(text, k === texts.length - 1 && (kind === 'segno' || kind === 'coda')),
              boxed: k === 1,
            },
          ]
        : []
    );
  }
  private readonly splitChords: { id: string; measure: number; upper: StaveNote; lower: StaveNote }[] = [];
  private readonly spelledSpans = new Set<number>();

  private readonly options: ContinuousOptions;
  /** Keep incoming ties and beams clear of the repeated clef at a row start. */
  private readonly continuationPadding = new Map<Stave, number>();
  private readonly arrivals = new Map<number, { note: Note; mark: Accidental; index: number }[]>();

  constructor(
    private readonly score: EasyScoreComposition,
    private readonly spec: EasyScoreCompositionSpec,
    starts: State[][],
    ends: State[][],
    placed?: Set<Accidental>,
    private readonly interiorBars: InteriorBar[] = [],
    private readonly textLanes?: SystemTextLanes
  ) {
    this.options = spec.continuous ?? {};
    for (const voice of score.voices.flat(2)) voice.preserveStaveAssignments = true;
    if (this.options.mode && !['greedy', 'balanced'].includes(this.options.mode)) invalid('Unknown break mode.');
    const ids = spec.staves.map((s) => s.id);
    for (const b of this.options.boundaries ?? []) {
      if (
        !Number.isInteger(b.measure) ||
        b.measure < 1 ||
        b.measure > score.systems.length ||
        this.boundaries.has(b.measure - 1)
      )
        invalid('Expected a unique, in-range boundary measure.');
      if (b.breakBefore && !['force', 'keep'].includes(b.breakBefore)) invalid('Unknown break constraint.');
      this.boundaries.set(b.measure - 1, { ...b });
    }
    const destinations = new Map<string, string>();
    for (const { navigation: n } of this.boundaries.values())
      if (n && 'id' in n) {
        if (!n.id || destinations.has(n.id)) invalid('Duplicate or empty navigation destination.');
        destinations.set(n.id, n.kind);
      }
    for (const { navigation: n } of this.boundaries.values())
      if (n && 'target' in n && destinations.get(n.target) !== (n.kind === 'toCoda' ? 'coda' : 'segno'))
        invalid('Navigation instruction needs a matching destination.');
    this.groups = (this.options.groups ?? []).map((g) => {
      const first = ids.indexOf(g.first),
        last = ids.indexOf(g.last);
      if (first < 0 || last <= first || !['brace', 'bracket'].includes(g.type)) invalid('Invalid staff group.');
      return { ...g, first, last };
    });
    const label = (text?: string) => (text ? new Element('Annotation').setText(text) : undefined);
    const names = spec.staves.map((s) => ({ full: label(s.name), short: label(s.shortName ?? s.name) }));
    this.names = score.systems.map((_, i) =>
      spec.staves.map((s, j) => {
        const change = s.measures[i].instrument;
        if (change) names[j] = { full: label(change.name), short: label(change.shortName ?? change.name) };
        return names[j];
      })
    );
    this.marks = starts.map((states, i) =>
      states.map((state, j) => {
        const stave = score.staves[i][j];
        const boundary = this.boundaries.get(i);
        if (boundary?.repeatStart) stave.setBegBarType(BarlineType.REPEAT_BEGIN);
        if (boundary?.repeatEnd) stave.setEndBarType(BarlineType.REPEAT_END);
        const start: StaveModifier[] = [],
          end: StaveModifier[] = [];
        const present = (category: string) => stave.getModifiers(Position.BEGIN, category).length > 0;
        if (!present(Clef.CATEGORY)) start.push(new Clef(state.clef));
        if (state.clef !== 'tab' && state.key !== 'C' && !present(KeySignature.CATEGORY))
          start.push(new KeySignature(state.key));
        // Meter is carried silently at a repeated row start. Explicit changes remain native modifiers.
        const next = starts[i + 1]?.[j],
          current = ends[i][j];
        if (next && this.options.courtesy !== false) {
          if (next.clef !== current.clef) end.push(new Clef(next.clef, 'small'));
          if (next.clef !== 'tab' && next.key !== current.key) end.push(new KeySignature(next.key, current.key));
          if (next.showTimeSignature && next.time !== current.time) end.push(new TimeSignature(next.time));
        }
        end.forEach((m) => m.setPosition(Position.END));
        return { start, end };
      })
    );
    const locations = new Map<Note, SpanAnchor>();
    score.notes.forEach((parts, measure) =>
      parts.flat(2).forEach((n) => {
        if (n instanceof Note)
          locations.set(n, { note: n, measure, staff: score.staves[measure].indexOf(n.checkStave()) });
      })
    );
    const seen = new Set<string>();
    const onset = (n: Note) => {
      const time = new Fraction(0, 1);
      for (const tick of n.getVoice().getTickables()) {
        if (tick === n) break;
        if (!tick.shouldIgnoreTicks()) time.add(tick.getTicks());
      }
      return time;
    };
    for (const sp of spec.spans ?? []) {
      const from = sp.from && locations.get(score.getNote(sp.from)),
        to = sp.to && locations.get(score.getNote(sp.to));
      if (from && to) for (let i = from.measure; i <= to.measure; i++) this.spelledSpans.add(i);
    }
    const beamedMembers = new Set<StaveNote>();
    for (const chord of this.options.splitChords ?? []) {
      const a = locations.get(score.getNote(chord.upper)),
        b = locations.get(score.getNote(chord.lower));
      if (
        !chord.id ||
        seen.has(chord.id) ||
        !a ||
        !b ||
        a.measure !== b.measure ||
        a.staff >= b.staff ||
        !(a.note instanceof StaveNote) ||
        !(b.note instanceof StaveNote) ||
        a.note.isRest() ||
        b.note.isRest() ||
        !['h', 'q', '2', '4', '8'].includes(a.note.getDuration()) ||
        a.note.getDuration() !== b.note.getDuration() ||
        a.note.getStemDirection() !== b.note.getStemDirection() ||
        !a.note.getTicks().equals(b.note.getTicks()) ||
        !onset(a.note).equals(onset(b.note))
      )
        invalid('A split stem needs matching simultaneous half, quarter or eighth notes on ordered staves.');
      if (a.note.getDuration() === '8') {
        if (beamedMembers.has(a.note) || beamedMembers.has(b.note))
          invalid('A beamed note can belong to only one split chord.');
        beamedMembers.add(a.note);
        beamedMembers.add(b.note);
      }
      seen.add(chord.id);
      this.splitChords.push({ id: chord.id, measure: a.measure, upper: a.note, lower: b.note });
    }
    const pendingBeams = new Map<ResolvedSpan, ReturnType<typeof beamMembers>>();
    const claimedNotes = new Set<StaveNote>();
    const kinds = [
      'beam',
      'tie',
      'slur',
      'glissando',
      'crescendo',
      'diminuendo',
      'pedal',
      'lyric',
      'hyphen',
      'volta',
      'ottava',
      'trill',
      'tuplet',
      'palmMute',
    ];
    const tuplets: ContinuousSpan[] = (this.options.tuplets ?? []).map(({ id, members, numNotes, side }) => ({
      id,
      kind: 'tuplet',
      from: members[0],
      to: members[members.length - 1],
      text: String(numNotes),
      side,
    }));
    for (const span of [...(this.options.spans ?? []), ...(textLanes?.connectors() ?? []), ...tuplets]) {
      const first = locations.get(score.getNote(span.from)),
        last = locations.get(score.getNote(span.to));
      if (
        !span.id ||
        seen.has(span.id) ||
        !kinds.includes(span.kind) ||
        !first ||
        !last ||
        first.measure > last.measure
      )
        invalid('Expected a unique span ID and ordered composition anchors.');
      let spec = { ...span };
      if (span.wavy && span.kind !== 'glissando') invalid('A wavy slide needs a glissando span.');
      if (span.flared && span.kind !== 'crescendo' && span.kind !== 'diminuendo')
        invalid('A flared profile needs a crescendo or diminuendo span.');
      if (span.halfDashed && span.kind !== 'slur') invalid('A half-dashed curve needs a slur span.');
      if (span.dashed && span.kind !== 'tie') invalid('A dashed tie needs a tie span.');
      if (
        span.bend !== undefined &&
        !(span.kind === 'tie' && first.note instanceof TabNote && last.note instanceof TabNote)
      )
        invalid('A tied bend needs two TAB endpoints.');
      if (
        span.string !== undefined &&
        !((span.kind === 'tie' || span.kind === 'slur') && first.note instanceof TabNote)
      )
        invalid('A string selector requires a tab tie or slur.');
      if (span.kind === 'palmMute') {
        if (!(first.note instanceof TabNote) || !(last.note instanceof TabNote) || first.staff !== last.staff)
          invalid('A palm mute needs two TAB anchors on the same staff.');
        if (
          !span.strings?.length ||
          new Set(span.strings).size !== span.strings.length ||
          !span.strings.every((n) => Number.isInteger(n) && n > 0 && n <= first.note.checkStave().getNumLines())
        )
          invalid('A palm mute needs distinct string numbers on its staff.');
        for (const note of [first.note, last.note])
          if (!note.getPositions().some((p) => span.strings!.includes(p.str)))
            invalid('Each palm-mute anchor must play a targeted string.');
        spec.strings = [...span.strings];
      } else if (first.note instanceof TabNote && last.note instanceof TabNote) {
        if (first.staff !== last.staff || (span.kind !== 'tie' && span.kind !== 'slur' && span.kind !== 'volta'))
          invalid('Tab ties, slurs and endings need anchors on the same tab staff.');
        if (span.kind === 'tie' || span.kind === 'slur') {
          spec = resolveTabCurve(span, first.note, last.note);
          if (span.bend) {
            if (!adjacentBendEvents(score, first, last))
              invalid('A tied bend needs adjacent events in the same TAB voice.');
            spec.bend = copyTiedBend(span.bend);
          }
        }
      } else {
        if (!(first.note instanceof StaveNote) || !(last.note instanceof StaveNote))
          invalid('Continuous spans need staff-note anchors.');
        for (const [head, n] of [
          [span.fromHead ?? 0, first.note],
          [span.toHead ?? 0, last.note],
        ] as const)
          if (!Number.isInteger(head) || head < 0 || head >= n.keys.length) invalid('Invalid span head index.');
      }
      if (span.kind === 'glissando') {
        if (
          first.staff !== last.staff ||
          first.note.isRest() ||
          last.note.isRest() ||
          (first.measure === last.measure && onset(first.note).equals(onset(last.note)))
        )
          invalid('A glissando needs two ordered pitched attacks on the same staff.');
      }
      // A curved or sliding arrival on the first beat needs room after the clef for its incoming fragment.
      if (
        (span.kind === 'slur' || span.kind === 'glissando' || (span.kind === 'tie' && first.note instanceof TabNote)) &&
        first.measure !== last.measure &&
        onset(last.note).numerator === 0
      ) {
        const stave = last.note.checkStave();
        this.continuationPadding.set(stave, stave.space(1.5));
      }
      if (first.measure === last.measure && onset(first.note).greaterThan(onset(last.note))) invalid('Reversed span.');
      if (
        span.syllableId !== undefined &&
        (typeof span.syllableId !== 'string' ||
          span.syllableId.length === 0 ||
          !['lyric', 'hyphen'].includes(span.kind) ||
          first.staff !== last.staff ||
          span.text !== undefined ||
          span.labelFontSize !== undefined)
      )
        invalid(
          'An anchored lyric extender needs a syllable ID and two notes on the same staff. Its annotation supplies the text and font.'
        );
      if (span.toSyllableId !== undefined && (!span.syllableId || !span.toSyllableId))
        invalid('An arrival syllable needs an anchored lyric or hyphen.');
      if (span.kind === 'tie' && first.note instanceof StaveNote && first.measure !== last.measure) {
        const fi = span.fromHead ?? 0,
          li = span.toHead ?? 0;
        if (first.note.getKeys()[fi].toLowerCase() !== last.note.getKeys()[li].toLowerCase())
          invalid('Tied heads must have the same written pitch.');
        const mark = last.note
          .getModifiers()
          .find((m): m is Accidental => m instanceof Accidental && m.getIndex() === li && !!placed?.has(m));
        if (mark) {
          const entries = this.arrivals.get(last.measure) ?? [];
          entries.push({ note: last.note, mark, index: last.note.getModifiers().indexOf(mark) });
          this.arrivals.set(last.measure, entries);
        }
      }
      seen.add(span.id);
      const resolved: ResolvedSpan = { spec, first, last, label: spanLabel(spec) };
      if (spec.bend) resolved.bendLabel = new Element('Bend').setText(bendAmount(spec.bend));
      if (span.kind === 'beam') {
        const members = beamMembers(score, first, last);
        for (const { note, measure } of members) {
          if (note.getBeam() || claimedNotes.has(note)) invalid('A continuous beam member already belongs to a beam.');
          claimedNotes.add(note);
          if (measure > first.measure) {
            const stave = note.checkStave();
            this.continuationPadding.set(stave, stave.space(1.5));
          }
        }
        pendingBeams.set(resolved, members);
      }
      this.spans.push(resolved);
    }
    // Resolve every span before attaching beams to caller-owned notes.
    for (const [span, members] of pendingBeams) span.beam = new ContinuousBeam(members);
  }

  /** Only undecorated, wholly resting measures can disappear into a numbered rest. */
  private plainRest(i: number): boolean {
    const boundary = this.boundaries.get(i);
    if (
      boundary ||
      this.spelledSpans.has(i) ||
      this.spec.staves.some((staff) => staff.measures[i].instrument) ||
      this.spans.some((s) => s.first.measure <= i && i <= s.last.measure)
    )
      return false;
    if (
      this.score.staves[i].some((s) =>
        s
          .getModifiers()
          .some((m) => !(m instanceof Barline) || ![BarlineType.SINGLE, BarlineType.NONE].includes(m.getType()))
      )
    )
      return false;
    return this.score.notes[i]
      .flat(2)
      .every(
        (n) =>
          n instanceof StaveNote &&
          n.isRest() &&
          n.restLine === undefined &&
          !n.getModifiers().length &&
          !n.getBeam() &&
          !n.getTupletStack().length
      );
  }

  /** Add cached signs for the candidate boundaries and reserve actual end-modifier width. */
  private boundaryWidth(i: number, start: boolean, end: boolean): number {
    // Only signs generated by key-aware composition change with a tied arrival. Authored signs survive.
    for (const { note, mark, index } of this.arrivals.get(i) ?? []) {
      const mods = note.getModifiers(),
        current = mods.indexOf(mark);
      if (start && current < 0) mods.splice(Math.min(index, mods.length), 0, mark);
      else if (!start && current >= 0) mods.splice(current, 1);
    }
    const staves = this.score.staves[i];
    return Math.max(
      ...staves.map((s, j) => {
        const marks = this.marks[i][j];
        if (this.options.independentMeters && !this.boundaries.get(i)?.repeatStart) {
          s.setBegBarType(
            start && this.spec.staves[j].options?.leftBar !== false ? BarlineType.SINGLE : BarlineType.NONE
          );
        }
        s.setBoundaryModifiers(
          [...(start ? marks.start : []), ...(end ? marks.end : [])],
          start ? this.continuationPadding.get(s) : 0
        );
        const bar = s.getModifiers(Position.END, Barline.CATEGORY)[0] as Barline;
        return Math.max(s.getX() + s.getWidth() - s.getNoteEndX(), -(bar?.getLayoutMetrics()?.xMin ?? 0));
      })
    );
  }

  private units(padding: number): Unit[] {
    this.score.staves.flat().forEach((s) => s.setBoundaryModifiers([]));
    const result: Unit[] = [];
    for (let i = 0; i < this.score.systems.length; i++) {
      let last = i;
      if (this.options.compressRests && this.plainRest(i))
        while (last + 1 < this.score.systems.length && this.plainRest(last + 1)) last++;
      const sys = this.score.systems[i];
      // Give end modifiers a finite reference edge before measuring intrinsic width.
      sys.setX(0).setY(0).setWidth(1);
      const measure = (start: boolean, end: boolean) => {
        const tail = this.boundaryWidth(i, start, end);
        sys.setWidth().format({ endPadding: tail });
        return sys.getWidth();
      };
      const base = measure(false, false);
      const prefix = measure(true, false) - base;
      // A compressed run ends before a structural change, using the final source measure's courtesy signs.
      const tail = this.endWidth(i, last);
      const reserve = this.spans
        .filter((s) => s.first.measure === i && s.label)
        .reduce((w, s) => Math.max(w, s.label!.getWidth() + 12), 0);
      result.push({
        first: i,
        last,
        width: Math.max(
          base + padding,
          last > i ? 68 : 0,
          reserve,
          ...[false, true].map((atStart) =>
            this.headerParts(i, atStart).reduce((w, p) => w + p.mark.getWidth() + (p.boxed ? 12 : 7), 0)
          )
        ),
        start: Math.max(0, prefix),
        end: tail,
        after: 0,
        breakBefore: this.boundaries.get(i)?.breakBefore,
      });
      i = last;
    }
    return result;
  }

  private endWidth(i: number, last: number): number {
    const plain = this.boundaryWidth(i, false, false);
    return Math.max(0, this.install(i, last, false, true) - plain);
  }
  private install(i: number, last: number, start: boolean, end: boolean): number {
    if (i === last) return this.boundaryWidth(i, start, end);
    return Math.max(
      ...this.score.staves[i].map((stave, j) => {
        const m = this.marks[i][j];
        stave.setBoundaryModifiers([...(start ? m.start : []), ...(end ? this.marks[last][j].end : [])]);
        return stave.getX() + stave.getWidth() - stave.getNoteEndX();
      })
    );
  }
  /** Reserve the full 14 px brace width and the 8 px offset of each additional connector. */
  private connectorWidth(): number {
    if (this.options.verticalSpacing !== 'profile') return this.groups.length * 9;
    return Math.max(0, ...this.groups.map((group, i) => i * 8 + (group.type === 'brace' ? 14 : 9)));
  }

  private indent(measure: number): number {
    const widths = this.names[measure].map(
      (n, j) => (measure === 0 || this.spec.staves[j].measures[measure].instrument ? n.full : n.short)?.getWidth() ?? 0
    );
    const w = Math.max(0, ...widths);
    return (w ? w + 10 : 0) + this.connectorWidth();
  }
  /** Preserve staves carrying a spanning instruction or cross-staff note, including silent middle rows. */
  private visible(first: number, last: number): number[] {
    const indices = this.spec.staves.map((_, i) => i);
    if (!this.options.hideEmptyStaves) return indices;
    const used = new Set<number>();
    for (let i = first; i <= last; i++) {
      this.score.notes[i].flat(2).forEach((n) => {
        if (
          n instanceof Note &&
          (!(n instanceof StaveNote) || !n.isRest() || n.restLine !== undefined || n.getModifiers().length)
        )
          used.add(this.score.staves[i].indexOf(n.checkStave()));
      });
    }
    for (const s of this.spans)
      if (s.first.measure <= last && first <= s.last.measure) {
        used.add(s.first.staff);
        used.add(s.last.staff);
      }
    return used.size ? indices.filter((i) => used.has(i)) : [0];
  }
  private suppress(i: number, visible: number[], compressed: boolean, omitted: boolean): void {
    if (omitted) this.hidden.add(this.score.systems[i]);
    this.score.staves[i].forEach((s, j) => {
      if (omitted || !visible.includes(j)) this.hidden.add(s);
    });
    for (const voice of this.score.voices[i].flat()) {
      const ticks = voice.getTickables();
      if (omitted || compressed || ticks.every((n) => this.hidden.has(n.getStave() ?? voice.getStave()!))) {
        this.hidden.add(voice);
        ticks.forEach((n) => this.hidden.add(n));
      }
    }
  }

  format(options: Required<SheetOptions>, alignedWidths?: readonly number[]): ContinuousRow[] {
    // A verse can be attached after composition. Resolve its current mark before every reflow.
    for (const span of this.spans) {
      if (!span.spec.syllableId) continue;
      const matches = span.first.note
        .getModifiers()
        .filter((m): m is Annotation => m instanceof Annotation && m.getAttribute('id') === span.spec.syllableId);
      if (matches.length !== 1) invalid('Expected one lyric annotation on the source note: ' + span.spec.syllableId);
      span.syllable = matches[0];
      if (span.spec.toSyllableId) {
        const destination = span.last.note
          .getModifiers()
          .filter(
            (mark): mark is Annotation =>
              mark instanceof Annotation && mark.getAttribute('id') === span.spec.toSyllableId
          );
        if (destination.length !== 1) invalid('Expected one arrival annotation: ' + span.spec.toSyllableId);
        span.toSyllable = destination[0];
        if (
          span.first.measure !== span.last.measure &&
          span.last.note ===
            span.last.note
              .getVoice()
              .getTickables()
              .find((note) => !note.shouldIgnoreTicks())
        ) {
          const stave = span.last.note.checkStave();
          const advance = span.toSyllable.getTextMetrics().width / 2 + stave.space(1.5);
          this.continuationPadding.set(stave, Math.max(this.continuationPadding.get(stave) ?? 0, advance));
        }
      }
    }
    // A caller may attach the native beam after composition. Validate every owner before modifying either voice.
    const eighths = this.splitChords.filter(({ upper }) => upper.getDuration() === '8');
    for (const { upper, lower } of eighths)
      if (!!upper.getBeam() === !!lower.getBeam() || upper.getStemDirection() !== lower.getStemDirection())
        invalid('A split eighth-note chord needs a beam on exactly one of its two notes and matching stem directions.');
    for (const { upper, lower } of eighths) linkSplitStem(upper, lower);
    for (const span of this.spans) span.beam?.clearRows();
    const units = this.units(options.measurePadding);
    const padding = new Map<System, number>();
    do {
      for (const span of this.spans) span.beam?.clearRows();
      this.hidden.clear();
      this.diagnostics.length = 0;
      this.fragments.length = 0;
      this.rows.length = 0;
      this.drawing = [];
      for (const u of units) u.after = padding.get(this.score.systems[u.first]) ?? 0;
      // A multi-bar publication inset inherits the host barlines and must keep the supplied widths.
      const groups = alignedWidths
        ? [units.map((_, i) => i)]
        : chooseSystemBreaks(
            units,
            options.width,
            options.measureGap,
            (i) => this.indent(units[i].first),
            this.options.mode ?? 'balanced'
          );
      let y = options.y;
      for (const indices of groups) {
        const row = this.layoutRow(
          indices.map((i) => units[i]),
          options,
          y,
          alignedWidths
        );
        const profile = this.rowInk.get(row);
        this.score.sheet.alignSticking(row, profile && ((box) => profile.add(box, -row.y)));
        this.rows.push(row);
        y = row.y + row.height + options.rowGap;
      }
    } while (!alignedWidths && reserveChordSpacing(this.rows, padding));
    for (const s of this.spans) {
      const parts = this.fragments.filter((f) => f.id === s.spec.id);
      if (s.spec.string !== undefined) this.fitTabCurveRows(s, parts);
      const total = parts.reduce((a, f) => a + f.x2 - f.x1, 0);
      let prior = 0;
      for (const f of parts) {
        f.progress = [prior / total, (prior + f.x2 - f.x1) / total];
        prior += f.x2 - f.x1;
        if (f.kind === 'glissando') {
          const measures = this.rows[f.row].measures;
          const firstStave = this.score.staves[measures[0] - 1][s.first.staff];
          const lastStave = this.score.staves[measures[measures.length - 1] - 1][s.last.staff];
          f.y1 = glissandoY(s, firstStave, f.progress[0]);
          f.y2 = glissandoY(s, lastStave, f.progress[1]);
        }
        if (!s.beam) this.drawing.push((ctx) => drawSpan(ctx, f, s.label, s.bendLabel));
      }
    }
    for (const { beam } of this.spans) {
      if (!beam) continue;
      beam.finishRows();
      this.drawing.push((ctx) => beam.setContext(ctx).drawWithStyle());
    }
    return this.rows;
  }

  /** Managed text lanes move after curve fitting, while head fingerings and other fixed marks constrain the route. */
  private measureSlurInk(events: (StaveNote | TabNote)[]): Bounds[] {
    return slurInk(events, (mark) => this.textLanes?.isMark(mark) ?? false);
  }

  /** A tie only needs other fret numbers; a slur can run past modifiers or other positions of its own chord. */
  private tabCurveInk(span: ResolvedSpan, f: SpanFragment, measures: number[]): Bounds[] {
    return measures.flatMap((m) => {
      const stave = this.score.staves[m - 1][span.first.staff];
      const events = this.score.notes[m - 1]
        .flat(2)
        .filter((n): n is TabNote => n instanceof TabNote && n.getStave() === stave);
      const ink =
        span.spec.kind === 'slur'
          ? this.measureSlurInk(events)
          : events.filter((n) => n !== span.first.note && n !== span.last.note).flatMap((n) => n.getFretInk());
      return ink.filter((b) => b.x + b.w >= f.x1 - f.space && b.x <= f.x2 + f.space);
    });
  }

  /** The selected digits can have different widths or positions within their respective chords. */
  private tabSlurEnds(span: ResolvedSpan): [Bounds, Bounds] {
    return [
      (span.first.note as TabNote).getFretInk()[span.spec.fromHead!],
      (span.last.note as TabNote).getFretInk()[span.spec.toHead!],
    ];
  }

  /** Choose one side for the whole TAB curve after the positions of all its frets are known. */
  private fitTabCurveRows(span: ResolvedSpan, parts: SpanFragment[]): void {
    const ink = parts.map((f) => this.tabCurveInk(span, f, this.rows[f.row].measures));
    const ends = span.spec.kind === 'slur' ? this.tabSlurEnds(span) : undefined;
    for (const f of fitTabCurve(parts, ink, span.spec.side === undefined && !span.spec.bend, ends)) {
      this.diagnostics.push({ code: 'CurveCollision', measures: this.rows[f.row].measures, source: span.spec.id });
    }
  }

  /** Measure native ink once the horizontal positions and beam fits for this row are known. */
  private measureStaffInk(positions: PlacedMeasure[], visible: number[], profiles?: InkProfile[]) {
    // Staff-relative extrema exclude crossing beams and their stems, which are refitted to these very gaps.
    const ink = this.spec.staves.map(() => ({ top: Infinity, bottom: -Infinity }));
    for (const { u, sys } of positions)
      for (const j of visible) {
        const stave = this.score.staves[u.first][j],
          base = stave.getY();
        const take = (top: number, bottom: number) => {
          ink[j].top = Math.min(ink[j].top, top - base);
          ink[j].bottom = Math.max(ink[j].bottom, bottom - base);
        };
        const addPart = (box: Bounds) => profiles?.[j].add(box, -base);
        if (profiles) {
          const top = stave.getYForLine(0) - 0.5;
          addPart({
            x: stave.getX(),
            y: top,
            w: stave.getWidth(),
            h: stave.getYForLine(stave.getNumLines() - 1) + 0.5 - top,
          });
          sys.getPhraseInk(stave).forEach(addPart);
          this.options.inkBounds?.(stave, u.first + 1).forEach(addPart);
        }
        take(stave.getYForLine(0) - stave.space(1.6), stave.getYForLine(stave.getNumLines() - 1) + stave.space(1.6));
        for (const m of stave.getModifiers()) {
          const boxes =
            m instanceof Clef || m instanceof TimeSignature
              ? [m.getInkBounds()]
              : m instanceof KeySignature
                ? m.getInkParts()
                : [];
          for (const box of boxes) {
            take(box.y, box.y + box.h);
            addPart(box);
          }
        }
        if (u.first === u.last)
          for (const n of this.score.notes[u.first].flat(2)) {
            if (n instanceof TextNote && n.getDirectionAnchor() && n.getStave() === stave) {
              const box = n.getBoundingBox();
              take(box.y, box.y + box.h);
              addPart(box);
            }
            if (n instanceof TabNote && n.getStave() === stave && profiles) {
              n.getFretInk().forEach(addPart);
              for (const mark of n.getModifiers()) measureEngraving(mark).parts.forEach(addPart);
            }
            if (n instanceof TabNote && n.getStave() === stave && n.hasStem()) {
              const { topY, baseY } = n.getStemExtents();
              take(Math.min(topY, baseY), Math.max(topY, baseY));
              if (profiles)
                addPart({ x: n.getStemX(), y: Math.min(topY, baseY), w: Stem.WIDTH, h: Math.abs(topY - baseY) });
            }
            if (!(n instanceof StaveNote) || n.getStave() !== stave) continue;
            const shared = splitStemFor(n);
            const beam = shared ? shared.owner.getBeam() : n.getBeam();
            const tipStave = beam && beamStave(n);
            const bridge = !(beam instanceof ContinuousBeam) && beam?.getNotes().some((p) => beamStave(p) !== tipStave);
            const parts = bridge && !shared && !profiles ? n.getHeadInk() : measureEngraving(n).parts;
            parts.forEach((box, index) => {
              // The shared stem spans this very gap and must not increase it.
              if ((shared?.owner !== n && !(profiles && bridge)) || index !== n.noteHeads.length) {
                take(box.y, box.y + box.h);
                addPart(box);
              }
            });
            if (beam && !(beam instanceof ContinuousBeam) && !bridge && tipStave === stave) {
              if (profiles) beam.getStripBounds().forEach(addPart);
              const box = beam.getBoundingBox();
              take(box.y, box.y + box.h);
            }
            for (const t of n.getTupletStack()) {
              const box = t.getBoundingBox();
              addPart(box);
              take(box.y, box.y + box.h);
            }
          }
      }
    return ink;
  }

  /** Share the largest required staff distance across all measures, bounded to four native refits. */
  private alignStaves(positions: PlacedMeasure[], visible: number[], origin: number, offsets: number[]): boolean {
    // A native phrase may demand a larger separation. Propagate that minimum to every measure.
    for (let pass = 0; pass < 4; pass++) {
      const next = offsets.slice();
      for (const { sys, endPadding } of positions) {
        sys
          .setY(origin)
          .format({ staffOffsets: offsets, endPadding, deferStaffSpacing: this.options.verticalSpacing === 'profile' });
        const staves = sys.getStaves();
        for (let k = 1; k < visible.length; k++) {
          const a = visible[k - 1],
            b = visible[k];
          next[b] = Math.max(next[b], next[a] + staves[b].getY() - staves[a].getY());
        }
      }
      if (visible.every((j) => Math.abs(next[j] - offsets[j]) < 0.01)) return true;
      if (pass === 3) return false;
      next.forEach((v, j) => (offsets[j] = v));
    }
    return false;
  }

  /** Fit local curves and labels to their native notes before comparing adjoining staff profiles. */
  private profileSpans(
    profiles: InkProfile[],
    spans: ResolvedSpan[],
    units: Unit[],
    measures: number[],
    baseline: (span: ResolvedSpan) => number
  ): void {
    const first = units[0].first,
      last = units[units.length - 1].last;
    for (const s of spans) {
      if (s.beam || s.first.staff !== s.last.staff) continue;
      const staff = s.first.staff,
        base = this.score.staves[first][staff].getY();
      const f = this.makeFragment(s, units, measures, base + baseline(s), false);
      if (!f) continue;
      const p = profiles[staff];
      if (s.spec.string !== undefined && f.kind === 'slur') {
        // The full phrase selects one side after all rows have been placed. Reserve both possible ribbons.
        const ink = this.tabCurveInk(s, f, measures),
          ends = this.tabSlurEnds(s);
        for (const curve of s.spec.side ? [f] : [f, oppositeTabCurve(f)]) {
          fitTabSlur(curve, ink, ...ends);
          curveParts(curve).forEach((b) => p.add(b, -base));
        }
      } else if (f.kind === 'tie' || f.kind === 'slur') curveParts(f).forEach((b) => p.add(b, -base));
      else {
        if (f.kind === 'glissando') {
          f.y1 = glissandoY(s, this.score.staves[first][staff], 0);
          f.y2 = glissandoY(s, this.score.staves[last][staff], 1);
        }
        p.add(
          {
            x: f.x1,
            y: Math.min(f.y1, f.y2) - (f.kind === 'volta' ? 1.4 : 1) * f.space,
            w: f.x2 - f.x1,
            h: Math.abs(f.y2 - f.y1) + 2 * f.space,
          },
          -base
        );
      }
      if (s.label) {
        const x = f.kind === 'tuplet' ? (f.x1 + f.x2 - s.label.getWidth()) / 2 : f.x1;
        p.add(s.label.getTextInk(x, f.y1), -base);
      }
      if (f.bend) p.add(f.bend.bounds, -base);
    }
  }

  /** Fit the music and its curves first, then reserve a shared baseline for each text lane. */
  private fitTextLanes(
    positions: PlacedMeasure[],
    units: Unit[],
    spans: ResolvedSpan[],
    visible: number[],
    offsets: number[]
  ): void {
    if (!this.textLanes) return;
    const first = units[0].first;
    this.alignStaves(positions, visible, 0, offsets);
    // Compare each physical staff's music to the common text line, including both fragments of a broken slur.
    const staffInk = new Map<number, Bounds[]>();
    for (const { u } of positions) {
      const staves = this.score.staves[u.first];
      for (const note of this.score.notes[u.first].flat(2)) {
        if (!(note instanceof StaveNote) || note.renderOptions.draw === false) continue;
        const stave = note.checkStave();
        const staff = staves.indexOf(stave);
        const parts = staffInk.get(staff) ?? [];
        const ink = measureEngraving(note, {
          extension: (el) => (this.textLanes?.isMark(el) ? { parts: [], anchors: {} } : undefined),
        });
        for (const b of ink.parts) parts.push({ ...b, y: b.y - stave.getYForLine(0) });
        staffInk.set(staff, parts);
      }
    }
    for (const span of spans) {
      if (span.spec.kind !== 'slur' || span.first.staff !== span.last.staff) continue;
      const index = span.first.staff;
      const f = this.makeFragment(span, units, [], 0, false);
      if (!f) continue;
      const line = this.score.staves[first][index].getYForLine(0);
      const parts = staffInk.get(index) ?? [];
      parts.push(...curveParts(f).map((b) => ({ ...b, y: b.y - line })));
      staffInk.set(index, parts);
    }
    if (
      this.textLanes.fit(
        positions.map((p) => p.sys),
        staffInk
      )
    )
      for (const { sys, endPadding } of positions)
        sys.format({ endPadding, deferStaffSpacing: this.options.verticalSpacing === 'profile' });
  }

  /** Reconcile staff envelopes across all measures in a row, then translate the entire solved row once. */
  private layoutRow(
    units: Unit[],
    options: Required<SheetOptions>,
    y: number,
    alignedWidths?: readonly number[]
  ): ContinuousRow {
    const first = units[0].first,
      last = units[units.length - 1].last;
    const visible = this.visible(first, last);
    const spans = this.spans.filter((s) => s.first.measure <= last && first <= s.last.measure);
    const indent = this.indent(first);
    const minimum =
      indent +
      units.reduce((sum, u, i) => sum + u.width + (i + 1 < units.length ? u.after : 0), 0) +
      units[0].start +
      units[units.length - 1].end +
      (units.length - 1) * options.measureGap;
    // A one-beat polymetric window gets less justification than a three-beat window at the same pulse.
    const weights = units.map((u) =>
      this.options.independentMeters ? this.score.voices[u.first][0][0].getTotalTicks().value() : 1
    );
    const extra = options.justify ? Math.max(0, options.width - minimum) / weights.reduce((sum, w) => sum + w, 0) : 0;
    let x = options.x + indent;
    const profiles =
      this.options.verticalSpacing === 'profile'
        ? this.spec.staves.map(() => new InkProfile(options.x, options.width))
        : undefined;
    const offsets = this.spec.staves.map(() => 0);
    let measureOverflow = 0;
    const positions = units.map((u, k) => {
      const begin = k === 0,
        end = k === units.length - 1;
      const sys = this.score.systems[u.first];
      this.textLanes?.clear(sys);
      sys.setX(x).setY(0);
      const chordPadding = end ? 0 : u.after;
      const endPadding = this.install(u.first, u.last, begin, end) + chordPadding;
      const minimumWidth = u.width + chordPadding + (begin ? u.start : 0) + (end ? u.end : 0);
      const width = alignedWidths?.[u.first] ?? minimumWidth + extra * weights[k];
      if (alignedWidths) measureOverflow = Math.max(measureOverflow, minimumWidth - width);
      sys.setWidth(width).format({ endPadding, deferStaffSpacing: !!profiles });
      for (let j = 1; j < visible.length; j++) {
        const staves = sys.getStaves(),
          b = visible[j];
        const a = visible[j - 1];
        const nominal = profiles ? sys.getMinimumStaffDistance(a, b) : staves[b].getY() - staves[b - 1].getY();
        offsets[b] = Math.max(offsets[b], nominal);
      }
      for (let i = u.first; i <= u.last; i++) this.suppress(i, visible, u.first !== u.last, i !== u.first);
      x += width + options.measureGap;
      return { u, sys, endPadding };
    });
    const fitted = spans.flatMap((s) =>
      s.beam ? [{ beam: s.beam.measureRow(first, last), staff: s.first.staff }] : []
    );
    this.fitTextLanes(positions, units, spans, visible, offsets);
    const ink = this.measureStaffInk(positions, visible, profiles);
    for (const { beam, staff } of fitted) {
      const bounds = beam.getBoundingBox();
      const staveY = this.score.staves[first][staff].getY();
      ink[staff].top = Math.min(ink[staff].top, bounds.y - staveY);
      ink[staff].bottom = Math.max(ink[staff].bottom, bounds.y + bounds.h - staveY);
      if (profiles) beam.getStripBounds().forEach((b) => profiles[staff].add(b, -staveY));
      beam.resetLayout();
    }
    const lanes = new Map<ResolvedSpan, number>();
    // Prefer the nearest free lane. Non-overlapping spans can reuse it.
    const laneEnds = new Map<string, number[]>();
    for (const s of spans) {
      if (s.beam || (s.spec.kind === 'tie' && !s.spec.bend) || s.spec.kind === 'slur' || s.spec.kind === 'glissando')
        continue;
      if (s.syllable) {
        // A continuation row may have no sung words of its own. Include the extender in that staff's envelope.
        const stave = this.score.staves[first][s.first.staff];
        const word = s.toSyllable && s.first.measure < first && s.last.measure <= last ? s.toSyllable : s.syllable;
        const relativeY = this.lyricBaseline(word, stave) - stave.getY();
        const bounds = ink[s.first.staff];
        bounds.top = Math.min(bounds.top, relativeY);
        bounds.bottom = Math.max(bounds.bottom, relativeY + 2);
        continue;
      }
      const side = s.spec.bend !== undefined || spanAbove(s.spec),
        staff = s.first.staff,
        key = staff + '-' + side;
      const ends = laneEnds.get(key) ?? [];
      let lane = ends.findIndex((v) => v < s.first.measure);
      if (lane < 0) lane = ends.length;
      ends[lane] = s.last.measure;
      laneEnds.set(key, ends);
      lanes.set(s, lane);
    }
    const limits = ink.map((bounds, j) => {
      const space = this.score.staves[first][j].space(1);
      const above = laneEnds.get(j + '-true')?.length ?? 0,
        below = laneEnds.get(j + '-false')?.length ?? 0;
      return { top: bounds.top - space * (2 + above * 2.5), bottom: bounds.bottom + space * (1 + below * 2.5) };
    });
    const measures = Array.from({ length: last - first + 1 }, (_, i) => first + i + 1);
    const baseline = (s: ResolvedSpan) => {
      const staff = s.first.staff,
        lane = lanes.get(s) ?? 0;
      return s.spec.bend || spanAbove(s.spec) ? ink[staff].top - lane * 25 - 4 : ink[staff].bottom + lane * 25 + 14;
    };
    if (profiles) this.profileSpans(profiles, spans, units, measures, baseline);
    for (let j = 1; j < visible.length; j++) {
      const a = visible[j - 1],
        b = visible[j];
      offsets[b] =
        offsets[a] +
        Math.max(offsets[b], (profiles ? profiles[a].distance(profiles[b]) : limits[a].bottom - limits[b].top) + 8);
    }
    const instrumentChange = units.some(
      (u, k) => k > 0 && this.spec.staves.some((s) => s.measures[u.first].instrument)
    );
    const header =
      instrumentChange ||
      units.some((u) => this.boundaries.get(u.first)?.rehearsal || this.boundaries.get(u.first)?.navigation) ||
      this.options.measureNumbers
        ? 20
        : 0;
    const rowProfile = profiles && new InkProfile(options.x, options.width);
    if (rowProfile && profiles) visible.forEach((staff) => rowProfile.include(profiles[staff], offsets[staff]));
    const originOffset = header + (rowProfile ? 4 - rowProfile.minY : -limits[visible[0]].top);
    const rowInk = rowProfile && new InkProfile(options.x, options.width);
    rowInk?.include(rowProfile!, originOffset);
    const rowHeight = rowInk
      ? rowInk.maxY + 4
      : originOffset + offsets[visible[visible.length - 1]] + limits[visible[visible.length - 1]].bottom;
    if (rowInk) {
      if (header) rowInk.add({ x: options.x, y: 0, w: options.width, h: header });
      const previous = this.rows[this.rows.length - 1];
      const previousInk = previous && this.rowInk.get(previous);
      if (previousInk) {
        y -= previousInk.sharedHeight(rowInk, previous.height, rowHeight);
      }
    }
    const origin = y + originOffset;
    const stable = this.alignStaves(positions, visible, origin, offsets);
    if (!stable) this.diagnostics.push({ code: 'StaffSpacingLimit', measures });
    const row: ContinuousRow = {
      systems: positions.map((p) => p.sys),
      x: options.x,
      y,
      width: x - options.measureGap - options.x,
      height: rowHeight,
      overflow: Math.max(measureOverflow, minimum - options.width),
      measures,
      visibleStaves: visible.map((j) => this.spec.staves[j].id),
      restGroups: units
        .filter((u) => u.last > u.first)
        .map((u) => Array.from({ length: u.last - u.first + 1 }, (_, k) => u.first + k + 1)),
    };
    if (rowInk) this.rowInk.set(row, rowInk);
    if (row.overflow) this.diagnostics.push({ code: 'RowOverflow', measures });
    this.decorate(units, visible, first === 0, y + 15);
    for (const chord of this.splitChords) {
      if (chord.measure < first || chord.measure > last) continue;
      const a = chord.upper,
        b = chord.lower,
        x = a.getStemX(),
        top = Math.max(...a.getYs()),
        bottom = Math.min(...b.getYs());
      if (Math.abs(x - b.getStemX()) > Stem.WIDTH)
        this.diagnostics.push({ code: 'SplitStemAlignment', measures: [chord.measure + 1], source: chord.id });
      else if (!splitStemFor(a))
        this.drawing.push((ctx) => {
          ctx.fillRect(x - Stem.WIDTH / 2, top, Stem.WIDTH, bottom - top);
        });
    }
    for (const s of spans) {
      if (s.beam) {
        this.fragments.push(s.beam.placeRow(first, last, this.rows.length, s.spec.id));
        continue;
      }
      const f = this.makeFragment(s, units, measures, origin + offsets[s.first.staff] + baseline(s));
      if (f) this.fragments.push(f);
    }
    return row;
  }

  /** Carry the source syllable's distance from its top staff line to each continuation. */
  private lyricBaseline(word: Annotation, stave: Stave): number {
    const rowBaseline = this.textLanes?.baseline(word, stave);
    if (rowBaseline !== undefined) return rowBaseline;
    const source = word.checkAttachedNote().checkStave();
    const spaces = (word.computeY().y + word.getYShift() - source.getYForLine(0)) / source.space(1);
    return stave.getYForLine(0) + stave.space(spaces);
  }

  /** Keep continuation hooks and labels on the correct end when a span crosses a row. */
  private makeFragment(
    s: ResolvedSpan,
    units: Unit[],
    measures: number[],
    baseline: number,
    report = true
  ): SpanFragment | undefined {
    const first = units[0].first,
      last = units[units.length - 1].first;
    const starts = s.first.measure >= first,
      ends = s.last.measure <= units[units.length - 1].last;
    const { kind } = s.spec,
      above = spanAbove(s.spec);
    const startStaff = this.score.staves[first][s.first.staff],
      endStaff = this.score.staves[last][ends ? s.last.staff : s.first.staff];
    const space = startStaff.space(1),
      sign = above ? -1 : 1;
    let x1 = starts ? s.first.note.getAbsoluteX() : startStaff.getNoteStartX() + 2;
    let x2 = ends ? s.last.note.getAbsoluteX() + s.last.note.getGlyphWidth() : endStaff.getNoteEndX() - 3;
    let y1 = baseline,
      y2 = baseline;
    if (s.syllable) {
      y1 = y2 = this.lyricBaseline(!starts && ends && s.toSyllable ? s.toSyllable : s.syllable, startStaff);
      if (!starts && s.toSyllable) x1 -= this.continuationPadding.get(startStaff) ?? 0;
      if (starts) {
        const ink = s.syllable.getTextInk(s.syllable.computeX().x, s.syllable.computeY().y);
        x1 = ink.x + ink.w + space * 0.35;
      }
      if (ends) {
        x2 = s.toSyllable
          ? s.toSyllable.getTextInk(s.toSyllable.computeX().x, 0).x - space * 0.35
          : (s.last.note as StaveNote).getNoteHeadBeginX() + s.last.note.getGlyphWidth();
      }
    }
    if (kind === 'tie' || kind === 'slur') {
      if (!starts && (kind === 'slur' || s.spec.string !== undefined))
        x1 -= this.continuationPadding.get(startStaff) ?? 0;
      if (starts) x1 = s.first.note.getTieRightX();
      if (ends) x2 = s.last.note.getTieLeftX();
      if (s.spec.string !== undefined) {
        // Follow the same physical string at both row edges, with clearance for the fret numbers.
        const line = s.spec.string - 1;
        const endLine = ends ? (s.last.note as TabNote).getPositions()[s.spec.toHead!].str - 1 : line;
        const clearance = sign * space * 0.3;
        y1 = (starts ? s.first.note.checkStave() : startStaff).getYForLine(line) + clearance;
        y2 = (ends ? s.last.note.checkStave() : endStaff).getYForLine(endLine) + clearance;
        if (kind === 'slur') {
          const pad = space * 0.3;
          if (starts) {
            const digit = (s.first.note as TabNote).getFretInk()[s.spec.fromHead!];
            x1 = digit.x + digit.w + pad;
          }
          if (ends) x2 = (s.last.note as TabNote).getFretInk()[s.spec.toHead!].x - pad;
        }
      } else {
        const fromHead = kind === 'slur' ? slurHead(s.first.note, s.spec.fromHead, above) : s.spec.fromHead;
        const toHead = kind === 'slur' ? slurHead(s.last.note, s.spec.toHead, above) : s.spec.toHead;
        if (kind === 'slur') {
          // A long right-hand modifier can push a tie's default anchor past the next attack.
          // Check the selected heads before concluding that the row has no room for the slur.
          if (starts) {
            const head = (s.first.note as StaveNote).getHeadInk()[fromHead!];
            x1 = head.x + head.w;
          }
          if (ends) x2 = (s.last.note as StaveNote).getHeadInk()[toHead!].x;
        }
        y1 =
          (starts ? s.first.note.getYs()[fromHead ?? 0] : continuationPitch(s.first, startStaff, fromHead)) +
          sign * space * (starts ? 0.5 : 1.1);
        y2 =
          (ends
            ? s.last.note.getYs()[toHead ?? 0]
            : continuationPitch(kind === 'slur' ? s.first : s.last, endStaff, kind === 'slur' ? fromHead : toHead)) +
          sign * space * (ends ? 0.5 : 1.1);
      }
    }
    if (kind === 'glissando') {
      if (starts) {
        const head = (s.first.note as StaveNote).getHeadInk()[s.spec.fromHead ?? 0];
        x1 = head.x + head.w + space * 0.3;
      } else {
        x1 -= this.continuationPadding.get(startStaff) ?? 0;
      }
      if (ends) {
        const head = (s.last.note as StaveNote).getHeadInk()[s.spec.toHead ?? 0];
        x2 = head.x - endStaff.space(0.3);
      }
    }
    if (kind === 'volta') {
      x1 = starts ? this.score.staves[s.first.measure][s.first.staff].getX() + 1 : startStaff.getX() + 1;
      x2 = ends ? this.score.staves[s.last.measure][s.last.staff].getNoteEndX() : endStaff.getNoteEndX();
    }
    // On a short mute, keep the closing hook at the last string attack and let the label lead into it.
    if (kind === 'palmMute' && starts && s.label) {
      x1 = Math.max(startStaff.getX(), Math.min(x1, x2 - s.label.getWidth() - space));
    }
    if (kind === 'hyphen' && ends && !s.toSyllable) x2 = s.last.note.getAbsoluteX() - space * 0.3;
    if (x2 <= x1 || (starts && s.label && x1 + s.label.getWidth() > x2)) {
      if (report) this.diagnostics.push({ code: 'SpanOverflow', measures, source: s.spec.id });
      if (x2 <= x1) return;
    }
    const fragment: SpanFragment = {
      id: s.spec.id,
      kind,
      row: this.rows.length,
      part: starts ? (ends ? 'single' : 'first') : ends ? 'last' : 'middle',
      x1,
      x2,
      y1,
      y2,
      progress: [0, 1],
      ...(s.spec.wavy && { wavy: true }),
      ...(s.spec.flared && { flared: true }),
      ...(s.spec.halfDashed && { halfDashed: true }),
      ...(s.spec.dashed && { dashed: true }),
      ...((kind === 'palmMute' || s.spec.string !== undefined) && {
        strings:
          s.spec.string !== undefined
            ? [...new Set([s.spec.string, (s.last.note as TabNote).getPositions()[s.spec.toHead!].str])]
            : s.spec.strings,
        ...(starts && { from: s.spec.from }),
        ...(ends && { to: s.spec.to }),
      }),
      above,
      space,
    };
    if (s.spec.bend && s.bendLabel) {
      fragment.bend = layoutTiedBend(
        s.spec.bend,
        starts ? s.first.note : undefined,
        ends ? s.last.note : undefined,
        x1,
        endStaff.getNoteEndX() - space * 0.35,
        startStaff.getYForLine(s.spec.string! - 1),
        baseline,
        space,
        s.bendLabel
      );
    }
    if (s.spec.niente && kind === 'crescendo' && starts) fragment.nienteTip = nienteTip(x1, y1, space, 'left');
    if (s.spec.niente && kind === 'diminuendo' && ends) fragment.nienteTip = nienteTip(x2, y2, space, 'right');
    if ((kind === 'slur' || kind === 'tie') && s.spec.string === undefined) {
      const events = units.flatMap((u) => {
        const staves = this.score.staves[u.first];
        return this.score.notes[u.first]
          .flat(2)
          .filter(
            (n): n is StaveNote =>
              n instanceof StaveNote &&
              (n.getStave() === staves[s.first.staff] || n.getStave() === staves[s.last.staff])
          );
      });
      // System text is placed outside the finished curve; it must not push that same curve away.
      let fitted: boolean;
      if (kind === 'slur') {
        fitted = fitPitchedSlur(fragment, s, this.measureSlurInk(events));
      } else {
        const obstacles = events
          .filter((n) => n !== s.first.note && n !== s.last.note)
          .flatMap(
            (n) =>
              measureEngraving(n, {
                extension: (e) => (this.textLanes?.isMark(e) ? { parts: [], anchors: {} } : undefined),
              }).parts
          );
        fitted = fitSpan(fragment, obstacles);
      }
      if (!fitted && report) this.diagnostics.push({ code: 'CurveCollision', measures, source: s.spec.id });
    }
    return fragment;
  }

  /** Add labels, connectors and numbered rests after all native positions have settled. */
  private decorate(units: Unit[], visible: number[], firstRow: boolean, headerY: number): void {
    const head = this.score.staves[units[0].first];
    for (const j of visible) {
      const label =
        firstRow || this.spec.staves[j].measures[units[0].first].instrument
          ? this.names[units[0].first][j].full
          : this.names[units[0].first][j].short;
      if (label)
        this.drawing.push((ctx) =>
          label.renderText(
            ctx,
            head[j].getX() - this.connectorWidth() - 7 - label.getWidth(),
            head[j].getYForLine(2) + 4
          )
        );
    }
    for (const [index, g] of this.groups.entries()) {
      const members = visible.filter((j) => j >= g.first && j <= g.last);
      if (members.length < 2) continue;
      const top = members[0],
        bottom = members[members.length - 1];
      const connector = new StaveConnector(head[top], head[bottom]).setType(g.type).setXShift(-index * 8);
      this.drawing.push((ctx) => connector.setContext(ctx).drawWithStyle());
      if (g.barlines)
        for (const u of units) {
          const staves = this.score.staves[u.first];
          if (
            this.options.independentMeters &&
            members.some(
              (j) =>
                (staves[j].getModifiers(Position.END, Barline.CATEGORY)[0] as Barline).getType() === BarlineType.NONE
            )
          )
            continue;
          const line = new StaveConnector(staves[top], staves[bottom]).setType('singleRight');
          this.drawing.push((ctx) => line.setContext(ctx).drawWithStyle());
        }
    }
    for (const u of units) {
      const staves = this.score.staves[u.first];
      let x = staves[visible[0]].getX() + 2;
      for (const { mark, boxed } of this.headerParts(u.first, u === units[0])) {
        const left = x + (boxed ? 3 : 0);
        this.drawing.push((ctx) => {
          if (boxed) {
            const box = mark.getTextInk(left, headerY);
            ctx.beginPath();
            ctx.rect(box.x - 3, box.y - 3, box.w + 6, box.h + 6);
            ctx.stroke();
          }
          mark.renderText(ctx, left, headerY);
        });
        x += mark.getWidth() + (boxed ? 12 : 7);
      }
      if (u.last > u.first)
        for (const j of visible) {
          const count = u.last - u.first + 1,
            rest = new MultiMeasureRest(count, { numberOfMeasures: count }).setStave(staves[j]);
          this.drawing.push((ctx) => rest.setContext(ctx).drawWithStyle());
        }
    }
  }

  draw(context: RenderContext): void {
    for (const draw of this.drawing) draw(context);
    // A sustained note in a different voice can keep this local boundary inside a formatting window.
    for (const { next, bar } of this.interiorBars) {
      const stave = next.checkStave();
      if (this.hidden.has(stave)) continue;
      bar.setStave(stave).setX(next.getTieLeftX() - stave.space(0.5));
      bar.draw();
    }
  }
}
