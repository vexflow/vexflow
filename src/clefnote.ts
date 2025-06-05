// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author: Taehoon Moon 2014
// MIT License

import { BoundingBox } from './boundingbox';
import { Clef } from './clef';
import { Note } from './note';
import { Category } from './typeguard';

/** ClefNote implements clef annotations in measures. */
export class ClefNote extends Note {
  static override get CATEGORY(): string {
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

  override preFormat(): this {
    this.preFormatted = true;
    return this;
  }

  /** Render clef note. */
  override draw(): void {
    const stave = this.checkStave();
    const ctx = this.checkContext();

    this.setRendered();
    this.clef.setX(this.getAbsoluteX());
    this.clef.setY(stave.getYForLine(this.clef.line));
    this.clef.renderText(ctx, 0, 0);
  }

  override getBoundingBox(): BoundingBox {
    return this.clef.getBoundingBox();
  }
}
