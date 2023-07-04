// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author Larry Kuhns
//
// This file implements the `Stroke` class which renders chord strokes
// that can be arpeggiated, brushed, rasquedo, etc.

import { Font, FontInfo, FontStyle, FontWeight } from './font';
import { Glyph } from './glyph';
import { Modifier } from './modifier';
import { ModifierContextState } from './modifiercontext';
import { Note } from './note';
import { Tables } from './tables';
import { Category, isNote, isStaveNote, isTabNote } from './typeguard';
import { RuntimeError } from './util';

export class Stroke extends Modifier {
  static get CATEGORY(): string {
    return Category.Stroke;
  }

  static readonly Type = {
    BRUSH_DOWN: 1,
    BRUSH_UP: 2,
    ROLL_DOWN: 3, // Arpeggiated chord
    ROLL_UP: 4, // Arpeggiated chord
    RASQUEDO_DOWN: 5,
    RASQUEDO_UP: 6,
    ARPEGGIO_DIRECTIONLESS: 7, // Arpeggiated chord without upwards or downwards arrow
  };

  static TEXT_FONT: Required<FontInfo> = {
    family: Font.SERIF,
    size: Font.SIZE,
    weight: FontWeight.BOLD,
    style: FontStyle.ITALIC,
  };

  // Arrange strokes inside `ModifierContext`
  static format(strokes: Stroke[], state: ModifierContextState): boolean {
    const leftShift = state.leftShift;
    const strokeSpacing = 0;

    if (!strokes || strokes.length === 0) return false;

    const strokeList = strokes.map((stroke) => {
      const note = stroke.getNote();
      const index = stroke.checkIndex();
      if (isStaveNote(note)) {
        // Only StaveNote objects have getKeyProps().
        const { line } = note.getKeyProps()[index];
        const shift = note.getLeftDisplacedHeadPx();
        return { line, shift, stroke };
      } else if (isTabNote(note)) {
        // Only TabNote objects have getPositions().
        const { str: string } = note.getPositions()[index];
        return { line: string, shift: 0, stroke };
      } else {
        throw new RuntimeError('Internal', 'Unexpected instance.');
      }
    });

    const strokeShift = leftShift;

    // There can only be one stroke .. if more than one, they overlay each other
    const xShift = strokeList.reduce((xShift, { stroke, shift }) => {
      stroke.setXShift(strokeShift + shift);
      return Math.max(stroke.getWidth() + strokeSpacing, xShift);
    }, 0);

    state.leftShift += xShift;

    return true;
  }

  protected options: { allVoices: boolean };
  protected allVoices: boolean;
  protected type: number;
  protected noteEnd?: Note;
  public renderOptions: {
    fontScale: number;
  };

  constructor(type: number, options?: { allVoices: boolean }) {
    super();

    this.options = { allVoices: true, ...options };

    // multi voice - span stroke across all voices if true
    this.allVoices = this.options.allVoices;

    // multi voice - end note of stroke, set in draw()
    this.type = type;
    this.position = Modifier.Position.LEFT;

    this.renderOptions = {
      fontScale: Tables.NOTATION_FONT_SCALE,
    };

    this.resetFont();

    this.setXShift(0);
    this.setWidth(10);
  }

  getPosition(): number {
    return this.position;
  }

  addEndNote(note: Note): this {
    this.noteEnd = note;
    return this;
  }

  draw(): void {
    const ctx = this.checkContext();
    const note = this.checkAttachedNote();
    this.setRendered();

    const start = note.getModifierStartXY(this.position, this.index);
    let yPositions = note.getYs();
    let topY = start.y;
    let botY = start.y;
    const x = start.x - 5;
    const lineSpace = note.checkStave().getSpacingBetweenLines();

    const notes = this.checkModifierContext().getMembers(note.getCategory());
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      if (isNote(note)) {
        // Only Note objects have getYs().
        // note is an instance of either StaveNote or TabNote.
        yPositions = note.getYs();
        for (let n = 0; n < yPositions.length; n++) {
          if (this.note === notes[i] || this.allVoices) {
            topY = Math.min(topY, yPositions[n]);
            botY = Math.max(botY, yPositions[n]);
          }
        }
      }
    }

    let arrow = '';
    let arrowShiftX = 0;
    let arrowY = 0;
    let textShiftX = 0;
    let textY = 0;

