// Project staff-local bars onto shared formatting windows without changing the timing or identity of their notes.
import { Fraction } from '../fraction';
import { Note } from '../note';
import { Barline, BarlineType } from '../stavebarline';
import { Tables } from '../tables';
import { Tickable } from '../tickable';
import { RuntimeError } from '../util';
import { Voice } from '../voice';
import type {
  EasyScoreCompositionSpec,
  EasyScoreMeasureSpec,
  EasyScoreStaffState,
  EasyScoreStaveSpec,
} from './composition';

/** The source position stays the same when a different system break is chosen. */
export interface MeterPosition {
  staff: string;
  measure: number;
  voice: number;
  event: number;
  /** Exact ticks from the beginning of this staff's local measure. */
  onset: Fraction;
}

type State = Required<EasyScoreStaffState>;
interface Entry {
  tick: Tickable;
  at: number;
}
interface LocalBar {
  spec: EasyScoreMeasureSpec;
  state: State;
  start: number;
  end: number;
  voices: Entry[][];
}

/** A barline inside another staff's held note follows its own next attack after formatting. */
export interface InteriorBar {
  next: Note;
  bar: Barline;
}

function invalid(message: string): never {
  throw new RuntimeError('BadComposition', message);
}

/** Read each source bar once and keep the exact local onset of every attack. */
function readStaff(
  staff: EasyScoreStaveSpec,
  materialize: (bar: EasyScoreMeasureSpec, initial: State) => { voices: Tickable[][]; end: State },
  positions: Map<Tickable, MeterPosition>
): LocalBar[] {
  let state: State = {
    clef: staff.clef ?? (staff.kind === 'tab' ? 'tab' : 'treble'),
    time: staff.time ?? '4/4',
    key: staff.key ?? 'C',
    showTimeSignature: staff.showTimeSignature ?? true,
  };
  const cursor = new Fraction(0, 1);
  return staff.measures.map((spec, m) => {
    const initial = {
      clef: spec.clef ?? state.clef,
      key: spec.key ?? state.key,
      time: spec.time ?? state.time,
      showTimeSignature: spec.showTimeSignature ?? state.showTimeSignature,
    };
    const { voices, end } = materialize(spec, initial);
    state = end;
    const duration = new Voice(spec.span ?? initial.time).getTotalTicks();
    const start = cursor.value();
    const entries = voices.map((notes, v) => {
      const onset = new Fraction(0, 1);
      let event = 0;
      const result = notes.map((tick) => {
        const at = cursor.clone().add(onset).value();
        if (!tick.shouldIgnoreTicks()) {
          positions.set(tick, {
            staff: staff.id,
            measure: m + 1,
            voice: v,
            event: event++,
            onset: onset.clone().simplify(),
          });
          onset.add(tick.getTicks());
        }
        return { tick, at };
      });
      if (!onset.equals(duration)) invalid(`Measure ${m + 1} on ${staff.id} does not fill its declared span.`);
      return result;
    });
    return { spec, state: initial, start, end: cursor.add(duration).value(), voices: entries };
  });
}

/** A system can break where all voices have an attack and no native beam or tuplet straddles the cut. */
function canBreak(bar: LocalBar, at: number): boolean {
  if (bar.start === at || bar.end === at) return true;
  return bar.voices.every((voice) => {
    const next = voice.findIndex((e) => e.at === at && !e.tick.shouldIgnoreTicks());
    if (next < 0) return false;
    const note = voice[next].tick;
    const previous = voice
      .slice(0, next)
      .reverse()
      .find((e) => !e.tick.shouldIgnoreTicks())?.tick;
    return !(
      note instanceof Note &&
      previous instanceof Note &&
      ((note.getBeam() && note.getBeam() === previous.getBeam()) ||
        note.getTupletStack().some((t) => previous.getTupletStack().includes(t)))
    );
  });
}

