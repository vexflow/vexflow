// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author: Larry Kuhns 2011
// Draw rehearsal lettering and its optional frame from the same positioned text.

import { BoundingBox } from './boundingbox';
import { Metrics } from './metrics';
import { StaveModifier } from './stavemodifier';
import { Category } from './typeguard';

export class StaveSection extends StaveModifier {
  static override get CATEGORY(): string {
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

  /** Report the same ink and padding before drawing as after a stave has moved. */
  override getBoundingBox(): BoundingBox {
    if (this.stave) {
      this.x = this.stave.getX() + this.stave.getModifierXShift(this.getPosition()) + this.padding;
      this.y = this.stave.getYForTopText(1.5) - this.padding;
    }
    const ink = this.getTextInk(this.x, this.y);
    if (!this.drawRect) return ink;
    return new BoundingBox(
      ink.x - this.padding,
      ink.y - this.padding,
      ink.w + 2 * this.padding,
      ink.h + 2 * this.padding
    );
  }

  override draw(): void {
    const ctx = this.checkStave().checkContext();
    const bounds = this.getBoundingBox();
    this.setRendered();
    if (this.drawRect) {
      ctx.beginPath();
      ctx.rect(bounds.x, bounds.y, bounds.w, bounds.h);
      ctx.stroke();
    }
    this.renderText(ctx, 0, 0);
  }
}
