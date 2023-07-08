// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author: Larry Kuhns 2011

import { Font, FontInfo, FontStyle, FontWeight } from './font';
import { Glyph } from './glyph';
import { Stave } from './stave';
import { StaveModifier } from './stavemodifier';
import { Tables } from './tables';
import { Category } from './typeguard';

export class Repetition extends StaveModifier {
  static get CATEGORY(): string {
    return Category.Repetition;
  }

  static TEXT_FONT: Required<FontInfo> = {
    family: Font.SERIF,
    size: Tables.NOTATION_FONT_SCALE / 3,
    weight: FontWeight.BOLD,
    style: FontStyle.NORMAL,
  };

  static readonly type = {
    NONE: 1, // no coda or segno
    CODA_LEFT: 2, // coda at beginning of stave
    CODA_RIGHT: 3, // coda at end of stave
    SEGNO_LEFT: 4, // segno at beginning of stave
    SEGNO_RIGHT: 5, // segno at end of stave
    DC: 6, // D.C. at end of stave
    DC_AL_CODA: 7, // D.C. al coda at end of stave
    DC_AL_FINE: 8, // D.C. al Fine end of stave
    DS: 9, // D.S. at end of stave
    DS_AL_CODA: 10, // D.S. al coda at end of stave
    DS_AL_FINE: 11, // D.S. al Fine at end of stave
    FINE: 12, // Fine at end of stave
    TO_CODA: 13, // To Coda at end of stave
  };

  protected symbolType: number;

  protected xShift: number;
  protected yShift: number;

  constructor(type: number, x: number, yShift: number) {
    super();

    this.symbolType = type;
    this.x = x;
    this.xShift = 0;
    this.yShift = yShift;

    this.resetFont();
  }

  setShiftX(x: number): this {
    this.xShift = x;
    return this;
  }

  setShiftY(y: number): this {
    this.yShift = y;
    return this;
  }

  draw(stave: Stave, x: number): this {
    this.setRendered();

    switch (this.symbolType) {
      case Repetition.type.CODA_RIGHT:
        this.drawCodaFixed(stave, x + stave.getWidth());
        break;
      case Repetition.type.CODA_LEFT:
        this.drawSymbolText(stave, x, 'Coda', true);
        break;
      case Repetition.type.SEGNO_LEFT:
        this.drawSignoFixed(stave, x);
        break;
      case Repetition.type.SEGNO_RIGHT:
        this.drawSignoFixed(stave, x + stave.getWidth());
        break;
      case Repetition.type.DC:
        this.drawSymbolText(stave, x, 'D.C.', false);
        break;
      case Repetition.type.DC_AL_CODA:
        this.drawSymbolText(stave, x, 'D.C. al', true);
        break;
      case Repetition.type.DC_AL_FINE:
        this.drawSymbolText(stave, x, 'D.C. al Fine', false);
        break;
      case Repetition.type.DS:
        this.drawSymbolText(stave, x, 'D.S.', false);
        break;
      case Repetition.type.DS_AL_CODA:
        this.drawSymbolText(stave, x, 'D.S. al', true);
        break;
      case Repetition.type.DS_AL_FINE:
        this.drawSymbolText(stave, x, 'D.S. al Fine', false);
        break;
      case Repetition.type.FINE:
        this.drawSymbolText(stave, x, 'Fine', false);
        break;
      case Repetition.type.TO_CODA:
        this.drawSymbolText(stave, x, 'To', true);
        break;
      default:
        break;
    }

    return this;
  }

  drawCodaFixed(stave: Stave, x: number): this {
    const y = stave.getYForTopText(stave.getNumLines()) + this.yShift;
    Glyph.renderGlyph(
      stave.checkContext(),
      this.x + x + this.xShift,
      y + Tables.currentMusicFont().lookupMetric('staveRepetition.coda.offsetY'),
      40,
      'coda',
      { category: 'coda' }
    );
    return this;
  }

  drawSignoFixed(stave: Stave, x: number): this {
    const y = stave.getYForTopText(stave.getNumLines()) + this.yShift;
    Glyph.renderGlyph(
      stave.checkContext(),
      this.x + x + this.xShift,
      y + Tables.currentMusicFont().lookupMetric('staveRepetition.segno.offsetY'),
      30,
      'segno',
      { category: 'segno' }
    );
    return this;
  }

  drawSymbolText(stave: Stave, x: number, text: string, drawCoda: boolean): this {
    const ctx = stave.checkContext();

    ctx.save();
    ctx.setFont(this.textFont);

    let textX = 0;
    let symbolX = 0;
    const modifierWidth = stave.getNoteStartX() - this.x;
    switch (this.symbolType) {
      // To the left with symbol
      case Repetition.type.CODA_LEFT:
        // Offset Coda text to right of stave beginning
        textX = this.x + stave.getVerticalBarWidth();
        symbolX =
          textX +
          ctx.measureText(text).width +
          Tables.currentMusicFont().lookupMetric('staveRepetition.symbolText.offsetX');
        break;
      // To the right without symbol
      case Repetition.type.DC:
      case Repetition.type.DC_AL_FINE:
      case Repetition.type.DS:
      case Repetition.type.DS_AL_FINE:
      case Repetition.type.FINE:
        textX =
          this.x +
          x +
          this.xShift +
          stave.getWidth() -
          Tables.currentMusicFont().lookupMetric('staveRepetition.symbolText.spacing') -
          modifierWidth -
          ctx.measureText(text).width;
        break;
      // To the right with symbol
      default:
        textX =
          this.x +
          x +
          this.xShift +
          stave.getWidth() -
          Tables.currentMusicFont().lookupMetric('staveRepetition.symbolText.spacing') -
          modifierWidth -
          ctx.measureText(text).width -
          Tables.currentMusicFont().lookupMetric('staveRepetition.symbolText.offsetX');
        symbolX =
          textX +
          ctx.measureText(text).width +
          Tables.currentMusicFont().lookupMetric('staveRepetition.symbolText.offsetX');
        break;
    }

    const y =
      stave.getYForTopText(stave.getNumLines()) +
      this.yShift +
      Tables.currentMusicFont().lookupMetric('staveRepetition.symbolText.offsetY');
    if (drawCoda) {
      Glyph.renderGlyph(ctx, symbolX, y, Font.convertSizeToPointValue(this.textFont?.size) * 2, 'coda', {
        category: 'coda',
      });
    }

    ctx.fillText(text, textX, y + 5);
    ctx.restore();

    return this;
  }
}
