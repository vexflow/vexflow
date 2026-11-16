// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// Construct, lay out, theme, and draw notation with optional retained scores.
// MIT License
// @author Mohit Cheppudira
// MIT License

import { Accidental } from './accidental';
import { Annotation, AnnotationHorizontalJustify, AnnotationVerticalJustify } from './annotation';
import { Articulation } from './articulation';
import { BarNote } from './barnote';
import { Beam, PartialBeamDirection } from './beam';
import { ChordSymbol } from './chordsymbol';
import { ClefNote } from './clefnote';
import { Crescendo } from './crescendo';
import { Curve, CurveOptions } from './curve';
import { Dot } from './dot';
import { EasyScore, EasyScoreOptions } from './easyscore';
import { Element } from './element';
import { FontInfo } from './font';
import { Formatter, FormatterOptions } from './formatter';
import { FretHandFinger } from './frethandfinger';
import { GhostNote } from './ghostnote';
import { GlyphNote, GlyphNoteOptions } from './glyphnote';
import { GraceNote, GraceNoteStruct } from './gracenote';
import { GraceNoteGroup } from './gracenotegroup';
import { KeySigNote } from './keysignote';
import { Modifier } from './modifier';
import { ModifierContext } from './modifiercontext';
import { MultiMeasureRest, MultimeasureRestRenderOptions } from './multimeasurerest';
import { Note, NoteStruct } from './note';
import { NoteSubGroup } from './notesubgroup';
import { Ornament } from './ornament';
import { Parenthesis } from './parenthesis';
import { PedalMarking } from './pedalmarking';
import { Registry } from './registry';
import { RenderContext } from './rendercontext';
import { Renderer } from './renderer';
import { RepeatNote } from './repeatnote';
import { Sheet, SheetOptions } from './sheet';
import { Stave, StaveOptions } from './stave';
import { BarlineType } from './stavebarline';
import { StaveConnector, StaveConnectorType } from './staveconnector';
import { StaveHairpin, StaveHairpinRenderOptions } from './stavehairpin';
import { StaveLine } from './staveline';
import { StaveModifier } from './stavemodifier';
import { StaveNote, StaveNoteStruct } from './stavenote';
import { StaveTie } from './stavetie';
import { StemmableNote } from './stemmablenote';
import { StringNumber } from './stringnumber';
import { Stroke } from './strokes';
import { System, SystemOptions } from './system';
import { TabNote, TabNoteStruct } from './tabnote';
import { TabStave } from './tabstave';
import { TextBracket } from './textbracket';
import { TextDynamics } from './textdynamics';
import { TextNote, TextNoteStruct } from './textnote';
import { TickContext } from './tickcontext';
import { TimeSigNote } from './timesignote';
import { Tremolo } from './tremolo';
import { Tuplet, TupletOptions } from './tuplet';
import { defined, log, RuntimeError } from './util';
import { Vibrato } from './vibrato';
import { VibratoBracket } from './vibratobracket';
import { Voice, VoiceTime } from './voice';
import { isHTMLCanvas } from './web';

/** Explicit drawing role for a native extension adopted into a Factory. */
export type FactoryElementRole = 'note' | 'modifier' | 'drawable';

export interface FactoryOptions {
  stave?: {
    space: number;
  };
  renderer?: {
    elementId: string | null;
    backend?: number;
    width: number;
    height: number;
    background?: string;
  };
}

// eslint-disable-next-line
function L(...args: any[]) {
  if (Factory.DEBUG) log('VexFlow.Factory', args);
}

/**
 * Factory implements a high level API around VexFlow.
 */
export class Factory {
  /** To enable logging for this class. Set `VexFlow.Factory.DEBUG` to `true`. */
  static DEBUG: boolean = false;

  /**
   * Static simplified function to access constructor without providing FactoryOptions
   *
   * Example:
   *
   * Create an SVG renderer and attach it to the DIV element named "boo" to render using <page-width> 1200 and <page-height> 600
   *
   * `const vf: Factory = VexFlow.Factory.newFromElementId('boo', 1200, 600 );`
   */
  static newFromElementId(elementId: string | null, width = 500, height = 200): Factory {
    return new Factory({ renderer: { elementId, width, height } });
  }

  protected options: Required<FactoryOptions>;

