import { Accidental } from './accidental';
import { Annotation, AnnotationHorizontalJustify, AnnotationVerticalJustify } from './annotation';
import { Articulation } from './articulation';
import { BarNote } from './barnote';
import { Beam } from './beam';
import { Bend } from './bend';
import { BoundingBox } from './boundingbox';
import { CanvasContext } from './canvascontext';
import { ChordSymbol, ChordSymbolHorizontalJustify, ChordSymbolVerticalJustify, SymbolModifiers } from './chordsymbol';
import { Clef } from './clef';
import { ClefNote } from './clefnote';
import { Crescendo } from './crescendo';
import { Curve, CurvePosition } from './curve';
import { Dot } from './dot';
import { EasyScore } from './easyscore';
import { Element } from './element';
import { Factory } from './factory';
import { Font, FontStyle, FontWeight } from './font';
import { Formatter } from './formatter';
import { Fraction } from './fraction';
import { FretHandFinger } from './frethandfinger';
import { GhostNote } from './ghostnote';
import { GlyphNote } from './glyphnote';
import { Glyphs } from './glyphs';
import { GraceNote } from './gracenote';
import { GraceNoteGroup } from './gracenotegroup';
import { GraceTabNote } from './gracetabnote';
import { KeyManager } from './keymanager';
import { KeySignature } from './keysignature';
import { KeySigNote } from './keysignote';
import { Metrics, MetricsDefaults } from './metrics';
import { Modifier, ModifierPosition } from './modifier';
import { ModifierContext } from './modifiercontext';
import { MultiMeasureRest } from './multimeasurerest';
import { Music } from './music';
import { Note } from './note';
import { NoteHead } from './notehead';
import { NoteSubGroup } from './notesubgroup';
import { Ornament } from './ornament';
import { Parenthesis } from './parenthesis';
import { Parser } from './parser';
import { PedalMarking } from './pedalmarking';
import { Registry } from './registry';
import { RenderContext } from './rendercontext';
import { Renderer, RendererBackends, RendererLineEndType } from './renderer';
import { RepeatNote } from './repeatnote';
import { Stave } from './stave';
import { Barline, BarlineType } from './stavebarline';
import { StaveConnector } from './staveconnector';
import { StaveHairpin } from './stavehairpin';
import { StaveLine } from './staveline';
import { StaveModifier, StaveModifierPosition } from './stavemodifier';
import { StaveNote } from './stavenote';
import { Repetition } from './staverepetition';
import { StaveTempo } from './stavetempo';
import { StaveText } from './stavetext';
import { StaveTie } from './stavetie';
import { Volta, VoltaType } from './stavevolta';
import { Stem } from './stem';
import { StringNumber } from './stringnumber';
import { Stroke } from './strokes';
import { SVGContext } from './svgcontext';
import { System } from './system';
import { Tables } from './tables';
import { TabNote } from './tabnote';
import { TabSlide } from './tabslide';
import { TabStave } from './tabstave';
import { TabTie } from './tabtie';
import { TextBracket, TextBracketPosition } from './textbracket';
import { TextDynamics } from './textdynamics';
import { TextJustification, TextNote } from './textnote';
import { TickContext } from './tickcontext';
import { TimeSignature } from './timesignature';
import { TimeSigNote } from './timesignote';
import { Tremolo } from './tremolo';
import { Tuning } from './tuning';
import { Tuplet } from './tuplet';
import { RuntimeError } from './util';
import { DATE, ID, VERSION } from './version';
import { Vibrato } from './vibrato';
import { VibratoBracket } from './vibratobracket';
import { Voice, VoiceMode, VoiceTime } from './voice';

export class VexFlow {
  // VERSION, ID, and DATE are imported from version.ts.
  // INFO is set by the entry file in vexflow/entry/.
  static BUILD = {
    // version number.
    VERSION: VERSION,
    // git commit ID that this library was built from.
    ID: ID,
    // The date when this library was compiled.
    DATE: DATE,
    // Which build is this? vexflow, vexflow-bravura, vexflow-core, etc.
    INFO: '',
  };

