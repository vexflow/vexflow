// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// ## Description
// This class implements varies types of ties between contiguous notes. The
// ties include: regular ties, hammer ons, pull offs, and slides.

import { StaveTie, TieNotes } from './stavetie';
import { Category } from './typeguard';

export class TabTie extends StaveTie {
  static get CATEGORY(): string {
    return Category.TabTie;
  }

  static createHammeron(notes: TieNotes): TabTie {
    return new TabTie(notes, 'H');
  }

  static createPulloff(notes: TieNotes): TabTie {
    return new TabTie(notes, 'P');
  }

  /**
   * @param notes is a struct that has:
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
    super(notes, text);

    this.renderOptions.cp1 = 9;
    this.renderOptions.cp2 = 11;
    this.renderOptions.yShift = 3;

    this.direction = -1; // Tab tie's are always face up.
  }
}
