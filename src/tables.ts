// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors

import { ArticulationStruct } from './articulation';
import { Font } from './font';
import { Fraction } from './fraction';
import { Glyphs } from './glyphs';
import { GlyphProps, KeyProps } from './note';
import { RuntimeError } from './util';

const RESOLUTION = 16384;

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
  }
> = {
  C: { index: 0, intVal: 0 },
  CN: { index: 0, intVal: 0 },
  'C#': { index: 0, intVal: 1 },
  'C##': { index: 0, intVal: 2 },
  CB: { index: 0, intVal: 11 },
  CBB: { index: 0, intVal: 10 },
  D: { index: 1, intVal: 2 },
  DN: { index: 1, intVal: 2 },
  'D#': { index: 1, intVal: 3 },
  'D##': { index: 1, intVal: 4 },
  DB: { index: 1, intVal: 1 },
  DBB: { index: 1, intVal: 0 },
  E: { index: 2, intVal: 4 },
  EN: { index: 2, intVal: 4 },
  'E#': { index: 2, intVal: 5 },
  'E##': { index: 2, intVal: 6 },
  EB: { index: 2, intVal: 3 },
  EBB: { index: 2, intVal: 2 },
  F: { index: 3, intVal: 5 },
  FN: { index: 3, intVal: 5 },
  'F#': { index: 3, intVal: 6 },
  'F##': { index: 3, intVal: 7 },
  FB: { index: 3, intVal: 4 },
  FBB: { index: 3, intVal: 3 },
  G: { index: 4, intVal: 7 },
  GN: { index: 4, intVal: 7 },
  'G#': { index: 4, intVal: 8 },
  'G##': { index: 4, intVal: 9 },
  GB: { index: 4, intVal: 6 },
  GBB: { index: 4, intVal: 5 },
  A: { index: 5, intVal: 9 },
  AN: { index: 5, intVal: 9 },
  'A#': { index: 5, intVal: 10 },
  'A##': { index: 5, intVal: 11 },
  AB: { index: 5, intVal: 8 },
  ABB: { index: 5, intVal: 7 },
  B: { index: 6, intVal: 11 },
  BN: { index: 6, intVal: 11 },
  'B#': { index: 6, intVal: 12 },
  'B##': { index: 6, intVal: 13 },
  BB: { index: 6, intVal: 10 },
  BBB: { index: 6, intVal: 9 },
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

const ornaments: Record<string, string> = {
  mordent: '\ue56c' /*ornamentShortTrill*/,
  mordentInverted: '\ue56d' /*ornamentMordent*/,
  turn: '\ue567' /*ornamentTurn*/,
  turnInverted: '\ue569' /*ornamentTurnSlash*/,
  tr: '\ue566' /*ornamentTrill*/,
  upprall: '\ue5b5' /*ornamentPrecompSlideTrillDAnglebert*/,
  downprall: '\ue5c3' /*ornamentPrecompDoubleCadenceUpperPrefix*/,
  prallup: '\ue5bb' /*ornamentPrecompTrillSuffixDandrieu*/,
  pralldown: '\ue5c8' /*ornamentPrecompTrillLowerSuffix*/,
  upmordent: '\ue5b8' /*ornamentPrecompSlideTrillBach*/,
  downmordent: '\ue5c4' /*ornamentPrecompDoubleCadenceUpperPrefixTurn*/,
  lineprall: '\ue5b2' /*ornamentPrecompAppoggTrill*/,
  prallprall: '\ue56e' /*ornamentTremblement*/,
  scoop: '\ue5d0' /*brassScoop*/,
  doit: '\ue5d5' /*brassDoitMedium*/,
  fall: '\ue5d7' /*brassFallLipShort*/,
  doitLong: '\ue5d2' /*brassLiftMedium*/,
  fallLong: '\ue5de' /*brassFallRoughMedium*/,
  bend: '\ue5e3' /*brassBend*/,
  plungerClosed: '\ue5e5' /*brassMuteClosed*/,
  plungerOpen: '\ue5e7' /*brassMuteOpen*/,
  flip: '\ue5e1' /*brassFlip*/,
  jazzTurn: '\ue5e4' /*brassJazzTurn*/,
  smear: '\ue5e2' /*brassSmear*/,
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

  static accidentalCodes(accidental: string): string {
    return accidentals[accidental] ?? accidental;
  }

  static accidentalColumnsTable = accidentalColumns;

  static ornamentCodes(ornament: string): string {
    return ornaments[ornament] ?? ornament;
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
    return Glyphs.null;
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
