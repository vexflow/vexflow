// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author: Larry Kuhns 2011

import { Glyphs } from './glyphs';
import { Metrics } from './metrics';
import { Stave } from './stave';
import { StaveModifier } from './stavemodifier';
import { Category } from './typeguard';

export class Repetition extends StaveModifier {
  static get CATEGORY(): string {
    return Category.Repetition;
  }

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
  }

  setShiftX(x: number): this {
    this.xShift = x;
    return this;
  }

  setShiftY(y: number): this {
    this.yShift = y;
    return this;
  }

  draw(): void {
    const stave = this.checkStave();
    const x = stave.getModifierXShift(this.getPosition());
    this.setRendered();

    switch (this.symbolType) {
      case Repetition.type.CODA_RIGHT:
        this.drawCodaFixed(stave, x + stave.getWidth());
        break;
      case Repetition.type.CODA_LEFT:
        this.drawSymbolText(stave, x, 'Coda', true);
        break;
      case Repetition.type.SEGNO_LEFT:
        this.drawSegnoFixed(stave, x);
        break;
      case Repetition.type.SEGNO_RIGHT:
        this.drawSegnoFixed(stave, x + stave.getWidth());
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
  }

  drawCodaFixed(stave: Stave, x: number): this {
    const y = stave.getYForTopText(stave.getNumLines());
    this.text = Glyphs.coda;
    this.renderText(stave.checkContext(), x, y + Metrics.get('Repetition.coda.offsetY'));
    return this;
  }

  drawSegnoFixed(stave: Stave, x: number): this {
    const y = stave.getYForTopText(stave.getNumLines());
    this.text = Glyphs.segno;
    this.renderText(stave.checkContext(), x, y + Metrics.get('Repetition.segno.offsetY'));
    return this;
  }

  drawSymbolText(stave: Stave, x: number, text: string, drawCoda: boolean): this {
    const ctx = stave.checkContext();
    let textX = 0;

    this.text = text;
    if (drawCoda) {
      this.text += ' \ue048' /*coda*/;
    }
    this.setFont(Metrics.getFontInfo('Repetition.text'));
    switch (this.symbolType) {
      // To the left
      case Repetition.type.CODA_LEFT:
        // Offset Coda text to right of stave beginning
        textX = stave.getVerticalBarWidth();
        break;
      // To the right
      case Repetition.type.DC:
      case Repetition.type.DC_AL_FINE:
      case Repetition.type.DS:
      case Repetition.type.DS_AL_FINE:
      case Repetition.type.FINE:
      default:
        textX =
          x - (stave.getNoteStartX() - this.x) + stave.getWidth() - this.width - Metrics.get('Repetition.text.offsetX');
    }

    const y = stave.getYForTopText(stave.getNumLines()) + Metrics.get('Repetition.text.offsetY');

    this.renderText(ctx, textX, y);

    return this;
  }
}
