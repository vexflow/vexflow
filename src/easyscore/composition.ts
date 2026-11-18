// Structured construction delegates timing and layout to native Voice, System, and Sheet objects.
import { Accidental } from '../accidental';
import type { EasyScore, EasyScoreVoiceOptions } from '../easyscore';
import type { Element } from '../element';
import { Factory } from '../factory';
import { Fraction } from '../fraction';
import { GraceNoteStruct } from '../gracenote';
import { Modifier } from '../modifier';
import { Note } from '../note';
import { Sheet, SheetOptions } from '../sheet';
import { Stave, StaveOptions } from '../stave';
import { StaveNoteStruct } from '../stavenote';
import { StemmableNote } from '../stemmablenote';
import { System, SystemOptions } from '../system';
import { TabNoteStruct } from '../tabnote';
import { Tickable } from '../tickable';
import { TupletOptions } from '../tuplet';
import { RuntimeError } from '../util';
import { Voice, VoiceTime } from '../voice';
import { applyCompositionAccidentals, KeyChange } from './policies';
import { EasyScoreAutoBeamOptions } from './rhythm';

/** Written pitches stay literal, even when a key signature is displayed. */
export interface EasyScoreStaffState {
  clef?: string;
  key?: string;
  time?: string;
}

/** Explicit signs survive key-aware generation, including cautionaries and microtones. */
interface GracePitchSpec extends GraceNoteStruct {
  accidentals?: readonly { index: number; type: string; cautionary?: boolean }[];
}

interface GraceGroupSpec {
  side: 'before' | 'after';
  notes: readonly GracePitchSpec[];
  slur?: boolean;
  beam?: boolean;
}

/** Construct and validate the host's complete grace group inside the composition transaction. */
function buildGraceGroup(score: EasyScore, { side, notes, slur, beam }: GraceGroupSpec) {
  if (!['before', 'after'].includes(side) || !notes.length) invalid('Expected a nonempty before or after grace group.');
  const children = notes.map(({ accidentals, ...spec }) => {
    const child = score.make.graceNote(spec);
    for (const { index, type, cautionary } of accidentals ?? []) {
      const mark = score.make.accidental({ type });
      if (cautionary) mark.setAsCautionary();
      score.attach(child, mark, index);
    }
    return child;
  });
  const group = score.make.graceNoteGroup({ notes: children, slur });
  group.setPosition(side === 'after' ? Modifier.Position.RIGHT : Modifier.Position.LEFT);
  if (beam) group.beamNotes();
  return group;
}

/** Typed wrappers add IDs and cross-staff assignment without changing native note fields. */
export type EasyScoreContent =
  | string
  | StaveNoteStruct
  | Tickable
  | {
      note: StaveNoteStruct;
      id?: string;
      stave?: string;
      grace?: GraceGroupSpec;
    }
  | { tab: TabNoteStruct; id?: string; stave?: string; drawStem?: boolean }
  | { change: EasyScoreStaffState };

/** Tuplet indexes count timed notes, excluding inline signatures and barlines. */
export interface EasyScoreVoiceSpec {
  notes: string | readonly EasyScoreContent[];
  stem?: 'auto' | 'up' | 'down';
  options?: Omit<EasyScoreVoiceOptions, 'time' | 'mode'>;
  tuplets?: readonly { start: number; count: number; options?: TupletOptions }[];
  autoBeam?: boolean | EasyScoreAutoBeamOptions;
}

/** span is the actual duration of a pickup; time remains its displayed meter. */
export interface EasyScoreMeasureSpec extends EasyScoreStaffState {
  voices: readonly EasyScoreVoiceSpec[];
  span?: VoiceTime | string;
}

/** Staves have aligned measure arrays. Missing or uneven measures are errors. */
export interface EasyScoreStaveSpec extends EasyScoreStaffState {
  id: string;
  kind?: 'stave' | 'tab';
  options?: StaveOptions;
  spaceAbove?: number;
  spaceBelow?: number;
  measures: readonly EasyScoreMeasureSpec[];
}

