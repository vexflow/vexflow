// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors

import { ArticulationStruct } from './articulation';
import { Font, FontInfo } from './font';
import { Fraction } from './fraction';
import { GlyphProps, KeyProps } from './note';
import { RuntimeError } from './util';

const RESOLUTION = 16384;

// eslint-disable-next-line
export const CommonMetrics: Record<string, any> = {
  fontFamily: 'Bravura',
  fontSize: 30,
  fontWeight: 'normal',
  fontStyle: 'normal',

  Accidental: {
    cautionary: {
      fontSize: 28,
    },
  },

  Annotation: {
    fontSize: 10,
  },

  Bend: {
    fontSize: 10,
  },

  ChordSymbol: {
    fontSize: 12,
    spacing: 0.05,
    subscriptOffset: 0.2,
    superscriptOffset: -0.4,
    superSubRatio: 0.6,
  },

  FretHandFinger: {
    fontSize: 9,
    fontWeight: 'bold',
  },

  NoteHead: {
    minPadding: 2,
  },

  PedalMarking: {
    text: {
      fontSize: 12,
      fontStyle: 'italic',
    },
  },

  Repetition: {
    text: {
      fontSize: 12,
      fontWeight: 'bold',
      offsetX: 12,
      offsetY: 25,
      spacing: 5,
    },
    coda: {
      offsetY: 25,
    },
    segno: {
      offsetY: 10,
    },
  },

  Stave: {
    fontFamily: 'Arial, sans-serif',
    fontSize: 8,
    padding: 12,
    endPaddingMax: 10,
    endPaddingMin: 5,
    unalignedNotePadding: 10,
  },

  StaveConnector: {
    fontFamily: 'Times New Roman, serif',
    fontSize: 16,
  },

  StaveLine: {
    fontFamily: 'Arial, sans-serif',
    fontSize: 10,
  },

  StaveSection: {
    fontFamily: 'Arial, sans-serif',
    fontSize: 10,
    fontWeight: 'bold',
  },

  StaveTempo: {
    fontSize: 14,
    glyph: {
      fontSize: 25,
    },
    name: {
      fontWeight: 'bold',
    },
  },

  StaveText: {
    fontFamily: 'Times New Roman, serif',
    fontSize: 16,
  },

  StaveTie: {
    fontFamily: 'Arial, sans-serif',
    fontSize: 10,
  },

  StringNumber: {
    fontFamily: 'Arial, sans-serif',
    fontSize: 10,
    fontWeight: 'bold',
  },

  Strokes: {
    text: {
      fontFamily: 'Times New Roman, serif',
      fontSize: 10,
      fontStyle: 'italic',
      fontWeight: 'bold',
    },
  },

  TabNote: {
    text: {
      fontSize: 9,
    },
  },

  TabSlide: {
    fontFamily: 'Times New Roman, serif',
    fontSize: 10,
    fontStyle: 'italic',
    fontWeight: 'bold',
  },

  TabTie: {
    fontFamily: 'Arial, sans-serif',
    fontSize: 10,
  },

  TextBracket: {
    fontFamily: 'Times New Roman, serif',
    fontSize: 15,
    fontStyle: 'italic',
  },

  TextNote: {
    text: {
      fontSize: 12,
    },
  },

  Tremolo: {
    spacing: 7,
  },

  Volta: {
    fontFamily: 'Arial, sans-serif',
    fontSize: 9,
    fontWeight: 'bold',
  },
};

/**
 * Map duration numbers to 'ticks', the unit of duration used throughout VexFlow.
 * For example, a quarter note is 4, so it maps to RESOLUTION / 4 = 4096 ticks.
 */
const durations: Record<string, number> = {
  '1/2': RESOLUTION * 2,
  1: RESOLUTION / 1,
  2: RESOLUTION / 2,
  4: RESOLUTION / 4,
  8: RESOLUTION / 8,
  16: RESOLUTION / 16,
  32: RESOLUTION / 32,
  64: RESOLUTION / 64,
  128: RESOLUTION / 128,
  256: RESOLUTION / 256,
};

const durationAliases: Record<string, string> = {
  w: '1',
  h: '2',
  q: '4',

  // This is the default duration used to render bars (BarNote). Bars no longer
  // consume ticks, so this should be a no-op.
  // TODO(0xfe): This needs to be cleaned up.
  b: '256',
};

const keySignatures: Record<string, { accidental?: string; num: number }> = {
  C: { num: 0 },
  Am: { num: 0 },
  F: { accidental: 'b', num: 1 },
  Dm: { accidental: 'b', num: 1 },
  Bb: { accidental: 'b', num: 2 },
  Gm: { accidental: 'b', num: 2 },
  Eb: { accidental: 'b', num: 3 },
  Cm: { accidental: 'b', num: 3 },
  Ab: { accidental: 'b', num: 4 },
  Fm: { accidental: 'b', num: 4 },
  Db: { accidental: 'b', num: 5 },
  Bbm: { accidental: 'b', num: 5 },
  Gb: { accidental: 'b', num: 6 },
  Ebm: { accidental: 'b', num: 6 },
  Cb: { accidental: 'b', num: 7 },
  Abm: { accidental: 'b', num: 7 },
  G: { accidental: '#', num: 1 },
  Em: { accidental: '#', num: 1 },
  D: { accidental: '#', num: 2 },
  Bm: { accidental: '#', num: 2 },
  A: { accidental: '#', num: 3 },
  'F#m': { accidental: '#', num: 3 },
  E: { accidental: '#', num: 4 },
  'C#m': { accidental: '#', num: 4 },
  B: { accidental: '#', num: 5 },
  'G#m': { accidental: '#', num: 5 },
  'F#': { accidental: '#', num: 6 },
  'D#m': { accidental: '#', num: 6 },
  'C#': { accidental: '#', num: 7 },
  'A#m': { accidental: '#', num: 7 },
};

const clefs: Record<string, { lineShift: number }> = {
  treble: { lineShift: 0 },
  bass: { lineShift: 6 },
  tenor: { lineShift: 4 },
  alto: { lineShift: 3 },
  soprano: { lineShift: 1 },
  percussion: { lineShift: 0 },
  'mezzo-soprano': { lineShift: 2 },
  'baritone-c': { lineShift: 5 },
  'baritone-f': { lineShift: 5 },
  subbass: { lineShift: 7 },
  french: { lineShift: -1 },
};

const notesInfo: Record<
  string,
  {
    index: number;
    intVal?: number;
    accidental?: number;
  }
