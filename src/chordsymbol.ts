// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
//
// @author Aaron (@AaronDavidNewman)
//
// This implements chord symbols above/below a chord.
// Chord symbols are modifiers that can be attached to notes.
// They can contain multiple 'blocks' which represent text or
// glyphs with various positioning options.
//
// See `tests/chordsymbol_tests.ts` for usage examples.

import { BoundingBox } from './boundingbox';
import { Element } from './element';
import { Font } from './font';
import { Glyphs } from './glyphs';
import { Metrics } from './metrics';
import { Modifier } from './modifier';
import { ModifierContextState } from './modifiercontext';
import { Note } from './note';
import { StemmableNote } from './stemmablenote';
import { Tables } from './tables';
import { Category, isStemmableNote } from './typeguard';
import { log } from './util';

// To enable logging for this class. Set `VexFlow.ChordSymbol.DEBUG` to `true`.
// eslint-disable-next-line
function L(...args: any[]): void {
  if (ChordSymbol.DEBUG) log('VexFlow.ChordSymbol', args);
}

export class ChordSymbolBlock extends Element {
  symbolModifier: SymbolModifiers;
  vAlign: boolean;

  constructor(text: string, symbolModifier: SymbolModifiers, xShift: number, yShift: number, vAlign: boolean) {
    super();
    this.text = text;
    this.symbolModifier = symbolModifier;
    this.xShift = xShift;
    this.yShift = yShift;
    this.vAlign = vAlign;
  }

  isSuperscript(): boolean {
    return this.symbolModifier === SymbolModifiers.SUPERSCRIPT;
  }

  isSubscript(): boolean {
    return this.symbolModifier === SymbolModifiers.SUBSCRIPT;
  }
}

export enum ChordSymbolHorizontalJustify {
  LEFT = 1,
  CENTER = 2,
  RIGHT = 3,
  CENTER_STEM = 4,
}

export enum ChordSymbolVerticalJustify {
  TOP = 1,
  BOTTOM = 2,
}

export enum SymbolModifiers {
  NONE = 1,
  SUBSCRIPT = 2,
  SUPERSCRIPT = 3,
}

/**
 * ChordSymbol is a modifier that creates a chord symbol above/below a chord.
 * As a modifier, it is attached to an existing note.
 */
export class ChordSymbol extends Modifier {
  static DEBUG: boolean = false;

  static get CATEGORY(): string {
    return Category.ChordSymbol;
  }

  // Chord symbols can be positioned and justified relative to the note.
  static readonly HorizontalJustify = ChordSymbolHorizontalJustify;

  static readonly HorizontalJustifyString: Record<string, ChordSymbolHorizontalJustify> = {
    left: ChordSymbolHorizontalJustify.LEFT,
    right: ChordSymbolHorizontalJustify.RIGHT,
    center: ChordSymbolHorizontalJustify.CENTER,
    centerStem: ChordSymbolHorizontalJustify.CENTER_STEM,
  };

  static readonly VerticalJustify = ChordSymbolVerticalJustify;

  static readonly VerticalJustifyString: Record<string, ChordSymbolVerticalJustify> = {
    top: ChordSymbolVerticalJustify.TOP,
    above: ChordSymbolVerticalJustify.TOP,
    below: ChordSymbolVerticalJustify.BOTTOM,
    bottom: ChordSymbolVerticalJustify.BOTTOM,
  };

  static get superSubRatio(): number {
    return Metrics.get('ChordSymbol.superSubRatio');
  }

  static get spacingBetweenBlocks(): number {
    return Metrics.get('ChordSymbol.spacing');
  }

  static get superscriptOffset(): number {
    return Metrics.get('ChordSymbol.superscriptOffset');
  }

  static get subscriptOffset(): number {
    return Metrics.get('ChordSymbol.subscriptOffset');
  }