  protected stave?: Stave;
  protected context!: RenderContext;
  protected staves!: Stave[];
  protected voices!: Voice[];
  protected renderQ!: Element[];
  protected systems!: System[];
  protected sheets!: Sheet[];
  private retained = false;
  /** Ownership survives drawing; weak keys do not retain discarded notation. */
  private static owners = new WeakMap<Element, Factory>();
  private constructionScopes: Element[][] = [];
  private groupScopes: (() => void)[][] = [];
  private static groups = new WeakMap<Note, Modifier>();

  /** A grouped note draws only through its modifier, never through a main voice or queue. */
  static getGroup(note: Note): Modifier | undefined {
    return Factory.groups.get(note);
  }

  /** Identify the Factory that created an element, without changing its draw role. */
  static getOwner(element: Element): Factory | undefined {
    return Factory.owners.get(element);
  }

  /** Record ownership independently of whether the element draws itself or attaches to a note. */
  private own<T extends Element>(element: T): T {
    const owner = Factory.owners.get(element);
    if (owner === this) return element;
    if (owner) throw new RuntimeError('BadArguments', 'Element belongs to another Factory.');
    Factory.owners.set(element, this);
    this.constructionScopes.forEach((scope) => scope.push(element));
    return element;
  }

  /**
   * Adopt a native extension without guessing its drawing role. Attachment and layout remain explicit.
   * Repeating adoption cannot enqueue an element twice. Ownership survives draw/reset.
   */
  adopt<T extends Element>(element: T, role: FactoryElementRole): T {
    const valid =
      (role === 'note' && element instanceof Note) ||
      (role === 'modifier' && element instanceof Modifier) ||
      (role === 'drawable' &&
        element instanceof Element &&
        !(element instanceof Note) &&
        !(element instanceof Modifier) &&
        !(element instanceof Voice) &&
        !(element instanceof Stave) &&
        !(element instanceof StaveModifier) &&
        !(element instanceof System));
    if (!valid) throw new RuntimeError('BadArguments', `Invalid adopted element role: ${role}`);
    if (element instanceof Note && Factory.groups.has(element)) {
      throw new RuntimeError('BadArguments', 'A grouped note cannot be queued independently.');
    }
    this.own(element);
    if (role !== 'modifier' && !this.renderQ.includes(element)) this.renderQ.push(element);
    return element;
  }

  /** Stage synchronous construction. Failed operations preserve existing queues and registry entries. */
  transaction<T>(build: () => T): T {
    const snapshot = {
      staves: this.staves.slice(),
      voices: this.voices.slice(),
      renderQ: this.renderQ.slice(),
      systems: this.systems.slice(),
      sheets: this.sheets.slice(),
      stave: this.stave,
      retained: this.retained,
    };
    const created: Element[] = [];
    const grouped: (() => void)[] = [];
    this.constructionScopes.push(created);
    this.groupScopes.push(grouped);
    const run = () => {
      try {
        return build();
      } catch (error) {
        Object.assign(this, snapshot);
        created.forEach((element) => Factory.owners.delete(element));
        grouped
          .slice()
          .reverse()
          .forEach((restore) => restore());
        throw error;
      } finally {
        this.constructionScopes.pop();
        this.groupScopes.pop();
      }
    };
    const registry = Registry.getDefaultRegistry();
    return registry ? registry.transaction(run) : run();
  }
  /** Foreground defaults survive reset(), like renderer options. */
  protected style: { fillStyle?: string; strokeStyle?: string } = {};

  /**
   * Example:
   *
   * Create an SVG renderer and attach it to the DIV element named "boo" to render using <page-width> 1200 and <page-height> 600
   *
   * `const vf: Factory = new VexFlow.Factory({renderer: { elementId: 'boo', width: 1200, height: 600 }});`
   */
  constructor(options: FactoryOptions = {}) {
    L('New factory: ', options);
    this.options = {
      stave: {
        space: 10,
      },
      renderer: {
        elementId: '',
        width: 500,
        height: 200,
        background: '#FFF',
      },
    };

    this.setOptions(options);
  }

  reset(): void {
    this.sheets = [];
    this.retained = false;
    this.renderQ = [];
    this.systems = [];
    this.staves = [];
    this.voices = [];
    this.stave = undefined; // current stave
  }

  setOptions(options?: FactoryOptions): void {
    this.options = { ...this.options, ...options };
    this.initRenderer();
    this.reset();
  }

