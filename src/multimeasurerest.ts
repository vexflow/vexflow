// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
//
// This class implements multiple measure rests.

import { Element } from './element';
import { RenderContext } from './rendercontext';
import { Stave } from './stave';
import { StaveModifierPosition } from './stavemodifier';
import { Tables } from './tables';
import { Category, isBarline } from './typeguard';
import { defined } from './util';

export interface MultimeasureRestRenderOptions {
  /** Extracted by Factory.MultiMeasureRest() and passed to the MultiMeasureRest constructor. */
  numberOfMeasures: number;

  /** Use rest symbols. Defaults to `false`, which renders a thick horizontal line with serifs at both ends. */
  useSymbols?: boolean;

  /** Horizontal spacing between rest symbol glyphs (if `useSymbols` is `true`).*/
  symbolSpacing?: number;

  /** Show the number of measures at the top. Defaults to `true`. */
  showNumber?: boolean;

  /** Vertical position of the "number of measures" text (measured in stave lines). Defaults to -0.5, which is above the stave. 6.5 is below the stave. */
  numberLine?: number;

  /** Font size of the "number of measures" text. */
  numberGlyphPoint?: number;

  /** Left padding from `stave.getX()`. */
  paddingLeft?: number;

  /** Right padding from `stave.getX() + stave.getWidth()` */
  paddingRight?: number;

  /** Vertical position of the rest line or symbols, expressed as stave lines. Default: 2. The top stave line is 1, and the bottom stave line is 5. */
  line?: number;

  /** Defaults to the number of vertical pixels between stave lines. Used for serif height or 2-bar / 4-bar symbol height. */
  spacingBetweenLinesPx?: number;

  /** Size of the semibreve (1-bar) rest symbol. Other symbols are scaled accordingly. */
  semibreveRestGlyphScale?: number;

  /** Thickness of the rest line. Used when `useSymbols` is false. Defaults to half the space between stave lines. */
  lineThickness?: number;

  /** Thickness of the rest line's serif. Used when `useSymbols` is false. */
  serifThickness?: number;
}

export class MultiMeasureRest extends Element {
  static get CATEGORY(): string {
    return Category.MultiMeasureRest;
  }

  public renderOptions: Required<MultimeasureRestRenderOptions>;
  protected xs = { left: NaN, right: NaN };
  protected numberOfMeasures: number;

  protected stave?: Stave;

  #hasPaddingLeft = false;
  #hasPaddingRight = false;
  #hasLineThickness = false;
  #hasSymbolSpacing = false;

  /**
   *
   * @param numberOfMeasures Number of measures.
   * @param options The options object.
   */
  constructor(numberOfMeasures: number, options: MultimeasureRestRenderOptions) {
    super();
    const fontSize = options.numberGlyphPoint ?? Tables.lookupMetric('MultiMeasureRest.fontSize'); // same as TimeSignature.
    this.textFont.size = fontSize;

    this.numberOfMeasures = numberOfMeasures;
    this.text = '';
    const t = `${this.numberOfMeasures}`;
    for (const digit of t) {
      // 0xe080 is timeSig0. We calculate the code point for timeSigN to assemble the digits via SMuFL glyphs.
      this.text += String.fromCodePoint(0xe080 + Number(digit));
    }
    this.measureText();

    // Keep track of whether these four options were provided.
    this.#hasPaddingLeft = typeof options.paddingLeft === 'number';
    this.#hasPaddingRight = typeof options.paddingRight === 'number';
    this.#hasLineThickness = typeof options.lineThickness === 'number';
    this.#hasSymbolSpacing = typeof options.symbolSpacing === 'number';

    this.renderOptions = {
      useSymbols: false,
      showNumber: true,
      numberLine: -0.5,
      numberGlyphPoint: fontSize,
      line: 2,
      spacingBetweenLinesPx: Tables.STAVE_LINE_DISTANCE, // same as Stave.
      serifThickness: 2,
      semibreveRestGlyphScale: Tables.lookupMetric('fontSize'), // same as NoteHead.
      paddingLeft: 0,
      paddingRight: 0,
      lineThickness: 5,
      symbolSpacing: 0,
      ...options,
    };
  }

