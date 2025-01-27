// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author: Larry Kuhns 2011

import { Metrics } from './metrics';
import { StaveModifier } from './stavemodifier';
import { Category } from './typeguard';

export class StaveSection extends StaveModifier {
  static get CATEGORY(): string {
    return Category.StaveSection;
  }

  protected drawRect: boolean;

  constructor(section: string, x: number = 0, yShift: number = 0, drawRect = true) {
    super();

    this.setText(section);
    this.x = x;
    this.yShift = yShift;
    this.drawRect = drawRect;
    this.padding = Metrics.get('StaveSection.padding');
  }

  setDrawRect(drawRect: boolean): this {
    this.drawRect = drawRect;
    return this;
  }

  draw(): void {
    const stave = this.checkStave();
    const ctx = stave.checkContext();
    this.setRendered();

    this.x = stave.getX() + stave.getModifierXShift(this.getPosition());
    const headroom = -1 * this.textMetrics.actualBoundingBoxDescent;
    const width = this.width + 2 * this.padding; // add left & right padding
    const height = this.height + 2 * this.padding; // add top & bottom padding

    //  Seems to be a good default y
    const y = stave.getYForTopText(1.5) + this.yShift;
    const x = this.x + this.xShift;
    if (this.drawRect) {
      ctx.beginPath();
      ctx.rect(x, y - height + headroom, width, height);
      ctx.stroke();
    }
    this.renderText(ctx, this.xShift + this.padding, y - this.padding);
  }
}
