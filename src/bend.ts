// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License

import { Element, ElementStyle } from './element';
import { Metrics } from './metrics';
import { Modifier } from './modifier';
import { ModifierContextState } from './modifiercontext';
import { Category, isTabNote } from './typeguard';
import { RuntimeError } from './util';

export interface BendPhrase {
  x?: number;
  type: number;
  text: string;
  width?: number;
  drawWidth?: number;
}

/** Bend implements tablature bends. */
export class Bend extends Modifier {
  static get CATEGORY(): string {
    return Category.Bend;
  }

  static get UP(): number {
    return 0;
  }

  static get DOWN(): number {
    return 1;
  }

  // Arrange bends in `ModifierContext`
  static format(bends: Bend[], state: ModifierContextState): boolean {
    if (!bends || bends.length === 0) return false;

    let lastWidth = 0;
    // Format Bends
    for (let i = 0; i < bends.length; ++i) {
      const bend = bends[i];
      const note = bend.checkAttachedNote();

      if (isTabNote(note)) {
        const stringPos = note.leastString() - 1;
        if (state.topTextLine < stringPos) {
          state.topTextLine = stringPos;
        }
      }
      bend.setXShift(lastWidth);
      lastWidth = bend.getWidth();
      bend.setTextLine(state.topTextLine);
    }

    state.rightShift += lastWidth;
    state.topTextLine += 1;
    return true;
  }

  protected tap: string;
  protected phrase: BendPhrase[];
  
  protected styleLine: ElementStyle = Metrics.getStyle('Bend.line');;
  
  /** Set the element style used for rendering the lines. */
  setStyleLine(style: ElementStyle): this {
    this.styleLine = {...this.styleLine, ...style};
    return this;
  }

  /** Get the element style used for rendering the lines. */
  getStyleLine(): ElementStyle {
    return this.styleLine;
  }


  public renderOptions: {
    releaseWidth: number;
    bendWidth: number;
  };

  /**
   * Example of a phrase:
   * ```
   *    [{
   *     type: UP,
   *     text: "whole"
   *     width: 8;
   *   },
   *   {
   *     type: DOWN,
   *     text: "whole"
   *     width: 8;
   *   },
   *   {
   *     type: UP,
   *     text: "half"
   *     width: 8;
   *   },
   *   {
   *     type: UP,
   *     text: "whole"
   *     width: 8;
   *   },
   *   {
   *     type: DOWN,
   *     text: "1 1/2"
   *     width: 8;
   *   }]
   * ```
   */
  constructor(phrase: BendPhrase[]) {
    super();
  
    this.xShift = 0;
    this.tap = '';
    this.renderOptions = {
      bendWidth: 8,
      releaseWidth: 8,
    };
  
    this.phrase = phrase;

    this.updateWidth();
  }

  /** Set horizontal shift in pixels. */
  setXShift(value: number): this {
    this.xShift = value;
    this.updateWidth();
    return this;
  }

  setTap(value: string): this {
    this.tap = value;
    return this;
  }

  getTextHeight(): number {
    const element = new Element(Category.Bend);
    element.setText(this.phrase[0].text);
    return element.getHeight();
  }

  /** Recalculate width. */
  protected updateWidth(): this {
    const measureText = (text: string) => {
      const element = new Element(Category.Bend);
      element.setText(text);
      return element.getWidth();
    };

    let totalWidth = 0;
    for (let i = 0; i < this.phrase.length; ++i) {
      const bend = this.phrase[i];
      if (bend.width !== undefined) {
        totalWidth += bend.width;
      } else {
        const additionalWidth = bend.type === Bend.UP ? this.renderOptions.bendWidth : this.renderOptions.releaseWidth;

        bend.width = Math.max(additionalWidth, measureText(bend.text)) + 3;
        bend.drawWidth = bend.width / 2;
        totalWidth += bend.width;
      }
    }

    this.setWidth(totalWidth + this.xShift);
    return this;
  }