  // Glyph data
  static readonly glyphs: Record<string, string> = {
    diminished: Glyphs.csymDiminished,
    dim: Glyphs.csymDiminished,
    halfDiminished: Glyphs.csymHalfDiminished,
    '+': Glyphs.csymAugmented,
    augmented: Glyphs.csymAugmented,
    majorSeventh: Glyphs.csymMajorSeventh,
    minor: Glyphs.csymMinor,
    '-': Glyphs.csymMinor,
    '(': '(', // Glyphs.csymParensLeftTall,
    leftParen: '(', // Glyphs.csymParensLeftTall,
    ')': ')', // Glyphs.csymParensRightTall,
    rightParen: ')', // Glyphs.csymParensRightTall,
    leftBracket: Glyphs.csymBracketLeftTall,
    rightBracket: Glyphs.csymBracketRightTall,
    leftParenTall: '(', // Glyphs.csymParensLeftVeryTall,
    rightParenTall: ')', // Glyphs.csymParensRightVeryTall,
    '/': Glyphs.csymDiagonalArrangementSlash,
    over: Glyphs.csymDiagonalArrangementSlash,
    '#': Glyphs.csymAccidentalSharp,
    b: Glyphs.csymAccidentalFlat,
  };

  static readonly symbolModifiers = SymbolModifiers;

  static get minPadding(): number {
    return Metrics.get('NoteHead.minPadding');
  }

  /**
   * Estimate the width of the whole chord symbol, based on the sum of the widths of the individual blocks.
   * Estimate how many lines above/below the staff we need.
   */
  static format(symbols: ChordSymbol[], state: ModifierContextState): boolean {
    if (!symbols || symbols.length === 0) return false;

    let width = 0;
    let leftWidth = 0;
    let rightWidth = 0;
    let maxLeftGlyphWidth = 0;
    let maxRightGlyphWidth = 0;

    for (const symbol of symbols) {
      const note: Note = symbol.checkAttachedNote();
      let lineSpaces = 1;

      for (let j = 0; j < symbol.symbolBlocks.length; ++j) {
        const block = symbol.symbolBlocks[j];
        const sup = block.isSuperscript();
        const sub = block.isSubscript();
        block.setXShift(width);

        // If there are super/subscripts, they extend beyond the line so
        // assume they take up 2 lines
        if (sup || sub) {
          lineSpaces = 2;
        }

        // If a subscript immediately follows a superscript block, try to
        // overlay them.
        if (sub && j > 0) {
          const prev = symbol.symbolBlocks[j - 1];
          if (prev.isSuperscript()) {
            // slide the symbol over so it lines up with superscript
            block.setXShift(width - prev.getWidth() - ChordSymbol.minPadding);
            block.vAlign = true;
            width +=
              -prev.getWidth() -
              ChordSymbol.minPadding +
              (prev.getWidth() > block.getWidth() ? prev.getWidth() - block.getWidth() : 0);
          }
        }
        width += block.getWidth() + ChordSymbol.minPadding;
      }

      if (symbol.getVertical() === ChordSymbolVerticalJustify.TOP) {
        symbol.setTextLine(state.topTextLine);
        state.topTextLine += lineSpaces;
      } else {
        symbol.setTextLine(state.textLine + 1);
        state.textLine += lineSpaces + 1;
      }
      if (symbol.getReportWidth()) {
        if (isStemmableNote(note)) {
          const glyphWidth = note.getGlyphWidth();
          if (symbol.getHorizontal() === ChordSymbolHorizontalJustify.RIGHT) {
            maxLeftGlyphWidth = Math.max(glyphWidth, maxLeftGlyphWidth);
            leftWidth = Math.max(leftWidth, width) + ChordSymbol.minPadding;
          } else if (symbol.getHorizontal() === ChordSymbolHorizontalJustify.LEFT) {
            maxRightGlyphWidth = Math.max(glyphWidth, maxRightGlyphWidth);
            rightWidth = Math.max(rightWidth, width);
          } else {
            leftWidth = Math.max(leftWidth, width / 2) + ChordSymbol.minPadding;
            rightWidth = Math.max(rightWidth, width / 2);
            maxLeftGlyphWidth = Math.max(glyphWidth / 2, maxLeftGlyphWidth);
            maxRightGlyphWidth = Math.max(glyphWidth / 2, maxRightGlyphWidth);
          }
        }
        symbol.width = width;
      }
      width = 0; // reset symbol width
    }
    const rightOverlap = Math.min(
      Math.max(rightWidth - maxRightGlyphWidth, 0),
      Math.max(rightWidth - state.rightShift, 0)
    );
    const leftOverlap = Math.min(Math.max(leftWidth - maxLeftGlyphWidth, 0), Math.max(leftWidth - state.leftShift, 0));

    state.leftShift += leftOverlap;
    state.rightShift += rightOverlap;
    return true;
  }

