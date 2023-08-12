// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author Mike Corrigan <corrigan@gmail.com>
// MIT License

import { GraceNote } from './gracenote';
import { Modifier } from './modifier';
import { Stem } from './stem';
import { Tables } from './tables';
import { Category, isGraceNote } from './typeguard';

/** Tremolo implements tremolo notation. */
export class Tremolo extends Modifier {
  static get CATEGORY(): string {
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
    this.text = '\uE220' /*tremolo1*/;
    this.measureText();
  }

  /** Draw the tremolo on the rendering context. */
  draw(): void {
    const ctx = this.checkContext();
    const note = this.checkAttachedNote();
    this.setRendered();

    const stemDirection = note.getStemDirection();
    const scale = isGraceNote(note) ? GraceNote.SCALE : 1;
    const ySpacing = Tables.lookupMetric(`Tremolo.spacing`) * stemDirection * scale;

    const x = note.getAbsoluteX() + (stemDirection === Stem.UP ? note.getGlyphWidth() - Stem.WIDTH / 2 : Stem.WIDTH / 2);
    let y = note.getStemExtents().topY + (this.num <= 3 ? ySpacing : 0);

    this.textFont.size = Tables.lookupMetric(`Tremolo.fontSize`) * scale;

    for (let i = 0; i < this.num; ++i) {
      this.renderText(ctx, x, y);
      y += ySpacing;
    }
  }
}