  initRenderer(): void {
    const { elementId, width, height, background } = this.options.renderer;
    if (elementId === null) {
      return;
    }

    if (elementId === '') {
      L(this);
      throw new RuntimeError('renderer.elementId not set in FactoryOptions');
    }

    let backend = this.options.renderer.backend;
    if (backend === undefined) {
      const elem = document.getElementById(elementId);
      // We use a custom type check here, because node-canvas mimics canvas,
      // but is not an instance of window.HTMLCanvasElement.
      // In fact, `window` might be undefined here.
      // See: https://www.npmjs.com/package/canvas
      if (isHTMLCanvas(elem)) {
        backend = Renderer.Backends.CANVAS;
      } else {
        backend = Renderer.Backends.SVG;
      }
    }

    this.context = Renderer.buildContext(elementId, backend, width, height, background);
  }

  getContext(): RenderContext {
    return this.context;
  }

  setContext(context: RenderContext): this {
    this.context = context;
    return this;
  }

  getStave(): Stave | undefined {
    return this.stave;
  }

  getVoices(): Voice[] {
    return this.voices;
  }

  /** Set score colors. Explicit element styles override these defaults. */
  setStyle(style: { fillStyle?: string; strokeStyle?: string }): this {
    this.style = { ...style };
    return this;
  }

  /** Create an optional continuous sheet from measure-sized Systems. */
  Sheet(options: Omit<SheetOptions, 'factory'> = {}): Sheet {
    const sheet = new Sheet({ ...options, factory: this });
    this.sheets.push(sheet);
    return sheet;
  }

  /** Return pixels from current stave spacing. */

  Stave(params?: { x?: number; y?: number; width?: number; options?: StaveOptions }): Stave {
    const staveSpace = this.options.stave.space;
    const p = {
      x: 0,
      y: 0,
      width: this.options.renderer.width - staveSpace * 1.0,
      options: { spacingBetweenLinesPx: staveSpace * 1.0 },
      ...params,
    };

    const stave: Stave = new Stave(p.x, p.y, p.width, p.options);
    this.staves.push(stave);
    stave.setContext(this.context);
    this.stave = stave;
    return this.own(stave);
  }

  TabStave(params?: { x?: number; y?: number; width?: number; options?: StaveOptions }): TabStave {
    const staveSpace = this.options.stave.space;
    const p = {
      x: 0,
      y: 0,
      width: this.options.renderer.width - staveSpace * 1.0,
      options: { spacingBetweenLinesPx: staveSpace * 1.3 },
      ...params,
    };

    const stave = new TabStave(p.x, p.y, p.width, p.options);
    this.staves.push(stave);
    stave.setContext(this.context);
    this.stave = stave;
    return this.own(stave);
  }

  StaveNote(noteStruct: StaveNoteStruct): StaveNote {
    const note = new StaveNote(noteStruct);
    if (this.stave) note.setStave(this.stave);
    note.setContext(this.context);
    this.renderQ.push(note);
    return this.own(note);
  }

  GlyphNote(glyph: string, noteStruct: NoteStruct, options?: GlyphNoteOptions): GlyphNote {
    const note = new GlyphNote(glyph, noteStruct, options);
    if (this.stave) note.setStave(this.stave);
    note.setContext(this.context);
    this.renderQ.push(note);
    return this.own(note);
  }

  RepeatNote(type: string, noteStruct?: NoteStruct, options?: GlyphNoteOptions): RepeatNote {
    const note = new RepeatNote(type, noteStruct, options);
    if (this.stave) note.setStave(this.stave);
    note.setContext(this.context);
    this.renderQ.push(note);
    return this.own(note);
  }

  GhostNote(noteStruct: string | NoteStruct): GhostNote {
    const ghostNote = new GhostNote(noteStruct);
    if (this.stave) ghostNote.setStave(this.stave);
    ghostNote.setContext(this.context);
    this.renderQ.push(ghostNote);
    return this.own(ghostNote);
  }

  TextNote(noteStruct: TextNoteStruct): TextNote {
    const textNote = new TextNote(noteStruct);
    if (this.stave) textNote.setStave(this.stave);
    textNote.setContext(this.context);
    this.renderQ.push(textNote);
    return this.own(textNote);
  }

  BarNote(params: { type?: BarlineType | string } = {}): BarNote {
    const barNote = new BarNote(params.type);
    if (this.stave) barNote.setStave(this.stave);
    barNote.setContext(this.context);
    this.renderQ.push(barNote);
    return this.own(barNote);
  }