/** IDs resolve only after all notes exist. Native handles remain available afterward. */
export type EasyScoreSpanSpec =
  | { kind: 'tie'; from?: string; to?: string; firstIndexes?: number[]; lastIndexes?: number[]; text?: string }
  | { kind: 'curve'; from?: string; to?: string; options?: Parameters<Factory['Curve']>[0]['options'] }
  | {
      kind: 'hairpin';
      from: string;
      to: string;
      type: number;
      options?: Parameters<Factory['StaveHairpin']>[0]['options'];
    };

/** Layout policies are explicit. Sheet does not split spans or repeat signatures at row starts. */
export interface EasyScoreCompositionSpec {
  staves: readonly EasyScoreStaveSpec[];
  sheet?: Omit<SheetOptions, 'factory'>;
  system?: Omit<SystemOptions, 'factory' | 'width' | 'autoWidth' | 'noJustification'>;
  accidentals?: 'literal' | 'key-aware';
  /** Include written grace pitches in key-aware state at their host onset. */
  graceAccidentals?: 'explicit' | 'ordered';
  signatures?: 'changes' | 'every-measure';
  spans?: readonly EasyScoreSpanSpec[];
  crossMeasureSpans?: 'reject' | 'manual';
}

/** Structured warnings identify deliberate native layout limitations. */
export interface EasyScoreCompositionDiagnostic {
  code: 'ManualSpan' | 'SignaturePolicy';
  message: string;
}

/** Arrays are measure-first, then stave, then voice. Layout remains mutable through native objects. */
export interface EasyScoreComposition {
  sheet: Sheet;
  systems: System[];
  staves: Stave[][];
  voices: Voice[][][];
  notes: Tickable[][][][];
  spans: Element[];
  diagnostics: EasyScoreCompositionDiagnostic[];
  getElement: (id: string) => Element | undefined;
  getNote: (id: string) => Note;
}

/** Internal voice metadata keeps inline state and explicit cross-staff assignments separate from layout. */
interface BuiltVoice {
  notes: Tickable[];
  state: Required<EasyScoreStaffState>;
  changes: { index: number; state: Required<EasyScoreStaffState> }[];
  assignments: Map<Note, string>;
  generated: Set<Accidental>;
}

/** Fail with a consistent construction error before drawing. */
function invalid(message: string): never {
  throw new RuntimeError('BadComposition', message);
}

/** Return exact native ticks for a declared meter, including a pickup span. */
function ticksFor(time: VoiceTime | string): Fraction {
  return new Voice(time).getTotalTicks().clone();
}

