// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License

import { Glyph } from './glyph';
import { Note } from './note';
import { Tables } from './tables';
import { TextNoteStruct } from './textnote';
import { Category } from './typeguard';
import { defined, log, RuntimeError } from './util';

// eslint-disable-next-line
function L(...args: any[]) {
  if (TextDynamics.DEBUG) log('Vex.Flow.TextDynamics', args);
}

/**
 * `TextDynamics` renders traditional
 * text dynamics markings, **ie: p, f, sfz, rfz, ppp**
 *
 * You can render any dynamics string that contains a combination of
 * the following letters:  P, M, F, Z, R, S
 */
export class TextDynamics extends Note {
  /** To enable logging for this class. Set `Vex.Flow.TextDynamics.DEBUG` to `true`. */
  static DEBUG: boolean = false;

  static get CATEGORY(): string {
    return Category.TextDynamics;
  }

  protected sequence: string;

  protected line: number;
  protected glyphs: Glyph[];

  /** The glyph data for each dynamics letter. */
  static get GLYPHS(): Record<string, { code: string; width: number }> {
    return {
      f: {
        code: 'dynamicForte',
        width: 12,
      },
      p: {
        code: 'dynamicPiano',
        width: 14,
      },
      m: {
        code: 'dynamicMezzo',
        width: 17,
      },
      s: {
        code: 'dynamicSforzando',
        width: 10,
      },
      z: {
        code: 'dynamicZ',
        width: 12,
      },
      r: {
        code: 'dynamicRinforzando',
        width: 12,
      },
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

    this.sequence = (noteStruct.text || '').toLowerCase();
    this.line = noteStruct.line || 0;
    this.glyphs = [];

    this.renderOptions = { ...this.renderOptions, glyphFontSize: Tables.NOTATION_FONT_SCALE };

    L('New Dynamics Text: ', this.sequence);
  }

  /** Set the Stave line on which the note should be placed. */
  setLine(line: number): this {
    this.line = line;
    return this;
  }

  /** Preformat the dynamics text. */
  preFormat(): this {
    let totalWidth = 0;
    // length of this.glyphs must be <=
    // length of this.sequence, so if we're formatted before
    // create new glyphs.
    this.glyphs = [];
    // Iterate through each letter
    this.sequence.split('').forEach((letter) => {
      // Get the glyph data for the letter
      const glyphData = TextDynamics.GLYPHS[letter];
      if (!glyphData) throw new RuntimeError('Invalid dynamics character: ' + letter);

      const size = defined(this.renderOptions.glyphFontSize);
      const glyph = new Glyph(glyphData.code, size, { category: 'textNote' });

      // Add the glyph
      this.glyphs.push(glyph);

      totalWidth += glyphData.width;
    });

    // Store the width of the text
    this.setWidth(totalWidth);
    this.preFormatted = true;
    return this;
  }

  /** Draw the dynamics text on the rendering context. */
  draw(): void {
    this.setRendered();
    const x = this.getAbsoluteX();
    const y = this.checkStave().getYForLine(this.line + -3);

    L('Rendering Dynamics: ', this.sequence);

    let letterX = x;
    this.glyphs.forEach((glyph, index) => {
      const currentLetter = this.sequence[index];
      glyph.render(this.checkContext(), letterX, y);
      letterX += TextDynamics.GLYPHS[currentLetter].width;
    });
  }
}
