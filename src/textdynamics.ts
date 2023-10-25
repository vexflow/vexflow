// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License

import { Glyphs } from './glyphs';
import { Note } from './note';
import { TextNoteStruct } from './textnote';
import { Category } from './typeguard';
import { log, RuntimeError } from './util';

// eslint-disable-next-line
function L(...args: any[]) {
  if (TextDynamics.DEBUG) log('VexFlow.TextDynamics', args);
}

/**
 * `TextDynamics` renders traditional
 * text dynamics markings, **ie: p, f, sfz, rfz, ppp**
 *
 * You can render any dynamics string that contains a combination of
 * the following letters:  P, M, F, Z, R, S
 */
export class TextDynamics extends Note {
  /** To enable logging for this class. Set `VexFlow.TextDynamics.DEBUG` to `true`. */
  static DEBUG: boolean = false;

  static get CATEGORY(): string {
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
   * @param noteStruct an object that contains a `duration` property and a
   * `sequence` of letters that represents the letters to render.
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
  preFormat(): this {
    // length of this.glyphs must be <=
    // length of this.sequence, so if we're formatted before
    // create new glyphs.
    this.text = '';
    // Iterate through each letter
    this.sequence.split('').forEach((letter) => {
      // Get the glyph data for the letter
      const glyph = TextDynamics.GLYPHS[letter];
      if (!glyph) throw new RuntimeError('Invalid dynamics character: ' + letter);

      // Add the glyph
      this.text += glyph;
    });

    this.preFormatted = true;
    return this;
  }

  /** Draw the dynamics text on the rendering context. */
  draw(): void {
    this.setRendered();
    const x = this.getAbsoluteX();
    const y = this.checkStave().getYForLine(this.line + -3);

    L('Rendering Dynamics: ', this.sequence);

    this.renderText(this.checkContext(), x, y);
  }
}
