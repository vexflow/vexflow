// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
//
// ## Description
//
// This file implements `StaveLine` which are simply lines that connect
// two notes. This object is highly configurable, see the `renderOptions`.
// A simple line is often used for notating glissando articulations, but you
// can format a `StaveLine` with arrows or colors for more pedagogical
// purposes, such as diagrams.

import { Element } from './element';
import { RenderContext } from './rendercontext';
import { StaveNote } from './stavenote';
import { Tables } from './tables';
import { TextJustification } from './textnote';
import { Category } from './typeguard';
import { RuntimeError } from './util';

export interface StaveLineNotes {
  firstNote: StaveNote;
  firstIndexes: number[];
  lastNote: StaveNote;
  lastIndexes: number[];
}

// Attribution: Arrow rendering implementations based off of
// Patrick Horgan's article, "Drawing lines and arcs with
// arrow heads on  HTML5 Canvas"
//
// Draw an arrow head that connects between 3 coordinates.
function drawArrowHead(
  ctx: RenderContext,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): void {
  // all cases do this.
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x0, y0);
  ctx.closePath();

  ctx.fill();
}

export class StaveLine extends Element {
  static get CATEGORY(): string {
    return Category.StaveLine;
  }

  // Text Positioning
  static readonly TextVerticalPosition = {
    TOP: 1,
    BOTTOM: 2,
  };

  static readonly TextJustification = TextJustification;

  public renderOptions: {
    paddingLeft: number;
    paddingRight: number;
    lineWidth: number;
    lineDash?: number[];
    roundedEnd: boolean;
    color?: string;
    drawStartArrow: boolean;
    drawEndArrow: boolean;
    arrowheadLength: number;
    arrowheadAngle: number;
    textPositionVertical: number;
    textJustification: number;
  };

  // These five instance variables are all initialized by the constructor via this.setNotes(notes).
  protected notes!: StaveLineNotes;
  protected firstNote!: StaveNote;
  protected firstIndexes!: number[];
  protected lastNote!: StaveNote;
  protected lastIndexes!: number[];

  // Initialize the StaveLine with the given `notes`.
  //
  // `notes` is a struct that has:
  //
  //  ```
  //  {
  //    firstNote: Note,
  //    lastNote: Note,
  //    firstIndexes: [n1, n2, n3],
  //    lastIndexes: [n1, n2, n3]
  //  }
  //  ```
  constructor(notes: StaveLineNotes) {
    super();

    this.setNotes(notes);

    this.text = '';

    this.renderOptions = {
      // Space to add to the left or the right
      paddingLeft: 4,
      paddingRight: 3,

      // The width of the line in pixels
      lineWidth: 1,
      // An array of line/space lengths. (TODO/QUESTION: Is this supported in SVG?).
      lineDash: undefined,
      // Can draw rounded line end, instead of a square. (TODO/QUESTION: Is this supported in SVG?).
      roundedEnd: true,
      // The color of the line and arrowheads
      color: undefined,

      // Flags to draw arrows on each end of the line
      drawStartArrow: false,
      drawEndArrow: false,

      // The length of the arrowhead sides
      arrowheadLength: 10,
      // The angle of the arrowhead
      arrowheadAngle: Math.PI / 8,

      // The position of the text
      textPositionVertical: StaveLine.TextVerticalPosition.TOP,
      textJustification: StaveLine.TextJustification.CENTER,
    };
  }

  // The the annotation for the `StaveLine`
  setText(text: string): this {
    this.text = text;
    return this;
  }

  // Set the notes for the `StaveLine`
  setNotes(notes: StaveLineNotes): this {
    if (!notes.firstNote && !notes.lastNote) {
      throw new RuntimeError('BadArguments', 'Notes needs to have either firstNote or lastNote set.');
    }

    if (!notes.firstIndexes) notes.firstIndexes = [0];
    if (!notes.lastIndexes) notes.lastIndexes = [0];

    if (notes.firstIndexes.length !== notes.lastIndexes.length) {
      throw new RuntimeError('BadArguments', 'Connected notes must have same number of indexes.');
    }

    this.notes = notes;
    this.firstNote = notes.firstNote;
    this.firstIndexes = notes.firstIndexes;
    this.lastNote = notes.lastNote;
    this.lastIndexes = notes.lastIndexes;
    return this;
  }

  // Apply the style of the `StaveLine` to the context
  applyLineStyle(): void {
    const ctx = this.checkContext();
    const renderOptions = this.renderOptions;

    if (renderOptions.lineDash) {
      ctx.setLineDash(renderOptions.lineDash);
    }

    if (renderOptions.lineWidth) {
      ctx.setLineWidth(renderOptions.lineWidth);
    }

    if (renderOptions.roundedEnd) {
      ctx.setLineCap('round');
    } else {
      ctx.setLineCap('square');
    }
  }

