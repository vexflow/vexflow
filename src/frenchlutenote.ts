// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// French Renaissance lute letters and diapasons, derived from sounding course and fret.

import { Element } from './element';
import { Glyphs } from './glyphs';
import { TabNote, TabNotePosition, TabNoteStruct } from './tabnote';
import { Category } from './typeguard';
import { RuntimeError } from './util';

/** Course 1 is the top course. A numeric fret of zero sounds the open course. */
export interface FrenchLuteNoteStruct extends TabNoteStruct {
  positions: { str: number; fret: number }[];
}

// The Renaissance alphabet omits j. SMuFL defines twelve fretted letters after open a.
const fretLetters = [
  Glyphs.luteFrenchFretA,
  Glyphs.luteFrenchFretB,
  Glyphs.luteFrenchFretC,
  Glyphs.luteFrenchFretD,
  Glyphs.luteFrenchFretE,
  Glyphs.luteFrenchFretF,
  Glyphs.luteFrenchFretG,
  Glyphs.luteFrenchFretH,
  Glyphs.luteFrenchFretI,
  Glyphs.luteFrenchFretK,
  Glyphs.luteFrenchFretL,
  Glyphs.luteFrenchFretM,
  Glyphs.luteFrenchFretN,
];

// Open basses below the six ruled courses use a, /a, //a and ///a.
const openBassSigns = [
  Glyphs.luteFrench7thCourse,
  Glyphs.luteFrench8thCourse,
  Glyphs.luteFrench9thCourse,
  Glyphs.luteFrench10thCourse,
];

/** French lute tablature on a six-line TabStave. Signs sit directly above their course. */
export class FrenchLuteNote extends TabNote {
  static override get CATEGORY(): string {
    return Category.FrenchLuteNote;
  }

  // A French letter rests on a continuous course line at the music font's baseline.
  protected override clearFretLines = false;

  constructor(noteStruct: FrenchLuteNoteStruct, drawStem = false) {
    super(noteStruct, drawStem);
  }

  /** Keep the original sounding position and measure its music glyph for the formatter. */
  protected override createFretElement({ str, fret }: TabNotePosition): Element {
    if (!Number.isInteger(str) || str < 1 || str > 6 + openBassSigns.length) {
      throw new RuntimeError('BadArguments', 'French lute courses must be integers from 1 to 10.');
    }
    if (typeof fret !== 'number' || !Number.isInteger(fret) || fret < 0 || fret >= fretLetters.length) {
      throw new RuntimeError('BadArguments', 'French lute frets must be integers from 0 to 12.');
    }
    if (str > 6 && fret !== 0) {
      throw new RuntimeError('BadArguments', 'French lute diapasons must be open.');
    }
    const sign = str <= 6 ? fretLetters[fret] : openBassSigns[str - 7];
    const text = this.ghost ? Glyphs.accidentalParensLeft + sign + Glyphs.accidentalParensRight : sign;
    return new Element(FrenchLuteNote.CATEGORY).setFont(this.fontInfo).setText(text);
  }

  /** A single bass uses a common row. Stack simultaneous diapasons in course order. */
  protected override getFretLine(position: TabNotePosition): number {
    if (position.str <= 6) return position.str - 1;
    const bassesAbove = this.positions.filter(({ str }) => str > 6 && str < position.str).length;
    return 6.5 + 1.5 * bassesAbove;
  }
}
