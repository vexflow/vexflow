// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// Compose native notation through EasyScore, with pure diagnostics and staged strict construction.
// MIT License

import { Accidental } from './accidental';
import { Articulation } from './articulation';
import { Clef } from './clef';
import { Dot } from './dot';
import { compose, EasyScoreComposition, EasyScoreCompositionSpec } from './easyscore/composition';
import { EasyScoreReferences, EasyScoreSource } from './easyscore/elementindex';
import { EasyScoreElements } from './easyscore/elements';
import { autoBeam, EasyScoreAutoBeamOptions } from './easyscore/rhythm';
import { Element, ElementStyle } from './element';
import { Factory, FactoryElementRole, FactoryOptions } from './factory';
import { Fraction } from './fraction';
import { FretHandFinger } from './frethandfinger';
import { Modifier } from './modifier';
import { Music } from './music';
import { Note } from './note';
import { Grammar, Match, Parser, Result, Rule, RuleFunction } from './parser';
import { RenderContext } from './rendercontext';
import { Sheet, SheetOptions } from './sheet';
import { Stave } from './stave';
import { StaveModifier } from './stavemodifier';
import { StaveNoteStruct } from './stavenote';
import { Stem } from './stem';
import { StemmableNote } from './stemmablenote';
import { System, SystemOptions } from './system';
import { Tables } from './tables';
import { TabNote } from './tabnote';
import { Tickable } from './tickable';
import { TupletOptions } from './tuplet';
import { defined, log, RuntimeError } from './util';
import { Voice, VoiceMode, VoiceTime } from './voice';

export type {
  EasyScoreComposition,
  EasyScoreCompositionDiagnostic,
  EasyScoreCompositionSpec,
  EasyScoreContent,
  EasyScoreMeasureSpec,
  EasyScoreSpanSpec,
  EasyScoreStaffState,
  EasyScoreStaveSpec,
  EasyScoreVoiceSpec,
} from './easyscore/composition';
export type { EasyScoreSource } from './easyscore/elementindex';
export type { EasyScoreTabSpan } from './easyscore/elements';
export type { CompositionEngraving, CompositionMark, PlacedCompositionMark } from './easyscore/engraving';
export type { EasyScoreAutoBeamOptions } from './easyscore/rhythm';

// To enable logging for this class. Set `VexFlow.EasyScore.DEBUG` to `true`.
// eslint-disable-next-line
function L(...args: any[]): void {
  if (EasyScore.DEBUG) log('VexFlow.EasyScore', args);
}

// eslint-disable-next-line
export type CommitHook = (obj: any, note: StemmableNote, builder: Builder) => void;

export class EasyScoreGrammar implements Grammar {
  builder: Builder;

  constructor(builder: Builder) {
    this.builder = builder;
  }

  begin(): RuleFunction {
    return this.LINE;
  }

  LINE(): Rule {
    return {
      expect: [this.PIECE, this.PIECES, this.EOL],
    };
  }
  PIECE(): Rule {
    return {
      expect: [this.CHORDORNOTE, this.PARAMS],
      run: (state) => this.builder.commitPiece(state && { start: state.start, end: state.end }),
    };
  }
  PIECES(): Rule {
    return {
      expect: [this.COMMA, this.PIECE],
      zeroOrMore: true,
    };
  }
  PARAMS(): Rule {
    return {
      expect: [this.DURATION, this.TYPE, this.DOTS, this.OPTS],
    };
  }
  CHORDORNOTE(): Rule {
    return {
      expect: [this.CHORD, this.SINGLENOTE],
      or: true,
    };
  }
  CHORD(): Rule {
    return {
      expect: [this.LPAREN, this.NOTES, this.RPAREN],

      run: (state) => this.builder.addChord(state!.matches[1] as Match[]),
    };
  }
  NOTES(): Rule {
    return {
      expect: [this.NOTE],
      oneOrMore: true,
    };
  }
  NOTE(): Rule {
    return {
      expect: [this.NOTENAME, this.ACCIDENTAL, this.OCTAVE],
    };
  }
  SINGLENOTE(): Rule {
    return {
      expect: [this.NOTENAME, this.ACCIDENTAL, this.OCTAVE],
      run: (state) => {
        const s = state!;
        this.builder.addSingleNote(s.matches[0] as string, s.matches[1] as string, s.matches[2] as string);
      },
    };
  }
  ACCIDENTAL(): Rule {
    return {
      expect: [this.MICROTONES, this.ACCIDENTALS],
      maybe: true,
      or: true,
    };
  }
  DOTS(): Rule {
    return {
      expect: [this.DOT],
      zeroOrMore: true,

      run: (state) => this.builder.setNoteDots(state!.matches),
    };
  }
  TYPE(): Rule {
    return {
      expect: [this.SLASH, this.MAYBESLASH, this.TYPES],
      maybe: true,

      run: (state) => this.builder.setNoteType(state!.matches[2] as string),
    };
  }
  DURATION(): Rule {
    return {
      expect: [this.SLASH, this.DURATIONS],
      maybe: true,

      run: (state) => this.builder.setNoteDuration(state!.matches[1] as string),
    };
  }
  OPTS(): Rule {
    return {
      expect: [this.LBRACKET, this.KEYVAL, this.KEYVALS, this.RBRACKET],
      maybe: true,
    };
  }
  KEYVALS(): Rule {
    return {
      expect: [this.COMMA, this.KEYVAL],
      zeroOrMore: true,
    };
  }
  KEYVAL(): Rule {
    const unquote = (str: string) => str.slice(1, -1);

    return {
      expect: [this.KEY, this.EQUALS, this.VAL],

      run: (state) => this.builder.addNoteOption(state!.matches[0] as string, unquote(state!.matches[2] as string)),
    };
  }
  VAL(): Rule {
    return {
      expect: [this.SVAL, this.DVAL],
      or: true,
    };
  }