/** Scope staff defaults and build one voice's notation, without assigning a Voice yet. */
function buildVoice(
  score: EasyScore,
  spec: EasyScoreVoiceSpec,
  initial: Required<EasyScoreStaffState>,
  display: boolean
): BuiltVoice {
  return score.withDefaults({ clef: initial.clef, time: initial.time, stem: spec.stem ?? 'auto' }, () => {
    let state = { ...initial };
    const notes: Tickable[] = [];
    const changes: BuiltVoice['changes'] = [];
    const assignments = new Map<Note, string>();
    const generated = new Set<Accidental>();
    for (const item of typeof spec.notes === 'string' ? [spec.notes] : spec.notes) {
      if (typeof item === 'string') {
        notes.push(...score.notes(item));
        score.builder
          .getElements()
          .accidentals.flat()
          .forEach((mark) => {
            if (mark) generated.add(mark);
          });
      } else if (item instanceof Tickable) {
        if (Factory.getOwner(item) !== score.factory) invalid('Adopt native notes before composing them.');
        try {
          item.getVoice();
          invalid('Composition requires notes that are not already in a voice.');
        } catch (error) {
          if (!(error instanceof RuntimeError) || error.code !== 'NoVoice') throw error;
        }
        notes.push(item);
      } else if ('change' in item) {
        const previous = state;
        state = { ...state, ...item.change };
        changes.push({ index: notes.length, state: { ...state } });
        if (display) {
          if (item.change.clef) notes.push(score.make.clefNote({ type: state.clef, options: { size: 'small' } }));
          if (item.change.key)
            notes.push(score.make.keySigNote({ key: state.key, cancelKey: previous.key, clef: state.clef }));
          if (item.change.time) notes.push(score.make.timeSigNote({ time: state.time }));
        }
        score.set({ clef: state.clef, time: state.time });
      } else {
        const note =
          'tab' in item
            ? score.make.tabNote(item.tab, item.drawStem)
            : score.make.note('note' in item ? item.note : item);
        if ('grace' in item && item.grace) {
          score.attach(note, buildGraceGroup(score, item.grace), 0);
        }
        if ('id' in item && item.id !== undefined) note.setAttribute('id', item.id);
        if ('stave' in item && item.stave) assignments.set(note, item.stave);
        notes.push(note);
      }
    }
    const timed = notes.filter((note) => !note.shouldIgnoreTicks());
    for (const group of spec.tuplets ?? []) {
      if (
        !Number.isInteger(group.start) ||
        !Number.isInteger(group.count) ||
        group.start < 0 ||
        group.count < 1 ||
        group.start + group.count > timed.length
      )
        invalid('Tuplet range is outside its voice.');
      const members = timed.slice(group.start, group.start + group.count);
      if (!members.every((note): note is Note => note instanceof Note)) invalid('Tuplets require native notes.');
      score.make.tuplet({ notes: members, options: group.options });
    }
    if (spec.autoBeam) {
      if (!timed.every((note): note is StemmableNote => note instanceof StemmableNote))
        invalid('Automatic beams require stemmable notes.');
      score.set({ time: initial.time });
      score.autoBeam(timed, typeof spec.autoBeam === 'boolean' ? {} : spec.autoBeam);
    }
    return { notes, state, changes, assignments, generated };
  });
}

/** Inline changes must describe the same staff state at the same exact onset in every voice. */
function stateChanges(voice: BuiltVoice): { at: Fraction; state: Required<EasyScoreStaffState> }[] {
  return voice.changes.map(({ index, state }) => ({
    at: voice.notes
      .slice(0, index)
      .reduce((sum, note) => (note.shouldIgnoreTicks() ? sum : sum.add(note.getTicks())), new Fraction(0, 1)),
    state,
  }));
}

/** Add signatures at explicit boundaries; no hidden row-dependent behavior is introduced. */
function addSignatures(
  score: EasyScore,
  stave: Stave,
  state: Required<EasyScoreStaffState>,
  previous?: Required<EasyScoreStaffState>
): void {
  if (!previous || previous.clef !== state.clef) score.attachToStave(stave, score.make.clef(state.clef));
  if (state.clef !== 'tab' && (!previous || previous.key !== state.key))
    score.attachToStave(stave, score.make.keySignature(state.key, previous?.key));
  if (!previous || previous.time !== state.time) score.attachToStave(stave, score.make.timeSignature(state.time));
}

/** Resolve owned notes only after the entire composition is constructed. */
function buildSpans(
  score: EasyScore,
  spec: EasyScoreCompositionSpec,
  measures: Map<Note, number>,
  diagnostics: EasyScoreCompositionDiagnostic[]
): Element[] {
  return (spec.spans ?? []).map((span) => {
    const from = span.from === undefined ? undefined : score.getNote(span.from);
    const to = span.to === undefined ? undefined : score.getNote(span.to);
    for (const note of [from, to])
      if (note && !measures.has(note)) invalid('Span endpoints must belong to this composition.');
    if (from && to && measures.get(from) !== measures.get(to)) {
      if (spec.crossMeasureSpans !== 'manual') invalid('Cross-measure spans need explicit manual segmentation.');
      diagnostics.push({
        code: 'ManualSpan',
        message:
          'A cross-measure span will not split when Sheet wraps. Replace it with native partial segments before drawing across rows.',
      });
    }
    if (span.kind === 'tie') return score.make.tie({ ...span, from, to });
    if (span.kind === 'curve') return score.make.curve({ from, to, options: span.options });
    if (!from || !to) invalid('Hairpins require both endpoints.');
    return score.make.hairpin({ from, to, type: span.type, options: span.options });
  });
}

