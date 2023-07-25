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

  private durationToCode: Record<string, string> = {
    '1/2': '\ue1d0' /*metNoteDoubleWhole*/,
    1: '\ueca2' /*metNoteWhole*/,
    2: '\ueca3' /*metNoteHalfUp*/,
    4: '\ueca5' /*metNoteQuarterUp*/,
    8: '\ueca7' /*metNote8thUp*/,
    16: '\ueca9' /*metNote16thUp*/,
    32: '\uecab' /*metNote32ndUp*/,
    64: '\uecad' /*metNote64thUp*/,
    128: '\uecaf' /*metNote128thUp*/,
    256: '\uecb1' /*metNote256thUp*/,
    512: '\uecb3' /*metNote512thUp*/,
    1024: '\uecb5' /*metNote1024thUp*/,
  };

  setTempo(tempo: StaveTempoOptions): this {
    const { duration, dots, bpm, name } = tempo;
    let txt = '';
    if (name) txt += name;
    if (duration && bpm) {
      txt += (name ? ' (' : '') + this.durationToCode[Tables.sanitizeDuration(duration)];
      // Draw dots
      for (let i = 0; i < (dots ?? 0); i++) {
        txt += ' ' + '\uecb7' /*metAugmentationDot*/;
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