  KEY(): Rule {
    return { token: '[a-zA-Z][a-zA-Z0-9]*' };
  }
  DVAL(): Rule {
    return { token: '["][^"]*["]' };
  }
  SVAL(): Rule {
    return { token: "['][^']*[']" };
  }
  NOTENAME(): Rule {
    return { token: '[a-gA-G]' };
  }
  OCTAVE(): Rule {
    return { token: '[0-9]+' };
  }
  ACCIDENTALS(): Rule {
    return { token: 'bb|b|##|#|n' };
  }
  MICROTONES(): Rule {
    return { token: 'bbs|bss|bs|db|d|\\+\\+-|\\+-|\\+\\+|\\+|k|o' };
  }
  DURATIONS(): Rule {
    return { token: '[0-9whq]+' };
  }
  TYPES(): Rule {
    return { token: '[rRsSmMhHgG]' };
  }
  LPAREN(): Rule {
    return { token: '[(]' };
  }
  RPAREN(): Rule {
    return { token: '[)]' };
  }
  COMMA(): Rule {
    return { token: '[,]' };
  }
  DOT(): Rule {
    return { token: '[.]' };
  }
  SLASH(): Rule {
    return { token: '[/]' };
  }
  MAYBESLASH(): Rule {
    return { token: '[/]?' };
  }
  EQUALS(): Rule {
    return { token: '[=]' };
  }
  LBRACKET(): Rule {
    return { token: '\\[' };
  }
  RBRACKET(): Rule {
    return { token: '\\]' };
  }
  EOL(): Rule {
    return { token: '$' };
  }
}

export interface NotePiece {
  key: string;
  accid?: string | null;
  octave?: string;
}

export class Piece {
  /** Range of this piece in the most recently parsed input. */
  source?: EasyScoreSourceSpan;
  chord: NotePiece[] = [];
  duration: string;
  dots: number = 0;
  type?: string;
  options: { [x: string]: string } = {};
  constructor(duration: string) {
    this.duration = duration;
  }
}

export interface BuilderElements {
  notes: StemmableNote[];
  accidentals: (Accidental | undefined)[][];
}

// Extending Record<string, any> allows arbitrary properties via Builder.reset() & EasyScore.parse().
// eslint-disable-next-line
export interface BuilderOptions extends Record<string, any> {
  /** Native note options. String notation still supplies keys, duration, dots, and type. */
  octaveShift?: StaveNoteStruct['octaveShift'];
  strokePx?: StaveNoteStruct['strokePx'];
  alignCenter?: StaveNoteStruct['alignCenter'];
  line?: StaveNoteStruct['line'];
  durationOverride?: StaveNoteStruct['durationOverride'];
  id?: string;
  class?: string;
  articulations?: string;
  fingerings?: string;
  stem?: string;
  clef?: string;
  /** Initial duration for notes that omit one. Defaults to an eighth note. */
  duration?: string;
}

export class Builder {
  factory: Factory;
  // Initialized by the constructor via this.reset().
  elements!: BuilderElements;
  // Initialized by the constructor via this.reset().
  options!: BuilderOptions;
  // Initialized by the constructor via this.resetPiece().
  piece!: Piece;
  commitHooks: CommitHook[] = [];
  /** @internal EasyScore observes completed pieces after application hooks have run. */
  onNote?: (note: StemmableNote, source?: EasyScoreSourceSpan) => void;
  rollingDuration!: string;

  constructor(factory?: Factory) {
    // A factory-less builder is also used by syntax-only parsing.
    this.factory = factory!;
    this.reset();
  }

  reset(options?: BuilderOptions): void {
    this.options = {
      stem: 'auto',
      clef: 'treble',
      ...options,
    };
    this.elements = { notes: [], accidentals: [] };
    this.rollingDuration = options?.duration ?? '8';
    this.resetPiece();
  }

  getFactory(): Factory {
    return defined(this.factory, 'NoFactory', 'Create EasyScore with a Factory before constructing notes.');
  }

  getElements(): BuilderElements {
    return this.elements;
  }

  addCommitHook(commitHook: CommitHook): void {
    this.commitHooks.push(commitHook);
  }

  resetPiece(): void {
    L('resetPiece');
    this.piece = new Piece(this.rollingDuration);
  }

  setNoteDots(dots: Match[]): void {
    L('setNoteDots:', dots);
    if (dots) this.piece.dots = dots.length;
  }

