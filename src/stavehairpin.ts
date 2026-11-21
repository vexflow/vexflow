// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
//
// ## Description
// @author Raffaele Viglianti, 2012 http://itisnotsound.wordpress.com/
//
// This class implements hairpins between notes.
// A crescendo or decrescendo can have straight or flared arms and a circled niente tip.

import { BoundingBox } from './boundingbox';
import { Element } from './element';
import { drawFlaredHairpin } from './flaredhairpin';
import { drawNienteTip, nienteBounds, nienteTip } from './hairpintip';
import { Modifier } from './modifier';
import { Note } from './note';
import { RenderContext } from './rendercontext';
import { Tables } from './tables';
import { Category } from './typeguard';
import { RuntimeError } from './util';

export interface StaveHairpinRenderOptions {
  /** Widen the arms gradually near the closed tip, then more rapidly toward the open end. */
  flared?: boolean;
  /** Draw an open niente circle at the closed end of the wedge. */
  niente?: boolean;
  rightShiftTicks?: number;
  leftShiftTicks?: number;
  leftShiftPx: number;
  rightShiftPx: number;
  height: number;
  yShift: number;
}

export class StaveHairpin extends Element {
  static override get CATEGORY(): string {
    return Category.StaveHairpin;
  }

  protected hairpin: number;

  protected position: number;
  public renderOptions: StaveHairpinRenderOptions;

  // notes is initialized by the constructor via this.setNotes(notes).
  protected notes!: Record<string, Note>;

  protected firstNote?: Note;
  protected lastNote?: Note;

  static readonly type = {
    CRESC: 1,
    DECRESC: 2,
  };

  /* Helper function to convert ticks into pixels.
   * Requires a Formatter with voices joined and formatted (to
   * get pixels per tick)
   *
   * options is struct that has:
   *
   *  {
   *   height: px,
   *   yShift: px,         // vertical offset
   *   leftShiftTicks: 0, // left horizontal offset expressed in ticks
   *   rightShiftTicks: 0 // right horizontal offset expressed in ticks
   *  }
   *
   **/
  static FormatByTicksAndDraw(
    ctx: RenderContext,
    formatter: { pixelsPerTick: number },
    notes: Record<string, Note>,
    type: number,
    position: number,
    options: StaveHairpinRenderOptions
  ): void {
    const ppt = formatter.pixelsPerTick;

    if (ppt === null) {
      throw new RuntimeError('BadArguments', 'A valid Formatter must be provide to draw offsets by ticks.');
    }

    const leftShiftPx = ppt * (options.leftShiftTicks ?? 0);
    const rightShiftPx = ppt * (options.rightShiftTicks ?? 0);

    const hairpinOptions = {
      ...options,
      leftShiftPx,
      rightShiftPx,
      rightShiftTicks: 0,
      leftShiftTicks: 0,
    };

    new StaveHairpin(
      {
        firstNote: notes.firstNote,
        lastNote: notes.lastNote,
      },
      type
    )
      .setContext(ctx)
      .setRenderOptions(hairpinOptions)
      .setPosition(position)
      .drawWithStyle();
  }

  /**
   * Create a new hairpin from the specified notes.
   *
   * @param {!Object} notes The notes to tie up.
   * Notes is a struct that has:
   *
   *  {
   *    firstNote: Note,
   *    lastNote: Note,
   *  }
   * @param {!Object} type The type of hairpin
   */
  constructor(notes: Record<string, Note>, type: number) {
    super();
    this.setNotes(notes);
    this.hairpin = type;
    this.position = Modifier.Position.BELOW;

    this.renderOptions = {
      height: 10,
      yShift: 0, // vertical offset
      leftShiftPx: 0, // left horizontal offset
      rightShiftPx: 0, // right horizontal offset
      rightShiftTicks: 0,
      leftShiftTicks: 0,
    };
  }

  setPosition(position: number): this {
    if (position === Modifier.Position.ABOVE || position === Modifier.Position.BELOW) {
      this.position = position;
    }
    return this;
  }

  setRenderOptions(options: StaveHairpinRenderOptions): this {
    this.renderOptions = options;
    return this;
  }

  /**
   * Set the notes to attach this hairpin to.
   *
   * @param {!Object} notes The start and end notes.
   */
  setNotes(notes: Record<string, Note>): this {
    if (!notes.firstNote && !notes.lastNote) {
      throw new RuntimeError('BadArguments', 'Hairpin needs to have either firstNote or lastNote set.');
    }

    this.notes = notes;
    this.firstNote = notes.firstNote;
    this.lastNote = notes.lastNote;
    return this;
  }