    switch (this.type) {
      case Stroke.Type.BRUSH_DOWN:
        arrow = 'arrowheadBlackUp';
        arrowShiftX = -3;
        arrowY = topY - lineSpace / 2 + 10;
        botY += lineSpace / 2;
        break;
      case Stroke.Type.BRUSH_UP:
        arrow = 'arrowheadBlackDown';
        arrowShiftX = 0.5;
        arrowY = botY + lineSpace / 2;
        topY -= lineSpace / 2;
        break;
      case Stroke.Type.ROLL_DOWN:
      case Stroke.Type.RASQUEDO_DOWN:
        arrow = 'arrowheadBlackUp';
        arrowShiftX = -3;
        textShiftX = this.xShift + arrowShiftX - 2;
        if (isStaveNote(note)) {
          topY += 1.5 * lineSpace;
          if ((botY - topY) % 2 !== 0) {
            botY += 0.5 * lineSpace;
          } else {
            botY += lineSpace;
          }
          arrowY = topY - lineSpace;
          textY = botY + lineSpace + 2;
        } else {
          topY += 1.5 * lineSpace;
          botY += lineSpace;
          arrowY = topY - 0.75 * lineSpace;
          textY = botY + 0.25 * lineSpace;
        }
        break;
      case Stroke.Type.ROLL_UP:
      case Stroke.Type.RASQUEDO_UP:
        arrow = 'arrowheadBlackDown';
        arrowShiftX = -4;
        textShiftX = this.xShift + arrowShiftX - 1;
        if (isStaveNote(note)) {
          arrowY = lineSpace / 2;
          topY += 0.5 * lineSpace;
          if ((botY - topY) % 2 === 0) {
            botY += lineSpace / 2;
          }
          arrowY = botY + 0.5 * lineSpace;
          textY = topY - 1.25 * lineSpace;
        } else {
          topY += 0.25 * lineSpace;
          botY += 0.5 * lineSpace;
          arrowY = botY + 0.25 * lineSpace;
          textY = topY - lineSpace;
        }
        break;
      case Stroke.Type.ARPEGGIO_DIRECTIONLESS:
        topY += 0.5 * lineSpace;
        botY += lineSpace; // * 0.5 can lead to slight underlap instead of overlap sometimes
        break;
      default:
        throw new RuntimeError('InvalidType', `The stroke type ${this.type} does not exist`);
    }

    // The first letter is capitalized.
    // We later prepend 'stroke' to create a camelCased glyph category: 'strokeStraight' or 'strokeWiggly'.
    // See: common_metrics.ts
    let type = 'Straight';

    // Draw the stroke
    if (this.type === Stroke.Type.BRUSH_DOWN || this.type === Stroke.Type.BRUSH_UP) {
      ctx.fillRect(x + this.xShift, topY, 1, botY - topY);
    } else {
      type = 'Wiggly';
      if (isStaveNote(note)) {
        for (let i = topY; i <= botY; i += lineSpace) {
          Glyph.renderGlyph(ctx, x + this.xShift - 4, i, this.renderOptions.fontScale, 'vexWiggleArpeggioUp');
        }
      } else {
        let i;
        for (i = topY; i <= botY; i += 10) {
          Glyph.renderGlyph(ctx, x + this.xShift - 4, i, this.renderOptions.fontScale, 'vexWiggleArpeggioUp');
        }
        if (this.type === Stroke.Type.RASQUEDO_DOWN) {
          textY = i + 0.25 * lineSpace;
        }
      }
    }

    if (this.type === Stroke.Type.ARPEGGIO_DIRECTIONLESS) {
      return; // skip drawing arrow heads or text
    }

    // Draw the arrow head
    Glyph.renderGlyph(ctx, x + this.xShift + arrowShiftX, arrowY, this.renderOptions.fontScale, arrow, {
      category: `stroke${type}.${arrow}`,
    });

    // Draw the rasquedo "R"
    if (this.type === Stroke.Type.RASQUEDO_DOWN || this.type === Stroke.Type.RASQUEDO_UP) {
      ctx.save();
      ctx.setFont(this.textFont);
      ctx.fillText('R', x + textShiftX, textY);
      ctx.restore();
    }
  }
}