  static Accidental = Accidental;
  static Annotation = Annotation;
  static Articulation = Articulation;
  static Barline = Barline;
  static BarNote = BarNote;
  static Beam = Beam;
  static Bend = Bend;
  static BoundingBox = BoundingBox;
  static CanvasContext = CanvasContext;
  static ChordSymbol = ChordSymbol;
  static Clef = Clef;
  static ClefNote = ClefNote;
  static Crescendo = Crescendo;
  static Curve = Curve;
  static Dot = Dot;
  static EasyScore = EasyScore;
  static Element = Element;
  static Factory = Factory;
  static Font = Font;
  static Formatter = Formatter;
  static Fraction = Fraction;
  static FretHandFinger = FretHandFinger;
  static GhostNote = GhostNote;
  static GlyphNote = GlyphNote;
  static GraceNote = GraceNote;
  static GraceNoteGroup = GraceNoteGroup;
  static GraceTabNote = GraceTabNote;
  static KeyManager = KeyManager;
  static KeySignature = KeySignature;
  static KeySigNote = KeySigNote;
  static Modifier = Modifier;
  static ModifierContext = ModifierContext;
  static MultiMeasureRest = MultiMeasureRest;
  static Music = Music;
  static Note = Note;
  static NoteHead = NoteHead;
  static NoteSubGroup = NoteSubGroup;
  static Ornament = Ornament;
  static Parenthesis = Parenthesis;
  static Parser = Parser;
  static PedalMarking = PedalMarking;
  static Registry = Registry;
  static RenderContext = RenderContext;
  static Renderer = Renderer;
  static RepeatNote = RepeatNote;
  static Repetition = Repetition;
  static Stave = Stave;
  static StaveConnector = StaveConnector;
  static StaveHairpin = StaveHairpin;
  static StaveLine = StaveLine;
  static StaveModifier = StaveModifier;
  static StaveNote = StaveNote;
  static StaveTempo = StaveTempo;
  static StaveText = StaveText;
  static StaveTie = StaveTie;
  static Stem = Stem;
  static StringNumber = StringNumber;
  static Stroke = Stroke;
  static SVGContext = SVGContext;
  static System = System;
  static TabNote = TabNote;
  static TabSlide = TabSlide;
  static TabStave = TabStave;
  static TabTie = TabTie;
  static TextBracket = TextBracket;
  static TextDynamics = TextDynamics;
  static TextNote = TextNote;
  static TickContext = TickContext;
  static TimeSignature = TimeSignature;
  static TimeSigNote = TimeSigNote;
  static Tremolo = Tremolo;
  static Tuning = Tuning;
  static Tuplet = Tuplet;
  static Vibrato = Vibrato;
  static VibratoBracket = VibratoBracket;
  static Voice = Voice;
  static Volta = Volta;

  static RuntimeError = RuntimeError;

  static Test = undefined; // Set by vexflow_test_helpers.ts in the debug version of this library.

  // Exported Enums.
  // Sorted by the module / file they are exported from.
  static AnnotationHorizontalJustify = AnnotationHorizontalJustify;
  static AnnotationVerticalJustify = AnnotationVerticalJustify;
  static ChordSymbolHorizontalJustify = ChordSymbolHorizontalJustify;
  static ChordSymbolVerticalJustify = ChordSymbolVerticalJustify;
  static SymbolModifiers = SymbolModifiers;
  static CurvePosition = CurvePosition;
  static FontWeight = FontWeight;
  static FontStyle = FontStyle;
  static Glyphs = Glyphs;
  static ModifierPosition = ModifierPosition;
  static RendererBackends = RendererBackends;
  static RendererLineEndType = RendererLineEndType;
  static BarlineType = BarlineType;
  static StaveModifierPosition = StaveModifierPosition;
  static VoltaType = VoltaType;
  static TextBracketPosition = TextBracketPosition;
  static TextJustification = TextJustification;
  static VoiceMode = VoiceMode;

  /**
   * Load the fonts that are used by your app.
   *
   * Call this if you are using `vexflow-core.js` to take advantage of lazy loading for fonts.
   *
   * If you are using `vexflow.js` or `vexflow-bravura.js`, this method is unnecessary, since
   * they already call loadFonts(...) and setFonts(...) for you.
   *
   * If `fontNames` is undefined, all fonts in Font.FILES will be loaded.
   * This is useful for debugging, but not recommended for production because it will load lots of fonts.
   *
   * For example, on the `flow.html` test page, you could call:
   *   `await VexFlow.loadFonts();`
   *
   * Alternatively, you may load web fonts with a stylesheet link (e.g., from Google Fonts),
   * and a @font-face { font-family: ... } rule in your CSS.
   *
   * Customize `Font.HOST_URL` and `Font.FILES` to load different fonts for your app.
   */
  static async loadFonts(...fontNames: string[]): Promise<void> {
    if (!fontNames) {
      fontNames = Object.keys(Font.FILES);
    }

    const fontLoadPromises: Promise<FontFace>[] = [];
    for (const fontName of fontNames) {
      fontLoadPromises.push(Font.load(fontName));
    }

    await Promise.all(fontLoadPromises);
  }

