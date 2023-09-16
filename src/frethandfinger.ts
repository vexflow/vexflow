// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author Larry Kuhns 2013
// Class to draws string numbers into the notation.

import { Builder } from './easyscore';
import { Modifier, ModifierPosition } from './modifier';
import { ModifierContextState } from './modifiercontext';
import { StemmableNote } from './stemmablenote';
import { Tables } from './tables';
import { Category } from './typeguard';
import { RuntimeError } from './util';

export class FretHandFinger extends Modifier {
  static get CATEGORY(): string {
    return Category.FretHandFinger;
  }

  // Arrange fingerings inside a ModifierContext.
  static format(nums: FretHandFinger[], state: ModifierContextState): boolean {
    const { leftShift, rightShift } = state;
    const numSpacing = 1;

    if (!nums || nums.length === 0) return false;

    const numsList = [];
    let prevNote = null;
    let shiftLeft = 0;
    let shiftRight = 0;

    for (let i = 0; i < nums.length; ++i) {
      const num = nums[i];
      const note = num.getNote();
      const pos = num.getPosition();
      const index = num.checkIndex();
      const props = note.getKeyProps()[index];
      const textHeight = Tables.lookupMetric('FretHandFinger.fontSize');
      if (num.position === ModifierPosition.ABOVE) {
        state.topTextLine += textHeight / Tables.STAVE_LINE_DISTANCE + 0.5;
      }
      if (num.position === ModifierPosition.BELOW) {
        state.textLine += textHeight / Tables.STAVE_LINE_DISTANCE + 0.5;
      }

      if (note !== prevNote) {
        for (let n = 0; n < note.keys.length; ++n) {
          if (leftShift === 0) {
            shiftLeft = Math.max(note.getLeftDisplacedHeadPx(), shiftLeft);
          }
          if (rightShift === 0) {
            shiftRight = Math.max(note.getRightDisplacedHeadPx(), shiftRight);
          }
        }
        prevNote = note;
      }

      numsList.push({
        note,
        num,
        pos,
        line: props.line,
        shiftL: shiftLeft,
        shiftR: shiftRight,
      });
    }

    // Sort fingernumbers by line number.
    numsList.sort((a, b) => b.line - a.line);

    let numShiftL = 0;
    let numShiftR = 0;
    let xWidthL = 0;
    let xWidthR = 0;
    let lastLine = null;
    let lastNote = null;

    for (let i = 0; i < numsList.length; ++i) {
      let numShift = 0;
      const { note, pos, num, line, shiftL, shiftR } = numsList[i];

      // Reset the position of the string number every line.
      if (line !== lastLine || note !== lastNote) {
        numShiftL = leftShift + shiftL;
        numShiftR = rightShift + shiftR;
      }

      const numWidth = num.getWidth() + numSpacing;
      if (pos === Modifier.Position.LEFT) {
        num.setXShift(leftShift + numShiftL);
        numShift = leftShift + numWidth; // spacing
        xWidthL = numShift > xWidthL ? numShift : xWidthL;
      } else if (pos === Modifier.Position.RIGHT) {
        num.setXShift(numShiftR);
        numShift = shiftRight + numWidth; // spacing
        xWidthR = numShift > xWidthR ? numShift : xWidthR;
      }
      lastLine = line;
      lastNote = note;
    }

    state.leftShift += xWidthL;
    state.rightShift += xWidthR;

    return true;
  }

  static easyScoreHook({ fingerings }: { fingerings?: string } = {}, note: StemmableNote, builder: Builder): void {
    fingerings
      ?.split(',')
      .map((fingeringString: string) => {
        const split = fingeringString.trim().split('.');
        const params: { number: string; position?: string } = { number: split[0] };
        if (split[1]) params.position = split[1];
        return builder.getFactory().Fingering(params);
      })
      .map((fingering: Modifier, index: number) => note.addModifier(fingering, index));
  }

  protected xOffset: number;
  protected yOffset: number;

  constructor(finger: string) {
    super();

    this.setFretHandFinger(finger);
    this.position = Modifier.Position.LEFT; // Default position above stem or note head
    this.xOffset = 0; // Horizontal offset from default
    this.yOffset = 0; // Vertical offset from default
  }

  setFretHandFinger(finger: string): this {
    this.text = finger;
    return this;
  }

  getFretHandFinger(): string {
    return this.text;
  }

  setOffsetX(x: number): this {
    this.xOffset = x;
    return this;
  }

  setOffsetY(y: number): this {
    this.yOffset = y;
    return this;
  }

  draw(): void {
    const ctx = this.checkContext();
    const note = this.checkAttachedNote();
    this.setRendered();

    const start = note.getModifierStartXY(this.position, this.index);
    let dotX = start.x + this.xOffset;
    let dotY = start.y + this.yOffset + 5;

    switch (this.position) {
      case Modifier.Position.ABOVE:
        dotX -= 4;
        dotY -= 12;
        break;
      case Modifier.Position.BELOW:
        dotX -= 2;
        dotY += 10;
        break;
      case Modifier.Position.LEFT:
        dotX -= this.width;
        break;
      case Modifier.Position.RIGHT:
        dotX += 1;
        break;
      default:
        throw new RuntimeError('InvalidPosition', `The position ${this.position} does not exist`);
    }

    this.renderText(ctx, dotX, dotY);
  }
}
