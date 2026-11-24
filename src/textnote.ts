// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
// Timed text and optional music glyphs, including smaller text scripts.

import { BoundingBox } from './boundingbox';
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
  static override get CATEGORY(): string {
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
  private directionAnchor?: 'beat' | 'start' | 'end';

  private edgeOffset = 0;
  private beatInsets = { left: 0, right: 0 };

  /** Lay out one line of directions in voice order, leaving beat labels in the available interval. */
  static formatDirections(notes: TextNote[], gap: number): number {
    const starts = notes.filter((note) => note.directionAnchor === 'start');
    const ends = notes.filter((note) => note.directionAnchor === 'end');
    const beats = notes.filter((note) => note.directionAnchor === 'beat');
    function group(signs: TextNote[], sign: number): number {
      let offset = 0;
      for (const note of signs) {
        note.edgeOffset = sign * offset;
        offset += note.getTextInk(0, 0).w + gap;
      }
      return offset;
    }
    const left = group(starts, 1);
    const right = group(ends.reverse(), -1);
    for (const beat of beats) beat.beatInsets = { left, right };
    if (!left && !right) return 0;
    const beatWidth = Math.max(0, ...beats.map((note) => note.getTextInk(0, 0).w));
    return left + right + beatWidth - (beats.length ? 0 : gap);
  }

  /** A selectable direction retains its rhythm even when its text is aligned with a bar edge. */
  setDirectionAnchor(anchor: 'beat' | 'start' | 'end'): this {
    this.directionAnchor = anchor;
    return this;
  }

  getDirectionAnchor(): 'beat' | 'start' | 'end' | undefined {
    return this.directionAnchor;
  }

  /** Both drawing and pointer selection use the same justified origin. */
  private textOrigin(): { x: number; y: number } {
    const stave = this.checkStave();
    let x = this.getAbsoluteX() + this.checkTickContext().getMetrics().glyphPx / 2;
    const advance = this.directionAnchor ? this.getTextMetrics().width : this.getWidth();
    if (this.justification === TextJustification.CENTER) x -= advance / 2;
    if (this.justification === TextJustification.RIGHT) x -= advance;
    if (this.directionAnchor === 'start' || this.directionAnchor === 'end') {
      const ink = this.getTextInk(0, 0);
      x = this.directionAnchor === 'start' ? stave.getNoteStartX() - ink.x : stave.getNoteEndX() - ink.x - ink.w;
      x += this.edgeOffset;
    } else if (this.directionAnchor === 'beat' && (this.beatInsets.left || this.beatInsets.right)) {
      const ink = this.getTextInk(0, 0);
      x = Math.max(
        stave.getNoteStartX() + this.beatInsets.left - ink.x,
        Math.min(x, stave.getNoteEndX() - this.beatInsets.right - ink.w - ink.x)
      );
    }
    return { x, y: stave.getYForLine(this.line - 3) };
  }

  override getBoundingBox(): BoundingBox {
    if (!this.directionAnchor) return super.getBoundingBox();
    const { x, y } = this.textOrigin();
    return this.getTextInk(x, y);
  }

  constructor(noteStruct: TextNoteStruct) {
    super(noteStruct);

    this.text = noteStruct.text ?? '';
    if (noteStruct.glyph) {
      this.text += TextNote.GLYPHS[noteStruct.glyph] || noteStruct.glyph;
    }
    if (noteStruct.font) {
      this.setFont(noteStruct.font);
    } else if (noteStruct.glyph === undefined) {
      this.setFont(Metrics.getFontInfo('TextNote.text'));
    }

    // Scale the font size by 1/1.3.
    const smallerFontSize = Font.convertSizeToPointValue(this.fontInfo.size) * 0.769231;
    if (noteStruct.superscript) {
      this.superscript = new Element('TextNote.text');
      this.superscript.setText(noteStruct.superscript);
      this.superscript.setFontSize(smallerFontSize);
    }
    if (noteStruct.subscript) {
      this.subscript = new Element('TextNote.text');
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
  override preFormat(): void {
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
  override draw(): void {
    const ctx = this.checkContext();
    this.setRendered();
    const { x, y } = this.textOrigin();
    if (this.directionAnchor) {
      const id = this.getAttribute('id');
      ctx.openGroup('timed-direction', id)?.setAttribute('data-direction-id', id);
    }
    this.renderText(ctx, x, y);

    if (this.directionAnchor) {
      const ink = this.getBoundingBox();
      ctx.pointerRect(ink.x, ink.y, ink.w, ink.h);
      ctx.closeGroup();
    }
    const height = this.getHeight();

    if (this.superscript) {
      this.superscript.renderText(ctx, x + this.width + 2, y - height / 2.2);
    }

    if (this.subscript) {
      this.subscript.renderText(ctx, x + this.width + 2, y + height / 2.2 - 1);
    }
  }
}
