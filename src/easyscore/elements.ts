// Typed notation constructors. Factory owns drawing; EasyScore owns references and construction boundaries.
import { Articulation } from '../articulation';
import type { Element } from '../element';
import type { Factory } from '../factory';
import { Note } from '../note';
import { StaveNote, StaveNoteStruct } from '../stavenote';
import { StemmableNote } from '../stemmablenote';
import { Tables } from '../tables';
import type { TupletOptions } from '../tuplet';
import { RuntimeError } from '../util';

/** Internal bridge avoids a runtime import cycle back to the facade. */
export interface EasyScoreElementHost {
  factory: () => Factory;
  manage: <T extends Element>(construct: () => T) => T;
  owned: (element: Element) => void;
  checkIndex: (note: Note, index: number) => void;
  noteDefaults: () => Partial<StaveNoteStruct>;
  beamStems: (notes: StemmableNote[]) => boolean;
}

/** Explicit methods keep native constructor signatures visible in editor completion. */
export class EasyScoreElements {
  constructor(private host: EasyScoreElementHost) {}

  private get factory(): Factory {
    return this.host.factory();
  }

  /** Typed notes inherit score clef/stem defaults; explicit native fields win. */
  note(options: StaveNoteStruct) {
    return this.host.manage(() =>
      this.factory.StaveNote({
        ...this.host.noteDefaults(),
        ...(options.stemDirection !== undefined && options.autoStem === undefined ? { autoStem: false } : {}),
        ...options,
      })
    );
  }

  /** Construct a native Annotation; its options and setters remain available. */
  annotation(...args: Parameters<Factory['Annotation']>) {
    return this.host.manage(() => this.factory.Annotation(...args));
  }

  /** Construct a native GhostNote; its options and setters remain available. */
  ghostNote(...args: Parameters<Factory['GhostNote']>) {
    return this.host.manage(() => this.factory.GhostNote(...args));
  }

  /** Construct a native GraceNote; its options and setters remain available. */
  graceNote(options: Parameters<Factory['GraceNote']>[0]) {
    return this.host.manage(() => this.factory.GraceNote({ ...this.host.noteDefaults(), ...options }));
  }

  /** Construct a native Accidental; its options and setters remain available. */
  accidental(...args: Parameters<Factory['Accidental']>) {
    return this.host.manage(() => this.factory.Accidental(...args));
  }

  /** Construct a native Articulation; its options and setters remain available. */
  articulation(options: Parameters<Factory['Articulation']>[0] = {}) {
    const marks = Articulation.parseEasyScore(options.type ?? 'staccato');
    if (marks.length !== 1) throw new RuntimeError('BadArguments', 'Create one articulation per helper call.');
    return this.host.manage(() => this.factory.Articulation({ ...marks[0], ...options, type: marks[0].type }));
  }

  /** Construct a native Ornament; its options and setters remain available. */
  ornament(...args: Parameters<Factory['Ornament']>) {
    return this.host.manage(() => this.factory.Ornament(...args));
  }

  /** Construct a native Dot; its options and setters remain available. */
  dot(...args: Parameters<Factory['Dot']>) {
    return this.host.manage(() => this.factory.Dot(...args));
  }

  /** Construct a native Parenthesis; its options and setters remain available. */
  parenthesis(...args: Parameters<Factory['Parenthesis']>) {
    return this.host.manage(() => this.factory.Parenthesis(...args));
  }

  /** Construct a native Stroke; its options and setters remain available. */
  stroke(...args: Parameters<Factory['Stroke']>) {
    return this.host.manage(() => this.factory.Stroke(...args));
  }

  /** Construct a native Tremolo; its options and setters remain available. */
  tremolo(...args: Parameters<Factory['Tremolo']>) {
    return this.host.manage(() => this.factory.Tremolo(...args));
  }

  /** Construct a native Vibrato; its options and setters remain available. */
  vibrato(...args: Parameters<Factory['Vibrato']>) {
    return this.host.manage(() => this.factory.Vibrato(...args));
  }

  /** Construct a native ChordSymbol; its options and setters remain available. */
  chordSymbol(...args: Parameters<Factory['ChordSymbol']>) {
    return this.host.manage(() => this.factory.ChordSymbol(...args));
  }

  /** Construct a native TextNote; its options and setters remain available. */
  textNote(...args: Parameters<Factory['TextNote']>) {
    return this.host.manage(() => this.factory.TextNote(...args));
  }

