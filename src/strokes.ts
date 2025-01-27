// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author Larry Kuhns
//
// This file implements the `Stroke` class which renders chord strokes
// that can be arpeggiated, brushed, rasgueado, etc.

import { Element } from './element';
import { Glyphs } from './glyphs';
import { Metrics } from './metrics';
import { Modifier } from './modifier';
import { ModifierContextState } from './modifiercontext';
import { Note } from './note';
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
    RASGUEADO_DOWN: 5,
    RASGUEADO_UP: 6,
    ARPEGGIO_DIRECTIONLESS: 7, // Arpeggiated chord without upwards or downwards arrow
  };

  // Arrange strokes inside `ModifierContext`
  static format(strokes: Stroke[], state: ModifierContextState): boolean {
    const leftShift = state.leftShift;
    const strokeSpacing = 5;

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
      fontScale: Metrics.get('Stroke.fontSize'),
    };

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
    let arrowY = 0;
    let textY = 0;

    switch (this.type) {
      case Stroke.Type.BRUSH_DOWN:
      case Stroke.Type.ROLL_DOWN:
      case Stroke.Type.RASGUEADO_DOWN:
        arrow = Glyphs.arrowheadBlackUp;
        arrowY = topY;
        topY -= lineSpace / 2;
        botY += lineSpace / 2;
        break;
      case Stroke.Type.BRUSH_UP:
      case Stroke.Type.ROLL_UP:
      case Stroke.Type.RASGUEADO_UP:
        arrow = Glyphs.arrowheadBlackDown;
        arrowY = botY + lineSpace;
        topY -= lineSpace / 2;
        break;
      case Stroke.Type.ARPEGGIO_DIRECTIONLESS:
        topY -= lineSpace / 2;
        botY += lineSpace / 2;
        break;
      default:
        throw new RuntimeError('InvalidType', `The stroke type ${this.type} does not exist`);
    }

    // Draw the stroke
    if (this.type === Stroke.Type.BRUSH_DOWN || this.type === Stroke.Type.BRUSH_UP) {
      ctx.fillRect(x + this.xShift, topY, 1, botY - topY);
    } else {
      // Select the wiggle glyph depending on the arrow direction
      const lineGlyph = arrow === Glyphs.arrowheadBlackDown ? Glyphs.wiggleArpeggiatoDown : Glyphs.wiggleArpeggiatoUp;
      let txt = '';
      const el = new Element();
      // add glyphs until the required length is achieved
      while (el.getWidth() < botY - topY) {
        txt += lineGlyph;
        el.setText(txt);
      }
      if (
        this.type === Stroke.Type.RASGUEADO_DOWN ||
        this.type === Stroke.Type.ROLL_DOWN ||
        this.type === Stroke.Type.ARPEGGIO_DIRECTIONLESS
      ) {
        ctx.openRotation(90, x + this.xShift, topY);
        el.renderText(ctx, x + this.xShift, topY - el.getTextMetrics().actualBoundingBoxDescent + el.getHeight() / 2);
        ctx.closeRotation();
        textY = topY + el.getWidth() + 5;
      } else {
        ctx.openRotation(-90, x + this.xShift, botY);
        el.renderText(ctx, x + this.xShift, botY - el.getTextMetrics().actualBoundingBoxDescent + el.getHeight() / 2);
        ctx.closeRotation();
        textY = botY - el.getWidth() - 5;
      }
    }

    // Draw the arrow head
    if (arrowY !== 0) {
      const el = new Element();
      el.setText(arrow);
      el.renderText(
        ctx,
        // Center the arrow head substracting its width / 2
        x + this.xShift - el.getWidth() / 2,
        arrowY
      );
    }

    // Draw the rasgueado "R"
    if (this.type === Stroke.Type.RASGUEADO_DOWN || this.type === Stroke.Type.RASGUEADO_UP) {
      const el = new Element('Stroke.text');
      el.setText('R');
      el.renderText(
        ctx,
        x + this.xShift - el.getWidth() / 2,
        textY + (this.type === Stroke.Type.RASGUEADO_DOWN ? el.getHeight() : 0)
      );
    }
  }
}
