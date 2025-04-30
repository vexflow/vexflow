// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
//
// ## Description
// @author Raffaele Viglianti, 2012 http://itisnotsound.wordpress.com/
//
// This class implements hairpins between notes.
// Hairpins can be either crescendo or decrescendo.

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

  renderHairpin(params: { firstX: number; lastX: number; firstY: number; lastY: number; staffHeight: number }): void {
    const ctx = this.checkContext();
    let dis = this.renderOptions.yShift + 20;
    let yShift = params.firstY;

    if (this.position === Modifier.Position.ABOVE) {
      dis = -dis + 30;
      yShift = params.firstY - params.staffHeight;
    }

    const leftShiftPx = this.renderOptions.leftShiftPx;
    const rightShiftPx = this.renderOptions.rightShiftPx;

    ctx.beginPath();

    switch (this.hairpin) {
      case StaveHairpin.type.CRESC:
        ctx.moveTo(params.lastX + rightShiftPx, yShift + dis);
        ctx.lineTo(params.firstX + leftShiftPx, yShift + this.renderOptions.height / 2 + dis);
        ctx.lineTo(params.lastX + rightShiftPx, yShift + this.renderOptions.height + dis);
        break;
      case StaveHairpin.type.DECRESC:
        ctx.moveTo(params.firstX + leftShiftPx, yShift + dis);
        ctx.lineTo(params.lastX + rightShiftPx, yShift + this.renderOptions.height / 2 + dis);
        ctx.lineTo(params.firstX + leftShiftPx, yShift + this.renderOptions.height + dis);
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

    const firstNote = this.firstNote;
    const lastNote = this.lastNote;
    if (!firstNote || !lastNote) throw new RuntimeError('NoNote', 'Notes required to draw');

    const start = firstNote.getModifierStartXY(this.position, 0);
    const end = lastNote.getModifierStartXY(this.position, 0);

    this.renderHairpin({
      firstX: start.x,
      lastX: end.x,
      firstY: firstNote.checkStave().getY() + firstNote.checkStave().getHeight(),
      lastY: lastNote.checkStave().getY() + lastNote.checkStave().getHeight(),
      staffHeight: firstNote.checkStave().getHeight(),
    });
  }
}
