// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
//
// Any glyph that is set to appear on a Stave and take up musical time and graphical space.

import { Note, NoteStruct } from './note';
import { Category } from './typeguard';

export interface GlyphNoteOptions {
  ignoreTicks?: boolean;
  line?: number;
}

export class GlyphNote extends Note {
  static get CATEGORY(): string {
    return Category.GlyphNote;
  }

  protected options: Required<GlyphNoteOptions>;

  constructor(glyph: string, noteStruct: NoteStruct, options?: GlyphNoteOptions) {
    super(noteStruct);
    this.options = {
      ignoreTicks: false,
      line: 2,
      ...options,
    };

    // Note properties
    this.ignoreTicks = this.options.ignoreTicks;
    this.setGlyph(glyph);
  }

  setGlyph(glyph: string): this {
    this.text = glyph;
    this.measureText();
    return this;
  }

  preFormat(): this {
    if (!this.preFormatted && this.modifierContext) {
      this.modifierContext.preFormat();
    }
    this.preFormatted = true;
    return this;
  }

  drawModifiers(): void {
    const ctx = this.checkContext();
    for (let i = 0; i < this.modifiers.length; i++) {
      const modifier = this.modifiers[i];
      modifier.setContext(ctx);
      modifier.drawWithStyle();
    }
  }

  draw(): void {
    const stave = this.checkStave();
    const ctx = stave.checkContext();
    this.setRendered();
    this.applyStyle(ctx);
    ctx.openGroup('glyphNote', this.getAttribute('id'));

    const x = this.isCenterAligned() ? this.getAbsoluteX() - this.getWidth() / 2 : this.getAbsoluteX();
    this.renderText(ctx, x, stave.getYForLine(this.options.line));
    this.drawModifiers();
    ctx.closeGroup();
    this.restoreStyle(ctx);
  }
}
