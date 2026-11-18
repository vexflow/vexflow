// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
//
// ## Description
//
// This file implements `GraceNoteGroup` which is used to format and
// render grace notes.

import { Beam } from './beam';
import { BoundingBox } from './boundingbox';
import { Formatter } from './formatter';
import { Modifier } from './modifier';
import { ModifierContextState } from './modifiercontext';
import { Note } from './note';
import { RenderContext } from './rendercontext';
import { StaveNote } from './stavenote';
import { StaveTie } from './stavetie';
import { StemmableNote } from './stemmablenote';
import { Tables } from './tables';
import { TabTie } from './tabtie';
import { Category, isStaveNote } from './typeguard';
import { log } from './util';
import { Voice } from './voice';

// To enable logging for this class. Set `GraceNoteGroup.DEBUG` to `true`.
// eslint-disable-next-line
function L(...args: any) {
  if (GraceNoteGroup.DEBUG) log('VexFlow.GraceNoteGroup', args);
}

/** GraceNoteGroup is used to format and render grace notes. */
export class GraceNoteGroup extends Modifier {
  static DEBUG: boolean = false;

  static override get CATEGORY(): string {
    return Category.GraceNoteGroup;
  }

  protected readonly voice: Voice;
  protected readonly graceNotes: StemmableNote[];
  protected readonly showSlur?: boolean;

  protected preFormatted: boolean = false;
  protected formatter?: Formatter;
  public renderOptions: { slurYShift: number };
  protected slur?: StaveTie | TabTie;
  protected beams: Beam[];

  /** Right-side material at the same onset must not move a before-grace cluster to the left. */
  private afterWidth = 0;
  private afterOffset = 0;

  /** Opposing groups reserve their own side. Voices with simultaneous before-graces align at the host. */
  static format(groups: GraceNoteGroup[], state: ModifierContextState): boolean {
    if (!groups?.length) return false;
    const entries = groups.map((group) => {
      group.preFormat();
      const note = group.getNote();
      const width = group.getWidth() + (isStaveNote(note) ? 4 : 0);
      return { group, note, width, after: group.position === Modifier.Position.RIGHT };
    });
    const afterWidth = Math.max(0, ...entries.filter((e) => e.after).map((e) => e.width));
    const beforeWidth = Math.max(
      0,
      ...entries.filter((e) => !e.after).map((e) => Math.max(e.width, e.note.getLeftDisplacedHeadPx()))
    );
    for (const { group, width, after, note } of entries) {
      group.afterWidth = afterWidth;
      group.afterOffset =
        note.getGlyphWidth() + note.getRightDisplacedHeadPx() + state.rightShift + StaveNote.minNoteheadPadding;
      group.setSpacingFromNextModifier((after ? 0 : beforeWidth - width) + StaveNote.minNoteheadPadding);
    }
    state.leftShift += beforeWidth;
    state.rightShift += afterWidth;
    return true;
  }

  //** `GraceNoteGroup` inherits from `Modifier` and is placed inside a `ModifierContext`. */
  constructor(graceNotes: StemmableNote[], showSlur?: boolean) {
    super();

    this.position = Modifier.Position.LEFT;
    this.graceNotes = graceNotes;
    this.width = 0;

    this.showSlur = showSlur;
    this.slur = undefined;

    this.voice = new Voice({
      numBeats: 4,
      beatValue: 4,
      resolution: Tables.RESOLUTION,
    }).setStrict(false);

    this.renderOptions = {
      slurYShift: 0,
    };

    this.beams = [];

    this.voice.addTickables(this.graceNotes);

    return this;
  }

  preFormat(): void {
    if (this.preFormatted) return;

    if (!this.formatter) {
      this.formatter = new Formatter();
    }
    this.formatter.joinVoices([this.voice]).format([this.voice], 0, {});
    this.setWidth(this.formatter.getMinTotalWidth());
    this.preFormatted = true;
  }

  beamNotes(graceNotes?: StemmableNote[]): this {
    graceNotes = graceNotes || this.graceNotes;
    if (graceNotes.length > 1) {
      const beam = new Beam(graceNotes);

      beam.renderOptions.beamWidth = 3;
      beam.renderOptions.partialBeamLength = 4;

      this.beams.push(beam);
    }

    return this;
  }

  override setWidth(width: number): this {
    this.width = width;
    return this;
  }

  override getWidth(): number {
    return this.width + StaveNote.minNoteheadPadding;
  }

  getGraceNotes(): Note[] {
    return this.graceNotes;
  }

  /** Position grace notes after the parent has been formatted and assigned a stave. */
  private positionGraceNotes(): void {
    const note = this.checkAttachedNote();
    note.checkStave();
    this.preFormat();
    this.alignSubNotesWithNote(this.getGraceNotes(), note, this.position);
    if (this.afterWidth) {
      for (const grace of this.graceNotes) {
        const tick = grace.getTickContext();
        tick.setXOffset(
          this.position === Modifier.Position.RIGHT
            ? note.getTickContext().getX() + this.afterOffset
            : tick.getXOffset() + this.afterWidth
        );
      }
    }
    this.beams.forEach((beam) => beam.postFormat());
  }

  /** Enclose the positioned grace notes (not the slur). Drawing is not required. */
  override getBoundingBox(): BoundingBox {
    if (this.graceNotes.length === 0) return super.getBoundingBox();
    this.positionGraceNotes();
    const boundingBox = this.graceNotes[0].getBoundingBox();
    for (let i = 1; i < this.graceNotes.length; i++) {
      boundingBox.mergeWith(this.graceNotes[i].getBoundingBox());
    }
    return boundingBox;
  }

  /** Positioned components, including the optional slur, shared with geometry consumers. */
  getLayoutElements(): (Note | Beam | StaveTie)[] {
    const note = this.checkAttachedNote();
    this.positionGraceNotes();
    if (this.showSlur && this.graceNotes.length) {
      // Keep one slur for the current pair of endpoints. A native caller may reattach this group.
      const isStavenote = isStaveNote(note);
      const TieClass = isStavenote ? StaveTie : TabTie;

      if (this.slur?.getNotes().firstNote !== note || this.slur?.getNotes().lastNote !== this.graceNotes[0])
        this.slur = new TieClass({
          lastNote: this.graceNotes[0],
          firstNote: note,
          firstIndexes: [0],
          lastIndexes: [0],
        });

      // A normal tie starts beyond all right modifiers, including this group.
      // Anchor an after-grace slur at the host head instead.
      if (this.position === Modifier.Position.RIGHT && isStavenote) {
        this.slur.renderOptions.firstXShift = note.getNoteHeadBeginX() + note.getGlyphWidth() - note.getTieRightX();
      } else {
        this.slur.renderOptions.firstXShift = 0;
      }
      this.slur.renderOptions.cp2 = 12;
      this.slur.renderOptions.yShift = (isStavenote ? 7 : 5) + this.renderOptions.slurYShift;
    }
    return [...this.graceNotes, ...this.beams, ...(this.slur ? [this.slur] : [])];
  }

  override draw(): void {
    const ctx: RenderContext = this.checkContext();
    this.setRendered();
    L('Drawing grace note group for:', this.checkAttachedNote());
    this.getLayoutElements().forEach((element) => element.setContext(ctx).drawWithStyle());
  }
}