> = {
  C: { index: 0, intVal: 0 },
  CN: { index: 0, intVal: 0, accidental: 0xe261 /*accidentalNatural*/ },
  'C#': { index: 0, intVal: 1, accidental: 0xe262 /*accidentalSharp*/ },
  'C##': { index: 0, intVal: 2, accidental: 0xe263 /*accidentalDoubleSharp*/ },
  CB: { index: 0, intVal: 11, accidental: 0xe260 /*accidentalFlat*/ },
  CBB: { index: 0, intVal: 10, accidental: 0xe264 /*accidentalDoubleFlat*/ },
  D: { index: 1, intVal: 2 },
  DN: { index: 1, intVal: 2, accidental: 0xe261 /*accidentalNatural*/ },
  'D#': { index: 1, intVal: 3, accidental: 0xe262 /*accidentalSharp*/ },
  'D##': { index: 1, intVal: 4, accidental: 0xe263 /*accidentalDoubleSharp*/ },
  DB: { index: 1, intVal: 1, accidental: 0xe260 /*accidentalFlat*/ },
  DBB: { index: 1, intVal: 0, accidental: 0xe264 /*accidentalDoubleFlat*/ },
  E: { index: 2, intVal: 4 },
  EN: { index: 2, intVal: 4, accidental: 0xe261 /*accidentalNatural*/ },
  'E#': { index: 2, intVal: 5, accidental: 0xe262 /*accidentalSharp*/ },
  'E##': { index: 2, intVal: 6, accidental: 0xe263 /*accidentalDoubleSharp*/ },
  EB: { index: 2, intVal: 3, accidental: 0xe260 /*accidentalFlat*/ },
  EBB: { index: 2, intVal: 2, accidental: 0xe264 /*accidentalDoubleFlat*/ },
  F: { index: 3, intVal: 5 },
  FN: { index: 3, intVal: 5, accidental: 0xe261 /*accidentalNatural*/ },
  'F#': { index: 3, intVal: 6, accidental: 0xe262 /*accidentalSharp*/ },
  'F##': { index: 3, intVal: 7, accidental: 0xe263 /*accidentalDoubleSharp*/ },
  FB: { index: 3, intVal: 4, accidental: 0xe260 /*accidentalFlat*/ },
  FBB: { index: 3, intVal: 3, accidental: 0xe264 /*accidentalDoubleFlat*/ },
  G: { index: 4, intVal: 7 },
  GN: { index: 4, intVal: 7, accidental: 0xe261 /*accidentalNatural*/ },
  'G#': { index: 4, intVal: 8, accidental: 0xe262 /*accidentalSharp*/ },
  'G##': { index: 4, intVal: 9, accidental: 0xe263 /*accidentalDoubleSharp*/ },
  GB: { index: 4, intVal: 6, accidental: 0xe260 /*accidentalFlat*/ },
  GBB: { index: 4, intVal: 5, accidental: 0xe264 /*accidentalDoubleFlat*/ },
  A: { index: 5, intVal: 9 },
  AN: { index: 5, intVal: 9, accidental: 0xe261 /*accidentalNatural*/ },
  'A#': { index: 5, intVal: 10, accidental: 0xe262 /*accidentalSharp*/ },
  'A##': { index: 5, intVal: 11, accidental: 0xe263 /*accidentalDoubleSharp*/ },
  AB: { index: 5, intVal: 8, accidental: 0xe260 /*accidentalFlat*/ },
  ABB: { index: 5, intVal: 7, accidental: 0xe264 /*accidentalDoubleFlat*/ },
  B: { index: 6, intVal: 11 },
  BN: { index: 6, intVal: 11, accidental: 0xe261 /*accidentalNatural*/ },
  'B#': { index: 6, intVal: 12, accidental: 0xe262 /*accidentalSharp*/ },
  'B##': { index: 6, intVal: 13, accidental: 0xe263 /*accidentalDoubleSharp*/ },
  BB: { index: 6, intVal: 10, accidental: 0xe260 /*accidentalFlat*/ },
  BBB: { index: 6, intVal: 9, accidental: 0xe264 /*accidentalDoubleFlat*/ },
  R: { index: 6 }, // Rest
  X: { index: 6 },
};

const validNoteTypes: Record<string, { name: string }> = {
  n: { name: 'note' },
  r: { name: 'rest' },
  h: { name: 'harmonic' },
  m: { name: 'muted' },
  s: { name: 'slash' },
  g: { name: 'ghost' },
  d: { name: 'diamond' },
  x: { name: 'x' },
  ci: { name: 'circled' },
  cx: { name: 'circle x' },
  sf: { name: 'slashed' },
  sb: { name: 'slashed backward' },
  sq: { name: 'square' },
  tu: { name: 'triangle up' },
  td: { name: 'triangle down' },
};

