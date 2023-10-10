// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
//
// ## Description
// Implements time signatures glyphs for staffs
// See tables.js for the internal time signatures
// representation

import { Element } from './element';
import { Glyphs } from './glyphs';
import { RenderContext } from './rendercontext';
import { Stave } from './stave';
import { StaveModifier, StaveModifierPosition } from './stavemodifier';
import { Category } from './typeguard';
import { RuntimeError } from './util';

export interface TimeSignatureInfo {
  glyph: string;
  line: number;
  num: boolean;
}

const assertIsValidTimeSig = (timeSpec: string) => {
  const numbers = timeSpec.split('/');

  numbers.forEach((number) => {
    // Characters consisting in number 0..9, '+', '-', '(' or ')'
    if (/^[0-9+\-()]+$/.test(number) === false) {
      throw new RuntimeError('BadTimeSignature', `Invalid time spec: ${timeSpec}. Must contain valid signatures.`);
    }
  });
};

/**
 * A TimeSignature is a StaveModifier that can make its appropriate Glyphs directly from
 * a provided "timeSpec" such as "4/4", "C|" (cut time), or even something more advanced
 * such as "3/4(6/8)" or "2/4+5/8".
 */
export class TimeSignature extends StaveModifier {
  static get CATEGORY(): string {
    return Category.TimeSignature;
  }

  bottomLine: number; // bottomLine and topLine are used to calculate the position of the
  topLine: number; // top row of digits in a numeric TimeSignature.

  protected timeSpec: string = '4/4';
  protected line: number = 0;
  protected topText: Element;
  protected botText: Element;
  protected isNumeric: boolean = true;
  protected validateArgs: boolean;
  protected topStartX: number = 0;
  protected botStartX: number = 0;
  protected lineShift: number = 0;

  constructor(timeSpec: string = '4/4', customPadding = 15, validateArgs = true) {
    super();
    this.topText = new Element();
    this.botText = new Element();
    this.validateArgs = validateArgs;

    const padding = customPadding;

    this.topLine = 1;
    this.bottomLine = 3;
    this.setPosition(StaveModifierPosition.BEGIN);
    this.setTimeSig(timeSpec);
    this.setPadding(padding);
  }

  static getTimeSigCode(key: string, smallSig = false): string {
    let code: string = Glyphs.null;
    switch (key) {
      case 'C':
        code = Glyphs.timeSigCommon;
        break;
      case 'C|':
        code = Glyphs.timeSigCutCommon;
        break;
      case '+':
        code = smallSig ? Glyphs.timeSigPlusSmall : Glyphs.timeSigPlus;
        break;
      case '-':
        code = Glyphs.timeSigMinus;
        break;
      case '(':
        code = smallSig ? Glyphs.timeSigParensLeftSmall : Glyphs.timeSigParensLeft;
        break;
      case ')':
        code = smallSig ? Glyphs.timeSigParensRightSmall : Glyphs.timeSigParensRight;
        break;
      default:
        code = String.fromCodePoint(0xe080 + Number(key[0])) /* timeSigN = Glyphs.timeSig0 + N */;
        break;
    }
    return code;
  }

  /**
   * Returns a new TimeSignatureGlyph (a Glyph subclass that knows how to draw both
   * top and bottom digits along with plus signs etc.)
   */
  makeTimeSignatureGlyph(topDigits: string, botDigits: string): void {
    // note that 'code' is ignored by TimeSignatureGlyph when rendering.
    let txt = '';
    let topWidth = 0;
    let height = 0;
    for (let i = 0; i < topDigits.length; ++i) {
      const code = TimeSignature.getTimeSigCode(topDigits[i], botDigits.length > 0);
      txt += code;
    }
    this.topText.setText(txt);
    topWidth = this.topText.getWidth();
    height = this.topText.getHeight();

    let botWidth = 0;
    txt = '';
    for (let i = 0; i < botDigits.length; ++i) {
      const code = TimeSignature.getTimeSigCode(botDigits[i], true);
      txt += code;
    }
    this.botText.setText(txt);
    botWidth = this.botText.getWidth();
    height = Math.max(height, this.botText.getHeight());

    // If the height of the digits is more than three staff spaces (30), shift half a line line
    // in order to center the digits on lines 1.5 and 4.5 rather than 2 and 4.
    this.lineShift = height > 30 ? 0.5 : 0;

    this.width = Math.max(topWidth, botWidth);
    this.topStartX = (this.width - topWidth) / 2.0;
    this.botStartX = (this.width - botWidth) / 2.0;
  }

  /**
   * Set a new time signature specification without changing customPadding, etc.
   *
   * The getter for this is `getTimeSpec` not `getTimeSig`.
   */
  setTimeSig(timeSpec: string): this {
    this.timeSpec = timeSpec;
    if (timeSpec === 'C' || timeSpec === 'C|') {
      const code = TimeSignature.getTimeSigCode(timeSpec);
      this.line = 2;
      this.text = code;
      this.isNumeric = false;
    } else {
      if (this.validateArgs) {
        assertIsValidTimeSig(timeSpec);
      }
      const parts = timeSpec.split('/');
      this.line = 0;
      this.isNumeric = true;
      this.makeTimeSignatureGlyph(parts[0] ?? '', parts[1] ?? '');
    }
    return this;
  }

  /**
   * Return the timeSpec (such as '4/4' or 'C|' or even '2/4+3/8') of the TimeSignature
   */
  getTimeSpec(): string {
    return this.timeSpec;
  }

  /**
   * Return the staff line that the TimeSignature sits on.  Generally 0 for numerator/
   * denominator time signatures such as 3/4 and 2 for cut/common.
   */
  getLine(): number {
    return this.line;
  }

  /**
   * Set the line number that the TimeSignature sits on.  Half-values are acceptable
   * for spaces, etc. Can be altered, for instance, for signatures that sit above the
   * staff in large orchestral scores.
   */
  setLine(line: number) {
    this.line = line;
  }

  /**
   * Return a boolean on whether this TimeSignature is drawn with one or more numbers
   * (such as 4/4) or not (as in cut time).
   */
  getIsNumeric(): boolean {
    return this.isNumeric;
  }

  /**
   * Set whether this TimeSignature is drawn with one or more numbers.
   */
  setIsNumeric(isNumeric: boolean) {
    this.isNumeric = isNumeric;
  }

  /**
   * Draw the time signature on a Stave using its RenderContext.  Both setStave
   * and setContext must already be run.
   */
  draw(): void {
    const stave = this.checkStave();
    const ctx = stave.checkContext();
    this.setRendered();
    this.drawAt(ctx, stave, this.x);
  }

  drawAt(ctx: RenderContext, stave: Stave, x: number): void {
    this.setRendered();

    this.applyStyle(ctx);
    ctx.openGroup('timesignature', this.getAttribute('id'));
    if (this.isNumeric) {
      let startX = x + this.topStartX;
      let y = 0;
      if (this.botText.getText().length > 0) y = stave.getYForLine(this.topLine - this.lineShift);
      else y = (stave.getYForLine(this.topLine) + stave.getYForLine(this.bottomLine)) / 2;
      this.topText.renderText(ctx, startX, y);
      startX = x + this.botStartX;
      y = stave.getYForLine(this.bottomLine + this.lineShift);
      this.botText.renderText(ctx, startX, y);
    } else {
      this.renderText(ctx, x - this.x, stave.getYForLine(this.line));
    }
    ctx.closeGroup();
    this.restoreStyle(ctx);
  }
}