  ClefNote(params?: { type?: string; options?: { size?: string; annotation?: string } }): ClefNote {
    const p = {
      type: 'treble',
      options: {
        size: 'default',
        annotation: undefined,
      },
      ...params,
    };

    const clefNote = new ClefNote(p.type, p.options.size, p.options.annotation);
    if (this.stave) clefNote.setStave(this.stave);
    clefNote.setContext(this.context);
    this.renderQ.push(clefNote);
    return this.own(clefNote);
  }

  TimeSigNote(params?: { time?: string }): TimeSigNote {
    const p = {
      time: '4/4',
      ...params,
    };

    const timeSigNote = new TimeSigNote(p.time);
    if (this.stave) timeSigNote.setStave(this.stave);
    timeSigNote.setContext(this.context);
    this.renderQ.push(timeSigNote);
    return this.own(timeSigNote);
  }

  KeySigNote(params: { key: string; cancelKey?: string; alterKey?: string[] }): KeySigNote {
    const keySigNote = new KeySigNote(params.key, params.cancelKey, params.alterKey);
    if (this.stave) keySigNote.setStave(this.stave);
    keySigNote.setContext(this.context);
    this.renderQ.push(keySigNote);
    return this.own(keySigNote);
  }

  TabNote(noteStruct: TabNoteStruct): TabNote {
    const note = new TabNote(noteStruct);
    if (this.stave) note.setStave(this.stave);
    note.setContext(this.context);
    this.renderQ.push(note);
    return this.own(note);
  }

  GraceNote(noteStruct: GraceNoteStruct): GraceNote {
    const note = new GraceNote(noteStruct);
    if (this.stave) note.setStave(this.stave);
    note.setContext(this.context);
    return this.own(note);
  }

  GraceNoteGroup(params: { notes: StemmableNote[]; slur?: boolean }): GraceNoteGroup {
    return this.own(new GraceNoteGroup(params.notes, params.slur).setContext(this.context));
  }

  Accidental(params: { type: string }): Accidental {
    const accid = new Accidental(params.type);
    accid.setContext(this.context);
    return this.own(accid);
  }

  Annotation(params?: {
    text?: string;
    hJustify?: string | AnnotationHorizontalJustify;
    vJustify?: string | AnnotationVerticalJustify;
    font?: FontInfo;
  }): Annotation {
    const p = {
      text: 'p',
      hJustify: AnnotationHorizontalJustify.CENTER,
      vJustify: AnnotationVerticalJustify.BOTTOM,
      ...params,
    };

    const annotation = new Annotation(p.text);
    annotation.setJustification(p.hJustify);
    annotation.setVerticalJustification(p.vJustify);
    annotation.setFont(p.font);
    annotation.setContext(this.context);
    return this.own(annotation);
  }

  ChordSymbol(params?: {
    vJustify?: string;
    hJustify?: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
  }): ChordSymbol {
    const p = {
      vJustify: 'top',
      hJustify: 'center',
      ...params,
    };

    const chordSymbol = new ChordSymbol();
    chordSymbol.setHorizontal(p.hJustify);
    chordSymbol.setVertical(p.vJustify);
    // There is a default font based on the engraving font.  Only set then
    // font if it is specific, else use the default
    if (typeof p.fontFamily === 'string' && typeof p.fontSize === 'number') {
      if (typeof p.fontWeight === 'string') chordSymbol.setFont(p.fontFamily, p.fontSize, p.fontWeight);
      else chordSymbol.setFont(p.fontFamily, p.fontSize, '');
    } else if (typeof p.fontSize === 'number') {
      chordSymbol.setFontSize(p.fontSize);
    }
    chordSymbol.setContext(this.context);
    return this.own(chordSymbol);
  }

  Articulation(params?: { betweenLines?: boolean; type?: string; position?: string | number }): Articulation {
    const articulation = new Articulation(params?.type ?? 'a.');

    if (params?.position !== undefined) articulation.setPosition(params.position);
    if (params?.betweenLines !== undefined) articulation.setBetweenLines(params.betweenLines);
    articulation.setContext(this.context);
    return this.own(articulation);
  }

