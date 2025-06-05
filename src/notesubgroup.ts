// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author: Taehoon Moon 2016
//
// ## Description
//
// This file implements `NoteSubGroup` which is used to format and
// render notes as a `Modifier`
// ex) ClefNote, TimeSigNote and BarNote.

import { Formatter } from './formatter';
import { Modifier } from './modifier';
import { ModifierContextState } from './modifiercontext';
import { Note } from './note';
import { RenderContext } from './rendercontext';
import { Tables } from './tables';
import { Category } from './typeguard';
import { Voice } from './voice';

export class NoteSubGroup extends Modifier {
  static override get CATEGORY(): string {
    return Category.NoteSubGroup;
  }

  // Arrange groups inside a `ModifierContext`
  static format(groups: NoteSubGroup[], state: ModifierContextState): boolean {
    if (!groups || groups.length === 0) return false;

    let width = 0;
    for (let i = 0; i < groups.length; ++i) {
      const group = groups[i];
      group.preFormat();
      width += group.getWidth();
    }

    state.leftShift += width;
    return true;
  }

  protected subNotes: Note[];
  protected preFormatted: boolean = false;
  protected formatter: Formatter;
  protected voice: Voice;

  constructor(subNotes: Note[]) {
    super();

    this.position = Modifier.Position.LEFT;
    this.subNotes = subNotes;
    this.subNotes.forEach((subNote) => {
      subNote.setIgnoreTicks(false);
    });
    this.width = 0;

    this.formatter = new Formatter();
    this.voice = new Voice({
      numBeats: 4,
      beatValue: 4,
      resolution: Tables.RESOLUTION,
    }).setStrict(false);

    this.voice.addTickables(this.subNotes);
  }

  preFormat(): void {
    if (this.preFormatted) return;

    this.formatter.joinVoices([this.voice]).format([this.voice], 0);
    this.setWidth(this.formatter.getMinTotalWidth());
    this.preFormatted = true;
  }

  override setWidth(width: number): this {
    this.width = width;
    return this;
  }

  override getWidth(): number {
    return this.width;
  }

  override draw(): void {
    const ctx: RenderContext = this.checkContext();
    const note = this.checkAttachedNote();
    this.setRendered();
    this.alignSubNotesWithNote(this.subNotes, note); // Modifier function
    this.subNotes.forEach((subNote) => subNote.setContext(ctx).drawWithStyle());
  }
}