  setNoteDuration(duration?: string): void {
    L('setNoteDuration:', duration);
    this.rollingDuration = this.piece.duration = duration || this.rollingDuration;
  }

  setNoteType(type?: string): void {
    L('setNoteType:', type);
    if (type) this.piece.type = type;
  }

  addNoteOption(key: string, value: string): void {
    L('addNoteOption: key:', key, 'value:', value);
    this.piece.options[key] = value;
  }

  addNote(key?: string, accid?: string | null, octave?: string): void {
    L('addNote:', key, accid, octave);
    this.piece.chord.push({
      key: key as string,
      accid,
      octave,
    });
  }

  addSingleNote(key: string, accid?: string | null, octave?: string): void {
    L('addSingleNote:', key, accid, octave);
    this.addNote(key, accid, octave);
  }

  // notes is an array with 3 entries
  addChord(notes: Match[]): void {
    L('startChord');
    if (typeof notes[0] !== 'object') {
      this.addSingleNote(notes[0]);
    } else {
      notes.forEach((n) => {
        if (n) this.addNote(...(n as string[])); // n => [string, string | null, string]
      });
    }
    L('endChord');
  }

  commitPiece(source?: EasyScoreSourceSpan): void {
    this.piece.source = source;
    L('commitPiece');
    const { factory } = this;

    if (!factory) return;

    const options = { ...this.options, ...this.piece.options };

    // reset() sets this.options.stem & this.options.clef but we check to make sure nothing has changed.
    // e.g., auto | up | down
    const stem = defined(options.stem, 'BadArguments', 'options.stem is not defined').toLowerCase();
    // e.g., treble | bass
    const clef = defined(options.clef, 'BadArguments', 'options.clef is not defined').toLowerCase();

    const { chord, duration, dots, type } = this.piece;

    // Create a string[] that will be assigned to the .keys property of the StaveNote.
    // Each string in the array represents a note pitch and is of the form: {NoteName}{Accidental}/{Octave}
    // Only standard accidentals are included in the .keys property. Microtonal accidentals are not included.
    const standardAccidentals = Music.accidentals;
    const keys = chord.map(
      (notePiece) =>
        notePiece.key +
        (standardAccidentals.includes(notePiece.accid ?? '') ? notePiece.accid : '') +
        '/' +
        notePiece.octave
    );
    const nativeOptions = {
      octaveShift: options.octaveShift === undefined ? undefined : Number(options.octaveShift),
      strokePx: options.strokePx === undefined ? undefined : Number(options.strokePx),
      line: options.line === undefined ? undefined : Number(options.line),
      alignCenter: String(options.alignCenter) === 'true',
      durationOverride: options.durationOverride,
    };
    const autoStem = stem === 'auto'; // StaveNoteStruct expects the underscore & lowercase.

    // Build a GhostNote or StaveNote using the information we gathered.
    const note =
      type?.toLowerCase() === 'g'
        ? factory.GhostNote({ ...nativeOptions, duration, dots })
        : factory.StaveNote({ ...nativeOptions, keys, duration, dots, type, clef, autoStem });
    if (!autoStem) note.setStemDirection(stem === 'up' ? Stem.UP : Stem.DOWN);

    // Attach accidentals.
    const accidentals: (Accidental | undefined)[] = [];
    chord.forEach((notePiece: NotePiece, index: number) => {
      const accid = notePiece.accid;
      if (typeof accid === 'string') {
        const accidental = factory.Accidental({ type: accid });
        note.addModifier(accidental, index);
        accidentals.push(accidental);
      } else {
        accidentals.push(undefined);
      }
    });

    // Attach dots.
    for (let i = 0; i < dots; i++) Dot.buildAndAttach([note], { all: true });

    this.commitHooks.forEach((commitHook) => commitHook(options, note, this));

    this.onNote?.(note, source);
    this.elements.notes.push(note);
    this.elements.accidentals.push(accidentals);
    this.resetPiece();
  }
}

/** Zero-based, end-exclusive source range. */
export interface EasyScoreSourceSpan {
  start: number;
  end: number;
}

/** Editor-friendly error. Line and column are one-based. */
export interface EasyScoreDiagnostic extends EasyScoreSourceSpan {
  code: string;
  message: string;
  line: number;
  column: number;
  measure?: number;
}

/** Parsed notation contains data only; no VexFlow elements or render context. */
export interface EasyScoreParsedPiece extends Piece {
  source: EasyScoreSourceSpan;
}

export interface EasyScoreParseResult {
  success: boolean;
  pieces: EasyScoreParsedPiece[];
  diagnostics: EasyScoreDiagnostic[];
}

/** The same diagnostics are available to callers that prefer exceptions. */
export class EasyScoreError extends RuntimeError {
  constructor(public readonly diagnostics: EasyScoreDiagnostic[]) {
    super('EasyScoreError', diagnostics.map((d) => `${d.message} (${d.line}:${d.column})`).join('; '));
  }
}