  /** Construct a native Fingering; its options and setters remain available. */
  fingering(...args: Parameters<Factory['Fingering']>) {
    return this.host.manage(() => this.factory.Fingering(...args));
  }

  /** Construct a native StringNumber; its options and setters remain available. */
  stringNumber(...args: Parameters<Factory['StringNumber']>) {
    return this.host.manage(() => this.factory.StringNumber(...args));
  }

  /** Grace children are owned by one modifier and are removed from the standalone draw queue. */
  graceNoteGroup(options: Parameters<Factory['GraceNoteGroup']>[0]) {
    options.notes.forEach((note) => this.host.owned(note));
    return this.host.manage(() =>
      this.factory.groupNotes(options.notes, () =>
        this.factory.GraceNoteGroup({ ...options, notes: options.notes.slice() })
      )
    );
  }

  /** Group inline notation or other subnotes before inserting the parent into a voice. */
  noteSubGroup(options: { notes: Note[] }) {
    options.notes.forEach((note) => this.host.owned(note));
    return this.host.manage(() =>
      this.factory.groupNotes(options.notes, () => this.factory.NoteSubGroup({ notes: options.notes.slice() }))
    );
  }

  /** Ties validate ownership and chord-head indexes before construction. */
  tie(options: Parameters<Factory['StaveTie']>[0]) {
    const { from, to } = options;
    this.endpoints(from, to, true);
    const first = options.firstIndexes ?? [0];
    const last = options.lastIndexes ?? [0];
    if (!first.length || first.length !== last.length) {
      throw new RuntimeError('BadArguments', 'Tie index lists must be nonempty and have the same length.');
    }
    for (const [note, indices] of [
      [from, first],
      [to, last],
    ] as const) {
      if (!note) continue;
      this.host.owned(note);
      indices.forEach((index) => this.host.checkIndex(note, index));
    }
    return this.host.manage(() => this.factory.StaveTie(options));
  }
  /** Validate complete or explicitly partial spans before native constructors run. */
  private endpoints(from: Note | null | undefined, to: Note | null | undefined, partial = false): void {
    if ((!from && !to) || (!partial && (!from || !to)))
      throw new RuntimeError('BadArguments', 'Missing span endpoint.');
    for (const note of [from, to]) {
      if (!note) continue;
      if (!(note instanceof Note)) throw new RuntimeError('BadArguments', 'Span endpoints must be notes.');
      this.host.owned(note);
    }
  }

  /** Return a beam handle while preserving EasyScore's automatic/explicit stem policy. */
  beam(params: Parameters<Factory['Beam']>[0]) {
    const { notes, options } = params;
    if (notes.length < 2 || new Set(notes).size !== notes.length)
      throw new RuntimeError('BadArguments', 'A beam needs at least two distinct notes.');
    notes.forEach((note) => {
      if (!(note instanceof StemmableNote))
        throw new RuntimeError('BadArguments', 'Beam endpoints must be stemmable notes.');
      this.host.owned(note);
      if (note.hasBeam()) throw new RuntimeError('BadArguments', 'Note already belongs to a beam.');
      if (note.getIntrinsicTicks() >= Tables.durationToTicks('4'))
        throw new RuntimeError('BadArguments', 'Beamed notes must be shorter than a quarter note.');
    });
    for (const index of options?.secondaryBeamBreaks ?? []) this.noteIndex(notes.length, index);
    for (const [index, direction] of Object.entries(options?.partialBeamDirections ?? {})) {
      this.noteIndex(notes.length, Number(index));
      if (!['L', 'R', 'B'].includes(direction))
        throw new RuntimeError('BadArguments', 'Invalid partial beam direction.');
    }
    const autoStem = options?.autoStem ?? this.host.beamStems(notes);
    return this.host.manage(() => this.factory.Beam({ notes, options: { ...options, autoStem } }));
  }

