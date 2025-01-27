// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License

import { Element } from './element';
import { ModifierContext } from './modifiercontext';
import { Note } from './note';
import { Category } from './typeguard';
import { defined, RuntimeError } from './util';

export enum ModifierPosition {
  CENTER = 0,
  LEFT = 1,
  RIGHT = 2,
  ABOVE = 3,
  BELOW = 4,
}

// To enable logging for this class. Set `VexFlow.Modifier.DEBUG` to `true`.
// function L(...args) { if (Modifier.DEBUG) log('VexFlow.Modifier', args); }

/**
 * `Modifier` is an abstract interface for notational elements that modify
 * a `Note`. Examples of modifiers are `Accidental`, `Annotation`, `Stroke`, etc.
 *
 * For a `Modifier` instance to be positioned correctly, it must be part of
 * a `ModifierContext`. All modifiers in the same context are rendered relative to
 * one another.
 *
 * Typically, all modifiers to a note are part of the same `ModifierContext` instance. Also,
 * in multi-voice staves, all modifiers to notes on the same `tick` are part of the same
 * `ModifierContext`. This ensures that multiple voices don't trample all over each other.
 */
export class Modifier extends Element {
  /**
   * Modifiers category string. Every modifier has a different category.
   * The `ModifierContext` uses this to determine the type and order of the modifiers.
   */
  static get CATEGORY(): string {
    return Category.Modifier;
  }

  /** Modifiers can be positioned almost anywhere, relative to a note. */
  static get Position(): typeof ModifierPosition {
    return ModifierPosition;
  }

  static get PositionString(): Record<string, number> {
    return {
      center: ModifierPosition.CENTER,
      above: ModifierPosition.ABOVE,
      below: ModifierPosition.BELOW,
      left: ModifierPosition.LEFT,
      right: ModifierPosition.RIGHT,
    };
  }

  // Modifiers are attached to a note and an index. An index is a specific head in a chord.
  protected note?: Note;
  protected index?: number;

  protected textLine: number;
  protected position: ModifierPosition;

  protected spacingFromNextModifier: number;
  protected modifierContext?: ModifierContext;

  constructor() {
    super();

    this.width = 0;

    // The `textLine` is reserved space above or below a stave.
    this.textLine = 0;
    this.position = Modifier.Position.LEFT;
    this.spacingFromNextModifier = 0;
  }

  /** Called when position changes. */
  protected reset(): void {
    // DO NOTHING.
  }

  /** Get attached note (`StaveNote`, `TabNote`, etc.) */
  getNote(): Note {
    return defined(this.note, 'NoNote', 'Modifier has no note.');
  }

  /**
   * Used in draw() to check and get the attached note (`StaveNote`, `TabNote`, etc.).
   * Also verifies that the index is valid.
   */
  checkAttachedNote(): Note {
    const category = this.getCategory();
    defined(this.index, 'NoIndex', `Can't draw ${category} without an index.`);
    return defined(this.note, 'NoNote', `Can't draw ${category} without a note.`);
  }

  /**
   * Set attached note.
   * @param note (`StaveNote`, `TabNote`, etc.)
   */
  setNote(note: Note): this {
    this.note = note;
    return this;
  }

  /** Get note index, which is a specific note in a chord. */
  getIndex(): number | undefined {
    return this.index;
  }

  /** Check and get note index, which is a specific note in a chord. */
  checkIndex(): number {
    return defined(this.index, 'NoIndex', 'Modifier has an invalid index.');
  }

  /** Set note index, which is a specific note in a chord. */
  setIndex(index: number): this {
    this.index = index;
    return this;
  }

  /** Get `ModifierContext`. */
  getModifierContext(): ModifierContext | undefined {
    return this.modifierContext;
  }

  /** Check and get `ModifierContext`. */
  checkModifierContext(): ModifierContext {
    return defined(this.modifierContext, 'NoModifierContext', 'Modifier Context Required');
  }

  /** Every modifier must be part of a `ModifierContext`. */
  setModifierContext(c: ModifierContext): this {
    this.modifierContext = c;
    return this;
  }

  /** Get position. */
  getPosition(): number {
    return this.position;
  }

  /**
   * Set position.
   * @param position CENTER | LEFT | RIGHT | ABOVE | BELOW
   */
  setPosition(position: string | number): this {
    this.position = typeof position === 'string' ? Modifier.PositionString[position] : position;
    this.reset();
    return this;
  }

  /** Set the `textLine` for the modifier. */
  setTextLine(line: number): this {
    this.textLine = line;
    return this;
  }

  /** Shift modifier down `y` pixels. Negative values shift up. */
  setYShift(y: number): this {
    this.yShift = y;
    return this;
  }

  /** Set spacing from next modifier. */
  setSpacingFromNextModifier(x: number): void {
    this.spacingFromNextModifier = x;
  }

  /** Get spacing from next modifier. */
  getSpacingFromNextModifier(): number {
    return this.spacingFromNextModifier;
  }

  /**
   * Shift modifier `x` pixels in the direction of the modifier. Negative values
   * shift reverse.
   */
  setXShift(x: number): this {
    this.xShift = 0;
    if (this.position === Modifier.Position.LEFT) {
      this.xShift -= x;
    } else {
      this.xShift += x;
    }
    return this;
  }

  /** Get shift modifier `x` */
  getXShift(): number {
    return this.xShift;
  }

  /** Render the modifier onto the canvas. */
  draw(): void {
    this.checkContext();
    throw new RuntimeError('NotImplemented', 'draw() not implemented for this modifier.');
  }

  // aligns sub notes of NoteSubGroup (or GraceNoteGroup) to the main note with correct x-offset
  alignSubNotesWithNote(subNotes: Note[], note: Note, position = Modifier.Position.LEFT): void {
    // Shift over the tick contexts of each note
    const tickContext = note.getTickContext();
    const metrics = tickContext.getMetrics();
    const stave = note.getStave();
    const subNoteXOffset =
      position === Modifier.Position.RIGHT
        ? tickContext.getX() + this.getSpacingFromNextModifier() * subNotes.length + 10
        : tickContext.getX() - metrics.modLeftPx - metrics.modRightPx + this.getSpacingFromNextModifier();

    subNotes.forEach((subNote) => {
      const subTickContext = subNote.getTickContext();
      if (stave) subNote.setStave(stave);
      subTickContext.setXOffset(subNoteXOffset); // don't touch baseX to avoid shift each render
    });
  }
}