/** Voice settings are applied before inserting notes, including strictness and resolution. */
export interface EasyScoreVoiceOptions {
  time?: VoiceTime | string;
  mode?: 'strict' | 'soft' | 'full' | VoiceMode;
  softmaxFactor?: number;
  /** Legacy spelling remains supported. */
  options?: { softmaxFactor: number };
}

/** Collect pieces without calling Factory constructors or commit hooks. */
class NotationBuilder extends Builder {
  pieces: EasyScoreParsedPiece[] = [];

  override commitPiece(source: EasyScoreSourceSpan = { start: 0, end: 0 }): void {
    this.pieces.push({ ...this.piece, source });
    this.resetPiece();
  }
}

/** Convert a source range into the common diagnostic shape. */
function diagnostic(line: string, code: string, message: string, source: EasyScoreSourceSpan): EasyScoreDiagnostic {
  const prefix = line.slice(0, source.start);
  return { ...source, code, message, line: prefix.split('\n').length, column: source.start - prefix.lastIndexOf('\n') };
}

/** Pure extension validation runs before any Factory construction or commit hook. */
export interface EasyScoreValidationContext {
  piece: Readonly<EasyScoreParsedPiece>;
  options: Readonly<BuilderOptions>;
}

export interface EasyScoreOptions {
  factory?: Factory;
  builder?: Builder;
  commitHooks?: CommitHook[];
  throwOnError?: boolean;
  /** Reject unknown built-in options. Enabled by create(); legacy factories keep their extension behavior. */
  strictOptions?: boolean;
  /** Extra option names consumed by application commit hooks in strict mode. */
  extensions?: readonly string[];
  /** Throw to return a source diagnostic. Must not mutate input or application state. */
  validate?: (context: EasyScoreValidationContext) => void;
}

// Extending Record<string, any> allows arbitrary properties via set(defaults).
// eslint-disable-next-line
export interface EasyScoreDefaults extends Record<string, any> {
  clef?: string;
  time?: VoiceTime | string;
  stem?: string;
}

/**
 * Commit hook used by EasyScore.setOptions().
 */
function setId(options: { id?: string }, note: StemmableNote) {
  if (options.id === undefined) return;
  note.setAttribute('id', options.id);
}

// Used by setClass() below.
const commaSeparatedRegex = /\s*,\s*/;

/**
 * Commit hook used by EasyScore.setOptions().
 */
function setClass(options: { class?: string }, note: StemmableNote) {
  if (options.class === undefined) return;
  options.class.split(commaSeparatedRegex).forEach((className: string) => note.addClass(className));
}

/**
 * EasyScore implements a parser for a simple language to generate VexFlow objects.
 */
export class EasyScore {
  static DEBUG: boolean = false;
  private references = new EasyScoreReferences();
  /** The complete measure input, when parse() is constructing a trimmed measure. */
  private sourceContext?: { input: string; offset: number; measure: number };

  /** Inspect notation provenance without installing a global Registry. Useful for visual tooling. */
  static getSource(element: Element): EasyScoreSource | undefined {
    return EasyScoreReferences.sourceOf(element);
  }

  /** Look up a native object in this score. Missing IDs return undefined. */
  getElement(id: string): Element | undefined {
    return this.references.get(id);
  }

  /** Resolve a named note for typed relationship APIs. Missing IDs and non-notes throw. */
  getNote(id: string): Note {
    const element = this.getElement(id);
    if (!(element instanceof Note)) throw new RuntimeError('BadArguments', `No note with ID: ${id}`);
    return element;
  }

  /** Return a defensive copy of a generated element's source, or undefined for native objects. */
  getSource(element: Element): EasyScoreSource | undefined {
    return this.references.getSource(element);
  }

  /** Explicitly join a native extension to this score's ownership and drawing lifecycle. */
  adopt<T extends Element>(element: T, role: FactoryElementRole): T {
    return this.transaction(() => this.references.add(this.factory.adopt(element, role)));
  }

  /** Stage local references together with Factory queues and ambient registry entries. */
  private transaction<T>(build: () => T): T {
    return this.references.transaction(() => (this.factory ? this.factory.transaction(build) : build()));
  }

  /** Create a strict EasyScore facade with its own Factory. Load fonts before constructing notation. */
  static create(options: FactoryOptions, scoreOptions: Omit<EasyScoreOptions, 'factory' | 'builder'> = {}): EasyScore {
    return new Factory(options).EasyScore({ throwOnError: true, strictOptions: true, ...scoreOptions });
  }

  /** Typed constructors return native objects and share the facade's transaction boundary. */
  readonly make = new EasyScoreElements({
    factory: () => this.factory,
    manage: (construct) => this.transaction(() => this.references.add(construct())),
    owned: (element) => this.requireOwned(element),
    checkIndex: (note, index) => this.checkIndex(note, index),
    beamStems: (notes) => this.resolveBeamStems(notes),
    noteDefaults: () => ({
      clef: this.defaults.clef,
      autoStem: this.defaults.stem === 'auto',
      stemDirection: this.defaults.stem === 'down' ? Stem.DOWN : Stem.UP,
    }),
  });

