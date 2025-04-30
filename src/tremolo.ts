// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author Mike Corrigan <corrigan@gmail.com>
// MIT License

import { Glyphs } from './glyphs';
import { Metrics } from './metrics';
import { Modifier } from './modifier';
import { Stem } from './stem';
import { Category } from './typeguard';

/** Tremolo implements tremolo notation. */
export class Tremolo extends Modifier {
  static override get CATEGORY(): string {
    return Category.Tremolo;
  }

  protected readonly num: number;

  /**
   * @param num number of bars
   */
  constructor(num: number) {
    super();

    this.num = num;
    this.position = Modifier.Position.CENTER;
    this.text = Glyphs.tremolo1;
  }

  /** Draw the tremolo on the rendering context. */
  override draw(): void {
    const ctx = this.checkContext();
    const note = this.checkAttachedNote();
    this.setRendered();

    const stemDirection = note.getStemDirection();
    const scale = note.getFontScale();
    const ySpacing = Metrics.get(`Tremolo.spacing`) * stemDirection * scale;

    const x =
      note.getAbsoluteX() + (stemDirection === Stem.UP ? note.getGlyphWidth() - Stem.WIDTH / 2 : Stem.WIDTH / 2);
    let y = note.getStemExtents().topY + (this.num <= 3 ? ySpacing : 0);

    this.fontInfo.size = Metrics.get(`Tremolo.fontSize`) * scale;

    for (let i = 0; i < this.num; ++i) {
      this.renderText(ctx, x, y);
      y += ySpacing;
    }
  }
}
