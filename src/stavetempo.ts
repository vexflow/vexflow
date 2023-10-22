// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author: Radosaw Eichler 2012

import { Element } from './element';
import { Glyphs } from './glyphs';
import { Metrics } from './metrics';
import { Stave } from './stave';
import { StaveModifier, StaveModifierPosition } from './stavemodifier';
import { Tables } from './tables';
import { Category } from './typeguard';

export interface StaveTempoOptions {
  name?: string;
  parenthesis?: boolean;
  duration?: string;
  dots?: number;
  bpm?: number;
  duration2?: string;
  dots2?: number;
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
    '1/4': Glyphs.metNoteDoubleWholeSquare,
    long: Glyphs.metNoteDoubleWholeSquare,
    '1/2': Glyphs.metNoteDoubleWhole,
    breve: Glyphs.metNoteDoubleWhole,
    1: Glyphs.metNoteWhole,
    whole: Glyphs.metNoteWhole,
    w: Glyphs.metNoteWhole,
    2: Glyphs.metNoteHalfUp,
    half: Glyphs.metNoteHalfUp,
    h: Glyphs.metNoteHalfUp,
    4: Glyphs.metNoteQuarterUp,
    quarter: Glyphs.metNoteQuarterUp,
    q: Glyphs.metNoteQuarterUp,
    8: Glyphs.metNote8thUp,
    eighth: Glyphs.metNote8thUp,
    16: Glyphs.metNote16thUp,
    '16th': Glyphs.metNote16thUp,
    32: Glyphs.metNote32ndUp,
    '32nd': Glyphs.metNote32ndUp,
    64: Glyphs.metNote64thUp,
    '64th': Glyphs.metNote64thUp,
    128: Glyphs.metNote128thUp,
    '128th': Glyphs.metNote128thUp,
    256: Glyphs.metNote256thUp,
    '256th': Glyphs.metNote256thUp,
    512: Glyphs.metNote512thUp,
    '512th': Glyphs.metNote512thUp,
    1024: Glyphs.metNote1024thUp,
    '1024th': Glyphs.metNote1024thUp,
  };

  setTempo(tempo: StaveTempoOptions): this {
    this.tempo = tempo;
    return this;
  }

  draw(stave: Stave, shiftX: number): this {
    const ctx = stave.checkContext();
    this.setRendered();

    const { name, duration, dots, bpm, duration2, dots2, parenthesis } = this.tempo;
    let x = this.x + shiftX;
    const y = stave.getYForTopText(1);
    const el = new Element('StaveTempo.glyph');
    const elText = new Element('StaveTempo');

    if (name) {
      this.text = name;
      this.fontInfo = Metrics.getFontInfo('StaveTempo.name');
      this.renderText(ctx, shiftX, y);
      x += this.getWidth() + 3;
    }

    if ((name && duration) || parenthesis) {
      elText.setText('(');
      elText.renderText(ctx, x + this.xShift, y + this.yShift);
      x += elText.getWidth() + 3;
    }

    if (duration) {
      el.setText(this.#durationToCode[duration]);
      el.renderText(ctx, x + this.xShift, y + this.yShift);
      x += el.getWidth() + 3;
      if (dots) {
        // Draw dot
        el.setText(Glyphs.metAugmentationDot);
        for (let i = 0; i < dots; i++) {
          el.renderText(ctx, x + this.xShift, y + 2 + this.yShift);
          x += el.getWidth() + 3;
        }
      }
      elText.setText('=');
      elText.renderText(ctx, x + this.xShift, y + this.yShift);
      x += elText.getWidth() + 3;
      if (duration2) {
        el.setText(this.#durationToCode[duration2]);
        el.renderText(ctx, x + this.xShift, y + this.yShift);
        x += el.getWidth() + 3;
        if (dots2) {
          // Draw dot
          el.setText(Glyphs.metAugmentationDot);
          for (let i = 0; i < dots2; i++) {
            el.renderText(ctx, x + this.xShift, y + 2 + this.yShift);
            x += el.getWidth() + 3;
          }
        }
      } else if (bpm) {
        elText.setText('' + bpm);
        elText.renderText(ctx, x + this.xShift, y + this.yShift);
        x += elText.getWidth() + 3;
      }
      if (name || parenthesis) {
        elText.setText(')');
        elText.renderText(ctx, x + this.xShift, y + this.yShift);
      }
    }

    return this;
  }
}
