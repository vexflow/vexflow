// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License

import { Element } from './element';
import { Font, FontInfo } from './font';
import { Glyphs } from './glyphs';
import { Metrics } from './metrics';
import { Note, NoteStruct } from './note';
import { Category } from './typeguard';

export enum TextJustification {
  LEFT = 1,
  CENTER = 2,
  RIGHT = 3,
}

export interface TextNoteStruct extends NoteStruct {
  text?: string;
  glyph?: string;
  ignoreTicks?: boolean;
  smooth?: boolean;
  font?: FontInfo;
  subscript?: string;
  superscript?: string;
}

/**
 * `TextNote` is a notation element that is positioned in time. Generally
 * meant for objects that sit above/below the staff and inline with each other.
 * `TextNote` has to be assigned to a `Stave` before rendering by means of `setStave`.
 * Examples of this would be such as dynamics, lyrics, chord changes, etc.
 */
export class TextNote extends Note {
  static get CATEGORY(): string {
    return Category.TextNote;
  }

  static readonly Justification = TextJustification;

  /** Glyph data. */
  static get GLYPHS(): Record<string, string> {
    return {
      segno: Glyphs.segno,
      tr: Glyphs.ornamentTrill,
      mordent: Glyphs.ornamentMordent,
      mordentUpper: Glyphs.ornamentShortTrill,
      mordentLower: Glyphs.ornamentMordent,
      f: Glyphs.dynamicForte,
      p: Glyphs.dynamicPiano,
      m: Glyphs.dynamicMezzo,
      s: Glyphs.dynamicSforzando,
      z: Glyphs.dynamicZ,
      coda: Glyphs.coda,
      pedalOpen: Glyphs.keyboardPedalPed,
      pedalClose: Glyphs.keyboardPedalUp,
      caesuraStraight: Glyphs.caesura,
      caesuraCurved: Glyphs.caesuraCurved,
      breath: Glyphs.breathMarkComma,
      tick: Glyphs.breathMarkTick,
      turn: Glyphs.ornamentTurn,
      turnInverted: Glyphs.ornamentTurnSlash,
    };
  }

  protected superscript?: Element;
  protected subscript?: Element;
  protected smooth: boolean;
  protected justification: TextJustification;
  protected line: number;

  constructor(noteStruct: TextNoteStruct) {
    super(noteStruct);

    this.text = noteStruct.text ?? '';
    if (noteStruct.glyph) {
      this.text += TextNote.GLYPHS[noteStruct.glyph] || noteStruct.glyph;
    }
    if (noteStruct.font) {
      this.setFont(noteStruct.font);
    } else if (noteStruct.glyph === undefined) {
      this.setFont(Metrics.getFontInfo('TextNote.text.fontSize'));
    }

    // Scale the font size by 1/1.3.
    const smallerFontSize = Font.convertSizeToPointValue(this.fontInfo.size) * 0.769231;
    if (noteStruct.superscript) {
      this.superscript = new Element('TexNote.subSuper');
      this.superscript.setText(noteStruct.superscript);
      this.superscript.setFontSize(smallerFontSize);
    }
    if (noteStruct.subscript) {
      this.subscript = new Element('TexNote.subSuper');
      this.subscript.setText(noteStruct.subscript);
      this.subscript.setFontSize(smallerFontSize);
    }

    this.line = noteStruct.line ?? 0;
    this.smooth = noteStruct.smooth || false;
    this.ignoreTicks = noteStruct.ignoreTicks || false;
    this.justification = TextJustification.LEFT;
  }

  /** Set the horizontal justification of the TextNote. */
  setJustification(just: TextJustification): this {
    this.justification = just;
    return this;
  }

  /** Set the Stave line on which the note should be placed. */
  setLine(line: number): this {
    this.line = line;
    return this;
  }

  /** Return the Stave line on which the TextNote is placed. */
  getLine(): number {
    return this.line;
  }

  /** Pre-render formatting. */
  preFormat(): void {
    if (this.preFormatted) return;
    const tickContext = this.checkTickContext(`Can't preformat without a TickContext.`);

    if (this.justification === TextJustification.CENTER) {
      this.leftDisplacedHeadPx = this.width / 2;
    } else if (this.justification === TextJustification.RIGHT) {
      this.leftDisplacedHeadPx = this.width;
    }

    // We reposition to the center of the note head
    this.rightDisplacedHeadPx = tickContext.getMetrics().glyphPx / 2;
    this.preFormatted = true;
  }

  /**
   * Renders the TextNote.
   * `TextNote` has to be assigned to a `Stave` before rendering by means of `setStave`.
   */
  draw(): void {
    const ctx = this.checkContext();
    const stave = this.checkStave();
    const tickContext = this.checkTickContext(`Can't draw without a TickContext.`);

    this.setRendered();

    // Reposition to center of note head
    let x = this.getAbsoluteX() + tickContext.getMetrics().glyphPx / 2;

    // Align based on tick-context width.
    const width = this.getWidth();

    if (this.justification === TextJustification.CENTER) {
      x -= width / 2;
    } else if (this.justification === TextJustification.RIGHT) {
      x -= width;
    }

    const y = stave.getYForLine(this.line + -3);
    this.applyStyle(ctx);
    this.renderText(ctx, x, y);

    const height = this.getHeight();

    if (this.superscript) {
      this.superscript.renderText(ctx, x + this.width + 2, y - height / 2.2);
    }

    if (this.subscript) {
      this.subscript.renderText(ctx, x + this.width + 2, y + height / 2.2 - 1);
    }

    this.restoreStyle(ctx);
  }
}