  /** Draw the bend on the rendering context. */
  draw(): void {
    const ctx = this.checkContext();
    const note = this.checkAttachedNote();
    this.setRendered();
    this.applyStyle();

    const start = note.getModifierStartXY(Modifier.Position.RIGHT, this.index);
    start.x += 3;
    start.y += 0.5;
    const xShift = this.xShift;

    const stave = note.checkStave();
    const spacing = stave.getSpacingBetweenLines();
    const lowestY = note.getYs().reduce((a, b) => (a < b ? a : b));
    // this.textLine is relative to top string in the group.
    const bendHeight = start.y - ((this.textLine + 1) * spacing + start.y - lowestY) + 3;
    const annotationY = start.y - ((this.textLine + 1) * spacing + start.y - lowestY) - 1;

    const renderBend = (x: number, y: number, width: number, height: number) => {
      const cpX = x + width;
      const cpY = y;
      
      this.applyStyle(ctx, this.styleLine);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(cpX, cpY, x + width, height);
      ctx.stroke();
      this.restoreStyle(ctx, this.styleLine);
    };

    const renderRelease = (x: number, y: number, width: number, height: number) => {
      this.applyStyle(ctx, this.styleLine);
      ctx.beginPath();
      ctx.moveTo(x, height);
      ctx.quadraticCurveTo(x + width, height, x + width, y);
      ctx.stroke();
      this.restoreStyle(ctx, this.styleLine);
    };

    const renderArrowHead = (x: number, y: number, direction: number) => {
      const width = 4;
      const yBase = y + width * direction;

      ctx.beginPath();
      ctx.moveTo(x, y); // tip of the arrow
      ctx.lineTo(x - width, yBase);
      ctx.lineTo(x + width, yBase);
      ctx.closePath();
      ctx.fill();
    };

    const renderText = (x: number, text: string) => {
      ctx.setFont(this.fontInfo);
      const renderX = x - ctx.measureText(text).width / 2;
      ctx.fillText(text, renderX, annotationY);
    };

    let lastBend = undefined;
    let lastBendDrawWidth = 0;
    let lastDrawnWidth = 0;
    if (this.tap?.length) {
      const tapStart = note.getModifierStartXY(Modifier.Position.CENTER, this.index);
      renderText(tapStart.x, this.tap);
    }

    for (let i = 0; i < this.phrase.length; ++i) {
      const bend = this.phrase[i];
      if (!bend.drawWidth) bend.drawWidth = 0;
      if (i === 0) bend.drawWidth += xShift;

      lastDrawnWidth = bend.drawWidth + lastBendDrawWidth - (i === 1 ? xShift : 0);
      if (bend.type === Bend.UP) {
        if (lastBend && lastBend.type === Bend.UP) {
          renderArrowHead(start.x, bendHeight, +1);
        }

        renderBend(start.x, start.y, lastDrawnWidth, bendHeight);
      }

      if (bend.type === Bend.DOWN) {
        if (lastBend && lastBend.type === Bend.UP) {
          renderRelease(start.x, start.y, lastDrawnWidth, bendHeight);
        }

        if (lastBend && lastBend.type === Bend.DOWN) {
          renderArrowHead(start.x, start.y, -1);
          renderRelease(start.x, start.y, lastDrawnWidth, bendHeight);
        }

        if (!lastBend) {
          lastDrawnWidth = bend.drawWidth;
          renderRelease(start.x, start.y, lastDrawnWidth, bendHeight);
        }
      }

      renderText(start.x + lastDrawnWidth, bend.text);
      lastBend = bend;
      lastBendDrawWidth = bend.drawWidth;
      lastBend.x = start.x;

      start.x += lastDrawnWidth;
    }

    if (!lastBend || lastBend.x === undefined) {
      throw new RuntimeError('NoLastBendForBend', 'Internal error.');
    }

    // Final arrowhead and text
    if (lastBend.type === Bend.UP) {
      renderArrowHead(lastBend.x + lastDrawnWidth, bendHeight, +1);
    } else if (lastBend.type === Bend.DOWN) {
      renderArrowHead(lastBend.x + lastDrawnWidth, start.y, -1);
    }
    this.restoreStyle();
  }
}