  getXs(): { left: number; right: number } {
    return this.xs;
  }

  setStave(stave: Stave): this {
    this.stave = stave;
    return this;
  }

  getStave(): Stave | undefined {
    return this.stave;
  }

  checkStave(): Stave {
    return defined(this.stave, 'NoStave', 'No stave attached to instance.');
  }

  drawLine(stave: Stave, ctx: RenderContext, left: number, right: number, spacingBetweenLines: number): void {
    const options = this.renderOptions;

    const y = stave.getYForLine(options.line);
    const padding = (right - left) * 0.1;
    left += padding;
    right -= padding;
    let txt = '\ue4ef'; /*restHBarLeft*/
    const el = new Element();
    el.setText(txt);
    el.measureText();
    // Add middle bars until the right padding is reached
    for (let i = 1; (i + 2) * el.getWidth() + left <= right; i++) {
      txt += '\ue4f0'; /*restHBarMiddle*/
    }
    txt += '\ue4f1'; /*restHBarRight*/

    el.setText(txt);
    el.measureText();
    el.renderText(ctx, left + (right - left) * 0.5 - el.getWidth() * 0.5, y);
  }

  drawSymbols(stave: Stave, ctx: RenderContext, left: number, right: number, spacingBetweenLines: number): void {
    const n4 = Math.floor(this.numberOfMeasures / 4);
    const n = this.numberOfMeasures % 4;
    const n2 = Math.floor(n / 2);
    const n1 = n % 2;

    const options = this.renderOptions;

    const elMiddle = new Element();
    let txt = '';
    for (let i = 0; i < n4; ++i) {
      txt += '\ue4e1' /*restLonga*/ + ' ';
    }
    for (let i = 0; i < n2; ++i) {
      txt += '\ue4e2' /*restDoubleWhole*/ + ' ';
    }
    elMiddle.setText(txt);
    elMiddle.measureText();
    const elTop = new Element();
    txt = '';
    for (let i = 0; i < n1; ++i) {
      txt += '\ue4e3' /*restWhole*/ + ' ';
    }
    elTop.setText(txt);
    elTop.measureText();

    const width = elMiddle.getWidth() + elTop.getWidth();
    let x = left + (right - left) * 0.5 - width * 0.5;
    const line = options.line;
    const yTop = stave.getYForLine(line - 1);
    const yMiddle = stave.getYForLine(line);

    elMiddle.renderText(ctx, x, yMiddle);
    x += elMiddle.getWidth();
    elTop.renderText(ctx, x, yTop);
    x += elTop.getWidth();
  }

  draw(): void {
    const ctx = this.checkContext();
    this.setRendered();

    const stave = this.checkStave();

    let left = stave.getNoteStartX();
    let right = stave.getNoteEndX();

    // FIXME: getNoteStartX() returns x + 5(barline width)
    //        getNoteEndX() returns x + width(no barline width)
    // See Stave constructor. How do we fix this?
    // Here, we subtract the barline width.
    const begModifiers = stave.getModifiers(StaveModifierPosition.BEGIN);
    if (begModifiers.length === 1 && isBarline(begModifiers[0])) {
      left -= begModifiers[0].getWidth();
    }

    const options = this.renderOptions;
    if (this.#hasPaddingLeft) {
      left = stave.getX() + options.paddingLeft;
    }
    if (this.#hasPaddingRight) {
      right = stave.getX() + stave.getWidth() - options.paddingRight;
    }

    this.xs.left = left;
    this.xs.right = right;

    const spacingBetweenLines = options.spacingBetweenLinesPx;
    if (options.useSymbols) {
      this.drawSymbols(stave, ctx, left, right, spacingBetweenLines);
    } else {
      this.drawLine(stave, ctx, left, right, spacingBetweenLines);
    }

    if (options.showNumber) {
      this.renderText(
        ctx,
        left + (right - left) * 0.5 - this.width * 0.5,
        stave.getYForLine(options.numberLine) - this.height * 0.5
      );
    }
  }
}
