// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License

import { Bend } from './bend';
import { Modifier } from './modifier';
import { ModifierContext, ModifierContextState } from './modifiercontext';
import { RenderContext } from './rendercontext';
import { Tables } from './tables';
import { Category } from './typeguard';

export interface VibratoRenderOptions {
  vibratoWidth: number;
  waveWidth: number;
  waveHeight: number;
  waveGirth: number;
  harsh: boolean;
}

/** `Vibrato` implements diverse vibratos. */
export class Vibrato extends Modifier {
  static get CATEGORY(): string {
    return Category.Vibrato;
  }

  public renderOptions: VibratoRenderOptions;

  /** Arrange vibratos inside a `ModifierContext`. */
  static format(vibratos: Vibrato[], state: ModifierContextState, context: ModifierContext): boolean {
    if (!vibratos || vibratos.length === 0) return false;

    // Vibratos are always on top.
    let textLine = state.topTextLine;
    let width = 0;
    let shift = state.rightShift - 7;

    // If there's a bend, drop the text line
    const bends = context.getMembers(Bend.CATEGORY) as Bend[];
    if (bends && bends.length > 0) {
      const bendHeight =
        bends.map((bb) => bb.getTextHeight()).reduce((a, b) => (a > b ? a : b)) / Tables.STAVE_LINE_DISTANCE;
      textLine = textLine - (bendHeight + 1);
    } else {
      state.topTextLine += 1;
    }

    // Format Vibratos
    for (let i = 0; i < vibratos.length; ++i) {
      const vibrato = vibratos[i];
      vibrato.setXShift(shift);
      vibrato.setTextLine(textLine);
      width += vibrato.getWidth();
      shift += width;
    }

    state.rightShift += width;
    return true;
  }

  constructor() {
    super();

    this.position = Modifier.Position.RIGHT;
    this.renderOptions = {
      harsh: false,
      vibratoWidth: 20,
      waveHeight: 6,
      waveWidth: 4,
      waveGirth: 2,
    };

    this.setVibratoWidth(this.renderOptions.vibratoWidth);
  }

  /** Set harsh vibrato. */
  setHarsh(harsh: boolean): this {
    this.renderOptions.harsh = harsh;
    return this;
  }

  /** Set vibrato width in pixels. */
  setVibratoWidth(width: number): this {
    this.renderOptions.vibratoWidth = width;
    this.setWidth(width);
    return this;
  }

  /** Draw the vibrato on the rendering context. */
  draw(): void {
    const ctx = this.checkContext();
    const note = this.checkAttachedNote();
    this.setRendered();

    const start = note.getModifierStartXY(Modifier.Position.RIGHT, this.index);

    const vx = start.x + this.xShift;
    const vy = note.getYForTopText(this.textLine) + 2;

    Vibrato.renderVibrato(ctx, vx, vy, this.renderOptions);
  }

  /**
   * Static rendering method that can be called from
   * other classes (e.g. VibratoBracket).
   */
  static renderVibrato(ctx: RenderContext, x: number, y: number, opts: VibratoRenderOptions): void {
    const { vibratoWidth, waveWidth, waveHeight, waveGirth, harsh } = opts;
    const numWaves = vibratoWidth / waveWidth;

    ctx.beginPath();

    let i;
    if (harsh) {
      ctx.moveTo(x, y + waveGirth + 1);
      for (i = 0; i < numWaves / 2; ++i) {
        ctx.lineTo(x + waveWidth, y - waveHeight / 2);
        x += waveWidth;
        ctx.lineTo(x + waveWidth, y + waveHeight / 2);
        x += waveWidth;
      }
      for (i = 0; i < numWaves / 2; ++i) {
        ctx.lineTo(x - waveWidth, y - waveHeight / 2 + waveGirth + 1);
        x -= waveWidth;
        ctx.lineTo(x - waveWidth, y + waveHeight / 2 + waveGirth + 1);
        x -= waveWidth;
      }
      ctx.fill();
    } else {
      ctx.moveTo(x, y + waveGirth);
      for (i = 0; i < numWaves / 2; ++i) {
        ctx.quadraticCurveTo(x + waveWidth / 2, y - waveHeight / 2, x + waveWidth, y);
        x += waveWidth;
        ctx.quadraticCurveTo(x + waveWidth / 2, y + waveHeight / 2, x + waveWidth, y);
        x += waveWidth;
      }

      for (i = 0; i < numWaves / 2; ++i) {
        ctx.quadraticCurveTo(x - waveWidth / 2, y + waveHeight / 2 + waveGirth, x - waveWidth, y + waveGirth);
        x -= waveWidth;
        ctx.quadraticCurveTo(x - waveWidth / 2, y - waveHeight / 2 + waveGirth, x - waveWidth, y + waveGirth);
        x -= waveWidth;
      }
      ctx.fill();
    }
  }
}