  /** Attach a modifier once. Native custom modifiers are welcome; foreign Factory objects are rejected. */
  attach<T extends Note>(note: T, modifier: Modifier, index = 0): T {
    this.requireOwned(note);
    this.checkIndex(note, index);
    const owner = Factory.getOwner(modifier);
    if (owner && owner !== this.factory) throw new RuntimeError('BadArguments', 'Modifier belongs to another Factory.');
    let attached: Note | undefined;
    try {
      attached = modifier.getNote();
    } catch (error) {
      // Only the native unattached-modifier error means there is no existing owner.
      if (!(error instanceof RuntimeError) || error.code !== 'NoNote') throw error;
    }
    if (attached) {
      if (attached === note && modifier.getIndex() === index && note.getModifiers().includes(modifier)) return note;
      throw new RuntimeError('BadArguments', 'Modifier is already attached. Create a separate modifier.');
    }
    return this.transaction(() => {
      this.adopt(modifier, 'modifier');
      return note.addModifier(modifier, index);
    });
  }

  /** Attach staff notation once; the stave owns its drawing lifecycle. */
  attachToStave<T extends Stave>(stave: T, modifier: StaveModifier, position?: number): T {
    this.requireOwned(stave);
    const owner = Factory.getOwner(modifier);
    if (owner && owner !== this.factory) throw new RuntimeError('BadArguments', 'Modifier belongs to another Factory.');
    if (position !== undefined && (!Number.isInteger(position) || position < 0 || position > 6))
      throw new RuntimeError('BadArguments', 'Invalid stave modifier position.');
    if (modifier.getStave()) {
      if (
        modifier.getStave() === stave &&
        stave.getModifiers().includes(modifier) &&
        (position === undefined || position === modifier.getPosition())
      )
        return stave;
      throw new RuntimeError('BadArguments', 'Stave modifier is already attached.');
    }
    return this.transaction(() => {
      this.adopt(modifier, 'staveModifier');
      stave.addModifier(modifier, position);
      return stave;
    });
  }

  /** Apply temporary defaults to synchronous managed construction; restore them on success or failure. */
  withDefaults<T>(
    defaults: EasyScoreDefaults,
    construct: (score: EasyScore) => T & (T extends PromiseLike<unknown> ? never : unknown)
  ): T {
    const previous = this.defaults;
    try {
      this.set(defaults);
      return this.build(construct);
    } finally {
      this.defaults = previous;
    }
  }

  /** Construct aligned measures and resolve forward references before layout or drawing. */
  compose(spec: EasyScoreCompositionSpec): EasyScoreComposition {
    const prepare = spec.engraving?.prepareNote;
    if (!prepare) return compose(this, spec);
    // Scope the shared source hook to this composition, including construction failures.
    const index = this.builder.commitHooks.push(prepare) - 1;
    try {
      return compose(this, spec);
    } finally {
      this.builder.commitHooks.splice(index, 1);
    }
  }

  /** Build a normal System; its staff API and formatter options stay available. */
  system(options: SystemOptions = {}): System {
    return this.transaction(() => this.references.add(this.factory.System(options)));
  }

  /** Create a native responsive Sheet. Its systems remain managed by this Factory. */
  sheet(options: Omit<SheetOptions, 'factory'> = {}): Sheet {
    return this.transaction(() => this.factory.Sheet(options));
  }

  /**
   * Stage a group of synchronous construction calls. Failed groups release their new objects and IDs.
   * Existing-object setters and application side effects remain the caller's responsibility.
   */
  build<T>(construct: (score: EasyScore) => T & (T extends PromiseLike<unknown> ? never : unknown)): T {
    const snapshot = {
      elements: this.builder.elements,
      options: this.builder.options,
      piece: this.builder.piece,
      rollingDuration: this.builder.rollingDuration,
    };
    try {
      return this.transaction(() => {
        const result = construct(this);
        if (result && typeof result === 'object' && 'then' in result) {
          throw new RuntimeError('BadArguments', 'EasyScore.build() requires a synchronous callback.');
        }
        return result;
      });
    } catch (error) {
      Object.assign(this.builder, snapshot);
      throw error;
    }
  }

  /** Apply the Factory foreground defaults without changing global metrics or fonts. */
  setStyle(style: Pick<ElementStyle, 'fillStyle' | 'strokeStyle'>): this {
    this.factory.setStyle(style);
    return this;
  }

  /** Delegate drawing and the existing opt-in retained lifecycle to Factory. */
  draw(options: { retain?: boolean } = {}): void {
    this.factory.draw(options);
  }

  /** Release queued notation and the builder's last result. */
  reset(): this {
    this.factory.reset();
    this.builder.reset();
    this.references.clear();
    return this;
  }

  /** Endpoints and voice notes must share this facade's Factory. */
  private requireOwned(note: Element): void {
    if (Factory.getOwner(note) !== this.factory) {
      throw new RuntimeError(
        'BadArguments',
        'Note belongs to another Factory or was constructed outside this Factory.'
      );
    }
  }

