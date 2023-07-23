// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author: Radosaw Eichler 2012

import { Stave } from './stave';
import { StaveModifier, StaveModifierPosition } from './stavemodifier';
import { Tables } from './tables';
import { Category } from './typeguard';

export interface StaveTempoOptions {
  bpm?: number;
  duration?: string;
  dots?: number;
  name?: string;
}

export class StaveTempo extends StaveModifier {
  static get CATEGORY(): string {
    return Category.StaveTempo;
  }

  constructor(tempo: StaveTempoOptions, x: number, shiftY: number) {
    super();

    this.setTempo(tempo);
    this.position = StaveModifierPosition.ABOVE;
    this.x = x;
    this.setXShift(10);
    this.setYShift(shiftY);
  }

  private durationToCode: Record<string, number> = {
    '1/2': 0xe1d0 /*noteDoubleWhole*/,
    1: 0xe1d2 /*noteWhole*/,
    2: 0xe1d3 /*noteHalfUp*/,
    4: 0xe1d5 /*noteQuarterUp*/,
    8: 0xe1d7 /*note8thUp*/,
    16: 0xe1d9 /*note16thUp*/,
    32: 0xe1db /*note32ndUp*/,
    64: 0xe1dd /*note64thUp*/,
    128: 0xe1df /*note128thUp*/,
    256: 0xe1e1 /*note256thUp*/,
    512: 0xe1e3 /*note512thUp*/,
    1024: 0xe1e5 /*note1024thUp*/,
  };

  setTempo(tempo: StaveTempoOptions): this {
    const { duration, dots, bpm, name } = tempo;
    let txt = '';
    if (name) txt += name;
    if (duration && bpm) {
      txt += (name ? ' (' : '') + String.fromCharCode(this.durationToCode[Tables.sanitizeDuration(duration)]);
      // Draw dots
      for (let i = 0; i < (dots ?? 0); i++) {
        txt += ' ' + String.fromCharCode(0xe1e7 /*augmentationDot*/);
      }
      txt += ' = ' + bpm + (name ? ')' : '');
    }
    this.text = txt;
    this.measureText();
    return this;
  }

  draw(stave: Stave, shiftX: number): this {
    const ctx = stave.checkContext();
    this.setRendered();
    this.renderText(ctx, this.x + shiftX, stave.getYForTopText(1));
    return this;
  }
}
