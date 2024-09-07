// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author: Larry Kuhns 2011

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

  protected type: number;

  constructor(type: number, label: string, x: number, yShift: number) {
    super();
    this.type = type;
    this.x = x;
    this.yShift = yShift;
    this.text = label;
  }

  draw(): void {
    const stave = this.checkStave();
    const x = stave.getModifierXShift(this.getPosition());
    const ctx = stave.checkContext();
    this.setRendered();

    let width = stave.getWidth() - x; // don't include x (offset) for width
    const topY = stave.getYForTopText(stave.getNumLines()) + this.yShift;
    const vertHeight = 1.5 * stave.getSpacingBetweenLines();
    switch (this.type) {
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
    if (this.type === VoltaType.BEGIN || this.type === VoltaType.BEGIN_END) {
      this.renderText(ctx, x + 5, topY - this.yShift + 15);
    }

    ctx.fillRect(this.x + x, topY, width, 1);
  }
}
