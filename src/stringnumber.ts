// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author Larry Kuhns
//
// This file implements the `StringNumber` class which renders string
// number annotations beside notes.

import { Modifier, ModifierPosition } from './modifier';
import { ModifierContextState } from './modifiercontext';
import { Note } from './note';
import { Renderer } from './renderer';
import { Stem } from './stem';
import { StemmableNote } from './stemmablenote';
import { Tables } from './tables';
import { Category, isStaveNote, isStemmableNote } from './typeguard';
import { RuntimeError } from './util';

export interface StringNumberMetrics {
  verticalPadding: number;
  stemPadding: number;
  leftPadding: number;
  rightPadding: number;
}

export class StringNumber extends Modifier {
  static get CATEGORY(): string {
    return Category.StringNumber;
  }

  static get metrics(): StringNumberMetrics {
    return Tables.lookupMetric('StringNumber', {
      verticalPadding: 0,
      stemPadding: 0,
      leftPadding: 0,
      rightPadding: 0,
    });
  }

  // ## Static Methods
  // Arrange string numbers inside a `ModifierContext`
  static format(nums: StringNumber[], state: ModifierContextState): boolean {
    /**
     * The modifier context's leftShift state.
     */
    const leftShift = state.leftShift;
    /**
     * The modifier context's rightShift state.
     */
    const rightShift = state.rightShift;
    const numSpacing = 1;

    if (!nums || nums.length === 0) return false;

    const numsList = [];
    let prevNote = null;
    let extraXSpaceForDisplacedNotehead = 0;
    let shiftRight = 0;
    const modLines = 0;

    for (let i = 0; i < nums.length; ++i) {
      const num = nums[i];
      const note = num.getNote();
      const pos = num.getPosition();
      if (!isStaveNote(note)) {
        throw new RuntimeError('NoStaveNote');
      }
      const index = num.checkIndex();
      const props = note.getKeyProps()[index];
      const mc = note.getModifierContext();
      const verticalSpaceNeeded = (num.radius * 2) / Tables.STAVE_LINE_DISTANCE + 0.5;

      if (mc) {
        if (pos === ModifierPosition.ABOVE) {
          num.textLine = mc.getState().topTextLine;
          state.topTextLine += verticalSpaceNeeded;
        } else if (pos === ModifierPosition.BELOW) {
          num.textLine = mc.getState().textLine;
          state.textLine += verticalSpaceNeeded;
        }
      }

      if (note !== prevNote) {
        for (let n = 0; n < note.keys.length; ++n) {
          if (pos === Modifier.Position.LEFT) {
            extraXSpaceForDisplacedNotehead = Math.max(note.getLeftDisplacedHeadPx(), extraXSpaceForDisplacedNotehead);
          }
          if (rightShift === 0) {
            shiftRight = Math.max(note.getRightDisplacedHeadPx(), shiftRight);
          }
        }
        prevNote = note;
      }

      const glyphLine = modLines === 0 ? props.line : modLines;

      numsList.push({
        pos,
        note,
        num,
        line: glyphLine,
        shiftL: extraXSpaceForDisplacedNotehead,
        shiftR: shiftRight,
      });
    }

    // Sort string numbers by line number.
    numsList.sort((a, b) => b.line - a.line);

    let numShiftR = 0;
    let xWidthL = 0;
    let xWidthR = 0;
    let lastLine = null;
    let lastNote = null;
    for (let i = 0; i < numsList.length; ++i) {
      const note = numsList[i].note;
      const pos = numsList[i].pos;
      const num = numsList[i].num;
      const line = numsList[i].line;
      const shiftR = numsList[i].shiftR;
      // Reset the position of the string number every line.
      if (line !== lastLine || note !== lastNote) {
        numShiftR = rightShift + shiftR;
      }

      const numWidth = num.getWidth() + numSpacing;
      let numXShift = 0;
      if (pos === Modifier.Position.LEFT) {
        num.setXShift(leftShift + extraXSpaceForDisplacedNotehead);
        numXShift = numWidth; // spacing
        xWidthL = Math.max(numXShift, xWidthL);
      } else if (pos === Modifier.Position.RIGHT) {
        num.setXShift(numShiftR);
        numXShift += numWidth; // spacing
        xWidthR = numXShift > xWidthR ? numXShift : xWidthR;
      }
      lastLine = line;
      lastNote = note;
    }

    state.leftShift += xWidthL;
    state.rightShift += xWidthR;
    return true;
  }

  protected radius: number;
  protected drawCircle: boolean;
  protected lastNote?: Note;
  protected stringNumber: string;
  protected xOffset: number;
  protected yOffset: number;
  protected textLine: number;
  protected stemOffset: number;
  protected dashed: boolean;
  protected leg: number;

