// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author: Taehoon Moon 2014

import { ModifierContext } from './modifiercontext';
import { Note } from './note';
import { TimeSignature } from './timesignature';
import { Category } from './typeguard';

export class TimeSigNote extends Note {
  static override get CATEGORY(): string {
    return Category.TimeSigNote;
  }

  protected timeSig: TimeSignature;

  constructor(timeSpec: string, customPadding?: number) {
    super({ duration: 'b' });

    this.timeSig = new TimeSignature(timeSpec, customPadding);
    this.setWidth(this.timeSig.getWidth());

    // Note properties
    this.ignoreTicks = true;
  }

  /* Overridden to ignore */
  // eslint-disable-next-line
  override addToModifierContext(mc: ModifierContext): this {
    // DO NOTHING.
    return this;
  }

  override preFormat(): this {
    this.preFormatted = true;
    return this;
  }

  override draw(): void {
    const stave = this.checkStave();
    const ctx = this.checkContext();
    this.setRendered();

    const clsAttribute = this.getAttribute('class');
    ctx.openGroup('timesignote' + (clsAttribute ? ' ' + clsAttribute : ''), this.getAttribute('id'));
    this.timeSig.drawAt(ctx, stave, this.getAbsoluteX());
    this.drawPointerRect();
    ctx.closeGroup();
  }
}
