// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// ## Description
// Tablature ties carry technique letters between frets, including hammer-ons and pull-offs.

import { Metrics } from './metrics';
import { StaveTie, TieNotes } from './stavetie';
import { Category } from './typeguard';

export class TabTie extends StaveTie {
  static override get CATEGORY(): string {
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
    // A one-letter tab technique has a distinct face from a written direction or a slide abbreviation.
    if (text && /^[a-z]$/i.test(text)) this.setFont(Metrics.getFontInfo('TabTie.techniqueLetter'));

    this.renderOptions.cp1 = 9;
    this.renderOptions.cp2 = 11;
    this.renderOptions.yShift = 3;

    this.direction = -1; // Tab tie's are always face up.
  }
}
