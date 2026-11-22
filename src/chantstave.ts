// Copyright (c) 2026-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
// Movable clefs, written pitches, and phrase divisions on a four-line square-chant stave.

import { Clef } from './clef';
import { GlyphNote } from './glyphnote';
import { Glyphs } from './glyphs';
import { Stave, StaveOptions } from './stave';
import { Tables } from './tables';
import { RuntimeError } from './util';

/** A C clef marks written middle C. An F clef marks the F below it. */
export type ChantClef = 'C' | 'F';

/** Chant counts its four lines upwards, starting with 1 at the bottom. */
export type ChantLine = 1 | 2 | 3 | 4;

export interface ChantStaveOptions extends Omit<StaveOptions, 'clef' | 'numLines'> {
  clef?: ChantClef;
  line?: ChantLine;
}

/** Render square chant and resolve pitches against the same movable clef. */
export class ChantStave extends Stave {
  private readonly chantClef: Clef;

  /** Default to C on line three or F on line two. Chant uses explicit phrase endings. */
  constructor(x: number, y: number, width: number, options: ChantStaveOptions = {}) {
    const { clef = 'C', line = clef === 'C' ? 3 : 2, ...staveOptions } = options;
    super(x, y, width, { leftBar: false, rightBar: false, ...staveOptions, numLines: 4 });
    this.chantClef = new Clef('chant-c');
    this.addModifier(this.chantClef);
    this.setChantClef(clef, line);
  }

  /** Replace the clef in place. The next layout uses its new width and pitch anchor. */
  setChantClef(clef: ChantClef, line: ChantLine): this {
    if ((clef !== 'C' && clef !== 'F') || !Number.isInteger(line) || line < 1 || line > 4)
      throw new RuntimeError('BadArguments', 'Expected a chant C or F clef on line 1 through 4.');
    this.clef = clef === 'C' ? 'chant-c' : 'chant-f';
    this.chantClef.setType(this.clef);
    this.chantClef.line = 4 - line;
    // One SMuFL em spans four staff spaces, including on enlarged staves.
    this.chantClef.setFontSize(`${4 * this.getSpacingBetweenLines()}px`);
    this.formatted = false;
    return this;
  }

  /** Return the drawing line from the top. Neighboring written pitches are half a space apart. */
  getLineForPitch(pitch: string): number {
    if (!/^[a-g](?:bb|##|b|#|n)?\/-?\d+$/i.test(pitch) || !Number.isSafeInteger(Number(pitch.split('/')[1])))
      throw new RuntimeError('BadArguments', 'Expected a written chant pitch such as c/4.');
    const anchor = this.chantClef.code === Glyphs.chantCclef ? 'c/4' : 'f/3';
    return this.chantClef.line + Tables.keyProperties(anchor).line - Tables.keyProperties(pitch).line;
  }

  /** Return the written pitch's y coordinate in this stave. */
  getYForPitch(pitch: string): number {
    return this.getYForLine(this.getLineForPitch(pitch));
  }
}

/** The four phrase endings in order from the shortest pause to the end of a piece. */
const divisionGlyphs = {
  minima: Glyphs.chantDivisioMinima,
  maior: Glyphs.chantDivisioMaior,
  maxima: Glyphs.chantDivisioMaxima,
  finalis: Glyphs.chantDivisioFinalis,
} as const;
export type ChantDivisionKind = keyof typeof divisionGlyphs;

/** Resolve the named glyph and reject unsupported names from JavaScript callers. */
function divisionGlyph(kind: ChantDivisionKind): string {
  if (!Object.prototype.hasOwnProperty.call(divisionGlyphs, kind))
    throw new RuntimeError('BadArguments', 'Expected a minima, maior, maxima or finalis division.');
  return divisionGlyphs[kind];
}

/** Chant divisions reserve horizontal ink in a Voice without consuming musical time. */
export class ChantDivision extends GlyphNote {
  constructor(kind: ChantDivisionKind) {
    // All four SMuFL glyphs share the center of the four-line staff as their origin.
    super(divisionGlyph(kind), { duration: 'b' }, { ignoreTicks: true, line: 1.5 });
  }

  /** Change the mark in place while preserving its position in the voice. */
  setKind(kind: ChantDivisionKind): this {
    return this.setGlyph(divisionGlyph(kind));
  }

  /** Size the strokes to the actual staff spacing so maxima and finalis reach both outer lines. */
  override setStave(stave: Stave): this {
    super.setStave(stave);
    this.setFontSize(`${4 * stave.getSpacingBetweenLines()}px`);
    return this;
  }
}
