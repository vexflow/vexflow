// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author: Radosaw Eichler 2012

import { Element } from './element';
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
  protected tempo: StaveTempoOptions;

  constructor(tempo: StaveTempoOptions, x: number, shiftY: number) {
    super();

    this.tempo = tempo;
    this.position = StaveModifierPosition.ABOVE;
    this.x = x;
    this.setXShift(10);
    this.setYShift(shiftY);
  }

  #durationToCode: Record<string, string> = {
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
    this.tempo = tempo;
    return this;
  }

  draw(stave: Stave, shiftX: number): this {
    const ctx = stave.checkContext();
    this.setRendered();

    const name = this.tempo.name;
    const duration = this.tempo.duration;
    const dots = this.tempo.dots ?? 0;
    const bpm = this.tempo.bpm;
    let x = this.x + shiftX;
    const y = stave.getYForTopText(1);

    ctx.save();

    if (name) {
      this.text = name;
      this.fontInfo = Tables.lookupMetricFontInfo('StaveTempo.name');
      this.renderText(ctx, shiftX, y);
      x += this.getWidth();
    }

    if (duration && bpm) {
      if (name) {
        x += 2;
        ctx.setFont(Tables.lookupMetricFontInfo('StaveTempo'));
        ctx.fillText('(', x + this.xShift, y + this.yShift);
        x += 5;
      }

      x += 3;
      const el = new Element('StaveTempo.glyph');
      el.setText(this.#durationToCode[Tables.sanitizeDuration(duration)]);
      el.measureText();
      el.renderText(ctx, x + this.xShift, y + this.yShift);
      x += el.getWidth();

      // Draw dot
      ctx.setFont(Tables.lookupMetricFontInfo('StaveTempo.glyph'));
      for (let i = 0; i < dots; i++) {
        x += 6;
        ctx.fillText('\uecb7' /*metAugmentationDot*/, x + this.xShift, y + 2 + this.yShift);
      }
      ctx.setFont(Tables.lookupMetricFontInfo('StaveTempo'));
      ctx.fillText(' = ' + bpm + (name ? ')' : ''), x + 3 + this.xShift, y + this.yShift);
    }

    ctx.restore();
    return this;
  }
}
