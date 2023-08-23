// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author Cyril Silverman
//
// This file implements `TextBrackets` which extend between two notes.
// The octave transposition markings (8va, 8vb, 15va, 15vb) can be created
// using this class.

import { Element } from './element';
import { Font } from './font';
import { Note } from './note';
import { RenderContext } from './rendercontext';
import { Renderer } from './renderer';
import { Tables } from './tables';
import { Category } from './typeguard';
import { log, RuntimeError } from './util';

export interface TextBracketParams {
  start: Note;
  stop: Note;
  text?: string;
  superscript?: string;
  position?: number | string;
}

// To enable logging for this class. Set `Vex.Flow.TextBracket.DEBUG` to `true`.
// eslint-disable-next-line
function L(...args: any[]) {
  if (TextBracket.DEBUG) log('Vex.Flow.TextBracket', args);
}

export enum TextBracketPosition {
  TOP = 1,
  BOTTOM = -1,
}

export class TextBracket extends Element {
  static DEBUG: boolean = false;

  static get CATEGORY(): string {
    return Category.TextBracket;
  }

  public renderOptions: {
    dashed: boolean;
    color: string;
    lineWidth: number;
    underlineSuperscript: boolean;
    showBracket: boolean;
    dash: number[];
    bracketHeight: number;
  };

  protected readonly text: string;
  protected readonly superscript: string;

  protected line: number;

  readonly position: TextBracketPosition;
  readonly start: Note;
  readonly stop: Note;

  static get Position(): typeof TextBracketPosition {
    return TextBracketPosition;
  }

  static get PositionString(): Record<string, number> {
    return {
      top: TextBracketPosition.TOP,
      bottom: TextBracketPosition.BOTTOM,
    };
  }

  /**
   * @deprecated Use `TextBracket.Position` instead.
   */
  static get Positions(): typeof TextBracketPosition {
    L('Positions is deprecated, use TextBracketPosition instead.');
    return TextBracketPosition;
  }

  /**
   * @deprecated Use `TextBracket.PositionString` instead.
   */
  static get PositionsString(): Record<string, number> {
    L('PositionsString is deprecated, use PositionString instead.');
    return TextBracket.PositionString;
  }

  constructor({ start, stop, text = '', superscript = '', position = TextBracketPosition.TOP }: TextBracketParams) {
    super();

    this.start = start;
    this.stop = stop;

    this.text = text;
    this.superscript = superscript;

    this.position = typeof position === 'string' ? TextBracket.PositionString[position] : position;

    this.line = 1;

    this.renderOptions = {
      dashed: true,
      dash: [5],
      color: 'black',
      lineWidth: 1,
      showBracket: true,
      bracketHeight: 8,

      // In the BOTTOM position, the bracket line can extend
      // under the superscript.
      underlineSuperscript: true,
    };
  }

  /**
   * Apply the text backet styling to the provided context.
   * @param ctx
   * @returns this
   */
  applyStyle(ctx: RenderContext): this {
    ctx.setFont(this.font);
    const options = this.renderOptions;
    ctx.setStrokeStyle(options.color);
    ctx.setFillStyle(options.color);
    ctx.setLineWidth(options.lineWidth);

    return this;
  }

  // Set whether the bracket line should be `dashed`. You can also
  // optionally set the `dash` pattern by passing in an array of numbers
  setDashed(dashed: boolean, dash?: number[]): this {
    this.renderOptions.dashed = dashed;
    if (dash) this.renderOptions.dash = dash;
    return this;
  }

  // Set the rendering `context` for the octave bracket
  setLine(line: number): this {
    this.line = line;
    return this;
  }

  // Draw the octave bracket on the rendering context
  draw(): void {
    const ctx = this.checkContext();
    this.setRendered();

    let y = 0;
    switch (this.position) {
      case TextBracketPosition.TOP:
        y = this.start.checkStave().getYForTopText(this.line);
        break;
      case TextBracketPosition.BOTTOM:
        y = this.start.checkStave().getYForBottomText(this.line + Tables.TEXT_HEIGHT_OFFSET_HACK);
        break;
      default:
        throw new RuntimeError('InvalidPosition', `The position ${this.position} is invalid.`);
    }

    // Get the preliminary start and stop coordintates for the bracket
    const start = { x: this.start.getAbsoluteX(), y };
    const stop = { x: this.stop.getAbsoluteX(), y };

    L('Rendering TextBracket: start:', start, 'stop:', stop, 'y:', y);

    const bracketHeight = this.renderOptions.bracketHeight * this.position;

    ctx.save();
    this.applyStyle(ctx);

    // Draw text
    ctx.fillText(this.text, start.x, start.y);

    // Get the width and height for the octave number
    const mainMeasure = ctx.measureText(this.text);
    const mainWidth = mainMeasure.width;
    const mainHeight = mainMeasure.height;

    // Calculate the y position for the super script
    const superY = start.y - mainHeight / 2.5;

    // We called this.resetFont() in the constructor, so we know this.textFont is available.
    // eslint-disable-next-line
    const { family, size, weight, style } = this.textFont!;
    // To draw the superscript, we scale the font size by 1/1.4.
    const smallerFontSize = Font.scaleSize(size, 0.714286);
    ctx.setFont(family, smallerFontSize, weight, style);
    ctx.fillText(this.superscript, start.x + mainWidth + 1, superY);

    // Determine width and height of the superscript
    const superMeasure = ctx.measureText(this.superscript);
    const superWidth = superMeasure.width;
    const superHeight = superMeasure.height;

    // Setup initial coordinates for the bracket line
    let startX = start.x;
    let lineY = superY;
    const endX = stop.x + this.stop.getGlyphWidth();

    // Adjust x and y coordinates based on position
    if (this.position === TextBracketPosition.TOP) {
      startX += mainWidth + superWidth + 5;
      lineY -= superHeight / 2.7;
    } else if (this.position === TextBracketPosition.BOTTOM) {
      lineY += superHeight / 2.7;
      startX += mainWidth + 2;

      if (!this.renderOptions.underlineSuperscript) {
        startX += superWidth;
      }
    }

    if (this.renderOptions.dashed) {
      // Main line
      Renderer.drawDashedLine(ctx, startX, lineY, endX, lineY, this.renderOptions.dash);
      // Ending Bracket
      if (this.renderOptions.showBracket) {
        Renderer.drawDashedLine(
          ctx,
          endX,
          lineY + 1 * this.position,
          endX,
          lineY + bracketHeight,
          this.renderOptions.dash
        );
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(startX, lineY);
      // Main line
      ctx.lineTo(endX, lineY);
      if (this.renderOptions.showBracket) {
        // Ending bracket
        ctx.lineTo(endX, lineY + bracketHeight);
      }
      ctx.stroke();
      ctx.closePath();
    }

    ctx.restore();
  }
}