  Ornament(
    type: string,
    params?: { position?: string | number; upperAccidental?: string; lowerAccidental?: string; delayed?: boolean }
  ) {
    const options = {
      type,
      accidental: '',
      ...params,
    };
    const ornament = new Ornament(type);
    if (params?.position !== undefined) {
      ornament.setPosition(params.position);
    }
    if (options.upperAccidental) {
      ornament.setUpperAccidental(options.upperAccidental);
    }
    if (options.lowerAccidental) {
      ornament.setLowerAccidental(options.lowerAccidental);
    }
    if (typeof options.delayed !== 'undefined') {
      ornament.setDelayed(options.delayed);
    }
    ornament.setContext(this.context);
    return this.own(ornament);
  }

  TextDynamics(params?: Partial<TextNoteStruct>): TextDynamics {
    const text = new TextDynamics({ text: 'p', duration: 'q', dots: 0, line: 0, ...params });

    if (this.stave) text.setStave(this.stave);
    text.setContext(this.context);
    this.renderQ.push(text);
    return this.own(text);
  }

  Fingering(params: { number?: string; position?: string }): FretHandFinger {
    const p = {
      number: '0',
      position: 'left',
      ...params,
    };

    const fingering = new FretHandFinger(p.number);
    fingering.setPosition(p.position);
    fingering.setContext(this.context);
    return this.own(fingering);
  }

  StringNumber(params: { number: string; position: string }, drawCircle = true): StringNumber {
    const stringNumber = new StringNumber(params.number);
    stringNumber.setPosition(params.position);
    stringNumber.setContext(this.context);
    stringNumber.setDrawCircle(drawCircle);
    return this.own(stringNumber);
  }

  TickContext(): TickContext {
    return new TickContext();
  }

  ModifierContext(): ModifierContext {
    return new ModifierContext();
  }

  MultiMeasureRest(params: MultimeasureRestRenderOptions): MultiMeasureRest {
    const numMeasures = defined(params.numberOfMeasures, 'NoNumberOfMeasures');
    const multiMeasureRest = new MultiMeasureRest(numMeasures, params);
    multiMeasureRest.setContext(this.context);
    this.renderQ.push(multiMeasureRest);
    return this.own(multiMeasureRest);
  }

  Voice(params?: { time?: VoiceTime | string }): Voice {
    const p = {
      time: '4/4',
      ...params,
    };
    const voice = new Voice(p.time);
    this.voices.push(voice);
    return this.own(voice);
  }

  StaveConnector(params: { topStave: Stave; bottomStave: Stave; type: StaveConnectorType }): StaveConnector {
    const connector = new StaveConnector(params.topStave, params.bottomStave);
    connector.setType(params.type).setContext(this.context);
    this.renderQ.push(connector);
    return this.own(connector);
  }

  Formatter(options?: FormatterOptions): Formatter {
    return new Formatter(options);
  }

  Tuplet(params?: { notes?: Note[]; options?: TupletOptions }): Tuplet {
    const p = {
      notes: [],
      options: {},
      ...params,
    };

    const tuplet = new Tuplet(p.notes, p.options).setContext(this.context);
    this.renderQ.push(tuplet);
    return this.own(tuplet);
  }

  Beam(params: {
    notes: StemmableNote[];
    options?: {
      autoStem?: boolean;
      secondaryBeamBreaks?: number[];
      partialBeamDirections?: {
        [noteIndex: number]: PartialBeamDirection;
      };
    };
  }): Beam {
    const beam = new Beam(params.notes, params.options?.autoStem).setContext(this.context);
    beam.breakSecondaryAt(params.options?.secondaryBeamBreaks ?? []);
    if (params.options?.partialBeamDirections) {
      Object.entries(params.options?.partialBeamDirections).forEach(([noteIndex, direction]) => {
        beam.setPartialBeamSideAt(Number(noteIndex), direction);
      });
    }
    this.renderQ.push(beam);
    return this.own(beam);
  }

  Curve(params: { from: Note | undefined; to: Note | undefined; options: CurveOptions }): Curve {
    const curve = new Curve(params.from, params.to, params.options).setContext(this.context);
    this.renderQ.push(curve);
    return this.own(curve);
  }

