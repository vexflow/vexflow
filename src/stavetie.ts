// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
//
// This class implements varies types of ties between contiguous notes. The
// ties include: regular ties, hammer ons, pull offs, and slides.

import { Element } from './element';
import { FontInfo } from './font';
import { Note } from './note';
import { Category } from './typeguard';
import { RuntimeError } from './util';

// For backwards compatibility with 3.0.9, firstNote and/or lastNote can be undefined or null.
// We prefer undefined instead of null.
// However, some of our test cases used to pass in null, so maybe there is client code relying on it.
export interface TieNotes {
  firstNote?: Note | null;
  lastNote?: Note | null;
  firstIndexes?: number[];
  lastIndexes?: number[];
}

export class StaveTie extends Element {
  static get CATEGORY(): string {
    return Category.StaveTie;
  }

  /** Default text font. */
  static TEXT_FONT: Required<FontInfo> = { ...Element.TEXT_FONT };

  public renderOptions: {
    cp2: number;
    lastXShift: number;
    tieSpacing: number;
    cp1: number;
    firstXShift: number;
    textShiftX: number;
    yShift: number;
  };

  protected text?: string;

  // notes is initialized by the constructor via this.setNotes(notes).
  protected notes!: TieNotes;

  protected direction?: number;

  /**
   * @param notes is a struct that has:
   *
   *  {
   *    firstNote: Note,
   *    lastNote: Note,
   *    firstIndexes: [n1, n2, n3],
   *    lastIndexes: [n1, n2, n3]
   *  }
   *
   * @param text
   */
  constructor(notes: TieNotes, text?: string) {
    super();
    this.setNotes(notes);
    this.text = text;
    this.renderOptions = {
      cp1: 8, // Curve control point 1
      cp2: 12, // Curve control point 2
      textShiftX: 0,
      firstXShift: 0,
      lastXShift: 0,
      yShift: 7,
      tieSpacing: 0,
    };

    this.resetFont();
  }

  setDirection(direction: number): this {
    this.direction = direction;
    return this;
  }

  /**
   * Set the notes to attach this tie to.
   *
   * @param {!Object} notes The notes to tie up.
   */
  setNotes(notes: TieNotes): this {
    if (!notes.firstNote && !notes.lastNote) {
      throw new RuntimeError('BadArguments', 'Tie needs to have either firstNote or lastNote set.');
    }

    if (!notes.firstIndexes) {
      notes.firstIndexes = [0];
    }
    if (!notes.lastIndexes) {
      notes.lastIndexes = [0];
    }

    if (notes.firstIndexes.length !== notes.lastIndexes.length) {
      throw new RuntimeError('BadArguments', 'Tied notes must have same number of indexes.');
    }

    this.notes = notes;
    return this;
  }

  /**
   * @return {boolean} Returns true if this is a partial bar.
   */
  isPartial(): boolean {
    return !this.notes.firstNote || !this.notes.lastNote;
  }

  /**
   * @param params.firstX is specified in pixels.
   * @param params.lastX is specified in pixels.
   */
  renderTie(params: { direction: number; firstX: number; lastX: number; lastYs: number[]; firstYs: number[] }): void {
    if (params.firstYs.length === 0 || params.lastYs.length === 0) {
      throw new RuntimeError('BadArguments', 'No Y-values to render');
    }

    const ctx = this.checkContext();
    let cp1 = this.renderOptions.cp1;
    let cp2 = this.renderOptions.cp2;

    if (Math.abs(params.lastX - params.firstX) < 10) {
      cp1 = 2;
      cp2 = 8;
    }

    const firstXShift = this.renderOptions.firstXShift;
    const lastXShift = this.renderOptions.lastXShift;
    const yShift = this.renderOptions.yShift * params.direction;

    // setNotes(...) verified that firstIndexes and lastIndexes are not undefined.
    // As a result, we use the ! non-null assertion operator here.
    // eslint-disable-next-line
    const firstIndexes = this.notes.firstIndexes!;
    // eslint-disable-next-line
    const lastIndexes = this.notes.lastIndexes!;
    this.applyStyle();
    ctx.openGroup('stavetie', this.getAttribute('id'));
    for (let i = 0; i < firstIndexes.length; ++i) {
      const cpX = (params.lastX + lastXShift + (params.firstX + firstXShift)) / 2;
      // firstY and lastY are specified in pixels.
      const firstY = params.firstYs[firstIndexes[i]] + yShift;
      const lastY = params.lastYs[lastIndexes[i]] + yShift;

      if (isNaN(firstY) || isNaN(lastY)) {
        throw new RuntimeError('BadArguments', 'Bad indexes for tie rendering.');
      }

      const topControlPointY = (firstY + lastY) / 2 + cp1 * params.direction;
      const bottomControlPointY = (firstY + lastY) / 2 + cp2 * params.direction;

      ctx.beginPath();
      ctx.moveTo(params.firstX + firstXShift, firstY);
      ctx.quadraticCurveTo(cpX, topControlPointY, params.lastX + lastXShift, lastY);
      ctx.quadraticCurveTo(cpX, bottomControlPointY, params.firstX + firstXShift, firstY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.closeGroup();
    this.restoreStyle();
  }

  /**
   * @param firstX specified in pixels
   * @param lastX specified in pixels
   */
  renderText(firstX: number, lastX: number): void {
    if (!this.text) return;
    const ctx = this.checkContext();
    let centerX = (firstX + lastX) / 2;
    centerX -= ctx.measureText(this.text).width / 2;
    const stave = this.notes.firstNote?.checkStave() ?? this.notes.lastNote?.checkStave();
    if (stave) {
      ctx.save();
      ctx.setFont(this.textFont);
      ctx.fillText(this.text, centerX + this.renderOptions.textShiftX, stave.getYForTopText() - 1);
      ctx.restore();
    }
  }

  /**
   * Returns the TieNotes structure of the first and last note this tie connects.
   */
  getNotes(): TieNotes {
    return this.notes;
  }

  draw(): boolean {
    this.checkContext();
    this.setRendered();

    const firstNote = this.notes.firstNote;
    const lastNote = this.notes.lastNote;

    // Provide some default values so the compiler doesn't complain.
    // firstX and lastX are in pixels.
    let firstX = 0;
    let lastX = 0;
    let firstYs: number[] = [0];
    let lastYs: number[] = [0];
    let stemDirection = 0;

    if (firstNote) {
      firstX = firstNote.getTieRightX() + this.renderOptions.tieSpacing;
      stemDirection = firstNote.getStemDirection();
      firstYs = firstNote.getYs();
    } else if (lastNote) {
      const stave = lastNote.checkStave();
      firstX = stave.getTieStartX();
      firstYs = lastNote.getYs();
      this.notes.firstIndexes = this.notes.lastIndexes;
    }

    if (lastNote) {
      lastX = lastNote.getTieLeftX() + this.renderOptions.tieSpacing;
      stemDirection = lastNote.getStemDirection();
      lastYs = lastNote.getYs();
    } else if (firstNote) {
      const stave = firstNote.checkStave();
      lastX = stave.getTieEndX();
      lastYs = firstNote.getYs();
      this.notes.lastIndexes = this.notes.firstIndexes;
    }

    if (this.direction) {
      stemDirection = this.direction;
    }

    this.renderTie({
      firstX,
      lastX,
      firstYs,
      lastYs,
      direction: stemDirection,
    });

    this.renderText(firstX, lastX);
    return true;
  }
}
