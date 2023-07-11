// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// This class implements varies types of ties between contiguous notes. The
// ties include: regular ties, hammer ons, pull offs, and slides.

import { TieNotes } from './stavetie';
import { TabNote } from './tabnote';
import { TabTie } from './tabtie';
import { Category } from './typeguard';
import { RuntimeError } from './util';

export class TabSlide extends TabTie {
  static get CATEGORY(): string {
    return Category.TabSlide;
  }

  static get SLIDE_UP(): number {
    return 1;
  }

  static get SLIDE_DOWN(): number {
    return -1;
  }

  static createSlideUp(notes: TieNotes): TabSlide {
    return new TabSlide(notes, TabSlide.SLIDE_UP);
  }

  static createSlideDown(notes: TieNotes): TabSlide {
    return new TabSlide(notes, TabSlide.SLIDE_DOWN);
  }

  /**
   * @param notes is a struct of the form:
   *  {
   *    firstNote: Note,
   *    lastNote: Note,
   *    firstIndexes: [n1, n2, n3],
   *    lastIndexes: [n1, n2, n3]
   *  }
   * @param notes.firstNote the starting note of the slide
   * @param notes.lastNote the ending note of the slide
   * @param notes.firstIndexes specifies which string + fret positions of the TabNote are used in this slide. zero indexed.
   * @param notes.lastIndexes currently unused. we assume it's the same as firstIndexes.
   *
   * @param direction TabSlide.SLIDE_UP or TabSlide.SLIDE_DOWN
   */
  constructor(notes: TieNotes, direction?: number) {
    super(notes, 'sl.');

    // Determine the direction automatically if it is not provided.
    if (!direction) {
      let firstFret = (notes.firstNote as TabNote).getPositions()[0].fret;
      if (typeof firstFret === 'string') {
        firstFret = parseInt(firstFret, 10);
      }
      let lastFret = (notes.lastNote as TabNote).getPositions()[0].fret;
      if (typeof lastFret === 'string') {
        lastFret = parseInt(lastFret, 10);
      }

      // If either of the frets are 'X', parseInt() above will return NaN.
      // Choose TabSlide.SLIDE_UP by default.
      if (isNaN(firstFret) || isNaN(lastFret)) {
        direction = TabSlide.SLIDE_UP;
      } else {
        direction = firstFret > lastFret ? TabSlide.SLIDE_DOWN : TabSlide.SLIDE_UP;
      }
    }

    this.direction = direction;
    this.renderOptions.cp1 = 11;
    this.renderOptions.cp2 = 14;
    this.renderOptions.yShift = 0.5;
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
    const firstX = params.firstX; // pixel units
    const firstYs = params.firstYs;
    const lastX = params.lastX; // pixel units

    const direction = params.direction;
    if (direction !== TabSlide.SLIDE_UP && direction !== TabSlide.SLIDE_DOWN) {
      throw new RuntimeError('BadSlide', 'Invalid slide direction');
    }

    // eslint-disable-next-line
    const firstIndexes = this.notes.firstIndexes!;
    for (let i = 0; i < firstIndexes.length; ++i) {
      const slideY = firstYs[firstIndexes[i]] + this.renderOptions.yShift;

      if (isNaN(slideY)) {
        throw new RuntimeError('BadArguments', 'Bad indexes for slide rendering.');
      }

      ctx.beginPath();
      ctx.moveTo(firstX, slideY + 3 * direction);
      ctx.lineTo(lastX, slideY - 3 * direction);
      ctx.closePath();
      ctx.stroke();
    }

    this.setRendered();
  }
}
