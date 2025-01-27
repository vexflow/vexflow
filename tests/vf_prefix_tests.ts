// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// VF.* Prefix Tests
//
// VexFlow classes are available under the global VexFlow.* namespace.

import { VexFlowTests } from './vexflow_test_helpers';

import {
  Accidental,
  Annotation,
  Articulation,
  Barline,
  BarNote,
  Beam,
  Bend,
  BoundingBox,
  ChordSymbol,
  Clef,
  ClefNote,
  Crescendo,
  Curve,
  Dot,
  EasyScore,
  Element,
  Factory,
  Font,
  Formatter,
  Fraction,
  FretHandFinger,
  GhostNote,
  GlyphNote,
  GraceNote,
  GraceNoteGroup,
  GraceTabNote,
  KeyManager,
  KeySignature,
  KeySigNote,
  Modifier,
  ModifierContext,
  MultiMeasureRest,
  Music,
  Note,
  NoteHead,
  NoteSubGroup,
  Ornament,
  Parser,
  PedalMarking,
  Registry,
  Renderer,
  RepeatNote,
  Repetition,
  Stave,
  StaveConnector,
  StaveHairpin,
  StaveLine,
  StaveModifier,
  StaveNote,
  StaveTempo,
  StaveText,
  StaveTie,
  Stem,
  StringNumber,
  Stroke,
  System,
  TabNote,
  TabSlide,
  TabStave,
  TabTie,
  TextBracket,
  TextDynamics,
  TextNote,
  TickContext,
  TimeSignature,
  TimeSigNote,
  Tremolo,
  Tuning,
  Tuplet,
  VexFlow,
  Vibrato,
  VibratoBracket,
  Voice,
  Volta,
} from '../src/index';

const VFPrefixTests = {
  Start(): void {
    QUnit.module('VF.* API');
    QUnit.test('VF.* API', VFPrefix);
    QUnit.test('VF Alias', VFAlias);
  },
};

function VFPrefix(assert: Assert): void {
  // Intentionally use VexFlow here so we can verify that the VexFlow.* API
  // is equivalent to using the individual classes in TypeScript.
  const VF = VexFlow;
  assert.equal(Accidental, VF.Accidental);
  assert.equal(Annotation, VF.Annotation);
  assert.equal(Articulation, VF.Articulation);
  assert.equal(Barline, VF.Barline);
  assert.equal(BarNote, VF.BarNote);
  assert.equal(Beam, VF.Beam);
  assert.equal(Bend, VF.Bend);
  assert.equal(BoundingBox, VF.BoundingBox);
  assert.equal(ChordSymbol, VF.ChordSymbol);
  assert.equal(Clef, VF.Clef);
  assert.equal(ClefNote, VF.ClefNote);
  assert.equal(Crescendo, VF.Crescendo);
  assert.equal(Curve, VF.Curve);
  assert.equal(Dot, VF.Dot);
  assert.equal(EasyScore, VF.EasyScore);
  assert.equal(Element, VF.Element);
  assert.equal(Factory, VF.Factory);
  assert.equal(Font, VF.Font);
  assert.equal(Formatter, VF.Formatter);
  assert.propEqual(new Formatter(), new VF.Formatter(), 'new Formatter()');
  assert.equal(Fraction, VF.Fraction);
  assert.equal(FretHandFinger, VF.FretHandFinger);
  assert.equal(GhostNote, VF.GhostNote);
  assert.equal(GlyphNote, VF.GlyphNote);
  assert.equal(GraceNote, VF.GraceNote);
  assert.equal(GraceNoteGroup, VF.GraceNoteGroup);
  assert.equal(GraceTabNote, VF.GraceTabNote);
  assert.equal(KeyManager, VF.KeyManager);
  assert.equal(KeySignature, VF.KeySignature);
  assert.equal(KeySigNote, VF.KeySigNote);
  assert.equal(Modifier, VF.Modifier);
  assert.equal(ModifierContext, VF.ModifierContext);
  assert.equal(MultiMeasureRest, VF.MultiMeasureRest);
  assert.equal(Music, VF.Music);
  assert.equal(Note, VF.Note);
  assert.equal(NoteHead, VF.NoteHead);
  assert.equal(NoteSubGroup, VF.NoteSubGroup);
  assert.equal(Ornament, VF.Ornament);
  assert.equal(Parser, VF.Parser);
  assert.equal(PedalMarking, VF.PedalMarking);
  assert.equal(Registry, VF.Registry);
  assert.equal(Renderer, VF.Renderer);
  assert.equal(RepeatNote, VF.RepeatNote);
  assert.equal(Repetition, VF.Repetition);
  assert.equal(Stave, VF.Stave);
  assert.notEqual(Stave, VF.StaveNote); // Sanity check.
  assert.equal(StaveConnector, VF.StaveConnector);
  assert.equal(StaveHairpin, VF.StaveHairpin);
  assert.equal(StaveLine, VF.StaveLine);
  assert.equal(StaveModifier, VF.StaveModifier);
  assert.equal(StaveNote, VF.StaveNote);
  assert.equal(StaveTempo, VF.StaveTempo);
  assert.equal(StaveText, VF.StaveText);
  assert.equal(StaveTie, VF.StaveTie);
  assert.equal(Stem, VF.Stem);
  assert.equal(StringNumber, VF.StringNumber);
  assert.equal(Stroke, VF.Stroke);
  assert.equal(System, VF.System);
  assert.equal(TabNote, VF.TabNote);
  assert.equal(TabSlide, VF.TabSlide);
  assert.equal(TabStave, VF.TabStave);
  assert.equal(TabTie, VF.TabTie);
  assert.equal(TextBracket, VF.TextBracket);
  assert.equal(TextDynamics, VF.TextDynamics);
  assert.equal(TextNote, VF.TextNote);
  assert.equal(TickContext, VF.TickContext);
  assert.equal(TimeSignature, VF.TimeSignature);
  assert.equal(TimeSigNote, VF.TimeSigNote);
  assert.equal(Tremolo, VF.Tremolo);
  assert.equal(Tuning, VF.Tuning);
  assert.equal(Tuplet, VF.Tuplet);
  assert.equal(Vibrato, VF.Vibrato);
  assert.equal(VibratoBracket, VF.VibratoBracket);
  assert.equal(Voice, VF.Voice);
  assert.equal(Volta, VF.Volta);
}

/**
 * If you have name collisions with VexFlow classes (e.g., if you have an Accidental class in your app),
 * consider extracting classes from VexFlow and renaming them with a VF prefix.
 */
function VFAlias(assert: Assert): void {
  const VFVibrato = VexFlow.Vibrato;
  const VFAccidental = VexFlow.Accidental;
  const VFAnnotation = VexFlow.Annotation;
  assert.equal(Accidental, VFAccidental);
  assert.equal(Annotation, VFAnnotation);

  const vibrato = new VFVibrato();
  assert.ok(vibrato);

  const acc1 = new VFAccidental('##');
  const acc2 = new Accidental('##');
  assert.equal(acc1.type, acc2.type);
}

VexFlowTests.register(VFPrefixTests);
export { VFPrefixTests };
