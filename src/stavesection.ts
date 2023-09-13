// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author: Larry Kuhns 2011

import { Stave } from './stave';
import { StaveModifier } from './stavemodifier';
import { Category } from './typeguard';

export class StaveSection extends StaveModifier {
  static get CATEGORY(): string {
    return Category.StaveSection;
  }

  protected drawRect: boolean;

  constructor(section: string, x: number, yShift: number, drawRect = true) {
    super();

    this.setStaveSection(section);
    this.x = x;
    this.yShift = yShift;
    this.drawRect = drawRect;
  }

  setStaveSection(section: string): this {
    this.text = section;
    return this;
  }

  draw(stave: Stave, xShift: number): this {
    const borderWidth = 2;
    const padding = 2;
    const ctx = stave.checkContext();
    this.setRendered();

    ctx.save();
    ctx.setLineWidth(borderWidth);

    const headroom = -1 * this.textMetrics.actualBoundingBoxDescent;
    const width = this.width + 2 * padding; // add left & right padding
    const height = this.height + 2 * padding; // add top & bottom padding

    //  Seems to be a good default y
    const y = stave.getYForTopText(1.5) + this.yShift;
    const x = this.x + xShift;
    if (this.drawRect) {
      ctx.beginPath();
      ctx.rect(x, y - height + headroom, width, height);
      ctx.stroke();
    }
    this.renderText(ctx, xShift + padding, y - padding);
    ctx.restore();
    return this;
  }
}
