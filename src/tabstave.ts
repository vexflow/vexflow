// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors

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

  override getYForGlyphs(): number {
    return this.getYForLine(2.5);
  }

  // Deprecated
  addTabGlyph(): this {
    this.addClef('tab');
    return this;
  }
}
