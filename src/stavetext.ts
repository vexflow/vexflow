// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author: Taehoon Moon 2014

import { Stave } from './stave';
import { StaveModifier, StaveModifierPosition } from './stavemodifier';
import { TextJustification, TextNote } from './textnote';
import { Category } from './typeguard';
import { RuntimeError } from './util';

export class StaveText extends StaveModifier {
  static get CATEGORY(): string {
    return Category.StaveText;
  }

  protected options: {
    shiftX: number;
    shiftY: number;
    justification: number;
  };

  protected text: string;
  protected shiftX?: number;
  protected shiftY?: number;

  constructor(
    text: string,
    position: number,
    options: { shiftX?: number; shiftY?: number; justification?: number } = {}
  ) {
    super();

    this.setWidth(16);
    this.text = text;
    this.position = position;
    this.options = {
      shiftX: 0,
      shiftY: 0,
      justification: TextNote.Justification.CENTER,
      ...options,
    };
  }

  setStaveText(text: string): this {
    this.text = text;
    return this;
  }

  setShiftX(x: number): this {
    this.shiftX = x;
    return this;
  }

  setShiftY(y: number): this {
    this.shiftY = y;
    return this;
  }

  setText(text: string): this {
    this.text = text;
    return this;
  }

  draw(stave: Stave): this {
    const ctx = stave.checkContext();
    this.setRendered();

    ctx.save();
    ctx.setLineWidth(2);
    ctx.setFont(this.textFont);
    const textWidth = ctx.measureText('' + this.text).width;

    let x;
    let y;
    switch (this.position) {
      case StaveModifierPosition.LEFT:
      case StaveModifierPosition.RIGHT:
        y = (stave.getYForLine(0) + stave.getBottomLineY()) / 2 + this.options.shiftY;
        if (this.position === StaveModifierPosition.LEFT) {
          x = stave.getX() - textWidth - 24 + this.options.shiftX;
        } else {
          x = stave.getX() + stave.getWidth() + 24 + this.options.shiftX;
        }
        break;
      case StaveModifierPosition.ABOVE:
      case StaveModifierPosition.BELOW:
        x = stave.getX() + this.options.shiftX;
        if (this.options.justification === TextJustification.CENTER) {
          x += stave.getWidth() / 2 - textWidth / 2;
        } else if (this.options.justification === TextJustification.RIGHT) {
          x += stave.getWidth() - textWidth;
        }

        if (this.position === StaveModifierPosition.ABOVE) {
          y = stave.getYForTopText(2) + this.options.shiftY;
        } else {
          y = stave.getYForBottomText(2) + this.options.shiftY;
        }
        break;
      default:
        throw new RuntimeError('InvalidPosition', 'Value Must be in Modifier.Position.');
    }

    ctx.fillText('' + this.text, x, y + 4);
    ctx.restore();
    return this;
  }
}
