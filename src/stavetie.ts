// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
//
// This class implements varies types of ties between contiguous notes. The
// ties include: regular ties, hammer ons, pull offs, and slides.

import { Element } from './element';
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

  public renderOptions: {
    cp1: number; // Curve control point 1
    cp2: number; // Curve control point 2
    shortTieCutoff: number; // below this we use short control points
    cp1Short: number;
    cp2Short: number;
    firstXShift: number;
    lastXShift: number;
    tieSpacing: number;
    textShiftX: number;
    yShift: number;
  };

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
  constructor(notes: TieNotes, text = '') {
    super();
    this.setNotes(notes);
    this.text = text;
    this.renderOptions = {
      cp1: 8, // Curve control point 1
      cp2: 12, // Curve control point 2
      shortTieCutoff: 10,
      cp1Short: 2,
      cp2Short: 8,
      textShiftX: 0,
      firstXShift: 0,
      lastXShift: 0,
      yShift: 7,
      tieSpacing: 0,
    };
  }

  /**
   * Returns either the direction explicitly set with setDirection, or
   * a logical direction based on lastNote or firstNote.
   */
  getDirection(): number {
    if (this.direction !== undefined && this.direction !== null) {
      return this.direction;
    } else if (this.notes.lastNote) {
      return this.notes.lastNote.getStemDirection();
    } else if (this.notes.firstNote) {
      return this.notes.firstNote.getStemDirection();
    } else {
      return 0;
    }
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

    if (Math.abs(params.lastX - params.firstX) < this.renderOptions.shortTieCutoff) {
      // do not get super exaggerated curves for very short ties
      cp1 = this.renderOptions.cp1Short;
      cp2 = this.renderOptions.cp2Short;
    }

    const firstXShift = this.renderOptions.firstXShift;
    const lastXShift = this.renderOptions.lastXShift;
    const yShift = this.renderOptions.yShift * params.direction;

    // setNotes(...) verified that firstIndexes and lastIndexes are not undefined.
    // As a result, we use the ! non-null assertion operator here.

    const firstIndexes = this.notes.firstIndexes!;

    const lastIndexes = this.notes.lastIndexes!;
    ctx.save();
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
    ctx.restore();
  }

  /**
   * @param firstX specified in pixels
   * @param lastX specified in pixels
   */
  renderTieText(firstX: number, lastX: number): void {
    const ctx = this.checkContext();
    let centerX = (firstX + lastX) / 2;
    centerX -= ctx.measureText(this.text).width / 2;
    const stave = this.notes.firstNote?.checkStave() ?? this.notes.lastNote?.checkStave();
    if (stave) {
      ctx.save();
      ctx.setFont(this.fontInfo);
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

  /**
   * Returns the X position in pixels that the tie will be drawn starting from;
   * ideally from the firstNote, alternatively from the lastNote, or 0 if all else fails.
   */
  getFirstX(): number {
    if (this.notes.firstNote) {
      return this.notes.firstNote.getTieRightX() + this.renderOptions.tieSpacing;
    } else if (this.notes.lastNote) {
      return this.notes.lastNote.checkStave().getTieStartX();
    } else {
      return 0;
    }
  }

  /**
   * Returns the X position in pixels that the tie will be drawn ending at;
   * ideally from the firstNote, alternatively from the lastNote, or 0 if all else fails.
   */
  getLastX(): number {
    if (this.notes.lastNote) {
      return this.notes.lastNote.getTieLeftX() + this.renderOptions.tieSpacing;
    } else if (this.notes.firstNote) {
      return this.notes.firstNote.checkStave().getTieEndX();
    } else {
      return 0;
    }
  }

  /**
   * Get the Y positions of the places where a tie needs to be drawn starting from.
   */
  getFirstYs(): number[] {
    if (this.notes.firstNote) {
      return this.notes.firstNote.getYs();
    } else if (this.notes.lastNote) {
      return this.notes.lastNote.getYs();
    } else {
      return [0];
    }
  }

  /**
   * Get the Y positions of the places where a tie needs to be drawn ending at.
   */
  getLastYs(): number[] {
    if (this.notes.lastNote) {
      return this.notes.lastNote.getYs();
    } else if (this.notes.firstNote) {
      return this.notes.firstNote.getYs();
    } else {
      return [0];
    }
  }

  /**
   * If a tie has firstNote and not lastNote, or vice-versa, then their
   * firstIndexes and lastIndexes need to be equal to each other.
   *
   * Does nothing if both notes.firstNote and notes.lastNote are defined (or
   * if neither are)
   *
   * (Note that after doing so they share a common Array object, so any change
   * to one will affect the other; this behavior may change in a future release)
   */
  synchronizeIndexes(): void {
    if (this.notes.firstNote && this.notes.lastNote) {
      return;
    } else if (!this.notes.firstNote && !this.notes.lastNote) {
      return;
    } else if (this.notes.firstNote) {
      this.notes.lastIndexes = this.notes.firstIndexes;
    } else {
      // this.notes.lastNote defined, but not firstNote
      this.notes.firstIndexes = this.notes.lastIndexes;
    }
  }

  draw(): boolean {
    this.checkContext();
    this.setRendered();
    this.synchronizeIndexes();
    const firstX = this.getFirstX();
    const lastX = this.getLastX();
    this.renderTie({
      firstX,
      lastX,
      firstYs: this.getFirstYs(),
      lastYs: this.getLastYs(),
      direction: this.getDirection(), // note: not this.direction
    });

    this.renderTieText(firstX, lastX);
    return true;
  }
}