  protected symbolBlocks: ChordSymbolBlock[] = [];
  protected horizontal: number = ChordSymbolHorizontalJustify.LEFT;
  protected vertical: number = ChordSymbolVerticalJustify.TOP;
  protected reportWidth: boolean = true;

  constructor() {
    super();
  }

  /**
   * The offset is specified in `em`. Scale this value by the font size in pixels.
   */
  get superscriptOffset(): number {
    return ChordSymbol.superscriptOffset * Font.convertSizeToPixelValue(this.fontInfo.size);
  }

  get subscriptOffset(): number {
    return ChordSymbol.subscriptOffset * Font.convertSizeToPixelValue(this.fontInfo.size);
  }
  setReportWidth(value: boolean): this {
    this.reportWidth = value;
    return this;
  }

  getReportWidth(): boolean {
    return this.reportWidth;
  }
  /**
   * ChordSymbol allows multiple blocks so we can mix glyphs and font text.
   * Each block can have its own vertical orientation.
   */
  getSymbolBlock(
    params: Partial<{
      text: string;
      symbolModifier: SymbolModifiers;
    }> = {}
  ): ChordSymbolBlock {
    const symbolBlock = new ChordSymbolBlock(
      params.text ?? '',
      params.symbolModifier ?? SymbolModifiers.NONE,
      0,
      0,
      false
    );

    if (symbolBlock.isSubscript()) {
      symbolBlock.setYShift(this.subscriptOffset);
    }
    if (symbolBlock.isSuperscript()) {
      symbolBlock.setYShift(this.superscriptOffset);
    }
    if (symbolBlock.isSubscript() || symbolBlock.isSuperscript()) {
      const { family, size, weight, style } = this.fontInfo;
      const smallerFontSize = Font.scaleSize(size, ChordSymbol.superSubRatio);
      symbolBlock.setFont(family, smallerFontSize, weight, style);
    } else {
      symbolBlock.setFont(this.fontInfo);
    }

    return symbolBlock;
  }

  /** Add a symbol to this chord, could be text, glyph or line. */
  addSymbolBlock(
    parameters: Partial<{
      text: string;
      symbolModifier: SymbolModifiers;
    }>
  ): this {
    this.symbolBlocks.push(this.getSymbolBlock(parameters));
    return this;
  }

  // ### Convenience functions for creating different types of chord symbol parts.

  /** Add a text block. */
  addText(
    text: string,
    parameters: Partial<{
      symbolModifier: SymbolModifiers;
    }> = {}
  ): this {
    return this.addSymbolBlock({ ...parameters, text });
  }

  /** Add a text block with superscript modifier. */
  addTextSuperscript(text: string): this {
    const symbolModifier = SymbolModifiers.SUPERSCRIPT;
    return this.addSymbolBlock({ text, symbolModifier });
  }

  /** Add a text block with subscript modifier. */
  addTextSubscript(text: string): this {
    const symbolModifier = SymbolModifiers.SUBSCRIPT;
    return this.addSymbolBlock({ text, symbolModifier });
  }

  /** Add a glyph block with superscript modifier. */
  addGlyphSuperscript(glyph: string): this {
    return this.addTextSuperscript(ChordSymbol.glyphs[glyph]);
  }

  /** Add a glyph block. */
  addGlyph(
    glyph: string,
    params: Partial<{
      symbolModifier: SymbolModifiers;
    }> = {}
  ): this {
    return this.addText(ChordSymbol.glyphs[glyph], params);
  }

  /**
   * Add a glyph for each character in 'text'. If the glyph is not available, use text from the font.
   * e.g. `addGlyphOrText('(+5#11)')` will use text for the '5' and '11', and glyphs for everything else.
   */
  addGlyphOrText(
    text: string,
    params: Partial<{
      symbolModifier: SymbolModifiers;
    }> = {}
  ): this {
    let str = '';
    for (let i = 0; i < text.length; ++i) {
      const char = text[i];
      const glyph = ChordSymbol.glyphs[char];
      if (glyph) {
        str += glyph;
      } else {
        // Collect consecutive characters with no glyphs.
        str += char;
      }
    }
    if (str.length > 0) {
      this.addText(str, params);
    }
    return this;
  }

