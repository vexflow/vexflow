// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
//
// ## Description
//
// This class implements various types of members to notes (e.g. bends,
// fingering positions etc.).  The ModifierContext works with tickables
// that are at the same tick to ensure that they and their modifiers
// all have proper alignment.  (Note that the ModifierContext also
// runs the spacing of the tickable).
//
// see https://github.com/0xfe/vexflow/wiki/How-Formatting-Works

import { Accidental } from './accidental';
import { Annotation } from './annotation';
import { Articulation } from './articulation';
import { Bend } from './bend';
import { ChordSymbol } from './chordsymbol';
import { Dot } from './dot';
import { FretHandFinger } from './frethandfinger';
import { GraceNoteGroup } from './gracenotegroup';
import { Modifier } from './modifier';
import { Note } from './note';
import { NoteSubGroup } from './notesubgroup';
import { Ornament } from './ornament';
import { Parenthesis } from './parenthesis';
import { StaveNote } from './stavenote';
import { StringNumber } from './stringnumber';
import { Stroke } from './strokes';
import { TabNote } from './tabnote';
import { Tickable } from './tickable';
import { Category } from './typeguard';
import { log, RuntimeError } from './util';
import { Vibrato } from './vibrato';

export interface ModifierContextState {
  leftShift: number;
  rightShift: number;
  textLine: number;
  topTextLine: number;
}

export interface ModifierContextMetrics {
  width: number;
  spacing: number;
}

export type ModifierContextMember = Tickable | Modifier | StaveNote | TabNote;

// To enable logging for this class. Set `VexFlow.ModifierContext.DEBUG` to `true`.
// eslint-disable-next-line
function L(...args: any[]) {
  if (ModifierContext.DEBUG) log('VexFlow.ModifierContext', args);
}

export class ModifierContext {
  static DEBUG: boolean = false;

  // Formatting data.
  protected state: ModifierContextState = {
    leftShift: 0,
    rightShift: 0,
    textLine: 0,
    topTextLine: 0,
  };

  // Current members -- a mapping of Category (string) to a list of Tickables, Modifiers,
  // StaveNotes, TabNotes, etc.
  protected members: Record<string, ModifierContextMember[]> = {};

  protected preFormatted: boolean = false;
  protected postFormatted: boolean = false;
  protected formatted: boolean = false;

  protected width: number = 0;
  protected spacing: number = 0;
  /** Horizontal space added only for annotations above or below the note. */
  protected annotationRightShift: number = 0;

  addModifier(member: ModifierContextMember): this {
    L('addModifier is deprecated, use addMember instead.');
    return this.addMember(member);
  }

  /**
   * this.members maps CATEGORY strings to arrays of Tickable | Modifier | StaveNote | TabNote.
   * Here we add a new member to this.members, and create a new array if needed.
   * @param member
   * @returns this
   */
  addMember(member: ModifierContextMember): this {
    const category = member.getCategory();
    if (!this.members[category]) {
      this.members[category] = [];
    }
    this.members[category].push(member);
    member.setModifierContext(this);
    this.preFormatted = false;
    return this;
  }

  /**
   * @deprecated
   */
  getModifiers(category: string): ModifierContextMember[] {
    L('getModifiers is deprecated, use getMembers instead.');
    return this.getMembers(category);
  }

  getMembers(category: string): ModifierContextMember[] {
    return this.members[category] ?? [];
  }

  /**
   * Get the width of the entire
   */
  getWidth(): number {
    return this.width;
  }

  getLeftShift(): number {
    return this.state.leftShift;
  }

  getRightShift(): number {
    return this.state.rightShift;
  }

  /** Ties clear nearby modifiers, but must not start beyond a lyric's text box. */
  getRightShiftForTie(): number {
    return this.state.rightShift - this.annotationRightShift;
  }

  // Lines occupied by the outermost annotations. Tuplets can measure this text directly.
  private measuredTopLines = 0;
  private measuredBottomLines = 0;

  /** Keep the line allowance for other marks when using actual annotation ink bounds. */
  getUnmeasuredTextLines(above: boolean): number {
    return above ? this.state.topTextLine - this.measuredTopLines : this.state.textLine - this.measuredBottomLines;
  }

  getState(): ModifierContextState {
    return this.state;
  }

  getMetrics(): ModifierContextMetrics {
    if (!this.formatted) {
      throw new RuntimeError('UnformattedMember', 'Unformatted member has no metrics.');
    }

    return {
      width: this.state.leftShift + this.state.rightShift + this.spacing,
      spacing: this.spacing,
    };
  }

  preFormat(): void {
    if (this.preFormatted) return;
    L('Preformatting ModifierContext');

    const state = this.state;
    const members = this.members;

    // The ordering below determines when different members are formatted and rendered.
    StaveNote.format(members[Category.StaveNote] as StaveNote[], state);
    Parenthesis.format(members[Category.Parenthesis] as Parenthesis[], state);
    Dot.format(members[Category.Dot] as Dot[], state);
    FretHandFinger.format(members[Category.FretHandFinger] as FretHandFinger[], state);
    Accidental.format(members[Category.Accidental] as Accidental[], state);
    Stroke.format(members[Category.Stroke] as Stroke[], state);
    GraceNoteGroup.format(members[Category.GraceNoteGroup] as GraceNoteGroup[], state);
    NoteSubGroup.format(members[Category.NoteSubGroup] as NoteSubGroup[], state);
    StringNumber.format(members[Category.StringNumber] as StringNumber[], state);
    Articulation.format(members[Category.Articulation] as Articulation[], state);
    Ornament.format(members[Category.Ornament] as Ornament[], state);
    const annotations = (members[Category.Annotation] as Annotation[] | undefined) ?? [];
    const isOutsideNote = (annotation: Annotation): boolean =>
      annotation.getVerticalJustification() === Annotation.VerticalJustify.TOP ||
      annotation.getVerticalJustification() === Annotation.VerticalJustify.BOTTOM;
    Annotation.format(
      annotations.filter((annotation) => !isOutsideNote(annotation)),
      state
    );
    const rightShiftBeforeAnnotations = state.rightShift;
    const topBefore = state.topTextLine;
    const bottomBefore = state.textLine;
    Annotation.format(annotations.filter(isOutsideNote), state);
    const topAfter = state.topTextLine;
    const bottomAfter = state.textLine;
    const rightShiftWithAnnotations = state.rightShift;
    // Keep annotation vertical placement in its original stage. Its horizontal
    // text box must not push nearby modifiers away from the notehead.
    state.rightShift = rightShiftBeforeAnnotations;
    ChordSymbol.format(members[Category.ChordSymbol] as ChordSymbol[], state);
    Bend.format(members[Category.Bend] as Bend[], state);
    Vibrato.format(members[Category.Vibrato] as Vibrato[], state, this);

    // If a later mark stacked above the annotations, retain its full reserved height.
    this.measuredTopLines = state.topTextLine === topAfter ? topAfter - topBefore : 0;
    this.measuredBottomLines = state.textLine === bottomAfter ? bottomAfter - bottomBefore : 0;

    // Reserve enough note spacing for both the lyric and nearby modifiers.
    this.annotationRightShift = Math.max(0, rightShiftWithAnnotations - state.rightShift);
    state.rightShift += this.annotationRightShift;

    // Update width of this member context
    this.width = state.leftShift + state.rightShift;
    this.preFormatted = true;
  }

  postFormat(): void {
    if (this.postFormatted) return;
    L('Postformatting ModifierContext');

    // If post-formatting is required for an element, add more lines below.
    StaveNote.postFormat(this.getMembers(Category.StaveNote) as Note[]);
  }
}