  /** Reject invalid chord-head references before attaching or queuing notation. */
  private checkIndex(note: Note, index: number): void {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= (note instanceof TabNote ? note.getPositions().length : Math.max(1, note.getKeys().length))
    ) {
      throw new RuntimeError('BadArguments', `Invalid chord index: ${index}`);
    }
  }

  defaults: EasyScoreDefaults = {
    clef: 'treble',
    time: '4/4',
    stem: 'auto',
  };

  // options, factory, builder, grammar, and parser are all
  // initialized by the constructor via this.setOptions().
  options!: EasyScoreOptions;
  factory!: Factory;
  builder!: Builder;
  grammar!: EasyScoreGrammar;
  parser!: Parser;

  constructor(options: EasyScoreOptions = {}) {
    this.setOptions(options);
  }

  /**
   * Set the score defaults.
   * clef must be set appropriately to avoid errors when adding Staves.
   * @param defaults.clef default clef ( treble | bass ...) see {@link Clef.types}
   * @param defaults.time default time signature ( 4/4 | 9/8 ...)
   * @param defaults.stem default stem arrangement (auto | up | down)
   * @returns this
   */
  set(defaults: EasyScoreDefaults): this {
    this.defaults = { ...this.defaults, ...defaults };
    return this;
  }

  /**
   * @param options.factory is required.
   * @returns this
   */
  setOptions(options: EasyScoreOptions): this {
    const factory = options.factory!; // ! operator, because options.factory was set in Factory.EasyScore().
    const builder = options.builder ?? new Builder(factory);

    this.options = {
      commitHooks: [setId, setClass, Articulation.easyScoreHook, FretHandFinger.easyScoreHook],
      throwOnError: false,
      ...options,
      factory,
      builder,
    };

    this.factory = factory;
    this.builder = builder;
    this.grammar = new EasyScoreGrammar(this.builder);
    this.parser = new Parser(this.grammar);
    this.options.commitHooks?.forEach((commitHook) => this.addCommitHook(commitHook));
    return this;
  }

  setContext(context: RenderContext): this {
    this.factory.setContext(context);
    return this;
  }

  /** Parse and validate without touching this builder, its hooks, Factory queues, or registries. */
  parseNotation(line: string, options: BuilderOptions = {}): EasyScoreParseResult {
    const builder = new NotationBuilder();
    builder.reset({ clef: this.defaults.clef, stem: this.defaults.stem, ...options });
    const result = new Parser(new EasyScoreGrammar(builder)).parse(line);
    if (!result.success) {
      const start = Math.max(0, result.furthestErrorPos ?? result.errorPos ?? 0);
      return {
        success: false,
        pieces: [],
        diagnostics: [
          diagnostic(line, 'SyntaxError', 'Invalid EasyScore notation', {
            start,
            end: Math.min(line.length, start + 1),
          }),
        ],
      };
    }
    const diagnostics: EasyScoreDiagnostic[] = [];
    for (const piece of builder.pieces) {
      try {
        const options = { ...builder.options, ...piece.options };
        this.validatePiece(piece, options);
        // Validation sees copies, so extensions cannot rewrite the parser's output accidentally.
        this.options.validate?.({
          piece: {
            ...piece,
            chord: piece.chord.map((note) => ({ ...note })),
            options: { ...piece.options },
            source: { ...piece.source },
          },
          options: { ...options },
        });
      } catch (error) {
        diagnostics.push(
          diagnostic(line, 'InvalidNotation', error instanceof Error ? error.message : String(error), piece.source)
        );
      }
    }
    return { success: diagnostics.length === 0, pieces: diagnostics.length ? [] : builder.pieces, diagnostics };
  }

  /** Validate built-in fields before allocating notes. Extension values are left to application hooks. */
  private validatePiece(piece: Piece, options: BuilderOptions): void {
    Tables.durationToTicks(piece.duration);
    if (!['auto', 'up', 'down'].includes(String(options.stem).toLowerCase())) {
      throw new RuntimeError('BadArguments', `Invalid stem: ${options.stem}`);
    }
    if (!Object.hasOwnProperty.call(Clef.types, String(options.clef).toLowerCase())) {
      throw new RuntimeError('BadArguments', `Invalid clef: ${options.clef}`);
    }
    for (const name of ['octaveShift', 'strokePx', 'line'] as const) {
      if (options[name] !== undefined && !Number.isFinite(Number(options[name]))) {
        throw new RuntimeError('BadArguments', `Invalid numeric option: ${name}`);
      }
    }
    if (options.alignCenter !== undefined && ![true, false, 'true', 'false'].includes(options.alignCenter)) {
      throw new RuntimeError('BadArguments', 'alignCenter must be true or false.');
    }
    if (
      options.durationOverride !== undefined &&
      (!(options.durationOverride instanceof Fraction) ||
        !Number.isFinite(options.durationOverride.value()) ||
        options.durationOverride.value() <= 0)
    ) {
      throw new RuntimeError('BadArguments', 'durationOverride must be a positive finite Fraction.');
    }
    if (options.articulations && this.builder.commitHooks.includes(Articulation.easyScoreHook)) {
      Articulation.parseEasyScore(options.articulations);
    }
    if (this.options.strictOptions) {
      const known = new Set([
        'stem',
        'clef',
        'duration',
        'id',
        'class',
        'articulations',
        'fingerings',
        'octaveShift',
        'strokePx',
        'line',
        'alignCenter',
        'durationOverride',
        ...(this.options.extensions ?? []),
      ]);
      for (const name of Object.keys(options)) {
        if (!known.has(name)) throw new RuntimeError('BadArguments', `Unknown EasyScore option: ${name}`);
      }
    }
  }

  /** Observe source ranges only during this parse, including legacy partial results. */
  parse(line: string, options: BuilderOptions = {}): Result {
    const previous = this.builder.onNote;
    const context = this.sourceContext;
    this.builder.onNote = (note, span) => {
      previous?.(note, span);
      const source = span && {
        input: context?.input ?? line,
        start: span.start + (context?.offset ?? 0),
        end: span.end + (context?.offset ?? 0),
        ...(context && { measure: context.measure }),
      };
      this.references.add(note, source);
      note.getModifiers().forEach((modifier) => this.references.add(modifier, source));
    };
    try {
      return this.parseInput(line, options);
    } finally {
      this.builder.onNote = previous;
    }
  }

  /** Strict construction is transactional; the legacy non-throwing parser retains partial output. */
  private parseInput(line: string, options: BuilderOptions): Result {
    if (!this.options.throwOnError) {
      this.builder.reset(options);
      return this.parser.parse(line);
    }
    // parse() retains Builder's defaults; notes() supplies EasyScore's defaults explicitly.
    const parsed = this.parseNotation(line, { clef: 'treble', stem: 'auto', ...options });
    if (!parsed.success) throw new EasyScoreError(parsed.diagnostics);
    const snapshot = {
      elements: this.builder.elements,
      options: this.builder.options,
      piece: this.builder.piece,
      rollingDuration: this.builder.rollingDuration,
    };
    const build = () => {
      this.builder.reset(options);
      const result = this.parser.parse(line);
      if (!result.success) throw new RuntimeError('BadArguments', 'Error parsing line: ' + line);
      return result;
    };
    try {
      return this.transaction(build);
    } catch (error) {
      const source = parsed.pieces[this.builder.elements.notes.length]?.source ?? { start: 0, end: line.length };
      Object.assign(this.builder, snapshot);
      throw new EasyScoreError([
        diagnostic(line, 'ConstructionError', error instanceof Error ? error.message : String(error), source),
      ]);
    }
  }

  /**
   * Resolve automatic stems for the whole group while respecting explicit stems.
   * autoStem: true overrides explicit directions; false preserves all directions.
   */
  beam(notes: StemmableNote[], options?: Parameters<Factory['Beam']>[0]['options']): StemmableNote[] {
    if (this.options.strictOptions) this.make.beam({ notes, options });
    else {
      const autoStem = options?.autoStem ?? this.resolveBeamStems(notes);
      this.transaction(() => this.references.add(this.factory.Beam({ notes, options: { ...options, autoStem } })));
    }
    return notes;
  }

  /** Generate and own native beam groups without changing rhythmic duration. */
  autoBeam(notes: StemmableNote[], options: EasyScoreAutoBeamOptions = {}) {
    return autoBeam(this, notes, options);
  }

  /** Explicit pitched stems constrain the group; conflicting explicit stems remain mixed. */
  private resolveBeamStems(notes: StemmableNote[]): boolean {
    const directions = new Set(
      notes.filter((note) => !note.isRest() && !note.isAutoStem()).map((note) => note.getStemDirection())
    );
    // With no explicit direction, Beam chooses from the complete group's pitches.
    if (directions.size === 0) return true;
    if (directions.size === 1) {
      const direction = directions.values().next().value!;
      notes.filter((note) => note.isAutoStem()).forEach((note) => note.setStemDirection(direction, true));
    }
    return false;
  }

  tuplet(notes: StemmableNote[], options?: TupletOptions): StemmableNote[] {
    if (this.options.strictOptions) this.make.tuplet({ notes, options });
    else this.transaction(() => this.references.add(this.factory.Tuplet({ notes, options })));
    return notes;
  }

  notes(line: string, options: BuilderOptions = {}): StemmableNote[] {
    options = { clef: this.defaults.clef, stem: this.defaults.stem, ...options };
    this.parse(line, options);
    return this.builder.getElements().notes;
  }

  /** Mix notation fragments, full native note structs, and already-owned native tickables. */
  sequence(items: readonly (string | StaveNoteStruct | Tickable)[], options: BuilderOptions = {}): Tickable[] {
    return this.build(() =>
      items.flatMap((item): Tickable[] => {
        if (typeof item === 'string') return this.notes(item, options);
        if (item instanceof Tickable) {
          this.requireOwned(item);
          if (item instanceof Note && Factory.getGroup(item))
            throw new RuntimeError('BadArguments', 'Grouped notes cannot be sequence entries.');
          return [item];
        }
        return [this.make.note(item)];
      })
    );
  }

  /**
   * Parse bar-separated measures. Durations carry across bars; notes() is unchanged.
   * A bar may have adjacent commas. Quoted option values may contain literal bars.
   * Empty measures and invalid notation throw, rather than returning partial music.
   */
  measures(line: string, options: BuilderOptions = {}): StemmableNote[][] {
    const measures = this.splitMeasures(line);
    // Validate every measure before constructing any of them. A transaction also covers hook/constructor failures.
    let duration = options.duration;
    for (const [index, { text, offset }] of measures.entries()) {
      const parsed = this.parseNotation(text, { ...options, duration });
      if (!parsed.success)
        throw new EasyScoreError(
          parsed.diagnostics.map((d) => ({
            ...diagnostic(line, d.code, d.message, { start: offset + d.start, end: offset + d.end }),
            measure: index + 1,
          }))
        );
      duration = parsed.pieces[parsed.pieces.length - 1].duration;
    }
    const build = () => {
      duration = options.duration;
      return measures.map(({ text, offset }, index) => {
        const previous = this.sourceContext;
        this.sourceContext = { input: line, offset, measure: index + 1 };
        try {
          const result = this.parse(text, { clef: this.defaults.clef, stem: this.defaults.stem, ...options, duration });
          if (!result.success) throw new RuntimeError('BadArguments', `Invalid EasyScore measure: ${text}`);
          duration = this.builder.rollingDuration;
          return this.builder.getElements().notes;
        } catch (error) {
          const diagnostics =
            error instanceof EasyScoreError
              ? error.diagnostics
              : [
                  diagnostic(text, 'ConstructionError', error instanceof Error ? error.message : String(error), {
                    start: 0,
                    end: text.length,
                  }),
                ];
          throw new EasyScoreError(
            diagnostics.map((d) => ({
              ...diagnostic(line, d.code, d.message, { start: offset + d.start, end: offset + d.end }),
              measure: index + 1,
            }))
          );
        } finally {
          this.sourceContext = previous;
        }
      });
    };
    const snapshot = {
      elements: this.builder.elements,
      options: this.builder.options,
      piece: this.builder.piece,
      rollingDuration: this.builder.rollingDuration,
    };
    try {
      return this.transaction(build);
    } catch (error) {
      Object.assign(this.builder, snapshot);
      throw error;
    }
  }

  /** Split only unquoted bars and retain each trimmed measure's original source offset. */
  private splitMeasures(line: string): { text: string; offset: number }[] {
    const parts: string[] = [];
    const starts = [0];
    let start = 0;
    let quote = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (quote) {
        if (char === quote) quote = '';
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === '|') {
        parts.push(line.slice(start, i));
        start = i + 1;
        starts.push(start);
      }
    }
    parts.push(line.slice(start));
    return parts.map((part, index) => {
      let text = part.trim();
      if (index > 0) text = text.replace(/^,\s*/, '');
      if (index < parts.length - 1) text = text.replace(/\s*,$/, '');
      if (!text)
        throw new EasyScoreError([
          {
            ...diagnostic(line, 'EmptyMeasure', 'Empty EasyScore measure. Use an explicit rest.', {
              start: starts[index],
              end: starts[index] + part.length,
            }),
            measure: index + 1,
          },
        ]);
      return { text, offset: starts[index] + part.indexOf(text) };
    });
  }

  /** Configure time, mode, and spacing before inserting tickables. */
  voice(notes: Tickable[], options: EasyScoreVoiceOptions = {}): Voice {
    const mode =
      typeof options.mode === 'string'
        ? { strict: VoiceMode.STRICT, soft: VoiceMode.SOFT, full: VoiceMode.FULL }[options.mode]
        : (options.mode ?? VoiceMode.STRICT);
    if (![VoiceMode.STRICT, VoiceMode.SOFT, VoiceMode.FULL].includes(mode)) {
      throw new RuntimeError('BadArguments', 'Invalid voice mode.');
    }
    const factor = options.softmaxFactor ?? options.options?.softmaxFactor;
    if (factor !== undefined && (!Number.isFinite(factor) || factor <= 0)) {
      throw new RuntimeError('BadArguments', 'softmaxFactor must be positive and finite.');
    }
    if (this.options.strictOptions) notes.forEach((note) => this.requireOwned(note));
    if (notes.some((note) => note instanceof Note && Factory.getGroup(note))) {
      throw new RuntimeError('BadArguments', 'Grouped notes cannot be inserted into a main voice.');
    }
    return this.transaction(() => {
      const voice = this.factory.Voice({ time: options.time ?? this.defaults.time });
      voice.setMode(mode);
      if (factor !== undefined) voice.setSoftmaxFactor(factor);
      // Check overflow before addTickables() changes the notes' voice assignments.
      const ticks = notes.reduce(
        (total, note) => (note.shouldIgnoreTicks() ? total : total.add(note.getTicks())),
        new Fraction(0, 1)
      );
      if (mode !== VoiceMode.SOFT && ticks.greaterThan(voice.getTotalTicks())) {
        throw new RuntimeError('BadArguments', 'Too many ticks for this voice.');
      }
      return this.references.add(voice.addTickables(notes));
    });
  }

  addCommitHook(commitHook: CommitHook): void {
    this.builder.addCommitHook(commitHook);
  }
}
