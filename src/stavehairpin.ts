// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
//
// ## Description
// @author Raffaele Viglianti, 2012 http://itisnotsound.wordpress.com/
//
// This class implements hairpins between notes.
// Hairpins can be either crescendo or decrescendo.

import { BoundingBox } from './boundingbox';
import { Element } from './element';
import { Modifier } from './modifier';
import { Note } from './note';
import { RenderContext } from './rendercontext';
import { Category } from './typeguard';
import { RuntimeError } from './util';

export interface StaveHairpinRenderOptions {
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
      height: options.height,
      yShift: options.yShift,
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
    return {
      top,
      left: params.firstX + leftShiftPx + this.layoutLeft,
      right: params.lastX + rightShiftPx - this.layoutRight,
      height,
    };
  }

  /** Signed endpoint order is available to diagnose a wedge squeezed between two dynamics. */
  getLayoutEdges() {
    return this.edges(this.parameters());
  }

  override getBoundingBox(): BoundingBox {
    const { top, left, right, height } = this.getLayoutEdges();
    const pad = (this.getStyle().lineWidth ?? 1) / 2;
    return new BoundingBox(
      Math.min(left, right) - pad,
      Math.min(top, top + height) - pad,
      Math.abs(right - left) + 2 * pad,
      Math.abs(height) + 2 * pad
    );
  }

  renderHairpin(params: { firstX: number; lastX: number; firstY: number; lastY: number; staffHeight: number }): void {
    const ctx = this.checkContext();
    const { top, left, right, height } = this.edges(params);
    ctx.beginPath();

    switch (this.hairpin) {
      case StaveHairpin.type.CRESC:
        ctx.moveTo(right, top);
        ctx.lineTo(left, top + height / 2);
        ctx.lineTo(right, top + height);
        break;
      case StaveHairpin.type.DECRESC:
        ctx.moveTo(left, top);
        ctx.lineTo(right, top + height / 2);
        ctx.lineTo(left, top + height);
        break;
      default:
        // Default is NONE, so nothing to draw
        break;
    }

    ctx.stroke();
    ctx.closePath();
  }

  override draw(): void {
    this.checkContext();
    this.setRendered();

    this.renderHairpin(this.parameters());
  }
}
