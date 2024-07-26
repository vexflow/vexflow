// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author: Taehoon Moon 2014

import { StaveModifier, StaveModifierPosition } from './stavemodifier';
import { TextJustification, TextNote } from './textnote';
import { Category } from './typeguard';
import { RuntimeError } from './util';

export class StaveText extends StaveModifier {
  static get CATEGORY(): string {
    return Category.StaveText;
  }

  protected justification: number;

  constructor(
    text: string,
    position: number,
    options: { shiftX?: number; shiftY?: number; justification?: number } = {}
  ) {
    super();

    this.setText(text);
    this.setXShift(options.shiftX ?? 0);
    this.setYShift(options.shiftY ?? 0);
    this.position = position;
    this.justification = options.justification ?? TextNote.Justification.CENTER;
  }

  draw(): void {
    const stave = this.checkStave();
    const ctx = stave.checkContext();
    this.setRendered();

    let x;
    let y;
    switch (this.position) {
      case StaveModifierPosition.LEFT:
      case StaveModifierPosition.RIGHT:
        y = (stave.getYForLine(0) + stave.getBottomLineY()) / 2;
        if (this.position === StaveModifierPosition.LEFT) {
          x = stave.getX() - this.width - 24;
        } else {
          x = stave.getX() + stave.getWidth() + 24;
        }
        break;
      case StaveModifierPosition.ABOVE:
      case StaveModifierPosition.BELOW:
        x = stave.getX();
        if (this.justification === TextJustification.CENTER) {
          x += stave.getWidth() / 2 - this.width / 2;
        } else if (this.justification === TextJustification.RIGHT) {
          x += stave.getWidth() - this.width;
        }

        if (this.position === StaveModifierPosition.ABOVE) {
          y = stave.getYForTopText(2);
        } else {
          y = stave.getYForBottomText(2);
        }
        break;
      default:
        throw new RuntimeError('InvalidPosition', 'Value Must be in Modifier.Position.');
    }

    this.renderText(ctx, x, y + 4);
  }
}