/** Build one staff measure before joining it to the shared native System. */
function buildStaffMeasure(
  score: EasyScore,
  spec: EasyScoreCompositionSpec,
  staff: EasyScoreStaveSpec,
  index: number,
  previous: Required<EasyScoreStaffState>,
  tracking: { seen: Set<Tickable>; noteMeasures: Map<Note, number> }
) {
  const assignments = new Map<Note, string>();
  const measure = staff.measures[index];
  if (!measure.voices.length) invalid('Every stave measure needs at least one voice.');
  const state = {
    clef: measure.clef ?? previous.clef,
    key: measure.key ?? previous.key,
    time: measure.time ?? previous.time,
  };
  const span = measure.span ?? state.time;
  const ticks = ticksFor(span);
  const built = measure.voices.map((voice, voiceIndex) => buildVoice(score, voice, state, voiceIndex === 0));
  const changes = stateChanges(built[0]);
  const signature = (items: ReturnType<typeof stateChanges>) =>
    JSON.stringify(items.map(({ at, state }) => [at.clone().simplify().toString(), state]));
  for (const voice of built) {
    if (signature(stateChanges(voice)) !== signature(changes))
      invalid('Inline staff changes must agree in all voices.');
    const actual = voice.notes.reduce(
      (sum, note) => (note.shouldIgnoreTicks() ? sum : sum.add(note.getTicks())),
      new Fraction(0, 1)
    );
    if (!actual.equals(ticks)) invalid(`Measure ${index + 1} on ${staff.id} does not fill its declared span.`);
    for (const note of voice.notes) {
      if (tracking.seen.has(note)) invalid('A note cannot belong to two composition voices.');
      tracking.seen.add(note);
      if (note instanceof Note) tracking.noteMeasures.set(note, index);
    }
    voice.assignments.forEach((id, note) => assignments.set(note, id));
  }
  const nativeVoices = built.map((voice, voiceIndex) =>
    score.voice(voice.notes, { ...measure.voices[voiceIndex].options, time: span, mode: 'strict' })
  );
  let currentKey = state.key;
  const keys: KeyChange[] = [];
  for (const change of changes)
    if (change.state.key !== currentKey) {
      currentKey = change.state.key;
      keys.push({ at: change.at, key: currentKey });
    }
  const policy = {
    key: state.key,
    changes: keys,
    generated: new Set(built.flatMap((voice) => [...voice.generated])),
  };
  const stave =
    staff.kind === 'tab'
      ? score.make.tabStave({ options: staff.options })
      : score.make.stave({ options: { ...staff.options, clef: state.clef } });
  addSignatures(score, stave, state, index && spec.signatures !== 'every-measure' ? previous : undefined);

  return {
    stave,
    voices: nativeVoices,
    notes: built.map((voice) => voice.notes),
    assignments,
    policy,
    ticks,
    state: built[0].state,
  };
}

