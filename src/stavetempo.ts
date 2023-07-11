// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author: Radosaw Eichler 2012

import { Glyph } from './glyph';
import { Stave } from './stave';
import { StaveModifier, StaveModifierPosition } from './stavemodifier';
import { Tables } from './tables';
import { TextFormatter } from './textformatter';
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
  protected shiftX: number;
  protected shiftY: number;
  /** Font size for note. */
  public renderOptions = { glyphFontScale: 30 };

  constructor(tempo: StaveTempoOptions, x: number, shiftY: number) {
    super();

    this.tempo = tempo;
    this.position = StaveModifierPosition.ABOVE;
    this.x = x;
    this.shiftX = 10;
    this.shiftY = shiftY;
  }

  setTempo(tempo: StaveTempoOptions): this {
    this.tempo = tempo;
    return this;
  }

  setShiftX(x: number): this {
    this.shiftX = x;
    return this;
  }

  setShiftY(y: number): this {
    this.shiftY = y;
    return this;
  }

  draw(stave: Stave, shiftX: number): this {
    const ctx = stave.checkContext();
    this.setRendered();

    const options = this.renderOptions;
    const scale = options.glyphFontScale / Tables.NOTATION_FONT_SCALE;
    const name = this.tempo.name;
    const duration = this.tempo.duration;
    const dots = this.tempo.dots || 0;
    const bpm = this.tempo.bpm;
    let x = this.x + this.shiftX + shiftX;
    const y = stave.getYForTopText(1) + this.shiftY;

    ctx.save();
    const textFormatter = TextFormatter.create(this.textFont);

    if (name) {
      ctx.setFont(this.textFont);
      ctx.fillText(name, x, y);
      x += textFormatter.getWidthForTextInPx(name);
    }

    if (duration && bpm) {
      // Override the weight and style.
      const noteTextFont = { ...this.textFont, weight: 'normal', style: 'normal' };
      ctx.setFont(noteTextFont);
      const noteTextFormatter = TextFormatter.create(noteTextFont);

      if (name) {
        x += noteTextFormatter.getWidthForTextInPx('|');
        ctx.fillText('(', x, y);
        x += noteTextFormatter.getWidthForTextInPx('(');
      }

      const glyphProps = Tables.getGlyphProps(duration);

      x += 3 * scale;
      Glyph.renderGlyph(ctx, x, y, options.glyphFontScale, glyphProps.codeHead);
      x += Glyph.getWidth(glyphProps.codeHead, options.glyphFontScale);

      // Draw stem and flags
      if (glyphProps.stem) {
        let stemHeight = 30;

        if (glyphProps.beamCount) stemHeight += 3 * (glyphProps.beamCount - 1);

        stemHeight *= scale;

        const yTop = y - stemHeight;
        ctx.fillRect(x - scale, yTop, scale, stemHeight);

        if (glyphProps.code && glyphProps.codeFlagUpstem) {
          const flagMetrics = Glyph.renderGlyph(ctx, x, yTop, options.glyphFontScale, glyphProps.codeFlagUpstem, {
            category: 'flag.staveTempo',
          });
          x += (flagMetrics.width * Tables.NOTATION_FONT_SCALE) / flagMetrics.font.getData().resolution;
        }
      }

      // Draw dot
      for (let i = 0; i < dots; i++) {
        x += 6 * scale;
        ctx.beginPath();
        ctx.arc(x, y + 2 * scale, 2 * scale, 0, Math.PI * 2, false);
        ctx.fill();
      }
      ctx.fillText(' = ' + bpm + (name ? ')' : ''), x + 3 * scale, y);
    }

    ctx.restore();
    return this;
  }
}
