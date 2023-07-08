// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author: Larry Kuhns 2011

import { Font, FontInfo, FontStyle, FontWeight } from './font';
import { Stave } from './stave';
import { StaveModifier } from './stavemodifier';
import { Category } from './typeguard';

export enum VoltaType {
  NONE = 1,
  BEGIN = 2,
  MID = 3,
  END = 4,
  BEGIN_END = 5,
}

export class Volta extends StaveModifier {
  static get CATEGORY(): string {
    return Category.Volta;
  }

  static get type(): typeof VoltaType {
    return VoltaType;
  }

  static TEXT_FONT: Required<FontInfo> = {
    family: Font.SANS_SERIF,
    size: 9,
    weight: FontWeight.BOLD,
    style: FontStyle.NORMAL,
  };

  protected volta: number;
  protected number: string;

  protected yShift: number;

  constructor(type: number, number: string, x: number, yShift: number) {
    super();
    this.volta = type;
    this.x = x;
    this.yShift = yShift;
    this.number = number;
    this.resetFont();
  }

  setShiftY(y: number): this {
    this.yShift = y;
    return this;
  }

  draw(stave: Stave, x: number): this {
    const ctx = stave.checkContext();
    this.setRendered();

    let width = stave.getWidth() - x; // don't include x (offset) for width
    const topY = stave.getYForTopText(stave.getNumLines()) + this.yShift;
    const vertHeight = 1.5 * stave.getSpacingBetweenLines();
    switch (this.volta) {
      case VoltaType.BEGIN:
        ctx.fillRect(this.x + x, topY, 1, vertHeight);
        break;
      case VoltaType.END:
        width -= 5;
        ctx.fillRect(this.x + x + width, topY, 1, vertHeight);
        break;
      case VoltaType.BEGIN_END:
        width -= 3;
        ctx.fillRect(this.x + x, topY, 1, vertHeight);
        ctx.fillRect(this.x + x + width, topY, 1, vertHeight);
        break;
      default:
        break;
    }
    // If the beginning of a volta, draw measure number
    if (this.volta === VoltaType.BEGIN || this.volta === VoltaType.BEGIN_END) {
      ctx.save();
      ctx.setFont(this.textFont);
      ctx.fillText(this.number, this.x + x + 5, topY + 15);
      ctx.restore();
    }

    ctx.fillRect(this.x + x, topY, width, 1);
    return this;
  }
}
