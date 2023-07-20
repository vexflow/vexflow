// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License

import { Bend } from './bend';
import { Modifier } from './modifier';
import { ModifierContext, ModifierContextState } from './modifiercontext';
import { RenderContext } from './rendercontext';
import { Tables } from './tables';
import { Category } from './typeguard';

export interface VibratoRenderOptions {
  code: number;
  width: number;
}

/** `Vibrato` implements diverse vibratos. */
export class Vibrato extends Modifier {
  static get CATEGORY(): string {
    return Category.Vibrato;
  }

  protected renderOptions: VibratoRenderOptions;

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
      code: 0xeab0,
      width: 20,
    };

    this.setVibratoWidth(this.renderOptions.width);
  }

  /** Set vibrato width in pixels. */
  setVibratoWidth(width: number): this {
    this.renderOptions.width = width;
    this.text = String.fromCodePoint(this.renderOptions.code);
    this.measureText();

    const items = Math.round(this.renderOptions.width / this.getWidth());
    for (let i = 1; i < items; i++) {
      this.text += String.fromCodePoint(this.renderOptions.code);
    }
    this.measureText();

    return this;
  }

  /** Set vibrato code. */
  setVibratoCode(code: number): this {
    this.renderOptions.code = code;
    return this.setVibratoWidth(this.renderOptions.width);
  }

  /** Draw the vibrato on the rendering context. */
  draw(): void {
    const ctx = this.checkContext();
    const note = this.checkAttachedNote();
    this.setRendered();

    const start = note.getModifierStartXY(Modifier.Position.RIGHT, this.index);

    const vx = start.x;
    const vy = note.getYForTopText(this.textLine) + 5;

    this.renderText(ctx, vx, vy);
  }
}
