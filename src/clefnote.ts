// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author: Taehoon Moon 2014
// MIT License

import { Clef } from './clef';
import { Note } from './note';
import { Category } from './typeguard';

/** ClefNote implements clef annotations in measures. */
export class ClefNote extends Note {
  static get CATEGORY(): string {
    return Category.ClefNote;
  }

  protected clef!: Clef;

  constructor(type: string, size: string = 'default', annotation?: string) {
    super({ duration: 'b' });
    this.setType(type, size, annotation);
    this.ignoreTicks = true;
  }

  /** Set clef type, size and annotation. */
  setType(type: string, size: string, annotation?: string): this {
    this.clef = new Clef(type, size, annotation);
    this.setWidth(this.clef.getWidth());

    return this;
  }

  /** Get associated clef. */
  getClef(): Clef {
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

    this.clef.renderText(ctx, this.getAbsoluteX(), stave.getYForLine(this.clef.line));
  }
}