// #FIXME: HACK to facilitate the VexFlow 5 migration.
// HACK-BEGIN
// .... will be deleted once all the classes use  accidentalCodes...
const accidentalsOld: Record<string, { code: string; parenRightPaddingAdjustment: number }> = {
  '#': { code: 'accidentalSharp', parenRightPaddingAdjustment: -1 },
  '##': { code: 'accidentalDoubleSharp', parenRightPaddingAdjustment: -1 },
  b: { code: 'accidentalFlat', parenRightPaddingAdjustment: -2 },
  bb: { code: 'accidentalDoubleFlat', parenRightPaddingAdjustment: -2 },
  n: { code: 'accidentalNatural', parenRightPaddingAdjustment: -1 },
  '{': { code: 'accidentalParensLeft', parenRightPaddingAdjustment: -1 },
  '}': { code: 'accidentalParensRight', parenRightPaddingAdjustment: -1 },
  db: { code: 'accidentalThreeQuarterTonesFlatZimmermann', parenRightPaddingAdjustment: -1 },
  d: { code: 'accidentalQuarterToneFlatStein', parenRightPaddingAdjustment: 0 },
  '++': { code: 'accidentalThreeQuarterTonesSharpStein', parenRightPaddingAdjustment: -1 },
  '+': { code: 'accidentalQuarterToneSharpStein', parenRightPaddingAdjustment: -1 },
  '+-': { code: 'accidentalKucukMucennebSharp', parenRightPaddingAdjustment: -1 },
  bs: { code: 'accidentalBakiyeFlat', parenRightPaddingAdjustment: -1 },
  bss: { code: 'accidentalBuyukMucennebFlat', parenRightPaddingAdjustment: -1 },
  o: { code: 'accidentalSori', parenRightPaddingAdjustment: -1 },
  k: { code: 'accidentalKoron', parenRightPaddingAdjustment: -1 },
  bbs: { code: 'vexAccidentalMicrotonal1', parenRightPaddingAdjustment: -1 },
  '++-': { code: 'accidentalBuyukMucennebSharp', parenRightPaddingAdjustment: -1 },
  ashs: { code: 'vexAccidentalMicrotonal3', parenRightPaddingAdjustment: -1 },
  afhf: { code: 'vexAccidentalMicrotonal4', parenRightPaddingAdjustment: -1 },
  accSagittal5v7KleismaUp: { code: 'accSagittal5v7KleismaUp', parenRightPaddingAdjustment: -1 },
  accSagittal5v7KleismaDown: { code: 'accSagittal5v7KleismaDown', parenRightPaddingAdjustment: -1 },
  accSagittal5CommaUp: { code: 'accSagittal5CommaUp', parenRightPaddingAdjustment: -1 },
  accSagittal5CommaDown: { code: 'accSagittal5CommaDown', parenRightPaddingAdjustment: -1 },
  accSagittal7CommaUp: { code: 'accSagittal7CommaUp', parenRightPaddingAdjustment: -1 },
  accSagittal7CommaDown: { code: 'accSagittal7CommaDown', parenRightPaddingAdjustment: -1 },
  accSagittal25SmallDiesisUp: { code: 'accSagittal25SmallDiesisUp', parenRightPaddingAdjustment: -1 },
  accSagittal25SmallDiesisDown: { code: 'accSagittal25SmallDiesisDown', parenRightPaddingAdjustment: -1 },
  accSagittal35MediumDiesisUp: { code: 'accSagittal35MediumDiesisUp', parenRightPaddingAdjustment: -1 },
  accSagittal35MediumDiesisDown: { code: 'accSagittal35MediumDiesisDown', parenRightPaddingAdjustment: -1 },
  accSagittal11MediumDiesisUp: { code: 'accSagittal11MediumDiesisUp', parenRightPaddingAdjustment: -1 },
  accSagittal11MediumDiesisDown: { code: 'accSagittal11MediumDiesisDown', parenRightPaddingAdjustment: -1 },
  accSagittal11LargeDiesisUp: { code: 'accSagittal11LargeDiesisUp', parenRightPaddingAdjustment: -1 },
  accSagittal11LargeDiesisDown: { code: 'accSagittal11LargeDiesisDown', parenRightPaddingAdjustment: -1 },
  accSagittal35LargeDiesisUp: { code: 'accSagittal35LargeDiesisUp', parenRightPaddingAdjustment: -1 },
  accSagittal35LargeDiesisDown: { code: 'accSagittal35LargeDiesisDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp25SDown: { code: 'accSagittalSharp25SDown', parenRightPaddingAdjustment: -1 },
  accSagittalFlat25SUp: { code: 'accSagittalFlat25SUp', parenRightPaddingAdjustment: -1 },
  accSagittalSharp7CDown: { code: 'accSagittalSharp7CDown', parenRightPaddingAdjustment: -1 },
  accSagittalFlat7CUp: { code: 'accSagittalFlat7CUp', parenRightPaddingAdjustment: -1 },
  accSagittalSharp5CDown: { code: 'accSagittalSharp5CDown', parenRightPaddingAdjustment: -1 },
  accSagittalFlat5CUp: { code: 'accSagittalFlat5CUp', parenRightPaddingAdjustment: -1 },
  accSagittalSharp5v7kDown: { code: 'accSagittalSharp5v7kDown', parenRightPaddingAdjustment: -1 },
  accSagittalFlat5v7kUp: { code: 'accSagittalFlat5v7kUp', parenRightPaddingAdjustment: -1 },
  accSagittalSharp: { code: 'accSagittalSharp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat: { code: 'accSagittalFlat', parenRightPaddingAdjustment: -1 },
  accSagittalSharp5v7kUp: { code: 'accSagittalSharp5v7kUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat5v7kDown: { code: 'accSagittalFlat5v7kDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp5CUp: { code: 'accSagittalSharp5CUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat5CDown: { code: 'accSagittalFlat5CDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp7CUp: { code: 'accSagittalSharp7CUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat7CDown: { code: 'accSagittalFlat7CDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp25SUp: { code: 'accSagittalSharp25SUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat25SDown: { code: 'accSagittalFlat25SDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp35MUp: { code: 'accSagittalSharp35MUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat35MDown: { code: 'accSagittalFlat35MDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp11MUp: { code: 'accSagittalSharp11MUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat11MDown: { code: 'accSagittalFlat11MDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp11LUp: { code: 'accSagittalSharp11LUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat11LDown: { code: 'accSagittalFlat11LDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp35LUp: { code: 'accSagittalSharp35LUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat35LDown: { code: 'accSagittalFlat35LDown', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleSharp25SDown: { code: 'accSagittalDoubleSharp25SDown', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleFlat25SUp: { code: 'accSagittalDoubleFlat25SUp', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleSharp7CDown: { code: 'accSagittalDoubleSharp7CDown', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleFlat7CUp: { code: 'accSagittalDoubleFlat7CUp', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleSharp5CDown: { code: 'accSagittalDoubleSharp5CDown', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleFlat5CUp: { code: 'accSagittalDoubleFlat5CUp', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleSharp5v7kDown: { code: 'accSagittalDoubleSharp5v7kDown', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleFlat5v7kUp: { code: 'accSagittalDoubleFlat5v7kUp', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleSharp: { code: 'accSagittalDoubleSharp', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleFlat: { code: 'accSagittalDoubleFlat', parenRightPaddingAdjustment: -1 },
  accSagittal7v11KleismaUp: { code: 'accSagittal7v11KleismaUp', parenRightPaddingAdjustment: -1 },
  accSagittal7v11KleismaDown: { code: 'accSagittal7v11KleismaDown', parenRightPaddingAdjustment: -1 },
  accSagittal17CommaUp: { code: 'accSagittal17CommaUp', parenRightPaddingAdjustment: -1 },
  accSagittal17CommaDown: { code: 'accSagittal17CommaDown', parenRightPaddingAdjustment: -1 },
  accSagittal55CommaUp: { code: 'accSagittal55CommaUp', parenRightPaddingAdjustment: -1 },
  accSagittal55CommaDown: { code: 'accSagittal55CommaDown', parenRightPaddingAdjustment: -1 },
  accSagittal7v11CommaUp: { code: 'accSagittal7v11CommaUp', parenRightPaddingAdjustment: -1 },
  accSagittal7v11CommaDown: { code: 'accSagittal7v11CommaDown', parenRightPaddingAdjustment: -1 },
  accSagittal5v11SmallDiesisUp: { code: 'accSagittal5v11SmallDiesisUp', parenRightPaddingAdjustment: -1 },
  accSagittal5v11SmallDiesisDown: { code: 'accSagittal5v11SmallDiesisDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp5v11SDown: { code: 'accSagittalSharp5v11SDown', parenRightPaddingAdjustment: -1 },
  accSagittalFlat5v11SUp: { code: 'accSagittalFlat5v11SUp', parenRightPaddingAdjustment: -1 },
  accSagittalSharp7v11CDown: { code: 'accSagittalSharp7v11CDown', parenRightPaddingAdjustment: -1 },
  accSagittalFlat7v11CUp: { code: 'accSagittalFlat7v11CUp', parenRightPaddingAdjustment: -1 },
  accSagittalSharp55CDown: { code: 'accSagittalSharp55CDown', parenRightPaddingAdjustment: -1 },
  accSagittalFlat55CUp: { code: 'accSagittalFlat55CUp', parenRightPaddingAdjustment: -1 },
  accSagittalSharp17CDown: { code: 'accSagittalSharp17CDown', parenRightPaddingAdjustment: -1 },
  accSagittalFlat17CUp: { code: 'accSagittalFlat17CUp', parenRightPaddingAdjustment: -1 },
  accSagittalSharp7v11kDown: { code: 'accSagittalSharp7v11kDown', parenRightPaddingAdjustment: -1 },
  accSagittalFlat7v11kUp: { code: 'accSagittalFlat7v11kUp', parenRightPaddingAdjustment: -1 },
  accSagittalSharp7v11kUp: { code: 'accSagittalSharp7v11kUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat7v11kDown: { code: 'accSagittalFlat7v11kDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp17CUp: { code: 'accSagittalSharp17CUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat17CDown: { code: 'accSagittalFlat17CDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp55CUp: { code: 'accSagittalSharp55CUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat55CDown: { code: 'accSagittalFlat55CDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp7v11CUp: { code: 'accSagittalSharp7v11CUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat7v11CDown: { code: 'accSagittalFlat7v11CDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp5v11SUp: { code: 'accSagittalSharp5v11SUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat5v11SDown: { code: 'accSagittalFlat5v11SDown', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleSharp5v11SDown: { code: 'accSagittalDoubleSharp5v11SDown', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleFlat5v11SUp: { code: 'accSagittalDoubleFlat5v11SUp', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleSharp7v11CDown: { code: 'accSagittalDoubleSharp7v11CDown', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleFlat7v11CUp: { code: 'accSagittalDoubleFlat7v11CUp', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleSharp55CDown: { code: 'accSagittalDoubleSharp55CDown', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleFlat55CUp: { code: 'accSagittalDoubleFlat55CUp', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleSharp17CDown: { code: 'accSagittalDoubleSharp17CDown', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleFlat17CUp: { code: 'accSagittalDoubleFlat17CUp', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleSharp7v11kDown: { code: 'accSagittalDoubleSharp7v11kDown', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleFlat7v11kUp: { code: 'accSagittalDoubleFlat7v11kUp', parenRightPaddingAdjustment: -1 },
  accSagittal23CommaUp: { code: 'accSagittal23CommaUp', parenRightPaddingAdjustment: -1 },
  accSagittal23CommaDown: { code: 'accSagittal23CommaDown', parenRightPaddingAdjustment: -1 },
  accSagittal5v19CommaUp: { code: 'accSagittal5v19CommaUp', parenRightPaddingAdjustment: -1 },
  accSagittal5v19CommaDown: { code: 'accSagittal5v19CommaDown', parenRightPaddingAdjustment: -1 },
  accSagittal5v23SmallDiesisUp: { code: 'accSagittal5v23SmallDiesisUp', parenRightPaddingAdjustment: -1 },
  accSagittal5v23SmallDiesisDown: { code: 'accSagittal5v23SmallDiesisDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp5v23SDown: { code: 'accSagittalSharp5v23SDown', parenRightPaddingAdjustment: -1 },
  accSagittalFlat5v23SUp: { code: 'accSagittalFlat5v23SUp', parenRightPaddingAdjustment: -1 },
  accSagittalSharp5v19CDown: { code: 'accSagittalSharp5v19CDown', parenRightPaddingAdjustment: -1 },
  accSagittalFlat5v19CUp: { code: 'accSagittalFlat5v19CUp', parenRightPaddingAdjustment: -1 },
  accSagittalSharp23CDown: { code: 'accSagittalSharp23CDown', parenRightPaddingAdjustment: -1 },
  accSagittalFlat23CUp: { code: 'accSagittalFlat23CUp', parenRightPaddingAdjustment: -1 },
  accSagittalSharp23CUp: { code: 'accSagittalSharp23CUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat23CDown: { code: 'accSagittalFlat23CDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp5v19CUp: { code: 'accSagittalSharp5v19CUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat5v19CDown: { code: 'accSagittalFlat5v19CDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp5v23SUp: { code: 'accSagittalSharp5v23SUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat5v23SDown: { code: 'accSagittalFlat5v23SDown', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleSharp5v23SDown: { code: 'accSagittalDoubleSharp5v23SDown', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleFlat5v23SUp: { code: 'accSagittalDoubleFlat5v23SUp', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleSharp5v19CDown: { code: 'accSagittalDoubleSharp5v19CDown', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleFlat5v19CUp: { code: 'accSagittalDoubleFlat5v19CUp', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleSharp23CDown: { code: 'accSagittalDoubleSharp23CDown', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleFlat23CUp: { code: 'accSagittalDoubleFlat23CUp', parenRightPaddingAdjustment: -1 },
  accSagittal19SchismaUp: { code: 'accSagittal19SchismaUp', parenRightPaddingAdjustment: -1 },
  accSagittal19SchismaDown: { code: 'accSagittal19SchismaDown', parenRightPaddingAdjustment: -1 },
  accSagittal17KleismaUp: { code: 'accSagittal17KleismaUp', parenRightPaddingAdjustment: -1 },
  accSagittal17KleismaDown: { code: 'accSagittal17KleismaDown', parenRightPaddingAdjustment: -1 },
  accSagittal143CommaUp: { code: 'accSagittal143CommaUp', parenRightPaddingAdjustment: -1 },
  accSagittal143CommaDown: { code: 'accSagittal143CommaDown', parenRightPaddingAdjustment: -1 },
  accSagittal11v49CommaUp: { code: 'accSagittal11v49CommaUp', parenRightPaddingAdjustment: -1 },
  accSagittal11v49CommaDown: { code: 'accSagittal11v49CommaDown', parenRightPaddingAdjustment: -1 },
  accSagittal19CommaUp: { code: 'accSagittal19CommaUp', parenRightPaddingAdjustment: -1 },
  accSagittal19CommaDown: { code: 'accSagittal19CommaDown', parenRightPaddingAdjustment: -1 },
  accSagittal7v19CommaUp: { code: 'accSagittal7v19CommaUp', parenRightPaddingAdjustment: -1 },
  accSagittal7v19CommaDown: { code: 'accSagittal7v19CommaDown', parenRightPaddingAdjustment: -1 },
  accSagittal49SmallDiesisUp: { code: 'accSagittal49SmallDiesisUp', parenRightPaddingAdjustment: -1 },
  accSagittal49SmallDiesisDown: { code: 'accSagittal49SmallDiesisDown', parenRightPaddingAdjustment: -1 },
  accSagittal23SmallDiesisUp: { code: 'accSagittal23SmallDiesisUp', parenRightPaddingAdjustment: -1 },
  accSagittal23SmallDiesisDown: { code: 'accSagittal23SmallDiesisDown', parenRightPaddingAdjustment: -1 },
  accSagittal5v13MediumDiesisUp: { code: 'accSagittal5v13MediumDiesisUp', parenRightPaddingAdjustment: -1 },
  accSagittal5v13MediumDiesisDown: { code: 'accSagittal5v13MediumDiesisDown', parenRightPaddingAdjustment: -1 },
  accSagittal11v19MediumDiesisUp: { code: 'accSagittal11v19MediumDiesisUp', parenRightPaddingAdjustment: -1 },
  accSagittal11v19MediumDiesisDown: { code: 'accSagittal11v19MediumDiesisDown', parenRightPaddingAdjustment: -1 },
  accSagittal49MediumDiesisUp: { code: 'accSagittal49MediumDiesisUp', parenRightPaddingAdjustment: -1 },
  accSagittal49MediumDiesisDown: { code: 'accSagittal49MediumDiesisDown', parenRightPaddingAdjustment: -1 },
  accSagittal5v49MediumDiesisUp: { code: 'accSagittal5v49MediumDiesisUp', parenRightPaddingAdjustment: -1 },
  accSagittal5v49MediumDiesisDown: { code: 'accSagittal5v49MediumDiesisDown', parenRightPaddingAdjustment: -1 },
  accSagittal49LargeDiesisUp: { code: 'accSagittal49LargeDiesisUp', parenRightPaddingAdjustment: -1 },
  accSagittal49LargeDiesisDown: { code: 'accSagittal49LargeDiesisDown', parenRightPaddingAdjustment: -1 },
  accSagittal11v19LargeDiesisUp: { code: 'accSagittal11v19LargeDiesisUp', parenRightPaddingAdjustment: -1 },
  accSagittal11v19LargeDiesisDown: { code: 'accSagittal11v19LargeDiesisDown', parenRightPaddingAdjustment: -1 },
  accSagittal5v13LargeDiesisUp: { code: 'accSagittal5v13LargeDiesisUp', parenRightPaddingAdjustment: -1 },
  accSagittal5v13LargeDiesisDown: { code: 'accSagittal5v13LargeDiesisDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp23SDown: { code: 'accSagittalSharp23SDown', parenRightPaddingAdjustment: -1 },
  accSagittalFlat23SUp: { code: 'accSagittalFlat23SUp', parenRightPaddingAdjustment: -1 },
  accSagittalSharp49SDown: { code: 'accSagittalSharp49SDown', parenRightPaddingAdjustment: -1 },
  accSagittalFlat49SUp: { code: 'accSagittalFlat49SUp', parenRightPaddingAdjustment: -1 },
  accSagittalSharp7v19CDown: { code: 'accSagittalSharp7v19CDown', parenRightPaddingAdjustment: -1 },
  accSagittalFlat7v19CUp: { code: 'accSagittalFlat7v19CUp', parenRightPaddingAdjustment: -1 },
  accSagittalSharp19CDown: { code: 'accSagittalSharp19CDown', parenRightPaddingAdjustment: -1 },
  accSagittalFlat19CUp: { code: 'accSagittalFlat19CUp', parenRightPaddingAdjustment: -1 },
  accSagittalSharp11v49CDown: { code: 'accSagittalSharp11v49CDown', parenRightPaddingAdjustment: -1 },
  accSagittalFlat11v49CUp: { code: 'accSagittalFlat11v49CUp', parenRightPaddingAdjustment: -1 },
  accSagittalSharp143CDown: { code: 'accSagittalSharp143CDown', parenRightPaddingAdjustment: -1 },
  accSagittalFlat143CUp: { code: 'accSagittalFlat143CUp', parenRightPaddingAdjustment: -1 },
  accSagittalSharp17kDown: { code: 'accSagittalSharp17kDown', parenRightPaddingAdjustment: -1 },
  accSagittalFlat17kUp: { code: 'accSagittalFlat17kUp', parenRightPaddingAdjustment: -1 },
  accSagittalSharp19sDown: { code: 'accSagittalSharp19sDown', parenRightPaddingAdjustment: -1 },
  accSagittalFlat19sUp: { code: 'accSagittalFlat19sUp', parenRightPaddingAdjustment: -1 },
  accSagittalSharp19sUp: { code: 'accSagittalSharp19sUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat19sDown: { code: 'accSagittalFlat19sDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp17kUp: { code: 'accSagittalSharp17kUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat17kDown: { code: 'accSagittalFlat17kDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp143CUp: { code: 'accSagittalSharp143CUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat143CDown: { code: 'accSagittalFlat143CDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp11v49CUp: { code: 'accSagittalSharp11v49CUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat11v49CDown: { code: 'accSagittalFlat11v49CDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp19CUp: { code: 'accSagittalSharp19CUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat19CDown: { code: 'accSagittalFlat19CDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp7v19CUp: { code: 'accSagittalSharp7v19CUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat7v19CDown: { code: 'accSagittalFlat7v19CDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp49SUp: { code: 'accSagittalSharp49SUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat49SDown: { code: 'accSagittalFlat49SDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp23SUp: { code: 'accSagittalSharp23SUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat23SDown: { code: 'accSagittalFlat23SDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp5v13MUp: { code: 'accSagittalSharp5v13MUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat5v13MDown: { code: 'accSagittalFlat5v13MDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp11v19MUp: { code: 'accSagittalSharp11v19MUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat11v19MDown: { code: 'accSagittalFlat11v19MDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp49MUp: { code: 'accSagittalSharp49MUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat49MDown: { code: 'accSagittalFlat49MDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp5v49MUp: { code: 'accSagittalSharp5v49MUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat5v49MDown: { code: 'accSagittalFlat5v49MDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp49LUp: { code: 'accSagittalSharp49LUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat49LDown: { code: 'accSagittalFlat49LDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp11v19LUp: { code: 'accSagittalSharp11v19LUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat11v19LDown: { code: 'accSagittalFlat11v19LDown', parenRightPaddingAdjustment: -1 },
  accSagittalSharp5v13LUp: { code: 'accSagittalSharp5v13LUp', parenRightPaddingAdjustment: -1 },
  accSagittalFlat5v13LDown: { code: 'accSagittalFlat5v13LDown', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleSharp23SDown: { code: 'accSagittalDoubleSharp23SDown', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleFlat23SUp: { code: 'accSagittalDoubleFlat23SUp', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleSharp49SDown: { code: 'accSagittalDoubleSharp49SDown', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleFlat49SUp: { code: 'accSagittalDoubleFlat49SUp', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleSharp7v19CDown: { code: 'accSagittalDoubleSharp7v19CDown', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleFlat7v19CUp: { code: 'accSagittalDoubleFlat7v19CUp', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleSharp19CDown: { code: 'accSagittalDoubleSharp19CDown', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleFlat19CUp: { code: 'accSagittalDoubleFlat19CUp', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleSharp11v49CDown: { code: 'accSagittalDoubleSharp11v49CDown', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleFlat11v49CUp: { code: 'accSagittalDoubleFlat11v49CUp', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleSharp143CDown: { code: 'accSagittalDoubleSharp143CDown', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleFlat143CUp: { code: 'accSagittalDoubleFlat143CUp', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleSharp17kDown: { code: 'accSagittalDoubleSharp17kDown', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleFlat17kUp: { code: 'accSagittalDoubleFlat17kUp', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleSharp19sDown: { code: 'accSagittalDoubleSharp19sDown', parenRightPaddingAdjustment: -1 },
  accSagittalDoubleFlat19sUp: { code: 'accSagittalDoubleFlat19sUp', parenRightPaddingAdjustment: -1 },
  accSagittalShaftUp: { code: 'accSagittalShaftUp', parenRightPaddingAdjustment: -1 },
  accSagittalShaftDown: { code: 'accSagittalShaftDown', parenRightPaddingAdjustment: -1 },
  accSagittalAcute: { code: 'accSagittalAcute', parenRightPaddingAdjustment: -1 },
  accSagittalGrave: { code: 'accSagittalGrave', parenRightPaddingAdjustment: -1 },
  accSagittal1MinaUp: { code: 'accSagittal1MinaUp', parenRightPaddingAdjustment: -1 },
  accSagittal1MinaDown: { code: 'accSagittal1MinaDown', parenRightPaddingAdjustment: -1 },
  accSagittal2MinasUp: { code: 'accSagittal2MinasUp', parenRightPaddingAdjustment: -1 },
  accSagittal2MinasDown: { code: 'accSagittal2MinasDown', parenRightPaddingAdjustment: -1 },
  accSagittal1TinaUp: { code: 'accSagittal1TinaUp', parenRightPaddingAdjustment: -1 },
  accSagittal1TinaDown: { code: 'accSagittal1TinaDown', parenRightPaddingAdjustment: -1 },
  accSagittal2TinasUp: { code: 'accSagittal2TinasUp', parenRightPaddingAdjustment: -1 },
  accSagittal2TinasDown: { code: 'accSagittal2TinasDown', parenRightPaddingAdjustment: -1 },
  accSagittal3TinasUp: { code: 'accSagittal3TinasUp', parenRightPaddingAdjustment: -1 },
  accSagittal3TinasDown: { code: 'accSagittal3TinasDown', parenRightPaddingAdjustment: -1 },
  accSagittal4TinasUp: { code: 'accSagittal4TinasUp', parenRightPaddingAdjustment: -1 },
  accSagittal4TinasDown: { code: 'accSagittal4TinasDown', parenRightPaddingAdjustment: -1 },
  accSagittal5TinasUp: { code: 'accSagittal5TinasUp', parenRightPaddingAdjustment: -1 },
  accSagittal5TinasDown: { code: 'accSagittal5TinasDown', parenRightPaddingAdjustment: -1 },
  accSagittal6TinasUp: { code: 'accSagittal6TinasUp', parenRightPaddingAdjustment: -1 },
  accSagittal6TinasDown: { code: 'accSagittal6TinasDown', parenRightPaddingAdjustment: -1 },
  accSagittal7TinasUp: { code: 'accSagittal7TinasUp', parenRightPaddingAdjustment: -1 },
  accSagittal7TinasDown: { code: 'accSagittal7TinasDown', parenRightPaddingAdjustment: -1 },
  accSagittal8TinasUp: { code: 'accSagittal8TinasUp', parenRightPaddingAdjustment: -1 },
  accSagittal8TinasDown: { code: 'accSagittal8TinasDown', parenRightPaddingAdjustment: -1 },
  accSagittal9TinasUp: { code: 'accSagittal9TinasUp', parenRightPaddingAdjustment: -1 },
  accSagittal9TinasDown: { code: 'accSagittal9TinasDown', parenRightPaddingAdjustment: -1 },
  accSagittalFractionalTinaUp: { code: 'accSagittalFractionalTinaUp', parenRightPaddingAdjustment: -1 },
  accSagittalFractionalTinaDown: { code: 'accSagittalFractionalTinaDown', parenRightPaddingAdjustment: -1 },
  accidentalNarrowReversedFlat: { code: 'accidentalNarrowReversedFlat', parenRightPaddingAdjustment: -1 },
  accidentalNarrowReversedFlatAndFlat: {
    code: 'accidentalNarrowReversedFlatAndFlat',
    parenRightPaddingAdjustment: -1,
  },
  accidentalWilsonPlus: { code: 'accidentalWilsonPlus', parenRightPaddingAdjustment: -1 },
  accidentalWilsonMinus: { code: 'accidentalWilsonMinus', parenRightPaddingAdjustment: -1 },
};
// HACK-END

const accidentals: Record<string, string> = {
  '#': '\ue262' /*accidentalSharp*/,
  '##': '\ue263' /*accidentalDoubleSharp*/,
  b: '\ue260' /*accidentalFlat*/,
  bb: '\ue264' /*accidentalDoubleFlat*/,
  n: '\ue261' /*accidentalNatural*/,
  '{': '\ue26a' /*accidentalParensLeft*/,
  '}': '\ue26b' /*accidentalParensRight*/,
  db: '\ue281' /*accidentalThreeQuarterTonesFlatZimmermann*/,
  d: '\ue280' /*accidentalQuarterToneFlatStein*/,
  '++': '\ue283' /*accidentalThreeQuarterTonesSharpStein*/,
  '+': '\ue282' /*accidentalQuarterToneSharpStein*/,
  '+-': '\ue446' /*accidentalKucukMucennebSharp*/,
  bs: '\ue442' /*accidentalBakiyeFlat*/,
  bss: '\ue440' /*accidentalBuyukMucennebFlat*/,
  o: '\ue461' /*accidentalSori*/,
  k: '\ue460' /*accidentalKoron*/,
  bbs: '\ue447' /*accidentalBuyukMucennebSharp*/,
  '++-': '\ue447' /*accidentalBuyukMucennebSharp*/,
  ashs: '\ue447' /*accidentalBuyukMucennebSharp*/,
  afhf: '\ue447' /*accidentalBuyukMucennebSharp*/,
};

// Helps determine the layout of accidentals.
const accidentalColumns: Record<number, { [name: string]: number[] }> = {
  1: {
    a: [1],
    b: [1],
  },
  2: {
    a: [1, 2],
  },
  3: {
    a: [1, 3, 2],
    b: [1, 2, 1],
    secondOnBottom: [1, 2, 3],
  },
  4: {
    a: [1, 3, 4, 2],
    b: [1, 2, 3, 1],
    spacedOutTetrachord: [1, 2, 1, 2],
  },
  5: {
    a: [1, 3, 5, 4, 2],
    b: [1, 2, 4, 3, 1],
    spacedOutPentachord: [1, 2, 3, 2, 1],
    verySpacedOutPentachord: [1, 2, 1, 2, 1],
  },
  6: {
    a: [1, 3, 5, 6, 4, 2],
    b: [1, 2, 4, 5, 3, 1],
    spacedOutHexachord: [1, 3, 2, 1, 3, 2],
    verySpacedOutHexachord: [1, 2, 1, 2, 1, 2],
  },
};

const articulations: Record<string, ArticulationStruct> = {
  'a.': { code: '\ue1e7' /*augmentationDot*/, betweenLines: true }, // Staccato
  av: {
    aboveCode: '\ue4a6' /*articStaccatissimoAbove*/,
    belowCode: '\ue4a7' /*articStaccatissimoBelow*/,
    betweenLines: true,
  }, // Staccatissimo
  'a>': {
    aboveCode: '\ue4a0' /*articAccentAbove*/,
    belowCode: '\ue4a1' /*articAccentBelow*/,
    betweenLines: true,
  }, // Accent
  'a-': {
    aboveCode: '\ue4a4' /*articTenutoAbove*/,
    belowCode: '\ue4a5' /*articTenutoBelow*/,
    betweenLines: true,
  }, // Tenuto
  'a^': {
    aboveCode: '\ue4ac' /*articMarcatoAbove*/,
    belowCode: '\ue4ad' /*articMarcatoBelow*/,
    betweenLines: false,
  }, // Marcato
  'a+': { code: '\ue633' /*pluckedLeftHandPizzicato*/, betweenLines: false }, // Left hand pizzicato
  ao: {
    aboveCode: '\ue631' /*pluckedSnapPizzicatoAbove*/,
    belowCode: '\ue630' /*pluckedSnapPizzicatoBelow*/,
    betweenLines: false,
  }, // Snap pizzicato
  ah: { code: '\ue614' /*stringsHarmonic*/, betweenLines: false }, // Natural harmonic or open note
  'a@': { aboveCode: '\ue4c0' /*fermataAbove*/, belowCode: '\ue4c1' /*fermataBelow*/, betweenLines: false }, // Fermata
  'a@a': { code: '\ue4c0' /*fermataAbove*/, betweenLines: false }, // Fermata above staff
  'a@u': { code: '\ue4c1' /*fermataBelow*/, betweenLines: false }, // Fermata below staff
  'a@s': { aboveCode: '\ue4c4' /*fermataShortAbove*/, belowCode: '\ue4c5' /*fermataShortBelow*/, betweenLines: false }, // Fermata short
  'a@as': { code: '\ue4c4' /*fermataShortAbove*/, betweenLines: false }, // Fermata short above staff
  'a@us': { code: '\ue4c5' /*fermataShortBelow*/, betweenLines: false }, // Fermata short below staff
  'a@l': { aboveCode: '\ue4c6' /*fermataLongAbove*/, belowCode: '\ue4c7' /*fermataLongBelow*/, betweenLines: false }, // Fermata long
  'a@al': { code: '\ue4c6' /*fermataLongAbove*/, betweenLines: false }, // Fermata long above staff
  'a@ul': { code: '\ue4c7' /*fermataLongBelow*/, betweenLines: false }, // Fermata long below staff
  'a@vl': {
    aboveCode: '\ue4c8' /*fermataVeryLongAbove*/,
    belowCode: '\ue4c9' /*fermataVeryLongBelow*/,
    betweenLines: false,
  }, // Fermata very long
  'a@avl': { code: '\ue4c8' /*fermataVeryLongAbove*/, betweenLines: false }, // Fermata very long above staff
  'a@uvl': { code: '\ue4c9' /*fermataVeryLongBelow*/, betweenLines: false }, // Fermata very long below staff
  'a|': { code: '\ue612' /*stringsUpBow*/, betweenLines: false }, // Bow up - up stroke
  am: { code: '\ue610' /*stringsDownBow*/, betweenLines: false }, // Bow down - down stroke
  'a,': { code: '\ue805' /*pictChokeCymbal*/, betweenLines: false }, // Choked
};

const ornaments: Record<string, { code: string }> = {
  mordent: { code: 'ornamentShortTrill' },
  mordentInverted: { code: 'ornamentMordent' },
  mordent_inverted: { code: 'ornamentMordent' }, // backwards-compatible to 4.x
  turn: { code: 'ornamentTurn' },
  turnInverted: { code: 'ornamentTurnSlash' },
  turn_inverted: { code: 'ornamentTurnSlash' }, // backwards-compatible to 4.x
  tr: { code: 'ornamentTrill' },
  upprall: { code: 'ornamentPrecompSlideTrillDAnglebert' },
  downprall: { code: 'ornamentPrecompDoubleCadenceUpperPrefix' },
  prallup: { code: 'ornamentPrecompTrillSuffixDandrieu' },
  pralldown: { code: 'ornamentPrecompTrillLowerSuffix' },
  upmordent: { code: 'ornamentPrecompSlideTrillBach' },
  downmordent: { code: 'ornamentPrecompDoubleCadenceUpperPrefixTurn' },
  lineprall: { code: 'ornamentPrecompAppoggTrill' },
  prallprall: { code: 'ornamentTremblement' },
  scoop: { code: 'brassScoop' },
  doit: { code: 'brassDoitMedium' },
  fall: { code: 'brassFallLipShort' },
  doitLong: { code: 'brassLiftMedium' },
  fallLong: { code: 'brassFallRoughMedium' },
  bend: { code: 'brassBend' },
  plungerClosed: { code: 'brassMuteClosed' },
  plungerOpen: { code: 'brassMuteOpen' },
  flip: { code: 'brassFlip' },
  jazzTurn: { code: 'brassJazzTurn' },
  smear: { code: 'brassSmear' },
};

export class Tables {
  static UNISON = true;
  static SOFTMAX_FACTOR = 10;
  static STEM_WIDTH = 1.5;
  static STEM_HEIGHT = 35;
  static STAVE_LINE_THICKNESS = 1;
  static RENDER_PRECISION_PLACES = 3;
  static RESOLUTION = RESOLUTION;

  // 1/2, 1, 2, 4, 8, 16, 32, 64, 128
  // NOTE: There is no 256 here! However, there are other mentions of 256 in this file.
  // For example, in durations has a 256 key, and sanitizeDuration() can return 256.
  // The sanitizeDuration() bit may need to be removed by 0xfe.
  static durationCodes: Record<string, Partial<GlyphProps>> = {
    '1/2': {
      stem: false,
    },

    1: {
      stem: false,
    },

    2: {
      stem: true,
    },

    4: {
      stem: true,
    },

    8: {
      stem: true,
      beamCount: 1,
      stemBeamExtension: 0,
      codeFlagUp: '\ue240' /*flag8thUp*/,
    },

    16: {
      beamCount: 2,
      stemBeamExtension: 0,
      stem: true,
      codeFlagUp: '\ue242' /*flag16thUp*/,
    },

    32: {
      beamCount: 3,
      stemBeamExtension: 7.5,
      stem: true,
      codeFlagUp: '\ue244' /*flag32ndUp*/,
    },

    64: {
      beamCount: 4,
      stemBeamExtension: 15,
      stem: true,
      codeFlagUp: '\ue246' /*flag64thUp*/,
    },

    128: {
      beamCount: 5,
      stemBeamExtension: 22.5,
      stem: true,
      codeFlagUp: '\ue248' /*flag128thUp*/,
    },
  };

  /**
   * Customize this by calling Flow.setMusicFont(...fontNames);
   */
  static MUSIC_FONT_STACK: Font[] = [];

  /**
   * @returns the `Font` object at the head of the music font stack.
   */
  static currentMusicFont(): Font {
    if (Tables.MUSIC_FONT_STACK.length === 0) {
      throw new RuntimeError(
        'NoFonts',
        'The font stack is empty. See: await Flow.fetchMusicFont(...); Flow.setMusicFont(...).'
      );
    } else {
      return Tables.MUSIC_FONT_STACK[0];
    }
  }

  static NOTATION_FONT_SCALE = 39;
  static TABLATURE_FONT_SCALE = 39;

  static SLASH_NOTEHEAD_WIDTH = 15;
  static STAVE_LINE_DISTANCE = 10;

  // HACK:
  // Since text origins are positioned at the baseline, we must
  // compensate for the ascender of the text. Of course, 1 staff space is
  // a very poor approximation.
  //
  // This will be deprecated in the future. This is a temporary solution until
  // we have more robust text metrics.
  static TEXT_HEIGHT_OFFSET_HACK = 1;

  static clefProperties(clef: string): { lineShift: number } {
    if (!clef || !(clef in clefs)) throw new RuntimeError('BadArgument', 'Invalid clef: ' + clef);
    return clefs[clef];
  }

  /** Use the provided key to look up a FontInfo in CommonMetrics. **/
  static lookupMetricFontInfo(key: string): Required<FontInfo> {
    return {
      family: Tables.lookupMetric(`${key}.fontFamily`),
      size: Tables.lookupMetric(`${key}.fontSize`),
      weight: Tables.lookupMetric(`${key}.fontWeight`),
      style: Tables.lookupMetric(`${key}.fontStyle`),
    };
  }

  /**
   * Use the provided key to look up a value in CommonMetrics.
   *
   * @param key is a string separated by periods (e.g., `Stroke.text.fontFamily`).
   * @param defaultValue is returned if the lookup fails.
   * @returns the retrieved value (or `defaultValue` if the lookup fails).
   *
   * For the key `Stroke.text.fontFamily`, check all of the following in order:
   *   1) CommonMetrics.fontFamily
   *   2) CommonMetrics.Stroke.fontFamily
   *   3) CommonMetrics.Stroke.text.fontFamily
   * Retrieve the value from the most specific key (i.e., prefer #3 over #2 over #1 in the above example).
   */
  // eslint-disable-next-line
  static lookupMetric(key: string, defaultValue?: any): any {
    const keyParts = key.split('.');
    const lastKeyPart = keyParts.pop()!; // Use ! because keyParts is not empty, since ''.split('.') still returns [''].

    // Start from root of CommonMetrics and go down as far as possible.
    let curr = CommonMetrics;
    let retVal = defaultValue;

    while (curr) {
      // Update retVal whenever we find a value assigned to a more specific key.
      retVal = curr[lastKeyPart] ?? retVal;
      const keyPart = keyParts.shift();
      if (keyPart) {
        curr = curr[keyPart]; // Go down one level.
      } else {
        break;
      }
    }

    return retVal;
  }

  /**
   * @param keyOctaveGlyph a string in the format "key/octave" (e.g., "c/5") or "key/octave/custom-note-head-code" (e.g., "g/5/t3").
   * @param clef
   * @param params a struct with one option, `octaveShift` for clef ottavation (0 = default; 1 = 8va; -1 = 8vb, etc.).
   * @returns properties for the specified note.
   */

  static keyProperties(
    keyOctaveGlyph: string,
    clef: string = 'treble',
    type: string = 'N',
    params?: { octaveShift?: number }
  ): KeyProps {
    let options = { octaveShift: 0, duration: '4' };
    if (typeof params === 'object') {
      options = { ...options, ...params };
    }
    const duration = Tables.sanitizeDuration(options.duration);

    const pieces = keyOctaveGlyph.split('/');
    if (pieces.length < 2) {
      throw new RuntimeError(
        'BadArguments',
        `First argument must be note/octave or note/octave/glyph-code: ${keyOctaveGlyph}`
      );
    }

    const key = pieces[0].toUpperCase();
    type = type.toUpperCase();
    const value = notesInfo[key];
    if (!value) throw new RuntimeError('BadArguments', 'Invalid key name: ' + key);
    let octave = parseInt(pieces[1], 10);

    // .octaveShift is the shift to compensate for clef 8va/8vb.
    octave += -1 * options.octaveShift;

    const baseIndex = octave * 7 - 4 * 7;
    let line = (baseIndex + value.index) / 2;
    line += Tables.clefProperties(clef).lineShift;

    // Integer value for note arithmetic.
    const intValue = typeof value.intVal !== 'undefined' ? octave * 12 + value.intVal : undefined;

    // If the user specified a glyph, overwrite the glyph code.
    let code = '';
    let glyphName = 'N';
    if (pieces.length > 2 && pieces[2]) {
      glyphName = pieces[2].toUpperCase();
    } else if (type !== 'N') {
      glyphName = type;
    } else glyphName = key;
    code = this.codeNoteHead(glyphName, duration);

    return {
      key,
      octave,
      line,
      intValue,
      accidental: value.accidental,
      code,
      displaced: false,
    };
  }

  static integerToNote(integer?: number): string {
    if (typeof integer === 'undefined' || integer < 0 || integer > 11) {
      throw new RuntimeError('BadArguments', `integerToNote() requires an integer in the range [0, 11]: ${integer}`);
    }

    const table: Record<number, string> = {
      0: 'C',
      1: 'C#',
      2: 'D',
      3: 'D#',
      4: 'E',
      5: 'F',
      6: 'F#',
      7: 'G',
      8: 'G#',
      9: 'A',
      10: 'A#',
      11: 'B',
    };

    const noteValue = table[integer];
    if (!noteValue) {
      throw new RuntimeError('BadArguments', `Unknown note value for integer: ${integer}`);
    }

    return noteValue;
  }

  // Used by annotation.ts and bend.ts. Clearly this implementation only works for the default font size.
  // TODO: The actual width depends on the font family, size, weight, style.
  static textWidth(text: string): number {
    return 7 * text.toString().length;
  }

  static articulationCodes(artic: string): ArticulationStruct {
    return articulations[artic];
  }

  static accidentalMap = accidentalsOld;

  static accidentalCodesOld(accidental: string): { code: string; parenRightPaddingAdjustment: number } {
    return accidentalsOld[accidental];
  }

  static accidentalCodes(accidental: string): string {
    return accidentals[accidental] ?? accidental;
  }

  static accidentalColumnsTable = accidentalColumns;

  static ornamentCodes(accidental: string): { code: string } {
    return ornaments[accidental];
  }

  static keySignature(spec: string): { type: string; line: number }[] {
    const keySpec = keySignatures[spec];

    if (!keySpec) {
      throw new RuntimeError('BadKeySignature', `Bad key signature spec: '${spec}'`);
    }

    if (!keySpec.accidental) {
      return [];
    }

    const accidentalList: Record<string, number[]> = {
      b: [2, 0.5, 2.5, 1, 3, 1.5, 3.5],
      '#': [0, 1.5, -0.5, 1, 2.5, 0.5, 2],
    };

    const notes = accidentalList[keySpec.accidental];

    const accList = [];
    for (let i = 0; i < keySpec.num; ++i) {
      const line = notes[i];
      accList.push({ type: keySpec.accidental, line });
    }

    return accList;
  }

  static getKeySignatures(): Record<string, { accidental?: string; num: number }> {
    return keySignatures;
  }

  static hasKeySignature(spec: string): boolean {
    return spec in keySignatures;
  }

  static unicode = {
    // ♯ accidental sharp
    sharp: '\u266f',
    // ♭ accidental flat
    flat: '\u266d',
    // ♮ accidental natural
    natural: '\u266e',
    // △ major seventh
    triangle: '\u25b3',
    // ø half-diminished
    'o-with-slash': '\u00f8',
    // ° diminished
    degrees: '\u00b0',
    // ○ diminished
    circle: '\u25cb',
  };

  /**
   * Convert duration aliases to the number based duration.
   * If the input isn't an alias, simply return the input.
   * @param duration
   * @returns Example: 'q' -> '4', '8' -> '8'
   */
  static sanitizeDuration(duration: string): string {
    const durationNumber: string = durationAliases[duration];
    if (durationNumber !== undefined) {
      duration = durationNumber;
    }
    if (durations[duration] === undefined) {
      throw new RuntimeError('BadArguments', `The provided duration is not valid: ${duration}`);
    }
    return duration;
  }

  /** Convert the `duration` to a fraction. */
  static durationToFraction(duration: string): Fraction {
    return new Fraction().parse(Tables.sanitizeDuration(duration));
  }

  /** Convert the `duration` to a number. */
  static durationToNumber(duration: string): number {
    return Tables.durationToFraction(duration).value();
  }

  /* Convert the `duration` to total ticks. */
  static durationToTicks(duration: string): number {
    duration = Tables.sanitizeDuration(duration);
    const ticks = durations[duration];
    if (ticks === undefined) {
      throw new RuntimeError('InvalidDuration');
    }
    return ticks;
  }

  static codeNoteHead(type: string, duration: string): string {
    switch (type) {
      /* Diamond */
      case 'D0':
        return '\ue0d8' /*noteheadDiamondWhole*/;
      case 'D1':
        return '\ue0d9' /*noteheadDiamondHalf*/;
      case 'D2':
        return '\ue0db' /*noteheadDiamondBlack*/;
      case 'D3':
        return '\ue0db' /*noteheadDiamondBlack*/;

      /* Triangle */
      case 'T0':
        return '\ue0bb' /*noteheadTriangleUpWhole*/;
      case 'T1':
        return '\ue0bc' /*noteheadTriangleUpHalf*/;
      case 'T2':
        return '\ue0be' /*noteheadTriangleUpBlack*/;
      case 'T3':
        return '\ue0be' /*noteheadTriangleUpBlack*/;

      /* Cross */
      case 'X0':
        return '\ue0a7' /*noteheadXWhole*/;
      case 'X1':
        return '\ue0a8' /*noteheadXHalf*/;
      case 'X2':
        return '\ue0a9' /*noteheadXBlack*/;
      case 'X3':
        return '\ue0b3' /*noteheadCircleX*/;

      /* Square */
      case 'S1':
        return '\ue0b8' /*noteheadSquareWhite*/;
      case 'S2':
        return '\ue0b9' /*noteheadSquareBlack*/;

      /* Rectangle */
      case 'R1':
        return '\ue0b8' /*noteheadSquareWhite*/; // no smufl code
      case 'R2':
        return '\ue0b8' /*noteheadSquareWhite*/; // no smufl code

      case 'DO':
        return '\ue0be' /*noteheadTriangleUpBlack*/;
      case 'RE':
        return '\ue0cb' /*noteheadMoonBlack*/;
      case 'MI':
        return '\ue0db' /*noteheadDiamondBlack*/;
      case 'FA':
        return '\ue0c0' /*noteheadTriangleLeftBlack*/;
      case 'FAUP':
        return '\ue0c2' /*noteheadTriangleRightBlack*/;
      case 'SO':
        return '\ue0a4' /*noteheadBlack*/;
      case 'LA':
        return '\ue0b9' /*noteheadSquareBlack*/;
      case 'TI':
        return '\ue0cd' /*noteheadTriangleRoundDownBlack*/;

      case 'DI': // Diamond
      case 'H': // Harmonics
        switch (duration) {
          case '1/2':
            return '\ue0d7' /*noteheadDiamondDoubleWhole*/;
          case '1':
            return '\ue0d8' /*noteheadDiamondWhole*/;
          case '2':
            return '\ue0d9' /*noteheadDiamondHalf*/;
          default:
            return '\ue0db' /*noteheadDiamondBlack*/;
        }
      case 'X':
      case 'M': // Muted
        switch (duration) {
          case '1/2':
            return '\ue0a6' /*noteheadXDoubleWhole*/;
          case '1':
            return '\ue0a7' /*noteheadXWhole*/;
          case '2':
            return '\ue0a8' /*noteheadXHalf*/;
          default:
            return '\ue0a9' /*noteheadXBlack*/;
        }
      case 'CX':
        switch (duration) {
          case '1/2':
            return '\ue0b0' /*noteheadCircleXDoubleWhole*/;
          case '1':
            return '\ue0b1' /*noteheadCircleXWhole*/;
          case '2':
            return '\ue0b2' /*noteheadCircleXHalf*/;
          default:
            return '\ue0b3' /*noteheadCircleX*/;
        }
      case 'CI':
        switch (duration) {
          case '1/2':
            return '\ue0e7' /*noteheadCircledDoubleWhole*/;
          case '1':
            return '\ue0e6' /*noteheadCircledWhole*/;
          case '2':
            return '\ue0e5' /*noteheadCircledHalf*/;
          default:
            return '\ue0e4' /*noteheadCircledBlack*/;
        }
      case 'SQ':
        switch (duration) {
          case '1/2':
            return '\ue0a1' /*noteheadDoubleWholeSquare*/;
          case '1':
            return '\ue0b8' /*noteheadSquareWhite*/;
          case '2':
            return '\ue0b8' /*noteheadSquareWhite*/;
          default:
            return '\ue0b9' /*noteheadSquareBlack*/;
        }
      case 'TU':
        switch (duration) {
          case '1/2':
            return '\ue0ba' /*noteheadTriangleUpDoubleWhole*/;
          case '1':
            return '\ue0bb' /*noteheadTriangleUpWhole*/;
          case '2':
            return '\ue0bc' /*noteheadTriangleUpHalf*/;
          default:
            return '\ue0be' /*noteheadTriangleUpBlack*/;
        }
      case 'TD':
        switch (duration) {
          case '1/2':
            return '\ue0c3' /*noteheadTriangleDownDoubleWhole*/;
          case '1':
            return '\ue0c4' /*noteheadTriangleDownWhole*/;
          case '2':
            return '\ue0c5' /*noteheadTriangleDownHalf*/;
          default:
            return '\ue0c7' /*noteheadTriangleDownBlack*/;
        }
      case 'SF':
        switch (duration) {
          case '1/2':
            return '\ue0d5' /*noteheadSlashedDoubleWhole1*/;
          case '1':
            return '\ue0d3' /*noteheadSlashedWhole1*/;
          case '2':
            return '\ue0d1' /*noteheadSlashedHalf1*/;
          default:
            return '\ue0cf' /*noteheadSlashedBlack1*/;
        }
      case 'SB':
        switch (duration) {
          case '1/2':
            return '\ue0d6' /*noteheadSlashedDoubleWhole2*/;
          case '1':
            return '\ue0d4' /*noteheadSlashedWhole2*/;
          case '2':
            return '\ue0d2' /*noteheadSlashedHalf2*/;
          default:
            return '\ue0d0' /*noteheadSlashedBlack2*/;
        }
      case 'R':
        switch (duration) {
          case '1/2':
            return '\ue4e2' /*restDoubleWhole*/;
          case '1':
            return '\ue4e3' /*restWhole*/;
          case '2':
            return '\ue4e4' /*restHalf*/;
          case '4':
            return '\ue4e5' /*restQuarter*/;
          case '8':
            return '\ue4e6' /*rest8th*/;
          case '16':
            return '\ue4e7' /*rest16th*/;
          case '32':
            return '\ue4e8' /*rest32nd*/;
          case '64':
            return '\ue4e9' /*rest64th*/;
          case '128':
            return '\ue4ea' /*rest128th*/;
        }
        break;
      case 'S':
        switch (duration) {
          case '1/2':
            return '\ue10a' /*noteheadSlashWhiteDoubleWhole*/;
          case '1':
            return '\ue102' /*noteheadSlashWhiteWhole*/;
          case '2':
            return '\ue103' /*noteheadSlashWhiteHalf*/;
          default:
            return '\ue100' /*noteheadSlashVerticalEnds*/;
        }
      default:
        switch (duration) {
          case '1/2':
            return '\ue0a0' /*noteheadDoubleWhole*/;
          case '1':
            return '\ue0a2' /*noteheadWhole*/;
          case '2':
            return '\ue0a3' /*noteheadHalf*/;
          default:
            return '\ue0a4' /*noteheadBlack*/;
        }
    }
    return '\u0000';
  }

  /* The list of valid note types. Used by note.ts during parseNoteStruct(). */
  static validTypes = validNoteTypes;

  // Default time signature.
  static TIME4_4 = {
    numBeats: 4,
    beatValue: 4,
    resolution: RESOLUTION,
  };
}