  constructor(number: string) {
    super();

    this.stringNumber = number;
    this.position = Modifier.Position.ABOVE; // Default position above stem or note head
    this.xShift = 0;
    this.yShift = 0;
    this.textLine = 0;
    this.stemOffset = 0;
    this.xOffset = 0; // Horizontal offset from default
    this.yOffset = 0; // Vertical offset from default
    this.dashed = true; // true - draw dashed extension  false - no extension
    this.leg = Renderer.LineEndType.NONE; // draw upward/downward leg at the of extension line
    this.radius = 8;
    this.drawCircle = true;
    this.setWidth(this.radius * 2 + 4);
  }

  setLineEndType(leg: number): this {
    if (leg >= Renderer.LineEndType.NONE && leg <= Renderer.LineEndType.DOWN) {
      this.leg = leg;
    }
    return this;
  }

  setStringNumber(number: string): this {
    this.stringNumber = number;
    return this;
  }

  setOffsetX(x: number): this {
    this.xOffset = x;
    return this;
  }

  setOffsetY(y: number): this {
    this.yOffset = y;
    return this;
  }

  setLastNote(note: Note): this {
    this.lastNote = note;
    return this;
  }

  setDashed(dashed: boolean): this {
    this.dashed = dashed;
    return this;
  }

  setDrawCircle(drawCircle: boolean): this {
    this.drawCircle = drawCircle;
    return this;
  }

  draw(): void {
    const ctx = this.checkContext();
    const note = this.checkAttachedNote();
    this.setRendered();
    const start = note.getModifierStartXY(this.position, this.index);
    const stemDirection = note.hasStem() ? note.getStemDirection() : Stem.UP;
    let dotX = start.x + this.xShift + this.xOffset;
    let stemExt: Record<string, number> = {};
    if (note.hasStem()) {
      stemExt = (note as StemmableNote).checkStem().getExtents();
    }

    let dotY = start.y + this.yShift + this.yOffset;

    switch (this.position) {
      case Modifier.Position.ABOVE:
        {
          const ys = note.getYs();
          dotY = ys.reduce((a, b) => (a < b ? a : b));
          if (note.hasStem() && stemDirection === Stem.UP) {
            dotY = stemExt.topY + StringNumber.metrics.stemPadding;
          }
          dotY -= this.radius + StringNumber.metrics.verticalPadding + this.textLine * Tables.STAVE_LINE_DISTANCE;
        }
        break;
      case Modifier.Position.BELOW:
        {
          const ys: number[] = note.getYs();
          dotY = ys.reduce((a, b) => (a > b ? a : b));
          if (note.hasStem() && stemDirection === Stem.DOWN) {
            dotY = stemExt.topY - StringNumber.metrics.stemPadding;
          }
          dotY += this.radius + StringNumber.metrics.verticalPadding + this.textLine * Tables.STAVE_LINE_DISTANCE;
        }
        break;
      case Modifier.Position.LEFT:
        dotX -= this.radius / 2 + StringNumber.metrics.leftPadding;
        break;
      case Modifier.Position.RIGHT:
        dotX += this.radius / 2 + StringNumber.metrics.rightPadding;
        break;
      default:
        throw new RuntimeError('InvalidPosition', `The position ${this.position} is invalid`);
    }

    ctx.save();
    if (this.drawCircle) {
      ctx.beginPath();
      ctx.arc(dotX, dotY, this.radius, 0, Math.PI * 2, false);
      ctx.setLineWidth(1.5);
      ctx.stroke();
    }
    ctx.setFont(this.textFont);
    const x = dotX - ctx.measureText(this.stringNumber).width / 2;
    ctx.fillText('' + this.stringNumber, x, dotY + 4.5);

    const lastNote = this.lastNote;
    if (isStemmableNote(lastNote)) {
      // Only StemmableNote objects have getStemX().
      const end = lastNote.getStemX() - note.getX() + 5;
      ctx.setStrokeStyle('#000000');
      ctx.setLineCap('round');
      ctx.setLineWidth(0.6);
      if (this.dashed) {
        Renderer.drawDashedLine(ctx, dotX + 10, dotY, dotX + end, dotY, [3, 3]);
      } else {
        Renderer.drawDashedLine(ctx, dotX + 10, dotY, dotX + end, dotY, [3, 0]);
      }

      let len;
      let pattern;
      switch (this.leg) {
        case Renderer.LineEndType.UP:
          len = -10;
          pattern = this.dashed ? [3, 3] : [3, 0];
          Renderer.drawDashedLine(ctx, dotX + end, dotY, dotX + end, dotY + len, pattern);
          break;
        case Renderer.LineEndType.DOWN:
          len = 10;
          pattern = this.dashed ? [3, 3] : [3, 0];
          Renderer.drawDashedLine(ctx, dotX + end, dotY, dotX + end, dotY + len, pattern);
          break;
        default:
          break;
      }
    }

    ctx.restore();
  }
}
