// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors

// Tablature stave geometry and the default six-string layout.

import { Stave, StaveOptions } from './stave';
import { Category } from './typeguard';

export class TabStave extends Stave {
  static override get CATEGORY(): string {
    return Category.TabStave;
  }

  constructor(x: number, y: number, width: number, options?: StaveOptions) {
    const tabOptions = {
      spacingBetweenLinesPx: 13,
      numLines: 6,
      topTextPosition: 1,
      ...options,
    };

    super(x, y, width, tabOptions);
  }

  /** The glyph anchor is halfway between the outer strings. */
  override getYForGlyphs(): number {
    return this.getYForLine((this.getNumLines() - 1) / 2);
  }

  // Deprecated
  addTabGlyph(): this {
    this.addClef('tab');
    return this;
  }
}
