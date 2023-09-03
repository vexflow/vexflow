// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
//
// This file implements the `Crescendo` object which draws crescendos and
// decrescendo dynamics markings. A `Crescendo` is initialized with a
// duration and formatted as part of a `Voice` like any other `Note`
// type in VexFlow. This object would most likely be formatted in a Voice
// with `TextNotes` - which are used to represent other dynamics markings.

import { Note, NoteStruct } from './note';
import { RenderContext } from './rendercontext';
import { TickContext } from './tickcontext';
import { Category } from './typeguard';
import { log } from './util';

export interface CrescendoParams {
  reverse: boolean;
  height: number;
  y: number;
  beginX: number;
  endX: number;
}

// To enable logging for this class. Set `Vex.Flow.Crescendo.DEBUG` to `true`.
// eslint-disable-next-line
function L(...args: any[]) {
  if (Crescendo.DEBUG) log('Vex.Flow.Crescendo', args);
}

// Helper to draw the hairpin.
function renderHairpin(ctx: RenderContext, params: CrescendoParams) {
  const beginX = params.beginX;
  const endX = params.endX;
  const y = params.y;
  const halfHeight = params.height / 2;

  ctx.beginPath();

  if (params.reverse) {
    ctx.moveTo(beginX, y - halfHeight);
    ctx.lineTo(endX, y);
    ctx.lineTo(beginX, y + halfHeight);
  } else {
    ctx.moveTo(endX, y - halfHeight);
    ctx.lineTo(beginX, y);
    ctx.lineTo(endX, y + halfHeight);
  }

  ctx.stroke();
  ctx.closePath();
}

export class Crescendo extends Note {
  static DEBUG: boolean = false;

  /** Crescendo category string. */
  static get CATEGORY(): string {
    return Category.Crescendo;
  }

  protected decrescendo: boolean;
  protected height: number;
  protected line: number;
  protected options = {
    // Extensions to the length of the crescendo on either side
    extendLeft: 0,
    extendRight: 0,
    // Vertical shift
    yShift: 0,
  };

  // Initialize the crescendo's properties
  constructor(noteStruct: NoteStruct) {
    super(noteStruct);

    // Whether the object is a decrescendo
    this.decrescendo = false;

    // The staff line to be placed on
    this.line = noteStruct.line ?? 0;

    // The height at the open end of the cresc/decresc
    this.height = 15;
  }

  // Set the line to center the element on
  setLine(line: number): this {
    this.line = line;
    return this;
  }

  // Set the full height at the open end
  setHeight(height: number): this {
    this.height = height;
    return this;
  }

  // Set whether the sign should be a descresendo by passing a bool
  // to `decresc`
  setDecrescendo(decresc: boolean): this {
    this.decrescendo = decresc;
    return this;
  }

  // Preformat the note
  preFormat(): this {
    this.preFormatted = true;
    return this;
  }

  // Render the Crescendo object onto the canvas
  draw(): void {
    const ctx = this.checkContext();
    const stave = this.checkStave();
    this.setRendered();

    const tickContext = this.getTickContext();
    const nextContext = TickContext.getNextContext(tickContext);

    const beginX = this.getAbsoluteX();
    const endX = nextContext ? nextContext.getX() : stave.getX() + stave.getWidth();
    const y = stave.getYForLine(this.line + -3) + 1;

    L('Drawing ', this.decrescendo ? 'decrescendo ' : 'crescendo ', this.height, 'x', beginX - endX);

    renderHairpin(ctx, {
      beginX: beginX - this.options.extendLeft,
      endX: endX + this.options.extendRight,
      y: y + this.options.yShift,
      height: this.height,
      reverse: this.decrescendo,
    });
  }
}
