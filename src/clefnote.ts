// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author: Taehoon Moon 2014
// MIT License

import { Clef, ClefAnnotatiomType, ClefType } from './clef';
import { Glyph } from './glyph';
import { Note } from './note';
import { Category } from './typeguard';

/** ClefNote implements clef annotations in measures. */
export class ClefNote extends Note {
  static get CATEGORY(): string {
    return Category.ClefNote;
  }

  glyphCategory(): string {
    const s = this.size;
    if (!s) {
      return 'clefNote';
    } else {
      // Capitalize first letter of this.size.
      return 'clefNote' + s.charAt(0).toUpperCase() + s.slice(1);
    }
  }

  protected clef: ClefType;
  protected annotation?: ClefAnnotatiomType;
  protected type: string;
  protected size: string;

  constructor(type: string, size?: string, annotation?: string) {
    super({ duration: 'b' });
    this.type = type;
    const clef = new Clef(type, size, annotation);
    this.clef = clef.clef;
    this.annotation = clef.annotation;
    this.size = size === undefined ? 'default' : size;
    this.setWidth(Glyph.getWidth(this.clef.code, Clef.getPoint(this.size), this.glyphCategory()));

    // Note properties
    this.ignoreTicks = true;
  }

  /** Set clef type, size and annotation. */
  setType(type: string, size: string, annotation: string): this {
    this.type = type;
    this.size = size;
    const clef = new Clef(type, size, annotation);
    this.clef = clef.clef;
    this.annotation = clef.annotation;
    this.setWidth(Glyph.getWidth(this.clef.code, Clef.getPoint(this.size), this.glyphCategory()));
    return this;
  }

  /** Get associated clef. */
  getClef(): ClefType {
    return this.clef;
  }

  preFormat(): this {
    this.preFormatted = true;
    return this;
  }

  /** Render clef note. */
  draw(): void {
    const stave = this.checkStave();
    const ctx = this.checkContext();

    this.setRendered();
    const absoluteX = this.getAbsoluteX();

    Glyph.renderGlyph(ctx, absoluteX, stave.getYForLine(this.clef.line), Clef.getPoint(this.size), this.clef.code, {
      category: this.glyphCategory(),
    });

    // If the Vex.Flow.Clef has an annotation, such as 8va, draw it.
    if (this.annotation !== undefined) {
      const attachment = new Glyph(this.annotation.code, this.annotation.point);
      attachment.setContext(ctx);
      attachment.setStave(stave);
      attachment.setYShift(stave.getYForLine(this.annotation.line) - stave.getYForGlyphs());
      attachment.setXShift(this.annotation.xShift);
      attachment.renderToStave(absoluteX);
    }
  }
}