  /** Add a line of the given width, used as a continuation of the previous symbol in analysis, or lyrics, etc. */
  addLine(
    params: Partial<{
      symbolModifier: SymbolModifiers;
    }> = {}
  ): this {
    // Two csymMinor glyphs next to each other.
    return this.addText('\ue874\ue874' /*{csymMinor}{csymMinor}*/, params);
  }

  /** Set vertical position of text (above or below stave). */
  setVertical(vj: ChordSymbolVerticalJustify | string | number): this {
    this.vertical = typeof vj === 'string' ? ChordSymbol.VerticalJustifyString[vj] : vj;
    return this;
  }

  getVertical(): number {
    return this.vertical;
  }

  /** Set horizontal justification. */
  setHorizontal(hj: ChordSymbolHorizontalJustify | string | number): this {
    this.horizontal = typeof hj === 'string' ? ChordSymbol.HorizontalJustifyString[hj] : hj;
    return this;
  }

  getHorizontal(): number {
    return this.horizontal;
  }

  /** Render text and glyphs above/below the note. */
  draw(): void {
    const ctx = this.checkContext();
    const note = this.checkAttachedNote() as StemmableNote;
    this.setRendered();

    ctx.openGroup('chordsymbol', this.getAttribute('id'));

    const start = note.getModifierStartXY(Modifier.Position.ABOVE, this.index);
    ctx.setFont(this.fontInfo);

    let y: number;

    // The position of the text varies based on whether or not the note
    // has a stem.
    const hasStem = note.hasStem();
    const stave = note.checkStave();

    if (this.vertical === ChordSymbolVerticalJustify.BOTTOM) {
      // HACK: We need to compensate for the text's height since its origin is bottom-right.
      y = stave.getYForBottomText(this.textLine + Tables.TEXT_HEIGHT_OFFSET_HACK);
      if (hasStem) {
        const stemExt = note.checkStem().getExtents();
        const spacing = stave.getSpacingBetweenLines();
        const stemBase = note.getStemDirection() === 1 ? stemExt.baseY : stemExt.topY;
        y = Math.max(y, stemBase + spacing * (this.textLine + 2));
      }
    } else {
      // (this.vertical === VerticalJustify.TOP)
      const topY = Math.min(...note.getYs());
      y = Math.min(stave.getYForTopText(this.textLine), topY - 10);
      if (hasStem) {
        const stemExt = note.checkStem().getExtents();
        const spacing = stave.getSpacingBetweenLines();
        y = Math.min(y, stemExt.topY - 5 - spacing * this.textLine);
      }
    }

    let x = start.x;
    if (this.horizontal === ChordSymbolHorizontalJustify.LEFT) {
      x = start.x;
    } else if (this.horizontal === ChordSymbolHorizontalJustify.RIGHT) {
      x = start.x + this.getWidth();
    } else if (this.horizontal === ChordSymbolHorizontalJustify.CENTER) {
      x = start.x - this.getWidth() / 2;
    } else {
      // HorizontalJustify.CENTER_STEM
      x = note.getStemX() - this.getWidth() / 2;
    }
    L('Rendering ChordSymbol: ', x, y);

    this.symbolBlocks.forEach((symbol) => {
      L('Rendering Text: ', symbol.getText(), x + symbol.getXShift(), y + symbol.getYShift());
      symbol.setX(x);
      symbol.setY(y);
      symbol.renderText(ctx, 0, 0);
    });
    this.drawPointerRect();
    ctx.closeGroup();
  }

  // Get the `BoundingBox` for the entire chord
  getBoundingBox(): BoundingBox {
    const boundingBox = this.symbolBlocks[0].getBoundingBox();
    for (let i = 1; i < this.symbolBlocks.length; i++) {
      boundingBox.mergeWith(this.symbolBlocks[i].getBoundingBox());
    }
    return boundingBox;
  }
}