  StaveTie(params: {
    from?: Note | null;
    to?: Note | null;
    firstIndexes?: number[];
    lastIndexes?: number[];
    text?: string;
    options?: { direction?: number };
  }): StaveTie {
    const tie = new StaveTie(
      {
        firstNote: params.from,
        lastNote: params.to,
        firstIndexes: params.firstIndexes,
        lastIndexes: params.lastIndexes,
      },
      params.text
    );

    if (params.options?.direction) tie.setDirection(params.options.direction);
    tie.setContext(this.context);
    this.renderQ.push(tie);
    return this.own(tie);
  }

  StaveLine(params: {
    from: StaveNote;
    to: StaveNote;
    firstIndexes: number[];
    lastIndexes: number[];
    options?: { text?: string; font?: FontInfo };
  }): StaveLine {
    const line = new StaveLine({
      firstNote: params.from,
      lastNote: params.to,
      firstIndexes: params.firstIndexes,
      lastIndexes: params.lastIndexes,
    });

    if (params.options?.text) line.setText(params.options.text);
    if (params.options?.font) line.setFont(params.options.font);

    line.setContext(this.context);
    this.renderQ.push(line);
    return this.own(line);
  }

  VibratoBracket(params: {
    from: Note | null;
    to: Note | null;
    options: {
      code?: number;
      line?: number;
    };
  }): VibratoBracket {
    const vibratoBracket = new VibratoBracket({
      start: params.from,
      stop: params.to,
    });

    if (params.options.line !== undefined) vibratoBracket.setLine(params.options.line);
    if (params.options.code !== undefined) vibratoBracket.setVibratoCode(params.options.code);

    vibratoBracket.setContext(this.context);
    this.renderQ.push(vibratoBracket);

    return this.own(vibratoBracket);
  }

  TextBracket(params: {
    from: Note;
    to: Note;
    text: string;
    options: {
      superscript: string;
      position: string;
      line?: number;
      font?: FontInfo;
    };
  }): TextBracket {
    const textBracket = new TextBracket({
      start: params.from,
      stop: params.to,
      text: params.text,
      superscript: params.options.superscript,
      position: params.options.position,
    });

    if (params.options.line !== undefined) textBracket.setLine(params.options.line);
    if (params.options.font) textBracket.setFont(params.options.font);

    textBracket.setContext(this.context);
    this.renderQ.push(textBracket);
    return this.own(textBracket);
  }

  System(params: SystemOptions = {}): System {
    const system = new System({ ...params, factory: this }).setContext(this.context);
    this.systems.push(system);
    return this.own(system);
  }

  /**
   * Creates EasyScore. Normally the first step after constructing a Factory. For example:
   * ```
   * const vf: Factory = new VexFlow.Factory({renderer: { elementId: 'boo', width: 1200, height: 600 }});
   * const score: EasyScore = vf.EasyScore();
   * ```
   * @param options.factory optional instance of Factory
   * @param options.builder instance of Builder
   * @param options.commitHooks function to call after a note element is created
   * @param options.throwOnError throw error in case of parsing error
   */
  EasyScore(options: EasyScoreOptions = {}): EasyScore {
    return new EasyScore({ ...options, factory: this });
  }

  PedalMarking(params?: { notes?: StaveNote[]; options?: { style: string } }): PedalMarking {
    const p = {
      notes: [],
      options: {
        style: 'mixed',
      },
      ...params,
    };

    const pedal = new PedalMarking(p.notes);
    pedal.setType(PedalMarking.typeString[p.options.style]);
    pedal.setContext(this.context);
    this.renderQ.push(pedal);
    return this.own(pedal);
  }

  NoteSubGroup(params?: { notes?: Note[] }): NoteSubGroup {
    const p = {
      notes: [],
      ...params,
    };

    return this.own(new NoteSubGroup(p.notes).setContext(this.context));
  }

  /** Transfer unvoiced notes to one modifier. Validation happens before native voice assignment. */
  groupNotes<T extends Modifier>(notes: Note[], construct: () => T): T {
    if (!notes.length || new Set(notes).size !== notes.length) {
      throw new RuntimeError('BadArguments', 'A note group needs distinct notes.');
    }
    notes.forEach((note) => {
      const owner = Factory.getOwner(note);
      if (owner && owner !== this) throw new RuntimeError('BadArguments', 'Group note belongs to another Factory.');
      if (Factory.groups.has(note)) throw new RuntimeError('BadArguments', 'Note already belongs to a group.');
      let voice: Voice | undefined;
      try {
        voice = note.getVoice();
      } catch (error) {
        if (!(error instanceof RuntimeError) || error.code !== 'NoVoice') throw error;
      }
      if (voice) throw new RuntimeError('BadArguments', 'A voiced note cannot be moved into a group.');
    });
    const ignored = notes.map((note) => note.shouldIgnoreTicks());
    const restore = () =>
      notes.forEach((note, index) => {
        Factory.groups.delete(note);
        note.clearVoice().setIgnoreTicks(ignored[index]);
      });
    let group: T;
    try {
      group = this.own(construct().setContext(this.context));
    } catch (error) {
      restore();
      throw error;
    }
    this.groupScopes.forEach((scope) => scope.push(restore));
    notes.forEach((note) => {
      this.own(note);
      Factory.groups.set(note, group);
    });
    this.renderQ = this.renderQ.filter((element) => !notes.includes(element as Note));
    return group;
  }