/** Keep one stave per staff in each shared window. A window edge only closes a staff's own bar. */
function windowMeasure(bars: LocalBar[], start: number, end: number, interior: InteriorBar[]): EasyScoreMeasureSpec {
  const first = bars[0];
  const last = bars[bars.length - 1];
  const width = new Fraction(end - start, Tables.RESOLUTION).simplify();
  const voices = first.voices.map((_, v) => ({
    options: first.spec.voices[v].options,
    notes: bars.flatMap((bar) => bar.voices[v].filter((e) => e.at >= start && e.at < end).map((e) => e.tick)),
  }));
  for (const [i, bar] of bars.entries()) {
    if (!i) continue;
    const next = bar.voices[0].find((e) => e.tick instanceof Note && !e.tick.shouldIgnoreTicks())?.tick;
    if (next instanceof Note)
      interior.push({ next, bar: new Barline(bars[i - 1].spec.endBarline ?? BarlineType.SINGLE) });
  }
  const ids = new Set(voices.flatMap((v) => v.notes.map((n) => n.getAttribute('id'))));
  const chords = bars.flatMap((bar) => bar.spec.chords ?? []).filter((mark) => ids.has(mark.note));
  const verses = bars.flatMap((bar) =>
    (bar.spec.verses ?? [])
      .map((verse) => {
        const syllables = ('syllables' in verse ? verse.syllables : verse).filter((mark) => ids.has(mark.note));
        return 'syllables' in verse ? { ...verse, syllables } : syllables;
      })
      .filter((verse) => ('syllables' in verse ? verse.syllables : verse).length)
  );
  return {
    ...first.state,
    instrument: first.start === start ? first.spec.instrument : undefined,
    voices,
    span: { numBeats: width.numerator, beatValue: width.denominator },
    chords,
    verses,
    endBarline: last.end === end ? (last.spec.endBarline ?? BarlineType.SINGLE) : BarlineType.NONE,
  };
}

/** Build shared cuts from the union of real barlines. Spanning notes keep their written durations. */
export function independentMeterGrid(spec: EasyScoreCompositionSpec, materialize: Parameters<typeof readStaff>[1]) {
  const positions = new Map<Tickable, MeterPosition>();
  const interior: InteriorBar[] = [];
  const parts = spec.staves.map((staff) => readStaff(staff, materialize, positions));
  const total = parts[0]?.[parts[0].length - 1]?.end;
  if (!total || parts.some((bars) => bars[bars.length - 1]?.end !== total))
    invalid('Independent staves must cover the same total duration.');
  const candidates = [...new Set(parts.flatMap((bars) => bars.map((bar) => bar.start)))].sort((a, b) => a - b);
  const cursors = parts.map(() => 0);
  const cuts = candidates.filter((at) =>
    parts.every((bars, j) => {
      while (bars[cursors[j]].end <= at) cursors[j]++;
      return canBreak(bars[cursors[j]], at);
    })
  );
  cuts.push(total);
  const staves = spec.staves.map((staff, j) => {
    const bars = parts[j];
    let index = 0;
    const measures = cuts.slice(1).map((end, i) => {
      const start = cuts[i];
      while (bars[index].end <= start) index++;
      let last = index;
      while (bars[last].end < end) last++;
      const slice = bars.slice(index, last + 1);
      if (slice.some((bar) => bar.voices.length !== slice[0].voices.length))
        invalid('A change of voice count needs a shared breakable barline.');
      return windowMeasure(slice, start, end, interior);
    });
    return { ...staff, measures };
  });
  // Global navigation and forced breaks use the first staff's authored measure numbers.
  const boundaries = spec.continuous?.boundaries?.map((b) => {
    const i = cuts.indexOf(parts[0][b.measure - 1]?.start);
    if (i < 0) invalid('A requested boundary must fall at a shared breakable onset.');
    return { ...b, measure: i + 1 };
  });
  return {
    positions,
    interior,
    spec: {
      ...spec,
      staves,
      accidentals: 'literal' as const,
      graceAccidentals: undefined,
      continuous: { ...spec.continuous, boundaries },
    },
  };
}