/** Compose aligned measure arrays atomically. Formatting and drawing remain explicit native operations. */
export function compose(score: EasyScore, spec: EasyScoreCompositionSpec): EasyScoreComposition {
  const count = spec.staves[0]?.measures.length ?? 0;
  if (!count || !spec.staves.length) invalid('A composition needs staves and measures.');
  if (
    new Set(spec.staves.map((stave) => stave.id)).size !== spec.staves.length ||
    spec.staves.some((stave) => !stave.id)
  )
    invalid('Staff IDs must be unique and nonempty.');
  if (spec.staves.some((stave) => stave.measures.length !== count))
    invalid('All staves need the same number of measures.');
  if (spec.accidentals && !['literal', 'key-aware'].includes(spec.accidentals)) invalid('Unknown accidental policy.');
  if (spec.graceAccidentals && !['explicit', 'ordered'].includes(spec.graceAccidentals))
    invalid('Unknown grace accidental policy.');
  if (spec.graceAccidentals === 'ordered' && spec.accidentals !== 'key-aware')
    invalid('Ordered grace accidentals require key-aware accidentals.');
  if (spec.signatures && !['changes', 'every-measure'].includes(spec.signatures)) invalid('Unknown signature policy.');
  if (spec.crossMeasureSpans && !['reject', 'manual'].includes(spec.crossMeasureSpans)) invalid('Unknown span policy.');
  const nativeInputs: Note[] = [];
  for (const stave of spec.staves)
    for (const measure of stave.measures)
      for (const voice of measure.voices)
        if (typeof voice.notes !== 'string')
          for (const item of voice.notes) if (item instanceof Note) nativeInputs.push(item);
  if (
    nativeInputs.length &&
    (spec.accidentals === 'key-aware' ||
      spec.staves.some((stave) =>
        stave.measures.some((measure) => measure.voices.some((voice) => voice.autoBeam || voice.tuplets?.length))
      ))
  )
    invalid('Apply rhythm and accidental policies before adopting native inputs, or use typed note descriptions.');
  const priorStaves = new Map(nativeInputs.map((note) => [note, note.getStave()]));
  // Avoid assigning the same note to more than one voice, even when references are supplied directly.
  const seen = new Set<Tickable>();
  try {
    return score.build(() => {
      const result: EasyScoreComposition = {
        sheet: score.sheet(spec.sheet),
        systems: [],
        staves: [],
        voices: [],
        notes: [],
        spans: [],
        diagnostics: [],
        getElement: (id) => score.getElement(id),
        getNote: (id) => score.getNote(id),
      };
      if (spec.signatures !== 'every-measure')
        result.diagnostics.push({
          code: 'SignaturePolicy',
          message:
            'Signatures appear at the first measure and explicit changes. Sheet does not repeat them at wrapped row starts.',
        });
      const states = spec.staves.map((stave) => ({
        clef: stave.clef ?? (stave.kind === 'tab' ? 'tab' : 'treble'),
        key: stave.key ?? 'C',
        time: stave.time ?? '4/4',
      }));
      const noteMeasures = new Map<Note, number>();
      for (let index = 0; index < count; index++) {
        const system = result.sheet.addSystem(spec.system);
        result.systems.push(system);
        const parts = spec.staves.map((staff, staffIndex) => {
          const part = buildStaffMeasure(score, spec, staff, index, states[staffIndex], { seen, noteMeasures });
          states[staffIndex] = part.state;
          system.addStave({
            stave: part.stave,
            voices: part.voices,
            ...(staff.spaceAbove === undefined ? {} : { spaceAbove: staff.spaceAbove }),
            ...(staff.spaceBelow === undefined ? {} : { spaceBelow: staff.spaceBelow }),
          });
          return part;
        });
        if (parts.some((part) => !part.ticks.equals(parts[0].ticks)))
          invalid('Staves must share the same actual measure span.');
        const staves = parts.map((part) => part.stave);
        const voices = parts.map((part) => part.voices);
        const notes = parts.map((part) => part.notes);
        const policies = parts.map((part) => part.policy);
        const assignments = new Map(parts.flatMap((part) => [...part.assignments]));
        assignments.forEach((id, note) => {
          const target = spec.staves.findIndex((staff) => staff.id === id);
          if (target < 0) invalid(`Unknown cross-staff target: ${id}`);
          note.setStave(staves[target]);
        });
        if (spec.accidentals === 'key-aware') {
          const generated = new Set(policies.flatMap((policy) => [...policy.generated]));
          policies.forEach((policy, staffIndex) =>
            applyCompositionAccidentals(
              score,
              voices.flat(),
              policy.key,
              policy.changes,
              generated,
              staves[staffIndex],
              spec.graceAccidentals === 'ordered'
            )
          );
        }
        result.staves.push(staves);
        result.voices.push(voices);
        result.notes.push(notes);
      }
      result.spans = buildSpans(score, spec, noteMeasures, result.diagnostics);
      return result;
    });
  } catch (error) {
    // Restore caller-owned note assignments. Rhythm/accidental mutation of native inputs is rejected above.
    for (const note of nativeInputs)
      if (seen.has(note)) {
        note.clearVoice();
        const stave = priorStaves.get(note);
        if (stave) note.setStave(stave);
        else note.clearStave();
      }
    throw error;
  }
}