  /** Construct a native Dot for attachment; preserve its full constructor options. */
  Dot(...args: ConstructorParameters<typeof Dot>): Dot {
    return this.adopt(new Dot(...args).setContext(this.context), 'modifier');
  }

  /** Construct a native Parenthesis for attachment; preserve its full constructor options. */
  Parenthesis(...args: ConstructorParameters<typeof Parenthesis>): Parenthesis {
    return this.adopt(new Parenthesis(...args).setContext(this.context), 'modifier');
  }

  /** Construct a native Stroke for attachment; preserve its full constructor options. */
  Stroke(...args: ConstructorParameters<typeof Stroke>): Stroke {
    return this.adopt(new Stroke(...args).setContext(this.context), 'modifier');
  }

  /** Construct a native Tremolo for attachment; preserve its full constructor options. */
  Tremolo(...args: ConstructorParameters<typeof Tremolo>): Tremolo {
    return this.adopt(new Tremolo(...args).setContext(this.context), 'modifier');
  }

  /** Construct a native Vibrato for attachment; preserve its full constructor options. */
  Vibrato(...args: ConstructorParameters<typeof Vibrato>): Vibrato {
    return this.adopt(new Vibrato(...args).setContext(this.context), 'modifier');
  }

  /** Timed crescendo note; span hairpins have a separate constructor. */
  Crescendo(...args: ConstructorParameters<typeof Crescendo>): Crescendo {
    const note = new Crescendo(...args).setContext(this.context);
    if (this.stave) note.setStave(this.stave);
    return this.adopt(note, 'note');
  }

  /** Stave-bound hairpin. The native renderer requires both endpoints. */
  StaveHairpin(params: {
    from: Note;
    to: Note;
    type: number;
    options?: Partial<StaveHairpinRenderOptions>;
  }): StaveHairpin {
    const notes = { ...(params.from && { firstNote: params.from }), ...(params.to && { lastNote: params.to }) };
    const hairpin = new StaveHairpin(notes, params.type).setContext(this.context);
    if (params.options) hairpin.setRenderOptions({ ...hairpin.renderOptions, ...params.options });
    return this.adopt(hairpin, 'drawable');
  }

  /** Render the score. */
  draw(options: { retain?: boolean } = {}): void {
    const ctx = this.context;
    this.sheets.forEach((sheet) => sheet.format());
    const managed = new Set(this.sheets.flatMap((sheet) => sheet.getSystems()));
    this.systems.forEach((s) => {
      if (!managed.has(s)) s.setContext(ctx).format();
    });
    const defaults = ctx.getDefaultStyle();
    ctx.save();
    ctx.setDefaultStyle(this.style);
    if (this.style.fillStyle !== undefined) ctx.setFillStyle(this.style.fillStyle);
    if (this.style.strokeStyle !== undefined) ctx.setStrokeStyle(this.style.strokeStyle);
    // Clear draw flags so retained scores redraw beams and other queued elements.
    if (this.retained) this.renderQ.forEach((element) => element.setRendered(false));
    try {
      this.staves.forEach((s) => s.setContext(ctx).drawWithStyle());
      this.voices.forEach((v) => v.setContext(ctx).drawWithStyle());
      this.renderQ.forEach((e) => {
        if (!e.isRendered()) e.setContext(ctx).drawWithStyle();
      });
      this.systems.forEach((s) => s.setContext(ctx).drawWithStyle());
    } finally {
      ctx.setDefaultStyle(defaults);
      ctx.restore();
    }
    this.retained = options.retain ?? false;
    if (!options.retain) this.reset();
  }
}