  /**
   * Call this if you are using `vexflow-core.js` to take advantage of lazy loading for fonts.
   *
   * `vexflow.js` and `vexflow-bravura.js` already call setFonts('Bravura', 'Academico'), so you only
   * need to call this when switching fonts.
   *
   * Example:
   * ```
   * await VexFlow.loadFonts('Bravura', 'Academico', 'Petaluma', 'Petaluma Script');
   * VexFlow.setFonts('Bravura', 'Academico');
   * ... render a score in Bravura ...
   * VexFlow.setFonts('Petaluma', 'Petaluma Script');
   * ... render a score in Petaluma...
   * ```
   * See `demos/fonts/` for more examples.
   */
  static setFonts(...fontNames: string[]): void {
    // Convert the array of font names into an array of Font objects.
    MetricsDefaults.fontFamily = fontNames.join(',');
    Metrics.clear();
  }

  static getFonts(): string[] {
    return Metrics.get('fontFamily').split(',');
  }

  static get RENDER_PRECISION_PLACES(): number {
    return Tables.RENDER_PRECISION_PLACES;
  }

  static set RENDER_PRECISION_PLACES(precision: number) {
    Tables.RENDER_PRECISION_PLACES = precision;
  }

  static get SOFTMAX_FACTOR(): number {
    return Tables.SOFTMAX_FACTOR;
  }

  static set SOFTMAX_FACTOR(factor: number) {
    Tables.SOFTMAX_FACTOR = factor;
  }

  static get UNISON(): boolean {
    return Tables.UNISON;
  }

  static set UNISON(unison: boolean) {
    Tables.UNISON = unison;
  }

  static get NOTATION_FONT_SCALE(): number {
    return Tables.NOTATION_FONT_SCALE;
  }

  static set NOTATION_FONT_SCALE(value: number) {
    Tables.NOTATION_FONT_SCALE = value;
  }

  static get TABLATURE_FONT_SCALE(): number {
    return Tables.TABLATURE_FONT_SCALE;
  }

  static set TABLATURE_FONT_SCALE(value: number) {
    Tables.TABLATURE_FONT_SCALE = value;
  }

  static get RESOLUTION(): number {
    return Tables.RESOLUTION;
  }

  static set RESOLUTION(value: number) {
    Tables.RESOLUTION = value;
  }

  static get SLASH_NOTEHEAD_WIDTH(): number {
    return Tables.SLASH_NOTEHEAD_WIDTH;
  }

  static set SLASH_NOTEHEAD_WIDTH(value: number) {
    Tables.SLASH_NOTEHEAD_WIDTH = value;
  }

  static get STAVE_LINE_DISTANCE(): number {
    return Tables.STAVE_LINE_DISTANCE;
  }

  static set STAVE_LINE_DISTANCE(value: number) {
    Tables.STAVE_LINE_DISTANCE = value;
  }

  static get STAVE_LINE_THICKNESS(): number {
    return MetricsDefaults.Stave.lineWidth;
  }

  static set STAVE_LINE_THICKNESS(value: number) {
    MetricsDefaults.Stave.lineWidth = value;
    MetricsDefaults.TabStave.lineWidth = value;
    Metrics.clear('Stave');
    Metrics.clear('TabStave');
  }

  static get STEM_HEIGHT(): number {
    return Tables.STEM_HEIGHT;
  }

  static set STEM_HEIGHT(value: number) {
    Tables.STEM_HEIGHT = value;
  }

  static get STEM_WIDTH(): number {
    return Tables.STEM_WIDTH;
  }

  static set STEM_WIDTH(value: number) {
    Tables.STEM_WIDTH = value;
  }

  static get TIME4_4(): VoiceTime {
    return Tables.TIME4_4;
  }

  static get unicode(): Record<string, string> {
    return Tables.unicode;
  }

  static keySignature(spec: string): { type: string; line: number }[] {
    return Tables.keySignature(spec);
  }

  static hasKeySignature(spec: string): boolean {
    return Tables.hasKeySignature(spec);
  }

  static getKeySignatures(): Record<string, { acc?: string; num: number }> {
    return Tables.getKeySignatures();
  }

  static clefProperties(clef: string): { lineShift: number } {
    return Tables.clefProperties(clef);
  }

  // eslint-disable-next-line
  static keyProperties(key: string, clef?: string, params?: any): any {
    return Tables.keyProperties(key, clef, params);
  }

  static durationToTicks(duration: string): number {
    return Tables.durationToTicks(duration);
  }
}
