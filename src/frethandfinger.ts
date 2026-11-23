// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author Larry Kuhns 2013
// Left-hand fingerings on pitched notes and TAB frets, with optional enclosing circles.

import { Articulation } from './articulation';
import { BoundingBox } from './boundingbox';
import { Builder } from './easyscore';
import { Metrics } from './metrics';
import { Modifier, ModifierPosition } from './modifier';
import { ModifierContextState } from './modifiercontext';
import type { StaveNote } from './stavenote';
import { StemmableNote } from './stemmablenote';
import { Tables } from './tables';
import { Category, isStaveNote, isTabNote } from './typeguard';
import { RuntimeError } from './util';

export class FretHandFinger extends Modifier {
  static override get CATEGORY(): string {
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
      const line = num.getAttachedLine();
      const textHeight = Metrics.get('FretHandFinger.fontSize');
      if (!num.headPlacement && num.position === ModifierPosition.ABOVE) {
        state.topTextLine += textHeight / Tables.STAVE_LINE_DISTANCE + 0.5;
      }
      if (!num.headPlacement && num.position === ModifierPosition.BELOW) {
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
        line,
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

  private drawCircle = false;
  protected xOffset: number;
  protected yOffset: number;

  /** Typed pitched heads use measured columns. Legacy fingerings keep their individual offsets. */
  private readonly headPlacement: boolean;

  constructor(finger: string, options: { headPlacement?: boolean } = {}) {
    super();
    this.headPlacement = options.headPlacement ?? false;

    this.setFretHandFinger(finger);
    this.position = Modifier.Position.LEFT; // Default position above stem or note head
    this.xOffset = 0; // Horizontal offset from default
    this.yOffset = 0; // Vertical offset from default
  }

  /** Enclose the fingering in a circle without changing the authored finger label. */
  setDrawCircle(drawCircle: boolean): this {
    this.drawCircle = drawCircle;
    return this;
  }

  /** Reserve enough room for the complete enclosure at the current font size. */
  override getWidth(): number {
    if (this.drawCircle) return Math.max(this.width, this.height) + 5;
    // Reserve padding on both sides of a typed digit before the accidental columns are formatted.
    if (this.headPlacement && (this.position === Modifier.Position.LEFT || this.position === Modifier.Position.RIGHT))
      return this.width + 2 * FretHandFinger.headGap;
    return this.width;
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

  /** Two renderer pixels between a typed side label and the adjacent head or accidental column. */
  private static readonly headGap = 2;

  /** Gather the digits in this column once per placement, keeping the highest written pitch at the top. */
  private headColumn(note: StaveNote): FretHandFinger[] {
    const ys = note.getYs();
    return note
      .getModifiers()
      .filter(
        (m): m is FretHandFinger => m instanceof FretHandFinger && m.headPlacement && m.position === this.position
      )
      .sort((a, b) => ys[a.checkIndex()] - ys[b.checkIndex()] || a.checkIndex() - b.checkIndex());
  }

  /** Place side digits near their own staff lines and separate the ink on close intervals. */
  private sideBaseline(note: StaveNote): number {
    const column = this.headColumn(note);
    const gap = FretHandFinger.headGap;
    let bottom = -Infinity;
    let shift = 0;
    let baseline = 0;
    for (const digit of column) {
      const m = digit.getTextMetrics();
      const center = note.getYs()[digit.checkIndex()];
      const natural = center + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
      const y = Math.max(natural, bottom + gap + m.actualBoundingBoxAscent);
      if (digit === this) baseline = y;
      shift = Math.max(shift, y - natural);
      bottom = y + m.actualBoundingBoxDescent;
    }
    return baseline - shift / 2;
  }

  /** Stack from the outside of the stave, heads, stem, flag and articulations on the requested side. */
  private outsideBaseline(note: StaveNote): number {
    const above = this.position === Modifier.Position.ABOVE;
    const stave = note.checkStave();
    const gap = stave.getSpacingBetweenLines() * 0.2;
    const outside = above ? Math.min : Math.max;
    let edge = stave.getYForLine(above ? 0 : stave.getNumLines() - 1);
    const ink = note.getHeadInk();
    const flag = note.getFlagInk();
    if (flag) ink.push(flag);
    const stem = note.getStemSegment();
    if (stem) edge = outside(edge, stem.tipY, stem.baseY);
    for (const mark of note.getModifiers()) {
      if (mark instanceof Articulation && mark.getPosition() === this.position) ink.push(mark.getInkBounds());
    }
    for (const box of ink) edge = outside(edge, above ? box.y : box.y + box.h);
    const column = this.headColumn(note);
    if (above) column.reverse();
    for (const digit of column) {
      const m = digit.getTextMetrics();
      const y = above ? edge - gap - m.actualBoundingBoxDescent : edge + gap + m.actualBoundingBoxAscent;
      if (digit === this) return y;
      edge = above ? y - m.actualBoundingBoxAscent : y + m.actualBoundingBoxDescent;
    }
    return edge;
  }

  /** Use the same formatted coordinates in the screen renderer, staff fitter and publication. */
  private headOrigin(note: StaveNote, startX: number) {
    if (this.position === Modifier.Position.LEFT || this.position === Modifier.Position.RIGHT) {
      const dx =
        this.position === Modifier.Position.LEFT ? -this.width - FretHandFinger.headGap : FretHandFinger.headGap;
      return { x: startX + dx + this.xOffset, y: this.sideBaseline(note) + this.yOffset };
    }
    return { x: startX - this.width / 2 + this.xOffset, y: this.outsideBaseline(note) + this.yOffset };
  }

  /** Resolve the digit baseline and optional circle from the same head anchor used for drawing. */
  private placement() {
    const note = this.checkAttachedNote();

    const start = note.getModifierStartXY(this.position, this.index);
    if (this.headPlacement && !this.drawCircle && isStaveNote(note)) return this.headOrigin(note, start.x);
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

    const tab = isTabNote(note);
    if (!tab && !this.drawCircle) {
      return { x: dotX, y: dotY };
    }
    // Place the actual ink on the selected string. Leave the fret number and the finger independent.
    const side = this.position === Modifier.Position.LEFT || this.position === Modifier.Position.RIGHT;
    const width = this.getWidth();
    const centerX =
      this.position === Modifier.Position.LEFT
        ? start.x + this.xOffset - width / 2
        : this.position === Modifier.Position.RIGHT
          ? start.x + this.xOffset + width / 2 + 1
          : start.x + this.xOffset;
    const centerY = side ? start.y + this.yOffset : dotY - 5;
    const metrics = this.getTextMetrics();
    return {
      x: centerX - this.width / 2,
      y: centerY + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2,
      centerX: centerX + this.xShift,
      centerY: centerY + this.yShift,
      width,
      tabSide: tab && side,
    };
  }

  /** Return the digit ink and its enclosing circle when drawn. */
  getInkParts() {
    const p = this.placement();
    const ink = [this.getTextInk(p.x, p.y)];
    if (this.drawCircle && 'centerX' in p)
      ink.push(new BoundingBox(p.centerX - p.width / 2, p.centerY - p.width / 2, p.width, p.width));
    return ink;
  }

  override draw(): void {
    const ctx = this.checkContext();
    this.setRendered();
    const p = this.placement();
    if (!('centerX' in p)) {
      this.renderText(ctx, p.x, p.y);
      return;
    }
    if (p.tabSide) ctx.clearRect(p.centerX - p.width / 2 - 1, p.centerY - 2, p.width + 2, 4);
    if (this.drawCircle) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.centerX, p.centerY, p.width / 2 - 0.5, 0, 2 * Math.PI, false);
      ctx.setLineWidth(1);
      ctx.stroke();
      ctx.restore();
    }
    this.renderText(ctx, p.x, p.y);
  }
}