  // Helper function to draw a line with arrow heads
  protected drawArrowLine(ctx: RenderContext, pt1: { x: number; y: number }, pt2: { x: number; y: number }): void {
    const bothArrows = this.renderOptions.drawStartArrow && this.renderOptions.drawEndArrow;

    const x1 = pt1.x;
    const y1 = pt1.y;
    const x2 = pt2.x;
    const y2 = pt2.y;

    // For ends with arrow we actually want to stop before we get to the arrow
    // so that wide lines won't put a flat end on the arrow.
    const distance = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    const ratio = (distance - this.renderOptions.arrowheadLength / 3) / distance;
    let endX;
    let endY;
    let startX;
    let startY;
    if (this.renderOptions.drawEndArrow || bothArrows) {
      endX = Math.round(x1 + (x2 - x1) * ratio);
      endY = Math.round(y1 + (y2 - y1) * ratio);
    } else {
      endX = x2;
      endY = y2;
    }

    if (this.renderOptions.drawStartArrow || bothArrows) {
      startX = x1 + (x2 - x1) * (1 - ratio);
      startY = y1 + (y2 - y1) * (1 - ratio);
    } else {
      startX = x1;
      startY = y1;
    }

    if (this.renderOptions.color) {
      ctx.setStrokeStyle(this.renderOptions.color);
      ctx.setFillStyle(this.renderOptions.color);
    }

    // Draw the shaft of the arrow
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.closePath();

    // calculate the angle of the line
    const lineAngle = Math.atan2(y2 - y1, x2 - x1);
    // h is the line length of a side of the arrow head
    const h = Math.abs(this.renderOptions.arrowheadLength / Math.cos(this.renderOptions.arrowheadAngle));

    let angle1;
    let angle2;
    let topX;
    let topY;
    let bottomX;
    let bottomY;

    if (this.renderOptions.drawEndArrow || bothArrows) {
      angle1 = lineAngle + Math.PI + this.renderOptions.arrowheadAngle;
      topX = x2 + Math.cos(angle1) * h;
      topY = y2 + Math.sin(angle1) * h;

      angle2 = lineAngle + Math.PI - this.renderOptions.arrowheadAngle;
      bottomX = x2 + Math.cos(angle2) * h;
      bottomY = y2 + Math.sin(angle2) * h;

      drawArrowHead(ctx, topX, topY, x2, y2, bottomX, bottomY);
    }

    if (this.renderOptions.drawStartArrow || bothArrows) {
      angle1 = lineAngle + this.renderOptions.arrowheadAngle;
      topX = x1 + Math.cos(angle1) * h;
      topY = y1 + Math.sin(angle1) * h;

      angle2 = lineAngle - this.renderOptions.arrowheadAngle;
      bottomX = x1 + Math.cos(angle2) * h;
      bottomY = y1 + Math.sin(angle2) * h;

      drawArrowHead(ctx, topX, topY, x1, y1, bottomX, bottomY);
    }
  }

  // Renders the `StaveLine` on the context
  draw(): this {
    const ctx = this.checkContext();
    this.setRendered();

    const firstNote = this.firstNote;
    const lastNote = this.lastNote;
    const renderOptions = this.renderOptions;

    ctx.save();
    this.applyLineStyle();

    // Cycle through each set of indexes and draw lines
    let startPosition = { x: 0, y: 0 };
    let endPosition = { x: 0, y: 0 };
    this.firstIndexes.forEach((firstIndex, i) => {
      const lastIndex = this.lastIndexes[i];

      // Get initial coordinates for the start/end of the line
      startPosition = firstNote.getModifierStartXY(2, firstIndex);
      endPosition = lastNote.getModifierStartXY(1, lastIndex);
      const upwardsSlope = startPosition.y > endPosition.y;

      // Adjust `x` coordinates for modifiers
      startPosition.x += firstNote.getMetrics().modRightPx + renderOptions.paddingLeft;
      endPosition.x -= lastNote.getMetrics().modLeftPx + renderOptions.paddingRight;

      // Adjust first `x` coordinates for displacements
      const noteheadWidth = firstNote.getGlyphWidth();
      const firstDisplaced = firstNote.getKeyProps()[firstIndex].displaced;
      if (firstDisplaced && firstNote.getStemDirection() === 1) {
        startPosition.x += noteheadWidth + renderOptions.paddingLeft;
      }

      // Adjust last `x` coordinates for displacements
      const lastDisplaced = lastNote.getKeyProps()[lastIndex].displaced;
      if (lastDisplaced && lastNote.getStemDirection() === -1) {
        endPosition.x -= noteheadWidth + renderOptions.paddingRight;
      }

      // Adjust y position better if it's not coming from the center of the note
      startPosition.y += upwardsSlope ? -3 : 1;
      endPosition.y += upwardsSlope ? 2 : 0;

      this.drawArrowLine(ctx, startPosition, endPosition);
    });

    ctx.restore();

    // Determine the x coordinate where to start the text
    const textWidth = this.width;
    const justification = renderOptions.textJustification;
    let x = 0;
    if (justification === StaveLine.TextJustification.LEFT) {
      x = startPosition.x;
    } else if (justification === StaveLine.TextJustification.CENTER) {
      const deltaX = endPosition.x - startPosition.x;
      const centerX = deltaX / 2 + startPosition.x;
      x = centerX - textWidth / 2;
    } else if (justification === StaveLine.TextJustification.RIGHT) {
      x = endPosition.x - textWidth;
    }

    // Determine the y value to start the text
    let y = 0;
    const verticalPosition = renderOptions.textPositionVertical;
    if (verticalPosition === StaveLine.TextVerticalPosition.TOP) {
      y = firstNote.checkStave().getYForTopText();
    } else if (verticalPosition === StaveLine.TextVerticalPosition.BOTTOM) {
      y = firstNote.checkStave().getYForBottomText(Tables.TEXT_HEIGHT_OFFSET_HACK);
    }

    // Draw the text
    const color = renderOptions.color;
    this.applyStyle(ctx, { fillStyle: color, strokeStyle: color });
    this.renderText(ctx, x, y);
    this.restoreStyle(ctx);

    return this;
  }
}
