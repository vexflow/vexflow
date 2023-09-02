// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
//
// This class implements dot modifiers for notes.

import { Modifier } from './modifier';
import { ModifierContextState } from './modifiercontext';
import { Note } from './note';
import { Category, isGraceNote, isStaveNote, isTabNote } from './typeguard';
import { RuntimeError } from './util';

export class Dot extends Modifier {
  static get CATEGORY(): string {
    return Category.Dot;
  }

  protected radius: number;
  protected dotShiftY: number;

  /** Returns the dots associated to a Note. */
  static getDots(note: Note): Dot[] {
    return note.getModifiersByType(Dot.CATEGORY) as Dot[];
  }

  /** Add a dot on the specified keys to the notes. */
  static buildAndAttach(notes: Note[], options?: { index?: number; all?: boolean }): void {
    for (const note of notes) {
      if (options?.all) {
        for (let i = 0; i < note.keys.length; i++) {
          const dot = new Dot();
          note.addModifier(dot, i);
        }
      } else if (options?.index !== undefined) {
        const dot = new Dot();
        note.addModifier(dot, options?.index);
      } else {
        const dot = new Dot();
        note.addModifier(dot, 0);
      }
    }
  }

  // Arrange dots inside a ModifierContext.
  static format(dots: Dot[], state: ModifierContextState): boolean {
    const rightShift = state.rightShift;
    const dotSpacing = 1;

    if (!dots || dots.length === 0) return false;

    const dotList = [];
    const maxShiftMap: Record<string, number> = {};
    for (let i = 0; i < dots.length; ++i) {
      const dot = dots[i];
      const note = dot.getNote();

      let props;
      let shift;

      if (isStaveNote(note)) {
        const index = dot.checkIndex();
        props = note.getKeyProps()[index];
        // consider right displaced head with no previous modifier
        shift = note.getFirstDotPx();
      } else if (isTabNote(note)) {
        props = { line: 0.5 }; // Shim key props for dot placement
        shift = rightShift;
      } else {
        // note object is not StaveNote or TabNote.
        throw new RuntimeError('Internal', 'Unexpected instance.');
      }

      const noteId = note.getAttribute('id');
      dotList.push({ line: props.line, note, noteId, dot });
      maxShiftMap[noteId] = Math.max(maxShiftMap[noteId] || shift, shift);
    }

    // Sort dots by line number.
    dotList.sort((a, b) => b.line - a.line);

    let dotShift = rightShift;
    let xWidth = 0;
    let lastLine = null;
    let lastNote = null;
    let prevDottedSpace = null;
    let halfShiftY = 0;

    for (let i = 0; i < dotList.length; ++i) {
      const { dot, note, noteId, line } = dotList[i];

      // Reset the position of the dot every line.
      if (line !== lastLine || note !== lastNote) {
        dotShift = maxShiftMap[noteId];
      }

      if (!note.isRest() && line !== lastLine) {
        if (Math.abs(line % 1) === 0.5) {
          // note is on a space, so no dot shift
          halfShiftY = 0;
        } else {
          // note is on a line, so shift dot to space above the line
          halfShiftY = 0.5;
          if (lastNote !== null && !lastNote.isRest() && lastLine !== null && lastLine - line === 0.5) {
            // previous note on a space, so shift dot to space below the line
            halfShiftY = -0.5;
          } else if (line + halfShiftY === prevDottedSpace) {
            // previous space is dotted, so shift dot to space below the line
            halfShiftY = -0.5;
          }
        }
      }

      // Convert halfShiftY to a multiplier for dots.draw().
      if (note.isRest()) {
        dot.dotShiftY += -halfShiftY;
      } else {
        dot.dotShiftY = -halfShiftY;
      }
      prevDottedSpace = line + halfShiftY;

      dot.setXShift(dotShift);
      dotShift += dot.getWidth() + dotSpacing; // spacing
      xWidth = dotShift > xWidth ? dotShift : xWidth;
      lastLine = line;
      lastNote = note;
    }

    // Update state.
    state.rightShift += xWidth;
    return true;
  }

  constructor() {
    super();

    this.position = Modifier.Position.RIGHT;

    this.radius = 2;
    this.setWidth(5);
    this.dotShiftY = 0;
  }

  setNote(note: Note): this {
    this.note = note;
    if (isGraceNote(note)) {
      this.radius *= 0.5;
      this.setWidth(3);
    }
    return this;
  }

  setDotShiftY(y: number): this {
    this.dotShiftY = y;
    return this;
  }

  draw(): void {
    const ctx = this.checkContext();
    const note = this.checkAttachedNote();
    this.setRendered();

    const stave = note.checkStave();
    const lineSpace = stave.getSpacingBetweenLines();

    const start = note.getModifierStartXY(this.position, this.index, { forceFlagRight: true });

    // Set the starting y coordinate to the base of the stem for TabNotes.

    if (isTabNote(note)) {
      start.y = note.getStemExtents().baseY;
    }

    const x = start.x + this.xShift + this.width - this.radius;
    const y = start.y + this.yShift + this.dotShiftY * lineSpace;

    ctx.beginPath();
    ctx.arc(x, y, this.radius, 0, Math.PI * 2, false);
    ctx.fill();
  }
}
