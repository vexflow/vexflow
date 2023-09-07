// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
//
// ## Description
// `StemmableNote` is an abstract interface for notes with optional stems.
// Examples of stemmable notes are `StaveNote` and `TabNote`

import { Element, ElementStyle } from './element';
import { Glyphs } from './glyphs';
import { GlyphProps, Note, NoteStruct } from './note';
import { Stem, StemOptions } from './stem';
import { Tables } from './tables';
import { Category } from './typeguard';
import { RuntimeError } from './util';

export abstract class StemmableNote extends Note {
  static get CATEGORY(): string {
    return Category.StemmableNote;
  }

  stemDirection?: number;
  stem?: Stem;

  protected flag = new Element();
  protected flagStyle: ElementStyle = {};
  protected stemExtensionOverride?: number;

  constructor(noteStruct: NoteStruct) {
    super(noteStruct);
  }

  // Get and set the note's `Stem`
  getStem(): Stem | undefined {
    return this.stem;
  }

  checkStem(): Stem {
    if (!this.stem) {
      throw new RuntimeError('NoStem', 'No stem attached to instance');
    }
    return this.stem;
  }

  setStem(stem: Stem): this {
    this.stem = stem;
    this.addChildElement(stem);
    return this;
  }

  // Builds and sets a new stem
  buildStem(): this {
    const stem = new Stem();
    this.setStem(stem);
    return this;
  }

  buildFlag(): void {
    const { glyphProps } = this;

    if (this.hasFlag()) {
      const flagCode =
        // codeFlagDown = codeFlagUp + 1
        // if codeFlagUp is undefined, codePoint will be 0
        this.getStemDirection() === Stem.DOWN
          ? String.fromCodePoint((glyphProps.codeFlagUp?.codePointAt(0) ?? -1) + 1)
          : glyphProps.codeFlagUp ?? Glyphs.null;

      this.flag.setText(flagCode);
      this.flag.fontSize = this.renderOptions.glyphFontScale;
      this.flag.measureText();
    }
  }

  // Get the custom glyph associated with the outer note head on the base of the stem.
  getBaseCustomNoteHeadGlyphProps(): GlyphProps {
    if (this.getStemDirection() === Stem.DOWN) {
      return this.customGlyphs[this.customGlyphs.length - 1];
    } else {
      return this.customGlyphs[0];
    }
  }

  // Get the full length of stem
  getStemLength(): number {
    return Stem.HEIGHT + this.getStemExtension();
  }

  // Get the number of beams for this duration
  getBeamCount(): number {
    const glyphProps = this.getGlyphProps();

    if (glyphProps) {
      return glyphProps.beamCount;
    } else {
      return 0;
    }
  }

  // Get the minimum length of stem
  getStemMinimumLength(): number {
    const frac = Tables.durationToFraction(this.duration);
    const beamIsUndefined = this.beam === undefined;
    let length = frac.value() <= 1 ? 0 : 20;
    // if note is flagged, cannot shorten beam
    switch (this.duration) {
      case '8':
      case '16':
        length = beamIsUndefined ? 35 : 25;
        break;
      case '32':
        length = beamIsUndefined ? 45 : 35;
        break;
      case '64':
        length = beamIsUndefined ? 50 : 40;
        break;
      case '128':
        length = beamIsUndefined ? 55 : 45;
        break;
      default:
        break;
    }
    return length;
  }

  // Get/set the direction of the stem
  getStemDirection(): number {
    if (!this.stemDirection) throw new RuntimeError('NoStem', 'No stem attached to this note.');
    return this.stemDirection;
  }

  setStemDirection(direction?: number): this {
    if (!direction) direction = Stem.UP;
    if (direction !== Stem.UP && direction !== Stem.DOWN) {
      throw new RuntimeError('BadArgument', `Invalid stem direction: ${direction}`);
    }

    this.stemDirection = direction;

    // Reset and reformat everything. Flag has to be built before calling getStemExtension.
    this.reset();
    if (this.hasFlag()) {
      this.buildFlag();
    }
    this.beam = undefined;

    if (this.stem) {
      this.stem.setDirection(direction);
      this.stem.setExtension(this.getStemExtension());
    }

    if (this.preFormatted) {
      this.preFormat();
    }
    return this;
  }

  // Get the `x` coordinate of the stem
  getStemX(): number {
    const xBegin = this.getAbsoluteX() + this.xShift;
    const xEnd = this.getAbsoluteX() + this.xShift + this.getGlyphWidth();
    const stemX = this.stemDirection === Stem.DOWN ? xBegin : xEnd;
    return stemX;
  }

  // Get the `x` coordinate for the center of the glyph.
  // Used for `TabNote` stems and stemlets over rests
  getCenterGlyphX(): number {
    return this.getAbsoluteX() + this.xShift + this.getGlyphWidth() / 2;
  }

  /** Primarily used as the scaling factor for grace notes, GraceNote will return the required scale. */
  getStaveNoteScale(): number {
    return 1.0;
  }

  // Get the stem extension for the current duration
  getStemExtension(): number {
    const glyphProps = this.getGlyphProps();
    const flagHeight = this.flag.getHeight();
    const scale = this.getStaveNoteScale();

    if (this.stemExtensionOverride !== undefined) {
      return this.stemExtensionOverride;
    }

    // Use stemBeamExtension with beams
    if (this.beam) {
      return glyphProps.stemBeamExtension * scale;
    }

    // If the flag is longer than the stem, extend the stem by the difference.
    return flagHeight > Stem.HEIGHT * scale ? flagHeight - Stem.HEIGHT * scale : 0;
  }

  // Set the stem length to a specific. Will override the default length.
  setStemLength(height: number): this {
    this.stemExtensionOverride = height - Stem.HEIGHT;
    return this;
  }

  // Get the top and bottom `y` values of the stem.
  getStemExtents(): { topY: number; baseY: number } {
    if (!this.stem) throw new RuntimeError('NoStem', 'No stem attached to this note.');
    return this.stem.getExtents();
  }

  /** Gets the `y` value for the top modifiers at a specific `textLine`. */
  getYForTopText(textLine: number): number {
    const stave = this.checkStave();
    if (this.hasStem()) {
      const extents = this.getStemExtents();
      if (!extents) throw new RuntimeError('InvalidState', 'Stem does not have extents.');

      return Math.min(
        stave.getYForTopText(textLine),
        extents.topY - this.renderOptions.annotationSpacing * (textLine + 1)
      );
    } else {
      return stave.getYForTopText(textLine);
    }
  }

  /** Gets the `y` value for the bottom modifiers at a specific `textLine`. */
  getYForBottomText(textLine: number): number {
    const stave = this.checkStave();
    if (this.hasStem()) {
      const extents = this.getStemExtents();
      if (!extents) throw new RuntimeError('InvalidState', 'Stem does not have extents.');

      return Math.max(stave.getYForTopText(textLine), extents.baseY + this.renderOptions.annotationSpacing * textLine);
    } else {
      return stave.getYForBottomText(textLine);
    }
  }

  hasFlag(): boolean {
    return this.glyphProps.codeFlagUp !== undefined && !this.beam && !this.isRest();
  }

  /** Post formats the note. */
  postFormat(): this {
    this.beam?.postFormat();
    this.postFormatted = true;
    return this;
  }

  /** Renders the stem onto the canvas. */
  drawStem(stemOptions: StemOptions): void {
    this.checkContext();
    this.setRendered();

    this.setStem(new Stem(stemOptions));
    this.stem?.setContext(this.getContext()).draw();
  }
}
