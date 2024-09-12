var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Accidental } from './accidental.js';
import { Annotation, AnnotationHorizontalJustify, AnnotationVerticalJustify } from './annotation.js';
import { Articulation } from './articulation.js';
import { BarNote } from './barnote.js';
import { Beam } from './beam.js';
import { Bend } from './bend.js';
import { BoundingBox } from './boundingbox.js';
import { CanvasContext } from './canvascontext.js';
import { ChordSymbol, ChordSymbolHorizontalJustify, ChordSymbolVerticalJustify, SymbolModifiers } from './chordsymbol.js';
import { Clef } from './clef.js';
import { ClefNote } from './clefnote.js';
import { Crescendo } from './crescendo.js';
import { Curve, CurvePosition } from './curve.js';
import { Dot } from './dot.js';
import { EasyScore } from './easyscore.js';
import { Element } from './element.js';
import { Factory } from './factory.js';
import { Font, FontStyle, FontWeight } from './font.js';
import { Formatter } from './formatter.js';
import { Fraction } from './fraction.js';
import { FretHandFinger } from './frethandfinger.js';
import { GhostNote } from './ghostnote.js';
import { GlyphNote } from './glyphnote.js';
import { Glyphs } from './glyphs.js';
import { GraceNote } from './gracenote.js';
import { GraceNoteGroup } from './gracenotegroup.js';
import { GraceTabNote } from './gracetabnote.js';
import { KeyManager } from './keymanager.js';
import { KeySignature } from './keysignature.js';
import { KeySigNote } from './keysignote.js';
import { Metrics, MetricsDefaults } from './metrics.js';
import { Modifier, ModifierPosition } from './modifier.js';
import { ModifierContext } from './modifiercontext.js';
import { MultiMeasureRest } from './multimeasurerest.js';
import { Music } from './music.js';
import { Note } from './note.js';
import { NoteHead } from './notehead.js';
import { NoteSubGroup } from './notesubgroup.js';
import { Ornament } from './ornament.js';
import { Parenthesis } from './parenthesis.js';
import { Parser } from './parser.js';
import { PedalMarking } from './pedalmarking.js';
import { Registry } from './registry.js';
import { RenderContext } from './rendercontext.js';
import { Renderer, RendererBackends, RendererLineEndType } from './renderer.js';
import { RepeatNote } from './repeatnote.js';
import { Stave } from './stave.js';
import { Barline, BarlineType } from './stavebarline.js';
import { StaveConnector } from './staveconnector.js';
import { StaveHairpin } from './stavehairpin.js';
import { StaveLine } from './staveline.js';
import { StaveModifier, StaveModifierPosition } from './stavemodifier.js';
import { StaveNote } from './stavenote.js';
import { Repetition } from './staverepetition.js';
import { StaveTempo } from './stavetempo.js';
import { StaveText } from './stavetext.js';
import { StaveTie } from './stavetie.js';
import { Volta, VoltaType } from './stavevolta.js';
import { Stem } from './stem.js';
import { StringNumber } from './stringnumber.js';
import { Stroke } from './strokes.js';
import { SVGContext } from './svgcontext.js';
import { System } from './system.js';
import { Tables } from './tables.js';
import { TabNote } from './tabnote.js';
import { TabSlide } from './tabslide.js';
import { TabStave } from './tabstave.js';
import { TabTie } from './tabtie.js';
import { TextBracket, TextBracketPosition } from './textbracket.js';
import { TextDynamics } from './textdynamics.js';
import { TextJustification, TextNote } from './textnote.js';
import { TickContext } from './tickcontext.js';
import { TimeSignature } from './timesignature.js';
import { TimeSigNote } from './timesignote.js';
import { Tremolo } from './tremolo.js';
import { Tuning } from './tuning.js';
import { Tuplet } from './tuplet.js';
import { RuntimeError } from './util.js';
import { DATE, ID, VERSION } from './version.js';
import { Vibrato } from './vibrato.js';
import { VibratoBracket } from './vibratobracket.js';
import { Voice, VoiceMode } from './voice.js';
export class VexFlow {
    static loadFonts(...fontNames) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!fontNames) {
                fontNames = Object.keys(Font.FILES);
            }
            const fontLoadPromises = [];
            for (const fontName of fontNames) {
                fontLoadPromises.push(Font.load(fontName));
            }
            yield Promise.all(fontLoadPromises);
        });
    }
    static setFonts(...fontNames) {
        MetricsDefaults.fontFamily = fontNames.join(',');
        Metrics.clear();
    }
    static getFonts() {
        return Metrics.get('fontFamily').split(',');
    }
    static get RENDER_PRECISION_PLACES() {
        return Tables.RENDER_PRECISION_PLACES;
    }
    static set RENDER_PRECISION_PLACES(precision) {
        Tables.RENDER_PRECISION_PLACES = precision;
    }
    static get SOFTMAX_FACTOR() {
        return Tables.SOFTMAX_FACTOR;
    }
    static set SOFTMAX_FACTOR(factor) {
        Tables.SOFTMAX_FACTOR = factor;
    }
    static get UNISON() {
        return Tables.UNISON;
    }
    static set UNISON(unison) {
        Tables.UNISON = unison;
    }
    static get NOTATION_FONT_SCALE() {
        return Tables.NOTATION_FONT_SCALE;
    }
    static set NOTATION_FONT_SCALE(value) {
        Tables.NOTATION_FONT_SCALE = value;
    }
    static get TABLATURE_FONT_SCALE() {
        return Tables.TABLATURE_FONT_SCALE;
    }
    static set TABLATURE_FONT_SCALE(value) {
        Tables.TABLATURE_FONT_SCALE = value;
    }
    static get RESOLUTION() {
        return Tables.RESOLUTION;
    }
    static set RESOLUTION(value) {
        Tables.RESOLUTION = value;
    }
    static get SLASH_NOTEHEAD_WIDTH() {
        return Tables.SLASH_NOTEHEAD_WIDTH;
    }
    static set SLASH_NOTEHEAD_WIDTH(value) {
        Tables.SLASH_NOTEHEAD_WIDTH = value;
    }
    static get STAVE_LINE_DISTANCE() {
        return Tables.STAVE_LINE_DISTANCE;
    }
    static set STAVE_LINE_DISTANCE(value) {
        Tables.STAVE_LINE_DISTANCE = value;
    }
    static get STAVE_LINE_THICKNESS() {
        return MetricsDefaults.Stave.lineWidth;
    }
    static set STAVE_LINE_THICKNESS(value) {
        MetricsDefaults.Stave.lineWidth = value;
        MetricsDefaults.TabStave.lineWidth = value;
        Metrics.clear('Stave');
        Metrics.clear('TabStave');
    }
    static get STEM_HEIGHT() {
        return Tables.STEM_HEIGHT;
    }
    static set STEM_HEIGHT(value) {
        Tables.STEM_HEIGHT = value;
    }
    static get STEM_WIDTH() {
        return Tables.STEM_WIDTH;
    }
    static set STEM_WIDTH(value) {
        Tables.STEM_WIDTH = value;
    }
    static get TIME4_4() {
        return Tables.TIME4_4;
    }
    static get unicode() {
        return Tables.unicode;
    }
    static keySignature(spec) {
        return Tables.keySignature(spec);
    }
    static hasKeySignature(spec) {
        return Tables.hasKeySignature(spec);
    }
    static getKeySignatures() {
        return Tables.getKeySignatures();
    }
    static clefProperties(clef) {
        return Tables.clefProperties(clef);
    }
    static keyProperties(key, clef, params) {
        return Tables.keyProperties(key, clef, params);
    }
    static durationToTicks(duration) {
        return Tables.durationToTicks(duration);
    }
}
VexFlow.BUILD = {
    VERSION: VERSION,
    ID: ID,
    DATE: DATE,
    INFO: '',
};
VexFlow.Accidental = Accidental;
VexFlow.Annotation = Annotation;
VexFlow.Articulation = Articulation;
VexFlow.Barline = Barline;
VexFlow.BarNote = BarNote;
VexFlow.Beam = Beam;
VexFlow.Bend = Bend;
VexFlow.BoundingBox = BoundingBox;
VexFlow.CanvasContext = CanvasContext;
VexFlow.ChordSymbol = ChordSymbol;
VexFlow.Clef = Clef;
VexFlow.ClefNote = ClefNote;
VexFlow.Crescendo = Crescendo;
VexFlow.Curve = Curve;
VexFlow.Dot = Dot;
VexFlow.EasyScore = EasyScore;
VexFlow.Element = Element;
VexFlow.Factory = Factory;
VexFlow.Font = Font;
VexFlow.Formatter = Formatter;
VexFlow.Fraction = Fraction;
VexFlow.FretHandFinger = FretHandFinger;
VexFlow.GhostNote = GhostNote;
VexFlow.GlyphNote = GlyphNote;
VexFlow.GraceNote = GraceNote;
VexFlow.GraceNoteGroup = GraceNoteGroup;
VexFlow.GraceTabNote = GraceTabNote;
VexFlow.KeyManager = KeyManager;
VexFlow.KeySignature = KeySignature;
VexFlow.KeySigNote = KeySigNote;
VexFlow.Modifier = Modifier;
VexFlow.ModifierContext = ModifierContext;
VexFlow.MultiMeasureRest = MultiMeasureRest;
VexFlow.Music = Music;
VexFlow.Note = Note;
VexFlow.NoteHead = NoteHead;
VexFlow.NoteSubGroup = NoteSubGroup;
VexFlow.Ornament = Ornament;
VexFlow.Parenthesis = Parenthesis;
VexFlow.Parser = Parser;
VexFlow.PedalMarking = PedalMarking;
VexFlow.Registry = Registry;
VexFlow.RenderContext = RenderContext;
VexFlow.Renderer = Renderer;
VexFlow.RepeatNote = RepeatNote;
VexFlow.Repetition = Repetition;
VexFlow.Stave = Stave;
VexFlow.StaveConnector = StaveConnector;
VexFlow.StaveHairpin = StaveHairpin;
VexFlow.StaveLine = StaveLine;
VexFlow.StaveModifier = StaveModifier;
VexFlow.StaveNote = StaveNote;
VexFlow.StaveTempo = StaveTempo;
VexFlow.StaveText = StaveText;
VexFlow.StaveTie = StaveTie;
VexFlow.Stem = Stem;
VexFlow.StringNumber = StringNumber;
VexFlow.Stroke = Stroke;
VexFlow.SVGContext = SVGContext;
VexFlow.System = System;
VexFlow.TabNote = TabNote;
VexFlow.TabSlide = TabSlide;
VexFlow.TabStave = TabStave;
VexFlow.TabTie = TabTie;
VexFlow.TextBracket = TextBracket;
VexFlow.TextDynamics = TextDynamics;
VexFlow.TextNote = TextNote;
VexFlow.TickContext = TickContext;
VexFlow.TimeSignature = TimeSignature;
VexFlow.TimeSigNote = TimeSigNote;
VexFlow.Tremolo = Tremolo;
VexFlow.Tuning = Tuning;
VexFlow.Tuplet = Tuplet;
VexFlow.Vibrato = Vibrato;
VexFlow.VibratoBracket = VibratoBracket;
VexFlow.Voice = Voice;
VexFlow.Volta = Volta;
VexFlow.RuntimeError = RuntimeError;
VexFlow.Test = undefined;
VexFlow.AnnotationHorizontalJustify = AnnotationHorizontalJustify;
VexFlow.AnnotationVerticalJustify = AnnotationVerticalJustify;
VexFlow.ChordSymbolHorizontalJustify = ChordSymbolHorizontalJustify;
VexFlow.ChordSymbolVerticalJustify = ChordSymbolVerticalJustify;
VexFlow.SymbolModifiers = SymbolModifiers;
VexFlow.CurvePosition = CurvePosition;
VexFlow.FontWeight = FontWeight;
VexFlow.FontStyle = FontStyle;
VexFlow.Glyphs = Glyphs;
VexFlow.ModifierPosition = ModifierPosition;
VexFlow.RendererBackends = RendererBackends;
VexFlow.RendererLineEndType = RendererLineEndType;
VexFlow.BarlineType = BarlineType;
VexFlow.StaveModifierPosition = StaveModifierPosition;
VexFlow.VoltaType = VoltaType;
VexFlow.TextBracketPosition = TextBracketPosition;
VexFlow.TextJustification = TextJustification;
VexFlow.VoiceMode = VoiceMode;
