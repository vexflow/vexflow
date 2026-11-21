// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
// Dynamics glyphs with page-relative bounds available before drawing.

import { BoundingBox } from './boundingbox';
import { Glyphs } from './glyphs';
import { Note } from './note';
import { TextNoteStruct } from './textnote';
import { Category } from './typeguard';
import { log, RuntimeError } from './util';

// eslint-disable-next-line
function L(...args: any[]) {
  if (TextDynamics.DEBUG) log('VexFlow.TextDynamics', args);
}

/** A timed music-font dynamic such as p, mf, sfz, or n (niente). */
export class TextDynamics extends Note {
  /** To enable logging for this class. Set `VexFlow.TextDynamics.DEBUG` to `true`. */
  static DEBUG: boolean = false;

  static override get CATEGORY(): string {
    return Category.TextDynamics;
  }

  protected sequence: string;

  protected line: number;

  /** The glyph data for each dynamics letter. */
  static get GLYPHS(): Record<string, string> {
    return {
      f: Glyphs.dynamicForte,
      p: Glyphs.dynamicPiano,
      m: Glyphs.dynamicMezzo,
      n: Glyphs.dynamicNiente,
      s: Glyphs.dynamicSforzando,
      z: Glyphs.dynamicZ,
      r: Glyphs.dynamicRinforzando,
    };
  }

  /**
   * Create the dynamics marking.
   *
   * A `TextDynamics` object inherits from `Note` so that it can be formatted
   * within a `Voice`.
   *
   * @param noteStruct an object that contains a `duration` property and the
   * dynamics letters in `text`.
   */
  constructor(noteStruct: TextNoteStruct) {
    super(noteStruct);

    this.sequence = (noteStruct.text ?? '').toLowerCase();
    this.line = noteStruct.line ?? 0;
    this.text = '';

    L('New Dynamics Text: ', this.sequence);
  }

  /** Set the Stave line on which the note should be placed. */
  setLine(line: number): this {
    this.line = line;
    return this;
  }

  /** Preformat the dynamics text. */
  override preFormat(): this {
    // Resolve the entire sequence before replacing its text, including on repeated formatting.
    const glyphs = TextDynamics.GLYPHS;
    let text = '';
    for (const letter of this.sequence) {
      const glyph = glyphs[letter];
      if (!glyph) throw new RuntimeError('Invalid dynamics character: ' + letter);
      text += glyph;
    }
    this.text = text;
    this.preFormatted = true;
    return this;
  }

  /** Measure at the same page coordinates used by draw(), after voice formatting. */
  override getBoundingBox(): BoundingBox {
    const metrics = this.getTextMetrics();
    return new BoundingBox(
      this.getAbsoluteX() + this.x + this.xShift,
      this.checkStave().getYForLine(this.line - 3) + this.y + this.yShift - metrics.actualBoundingBoxAscent,
      this.getWidth(),
      this.getHeight()
    );
  }

  /** Draw the dynamics text on the rendering context. */
  override draw(): void {
    this.setRendered();
    const x = this.getAbsoluteX();
    const y = this.checkStave().getYForLine(this.line + -3);

    L('Rendering Dynamics: ', this.sequence);

    this.renderText(this.checkContext(), x, y);
  }
}
