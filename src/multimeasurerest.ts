// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
//
// This class implements multiple measure rests.

import { Element } from './element';
import { Glyph } from './glyph';
import { NoteHead } from './notehead';
import { RenderContext } from './rendercontext';
import { Stave } from './stave';
import { StaveModifierPosition } from './stavemodifier';
import { Tables } from './tables';
import { TimeSignature } from './timesignature';
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

let semibreveRest: { glyphFontScale: number; glyphCode: string; width: number } | undefined;

function getSemibreveRest() {
  if (!semibreveRest) {
    const noteHead = new NoteHead({ duration: 'w', noteType: 'r' });
    semibreveRest = {
      glyphFontScale: noteHead.renderOptions.glyphFontScale,
      glyphCode: noteHead.glyphCode,
      width: noteHead.getWidth(),
    };
  }
  return semibreveRest;
}

export class MultiMeasureRest extends Element {
  static get CATEGORY(): string {
    return Category.MultiMeasureRest;
  }

  public renderOptions: Required<MultimeasureRestRenderOptions>;
  protected xs = { left: NaN, right: NaN };
  protected numberOfMeasures: number;

  protected stave?: Stave;

  private hasPaddingLeft = false;
  private hasPaddingRight = false;
  private hasLineThickness = false;
  private hasSymbolSpacing = false;

  /**
   *
   * @param numberOfMeasures Number of measures.
   * @param options The options object.
   */
  constructor(numberOfMeasures: number, options: MultimeasureRestRenderOptions) {
    super();

    this.numberOfMeasures = numberOfMeasures;

    // Keep track of whether these four options were provided.
    this.hasPaddingLeft = typeof options.paddingLeft === 'number';
    this.hasPaddingRight = typeof options.paddingRight === 'number';
    this.hasLineThickness = typeof options.lineThickness === 'number';
    this.hasSymbolSpacing = typeof options.symbolSpacing === 'number';

    const musicFont = Tables.currentMusicFont();
    this.renderOptions = {
      useSymbols: false,
      showNumber: true,
      numberLine: -0.5,
      numberGlyphPoint: musicFont.lookupMetric('digits.point') ?? Tables.NOTATION_FONT_SCALE, // same as TimeSignature.
      line: 2,
      spacingBetweenLinesPx: Tables.STAVE_LINE_DISTANCE, // same as Stave.
      serifThickness: 2,
      semibreveRestGlyphScale: Tables.NOTATION_FONT_SCALE, // same as NoteHead.
      paddingLeft: 0,
      paddingRight: 0,
      lineThickness: 5,
      symbolSpacing: 0,
      ...options,
    };

    const fontLineShift = musicFont.lookupMetric('digits.shiftLine', 0);
    this.renderOptions.numberLine += fontLineShift;
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

    let lineThicknessHalf;
    if (this.hasLineThickness) {
      lineThicknessHalf = options.lineThickness * 0.5;
    } else {
      lineThicknessHalf = spacingBetweenLines * 0.25;
    }
    const serifThickness = options.serifThickness;
    const top = y - spacingBetweenLines;
    const bot = y + spacingBetweenLines;
    const leftIndented = left + serifThickness;
    const rightIndented = right - serifThickness;
    const lineTop = y - lineThicknessHalf;
    const lineBottom = y + lineThicknessHalf;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(leftIndented, top);
    ctx.lineTo(leftIndented, lineTop);
    ctx.lineTo(rightIndented, lineTop);
    ctx.lineTo(rightIndented, top);
    ctx.lineTo(right, top);
    ctx.lineTo(right, bot);
    ctx.lineTo(rightIndented, bot);
    ctx.lineTo(rightIndented, lineBottom);
    ctx.lineTo(leftIndented, lineBottom);
    ctx.lineTo(leftIndented, bot);
    ctx.lineTo(left, bot);
    ctx.closePath();
    ctx.fill();
  }

  drawSymbols(stave: Stave, ctx: RenderContext, left: number, right: number, spacingBetweenLines: number): void {
    const n4 = Math.floor(this.numberOfMeasures / 4);
    const n = this.numberOfMeasures % 4;
    const n2 = Math.floor(n / 2);
    const n1 = n % 2;

    const options = this.renderOptions;

    // FIXME: TODO: invalidate semibreveRest at the appropriate time
    // (e.g., if the system font settings are changed).
    semibreveRest = undefined;

    const rest = getSemibreveRest();
    const restScale = options.semibreveRestGlyphScale;
    const restWidth = rest.width * (restScale / rest.glyphFontScale);
    const glyphs = {
      2: {
        width: restWidth * 0.5,
        height: spacingBetweenLines,
      },
      1: {
        width: restWidth,
      },
    };

    /* 10: normal spacingBetweenLines */
    const spacing = this.hasSymbolSpacing ? options.symbolSpacing : 10;

    const width = n4 * glyphs[2].width + n2 * glyphs[2].width + n1 * glyphs[1].width + (n4 + n2 + n1 - 1) * spacing;
    let x = left + (right - left) * 0.5 - width * 0.5;
    const line = options.line;
    const yTop = stave.getYForLine(line - 1);
    const yMiddle = stave.getYForLine(line);
    const yBottom = stave.getYForLine(line + 1);

    ctx.save();
    ctx.setStrokeStyle('none');
    ctx.setLineWidth(0);

    for (let i = 0; i < n4; ++i) {
      ctx.fillRect(x, yMiddle - glyphs[2].height, glyphs[2].width, glyphs[2].height);
      ctx.fillRect(x, yBottom - glyphs[2].height, glyphs[2].width, glyphs[2].height);
      x += glyphs[2].width + spacing;
    }
    for (let i = 0; i < n2; ++i) {
      ctx.fillRect(x, yMiddle - glyphs[2].height, glyphs[2].width, glyphs[2].height);
      x += glyphs[2].width + spacing;
    }
    for (let i = 0; i < n1; ++i) {
      Glyph.renderGlyph(ctx, x, yTop, restScale, rest.glyphCode);
      x += glyphs[1].width + spacing;
    }

    ctx.restore();
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
    if (this.hasPaddingLeft) {
      left = stave.getX() + options.paddingLeft;
    }
    if (this.hasPaddingRight) {
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
      const timeSpec = '/' + this.numberOfMeasures;
      const timeSig = new TimeSignature(timeSpec, 0, false);
      timeSig.point = options.numberGlyphPoint;
      timeSig.setTimeSig(timeSpec);
      timeSig.setStave(stave);
      timeSig.setX(left + (right - left) * 0.5 - timeSig.getInfo().glyph.getMetrics().width * 0.5);
      timeSig.bottomLine = options.numberLine;
      timeSig.setContext(ctx).draw();
    }
  }
}