  /** Both endpoints are required for a complete wedge on a single system. */
  getNotes(): readonly (Note | undefined)[] {
    return [this.firstNote, this.lastNote];
  }

  private layoutBaseline?: number;
  private layoutLeft = 0;
  private layoutRight = 0;

  /** A phrase baseline passes through the middle of the wedge; trims clear adjacent dynamics. */
  setLayoutBaseline(y?: number, left = 0, right = 0): void {
    this.layoutBaseline = y;
    this.layoutLeft = left;
    this.layoutRight = right;
  }

  private parameters() {
    const first = this.firstNote,
      last = this.lastNote;
    if (!first || !last) throw new RuntimeError('NoNote', 'Notes required to draw');
    return {
      firstX: first.getModifierStartXY(this.position, 0).x,
      lastX: last.getModifierStartXY(this.position, 0).x,
      firstY: first.checkStave().getY() + first.checkStave().getHeight(),
      lastY: last.checkStave().getY() + last.checkStave().getHeight(),
      staffHeight: first.checkStave().getHeight(),
    };
  }

  private edges(params: { firstX: number; lastX: number; firstY: number; staffHeight: number }) {
    const { yShift, height, leftShiftPx, rightShiftPx } = this.renderOptions;
    const above = this.position === Modifier.Position.ABOVE;
    const top =
      this.layoutBaseline === undefined
        ? params.firstY + (above ? 10 - params.staffHeight - yShift : 20 + yShift)
        : this.layoutBaseline - height / 2 + (above ? -yShift : yShift);
    const left = params.firstX + leftShiftPx + this.layoutLeft;
    const right = params.lastX + rightShiftPx - this.layoutRight;
    const crescendo = this.hairpin === StaveHairpin.type.CRESC;
    const closedX = crescendo ? left : right;
    const openX = crescendo ? right : left;
    const space = this.firstNote?.getStave()?.space(1) ?? Tables.STAVE_LINE_DISTANCE;
    const side = right >= left === crescendo ? 'left' : 'right';
    const tip = this.renderOptions.niente ? nienteTip(closedX, top + height / 2, space, side) : undefined;
    return { top, left, right, height, closedX, openX, tip };
  }

  /** Horizontal extents for spacing adjacent dynamics, including the diameter of a circled tip. */
  getLayoutEdges() {
    const { top, left, right, height, closedX, tip } = this.edges(this.parameters());
    const outerTip = tip ? 2 * tip.x - closedX : closedX;
    return {
      top,
      left: this.hairpin === StaveHairpin.type.CRESC ? outerTip : left,
      right: this.hairpin === StaveHairpin.type.DECRESC ? outerTip : right,
      height,
    };
  }

  override getBoundingBox(): BoundingBox {
    const { top, left, right, height, tip } = this.edges(this.parameters());
    const pad = (this.getStyle().lineWidth ?? 1) / 2;
    const box = new BoundingBox(
      Math.min(left, right) - pad,
      Math.min(top, top + height) - pad,
      Math.abs(right - left) + 2 * pad,
      Math.abs(height) + 2 * pad
    );
    return tip ? box.mergeWith(nienteBounds(tip, pad)) : box;
  }

  renderHairpin(params: { firstX: number; lastX: number; firstY: number; lastY: number; staffHeight: number }): void {
    const ctx = this.checkContext();
    const { top, height, closedX, openX, tip } = this.edges(params);
    if (this.hairpin !== StaveHairpin.type.CRESC && this.hairpin !== StaveHairpin.type.DECRESC) return;
    const middle = top + height / 2;
    if (this.renderOptions.flared) {
      drawFlaredHairpin(ctx, { x: closedX, y: middle, progress: 0 }, { x: openX, y: middle, progress: 1 }, height / 2);
    } else {
      ctx.beginPath();
      ctx.moveTo(openX, top);
      ctx.lineTo(closedX, middle);
      // At a circled tip use separate arms to keep a sharp miter out of the circle.
      if (tip) ctx.moveTo(closedX, middle);
      ctx.lineTo(openX, top + height);
      ctx.stroke();
      ctx.closePath();
    }
    if (tip) drawNienteTip(ctx, tip);
  }

  override draw(): void {
    this.checkContext();
    this.setRendered();

    this.renderHairpin(this.parameters());
  }
}
