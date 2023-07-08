// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License

import { Element } from './element';
import { FontInfo } from './font';
import { Modifier } from './modifier';
import { ModifierContextState } from './modifiercontext';
import { TextFormatter } from './textformatter';
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

  protected text: string;
  protected tap: string;
  protected release: boolean;
  protected phrase: BendPhrase[];

  public renderOptions: {
    lineWidth: number;
    releaseWidth: number;
    bendWidth: number;
    lineStyle: string;
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
   * @param text text for bend ("Full", "Half", etc.) (DEPRECATED)
   * @param release if true, render a release. (DEPRECATED)
   * @param phrase if set, ignore "text" and "release", and use the more sophisticated phrase specified
   */
  constructor(text: string, release: boolean = false, phrase?: BendPhrase[]) {
    super();

    this.text = text;
    this.release = release;
    this.tap = '';

    this.renderOptions = {
      lineWidth: 1.5,
      lineStyle: '#777777',
      bendWidth: 8,
      releaseWidth: 8,
    };

    if (phrase) {
      this.phrase = phrase;
    } else {
      // Backward compatibility
      this.phrase = [{ type: Bend.UP, text: this.text }];
      if (this.release) this.phrase.push({ type: Bend.DOWN, text: '' });
    }

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

  /** Get text provided in the constructor. */
  getText(): string {
    return this.text;
  }
  getTextHeight(): number {
    const textFormatter = TextFormatter.create(this.textFont);
    return textFormatter.maxHeight;
  }

  /** Recalculate width. */
  protected updateWidth(): this {
    const textFormatter = TextFormatter.create(this.textFont);
    const measureText = (text: string) => {
      return textFormatter.getWidthForTextInPx(text);
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

      ctx.save();
      ctx.beginPath();
      ctx.setLineWidth(this.renderOptions.lineWidth);
      ctx.setStrokeStyle(this.renderOptions.lineStyle);
      ctx.setFillStyle(this.renderOptions.lineStyle);
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(cpX, cpY, x + width, height);
      ctx.stroke();
      ctx.restore();
    };

    const renderRelease = (x: number, y: number, width: number, height: number) => {
      ctx.save();
      ctx.beginPath();
      ctx.setLineWidth(this.renderOptions.lineWidth);
      ctx.setStrokeStyle(this.renderOptions.lineStyle);
      ctx.setFillStyle(this.renderOptions.lineStyle);
      ctx.moveTo(x, height);
      ctx.quadraticCurveTo(x + width, height, x + width, y);
      ctx.stroke();
      ctx.restore();
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
      ctx.save();
      ctx.setFont(this.textFont);
      const renderX = x - ctx.measureText(text).width / 2;
      ctx.fillText(text, renderX, annotationY);
      ctx.restore();
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

    if (!lastBend || lastBend.x == undefined) {
      throw new RuntimeError('NoLastBendForBend', 'Internal error.');
    }

    // Final arrowhead and text
    if (lastBend.type === Bend.UP) {
      renderArrowHead(lastBend.x + lastDrawnWidth, bendHeight, +1);
    } else if (lastBend.type === Bend.DOWN) {
      renderArrowHead(lastBend.x + lastDrawnWidth, start.y, -1);
    }
  }
}
