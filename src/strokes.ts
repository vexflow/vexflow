// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author Larry Kuhns
//
// This file implements the `Stroke` class which renders chord strokes
// that can be arpeggiated, brushed, rasgueado, etc.

import { BoundingBox } from './boundingbox';
import { Element } from './element';
import { Glyphs } from './glyphs';
import { Metrics } from './metrics';
import { Modifier } from './modifier';
import { ModifierContextState } from './modifiercontext';
import { Note } from './note';
import type { RenderContext } from './rendercontext';
import { Category, isNote, isStaveNote, isTabNote } from './typeguard';
import { RuntimeError } from './util';

export class Stroke extends Modifier {
  static override get CATEGORY(): string {
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

    this.type = type;
    this.position = Modifier.Position.LEFT;

    this.renderOptions = {
      fontScale: Metrics.get('Stroke.fontSize'),
    };

    this.setXShift(0);
    this.setWidth(10);
  }

  override getPosition(): number {
    return this.position;
  }

  addEndNote(note: Note): this {
    this.noteEnd = note;
    return this;
  }

  /** A stroke joining two movable staves follows their separation; it cannot determine that gap. */
  spansStaves(): boolean {
    const note = this.checkAttachedNote();
    const stave = note.checkStave();
    if (this.noteEnd && this.noteEnd.getStave() !== stave) return true;
    return (
      this.allVoices &&
      this.checkModifierContext()
        .getMembers(note.getCategory())
        .some((member) => isNote(member) && member.getStave() !== stave)
    );
  }

  /** Locate each piece of ink from the current formatted notes. Drawing uses the same placements. */
  private layout(bounds: 'ink' | 'pointer', ctx?: RenderContext): BoundingBox[] {
    const note = this.checkAttachedNote();
    const start = note.getModifierStartXY(this.position, this.index);
    const parts: BoundingBox[] = [];
    let topY = Math.min(...note.getYs());
    let botY = Math.max(...note.getYs());
    // Leave a visible gap between a tab fret's string mask and the tip of a broad arrow.
    const x = start.x + this.xShift - 5 - (isTabNote(note) ? Metrics.get('NoteHead.minPadding') : 0);
    const lineSpace = note.checkStave().getSpacingBetweenLines();
    if (this.allVoices) {
      for (const member of this.checkModifierContext().getMembers(note.getCategory())) {
        if (!isNote(member)) continue;
        topY = Math.min(topY, ...member.getYs());
        botY = Math.max(botY, ...member.getYs());
      }
    }

    // An explicit terminal chord can lie on another stave and outside this modifier context.
    if (this.noteEnd) {
      topY = Math.min(topY, ...this.noteEnd.getYs());
      botY = Math.max(botY, ...this.noteEnd.getYs());
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

    if (this.type === Stroke.Type.BRUSH_DOWN || this.type === Stroke.Type.BRUSH_UP) {
      ctx?.fillRect(x, topY, 1, botY - topY);
      parts.push(new BoundingBox(x, topY, 1, botY - topY));
    } else {
      const turnsUp = arrow === Glyphs.arrowheadBlackDown;
      const glyph = turnsUp ? Glyphs.wiggleArpeggiatoDown : Glyphs.wiggleArpeggiatoUp;
      const wave = new Element().setText(glyph);
      // Without font metrics there is no measurable glyph. Avoid extending a zero-width run.
      if (wave.getWidth() > 0) {
        while (wave.getWidth() < botY - topY) wave.setText(wave.getText() + glyph);
        const pivotY = turnsUp ? botY : topY;
        const baseline = wave.getHeight() / 2 - wave.getTextMetrics().actualBoundingBoxDescent;
        if (bounds === 'pointer') {
          // Chord selection historically uses the full advance of the run.
          const width = wave.getWidth(),
            height = wave.getHeight();
          parts.push(new BoundingBox(x - height / 2, pivotY + baseline - (turnsUp ? width : 0), height, width));
        } else {
          // Rotate the ink edges about the same origin as the renderer.
          const box = wave.getTextInk(0, baseline);
          parts.push(
            turnsUp
              ? new BoundingBox(x + box.y, pivotY - box.x - box.w, box.h, box.w)
              : new BoundingBox(x - box.y - box.h, pivotY + box.x, box.h, box.w)
          );
        }
        if (ctx) {
          ctx.openRotation(turnsUp ? -90 : 90, x, pivotY);
          wave.renderText(ctx, x, pivotY + baseline);
          ctx.closeRotation();
        }
        textY = turnsUp ? botY - wave.getWidth() - 5 : topY + wave.getWidth() + 5;
      }
    }

    // The glyph advance centers the sign. The ink may extend beyond that advance.
    const place = (glyph: Element, y: number) => {
      const left = x - glyph.getWidth() / 2;
      parts.push(
        bounds === 'pointer'
          ? new BoundingBox(left, y - glyph.getHeight(), glyph.getWidth(), glyph.getHeight())
          : glyph.getTextInk(left, y)
      );
      if (ctx) glyph.renderText(ctx, left, y);
    };
    if (arrow) place(new Element().setText(arrow), arrowY);
    if (this.type === Stroke.Type.RASGUEADO_DOWN || this.type === Stroke.Type.RASGUEADO_UP) {
      const label = new Element('Stroke.text').setText('R');
      place(label, textY + (this.type === Stroke.Type.RASGUEADO_DOWN ? label.getHeight() : 0));
    }
    return parts;
  }

  /** Separate ink for the brush or wave, its arrow, and any rasgueado label. */
  getInkParts(): BoundingBox[] {
    return this.layout('ink');
  }

  /** Preserve the chord's pointer target based on glyph advances, including before drawing. */
  override getBoundingBox(): BoundingBox {
    if (!this.note?.preFormatted) return new BoundingBox(0, 0, 0, 0);
    const [first, ...rest] = this.layout('pointer');
    return rest.reduce((box, part) => box.mergeWith(part), first ?? new BoundingBox(0, 0, 0, 0));
  }

  override draw(): void {
    const ctx = this.checkContext();
    this.setRendered();
    this.layout('ink', ctx);
  }
}