  /** Reject non-integer and out-of-range note indices before native mutation. */
  private noteIndex(length: number, index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= length)
      throw new RuntimeError('BadArguments', 'Invalid beam note index.');
  }

  /** Tuplets change rational timing before voice insertion. Nested tuplets retain native behavior. */
  tuplet(params: { notes: Note[]; options?: TupletOptions }) {
    const { notes, options } = params;
    if (!notes.length || new Set(notes).size !== notes.length)
      throw new RuntimeError('BadArguments', 'A tuplet needs distinct notes.');
    notes.forEach((note) => {
      if (!(note instanceof Note)) throw new RuntimeError('BadArguments', 'Tuplets require notes.');
      this.host.owned(note);
      let voiced = false;
      try {
        note.getVoice();
        voiced = true;
      } catch (error) {
        if (!(error instanceof RuntimeError) || error.code !== 'NoVoice') throw error;
      }
      if (voiced) throw new RuntimeError('BadArguments', 'Create tuplets before inserting notes into a voice.');
    });
    for (const ratio of [options?.numNotes ?? notes.length, options?.notesOccupied ?? 2]) {
      if (!Number.isSafeInteger(ratio) || ratio <= 0)
        throw new RuntimeError('BadArguments', 'Tuplet ratios must be positive integers.');
    }
    return this.host.manage(() => this.factory.Tuplet(params));
  }

  /** Native curves support explicit partial spans at stave boundaries. */
  curve(params: { from?: Note; to?: Note; options?: Parameters<Factory['Curve']>[0]['options'] }) {
    this.endpoints(params.from, params.to, true);
    return this.host.manage(() =>
      this.factory.Curve({ from: params.from, to: params.to, options: params.options ?? {} })
    );
  }

  /** Hairpins require two endpoints; native render offsets remain editable. */
  hairpin(params: Parameters<Factory['StaveHairpin']>[0]) {
    this.endpoints(params.from, params.to);
    if (![1, 2].includes(params.type)) throw new RuntimeError('BadArguments', 'Unknown hairpin type.');
    return this.host.manage(() => this.factory.StaveHairpin(params));
  }

  /** Lines require two staff-note endpoints and matched chord-head indexes. */
  line(params: Parameters<Factory['StaveLine']>[0]) {
    this.endpoints(params.from, params.to);
    if (!(params.from instanceof StaveNote) || !(params.to instanceof StaveNote))
      throw new RuntimeError('BadArguments', 'Lines require staff notes.');
    if (!params.firstIndexes.length || params.firstIndexes.length !== params.lastIndexes.length)
      throw new RuntimeError('BadArguments', 'Line index lists must be nonempty and matched.');
    params.firstIndexes.forEach((index) => this.host.checkIndex(params.from, index));
    params.lastIndexes.forEach((index) => this.host.checkIndex(params.to, index));
    return this.host.manage(() => this.factory.StaveLine(params));
  }

  /** Text brackets have two complete endpoints; use explicit segments at row breaks. */
  textBracket(params: Parameters<Factory['TextBracket']>[0]) {
    this.endpoints(params.from, params.to);
    return this.host.manage(() => this.factory.TextBracket(params));
  }

  /** Vibrato brackets accept native partial endpoints. */
  vibratoBracket(params: Parameters<Factory['VibratoBracket']>[0]) {
    this.endpoints(params.from, params.to, true);
    return this.host.manage(() => this.factory.VibratoBracket(params));
  }

  /** Pedal points are explicit ordered staff-note events, including repeated depress/release points. */
  pedalMarking(params: { notes: StaveNote[]; options?: { style: 'text' | 'bracket' | 'mixed' } }) {
    if (!params.notes.length) throw new RuntimeError('BadArguments', 'Pedal markings need notes.');
    params.notes.forEach((note) => {
      if (!(note instanceof StaveNote)) throw new RuntimeError('BadArguments', 'Pedal points must be staff notes.');
      this.host.owned(note);
    });
    if (!['text', 'bracket', 'mixed'].includes(params.options?.style ?? 'mixed'))
      throw new RuntimeError('BadArguments', 'Unknown pedal style.');
    return this.host.manage(() => this.factory.PedalMarking(params));
  }

  /** Timed dynamics retain all native text-note fields. */
  textDynamics(params: Parameters<Factory['TextDynamics']>[0] = {}) {
    if (!/^[pmfsrz]*$/i.test(params.text ?? 'p')) throw new RuntimeError('BadArguments', 'Unknown dynamics glyph.');
    return this.host.manage(() => this.factory.TextDynamics(params));
  }

  /** Timed crescendo notes expose their native direction and height setters. */
  crescendo(...args: Parameters<Factory['Crescendo']>) {
    return this.host.manage(() => this.factory.Crescendo(...args));
  }
}
