// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
//
// ## Description
// `StemmableNote` is an abstract interface for notes with optional stems.
// Examples of stemmable notes are `StaveNote` and `TabNote`

import { Element, ElementStyle } from './element';
import { Glyph, GlyphProps } from './glyph';
import { Note, NoteStruct } from './note';
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
        this.getStemDirection() === Stem.DOWN ? glyphProps.codeFlagDownstem ?? '' : glyphProps.codeFlagUpstem ?? '';

      this.flag.setText(flagCode);
      // #FIXME: HACK to use 30 as fontSize default rather than 39 used with glyphs.
      // HACK-BEGIN
      this.flag.fontSize = (this.renderOptions.glyphFontScale / 39) * 30;
      // HACK-END
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
    let length = frac.value() <= 1 ? 0 : 20;
    // if note is flagged, cannot shorten beam
    switch (this.duration) {
      case '8':
        if (this.beam == undefined) length = 35;
        break;
      case '16':
        length = this.beam == undefined ? 35 : 25;
        break;
      case '32':
        length = this.beam == undefined ? 45 : 35;
        break;
      case '64':
        length = this.beam == undefined ? 50 : 40;
        break;
      case '128':
        length = this.beam == undefined ? 55 : 45;
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

      // Lookup the base custom notehead (closest to the base of the stem) to extend or shorten
      // the stem appropriately. If there's no custom note head, lookup the standard notehead.
      const glyphProps = this.getBaseCustomNoteHeadGlyphProps() || this.getGlyphProps();

      // Get the font-specific customizations for the note heads.
      const offsets = Tables.currentMusicFont().lookupMetric(`stem.noteHead.${glyphProps.codeHead}`, {
        offsetYBaseStemUp: 0,
        offsetYTopStemUp: 0,
        offsetYBaseStemDown: 0,
        offsetYTopStemDown: 0,
      });

      // Configure the stem to use these offsets.
      this.stem.setOptions({
        stemUpYOffset: offsets.offsetYTopStemUp, // glyph.stemUpYOffset,
        stemDownYOffset: offsets.offsetYTopStemDown, // glyph.stemDownYOffset,
        stemUpYBaseOffset: offsets.offsetYBaseStemUp, // glyph.stemUpYBaseOffset,
        stemDownYBaseOffset: offsets.offsetYBaseStemDown, // glyph.stemDownYBaseOffset,
      });
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

    if (this.stemExtensionOverride != undefined) {
      return this.stemExtensionOverride;
    }

    // Use stemBeamExtension with beams
    if (this.beam) {
      return glyphProps.stemBeamExtension * this.getStaveNoteScale();
    }

    return this.flag.getHeight() > Stem.HEIGHT * this.getStaveNoteScale()
      ? this.flag.getHeight() - Stem.HEIGHT * this.getStaveNoteScale()
      : 0;
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
    return Tables.getGlyphProps(this.duration).flag == true && !this.beam;
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
