// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors

/**
 * ## Description
 *
 * Create a new tuplet from the specified notes. The notes must
 * be part of the same voice. If they are of different rhythmic
 * values, then options.numNotes must be set.
 *
 * @constructor
 * @param {Array.<Vex.Flow.StaveNote>} A set of notes: staveNotes,
 *   notes, etc... any class that inherits stemmableNote at some
 *   point in its prototype chain.
 * @param options: object {
 *
 *   numNotes: fit this many notes into...
 *   notesOccupied: ...the space of this many notes
 *
 *       Together, these two properties make up the tuplet ratio
 *     in the form of numNotes : notesOccupied.
 *       numNotes defaults to the number of notes passed in, so
 *     it is important that if you omit this property, all of
 *     the notes passed should be of the same note value.
 *       notesOccupied defaults to 2 -- so you should almost
 *     certainly pass this parameter for anything other than
 *     a basic triplet.
 *
 *   location:
 *     default 1, which is above the notes: ┌─── 3 ───┐
 *      -1 is below the notes └─── 3 ───┘
 *
 *   bracketed: boolean, draw a bracket around the tuplet number
 *     when true: ┌─── 3 ───┐   when false: 3
 *     defaults to true if notes are not beamed, false otherwise
 *
 *   ratioed: boolean
 *     when true: ┌─── 7:8 ───┐, when false: ┌─── 7 ───┐
 *     defaults to true if the difference between numNotes and
 *     notesOccupied is greater than 1.
 *
 *   yOffset: int, default 0
 *     manually offset a tuplet, for instance to avoid collisions
 *     with articulations, etc...
 * }
 */

import { Element } from './element';
import { Formatter } from './formatter';
import { Glyph } from './glyph';
import { Note } from './note';
import { Stem } from './stem';
import { StemmableNote } from './stemmablenote';
import { Tables } from './tables';
import { Category } from './typeguard';
import { defined, RuntimeError } from './util';

export interface TupletOptions {
  beatsOccupied?: number;
  bracketed?: boolean;
  location?: number;
  notesOccupied?: number;
  numNotes?: number;
  ratioed?: boolean;
  yOffset?: number;
}

export interface TupletMetrics {
  noteHeadOffset: number;
  stemOffset: number;
  bottomLine: number;
  topModifierOffset: number;
}

export const enum TupletLocation {
  BOTTOM = -1,
  TOP = +1,
}

export class Tuplet extends Element {
  static get CATEGORY(): string {
    return Category.Tuplet;
  }

  notes: Note[];

  protected options: TupletOptions;
  protected numNotes: number;
  protected point: number;

  protected bracketed: boolean;
  protected yPos: number;
  protected xPos: number;
  protected width: number;

  // location is initialized by the constructor via setTupletLocation(...).
  protected location!: number;

  protected notesOccupied: number;
  protected ratioed: boolean;
  protected numeratorGlyphs: Glyph[] = [];
  protected denominatorGlyphs: Glyph[] = [];

  static get LOCATION_TOP(): number {
    return TupletLocation.TOP;
  }
  static get LOCATION_BOTTOM(): number {
    return TupletLocation.BOTTOM;
  }
  static get NESTING_OFFSET(): number {
    return 15;
  }

  static get metrics(): TupletMetrics {
    const tupletMetrics = Tables.currentMusicFont().getMetrics().tuplet;

    if (!tupletMetrics) throw new RuntimeError('BadMetrics', `tuplet missing`);
    return tupletMetrics;
  }

  constructor(notes: Note[], options: TupletOptions = {}) {
    super();
    if (!notes || !notes.length) {
      throw new RuntimeError('BadArguments', 'No notes provided for tuplet.');
    }

    this.options = options;
    this.notes = notes;
    this.numNotes = this.options.numNotes != undefined ? this.options.numNotes : notes.length;

    // We accept beatsOccupied, but warn that it's deprecated: the preferred property name is now notesOccupied.
    if (this.options.beatsOccupied) {
      this.beatsOccupiedDeprecationWarning();
    }
    this.notesOccupied = this.options.notesOccupied || this.options.beatsOccupied || 2;
    if (this.options.bracketed != undefined) {
      this.bracketed = this.options.bracketed;
    } else {
      this.bracketed = notes.some((note) => !note.hasBeam());
    }

    this.ratioed =
      this.options.ratioed != undefined ? this.options.ratioed : Math.abs(this.notesOccupied - this.numNotes) > 1;
    this.point = (Tables.NOTATION_FONT_SCALE * 3) / 5;
    this.yPos = 16;
    this.xPos = 100;
    this.width = 200;

    this.setTupletLocation(this.options.location || Tuplet.LOCATION_TOP);

    Formatter.AlignRestsToNotes(notes, true, true);
    this.resolveGlyphs();
    this.attach();
  }

  attach(): void {
    for (let i = 0; i < this.notes.length; i++) {
      const note = this.notes[i];
      note.setTuplet(this);
    }
  }

  detach(): void {
    for (let i = 0; i < this.notes.length; i++) {
      const note = this.notes[i];
      note.resetTuplet(this);
    }
  }

  /**
   * Set whether or not the bracket is drawn.
   */
  setBracketed(bracketed: boolean): this {
    this.bracketed = !!bracketed;
    return this;
  }

  /**
   * Set whether or not the ratio is shown.
   */
  setRatioed(ratioed: boolean): this {
    this.ratioed = !!ratioed;
    return this;
  }

  /**
   * Set the tuplet indicator to be displayed either on the top or bottom of the stave.
   */
  setTupletLocation(location: number): this {
    if (location !== Tuplet.LOCATION_TOP && location !== Tuplet.LOCATION_BOTTOM) {
      // eslint-disable-next-line
      console.warn(`Invalid tuplet location [${location}]. Using Tuplet.LOCATION_TOP.`);
      location = Tuplet.LOCATION_TOP;
    }

    this.location = location;
    return this;
  }

  getNotes(): Note[] {
    return this.notes;
  }

  getNoteCount(): number {
    return this.numNotes;
  }

  beatsOccupiedDeprecationWarning(): void {
    // eslint-disable-next-line
    console.warn(
      'beatsOccupied has been deprecated as an option for tuplets. Please use notesOccupied instead.',
      'Calls to getBeatsOccupied / setBeatsOccupied should now be routed to getNotesOccupied / setNotesOccupied.',
      'The old methods will be removed in VexFlow 5.0.'
    );
  }

  getBeatsOccupied(): number {
    this.beatsOccupiedDeprecationWarning();
    return this.getNotesOccupied();
  }

  setBeatsOccupied(beats: number): void {
    this.beatsOccupiedDeprecationWarning();
    return this.setNotesOccupied(beats);
  }

  getNotesOccupied(): number {
    return this.notesOccupied;
  }

  setNotesOccupied(notes: number): void {
    this.detach();
    this.notesOccupied = notes;
    this.resolveGlyphs();
    this.attach();
  }

  resolveGlyphs(): void {
    this.numeratorGlyphs = [];
    let n = this.numNotes;
    while (n >= 1) {
      this.numeratorGlyphs.unshift(new Glyph('timeSig' + (n % 10), this.point));
      n = parseInt((n / 10).toString(), 10);
    }

    this.denominatorGlyphs = [];
    n = this.notesOccupied;
    while (n >= 1) {
      this.denominatorGlyphs.unshift(new Glyph('timeSig' + (n % 10), this.point));
      n = parseInt((n / 10).toString(), 10);
    }
  }

  // determine how many tuplets are nested within this tuplet
  // on the same side (above/below), to calculate a y
  // offset for this tuplet:
  getNestedTupletCount(): number {
    const location = this.location;
    const firstNote = this.notes[0];
    let maxTupletCount = countTuplets(firstNote, location);
    let minTupletCount = countTuplets(firstNote, location);

    // Count the tuplets that are on the same side (above/below)
    // as this tuplet:
    function countTuplets(note: Note, location: number) {
      return note.getTupletStack().filter((tuplet) => tuplet.location === location).length;
    }

    this.notes.forEach((note) => {
      const tupletCount = countTuplets(note, location);
      maxTupletCount = tupletCount > maxTupletCount ? tupletCount : maxTupletCount;
      minTupletCount = tupletCount < minTupletCount ? tupletCount : minTupletCount;
    });

    return maxTupletCount - minTupletCount;
  }

  // determine the y position of the tuplet:
  getYPosition(): number {
    // offset the tuplet for any nested tuplets between
    // it and the notes:
    const nestedTupletYOffset = this.getNestedTupletCount() * Tuplet.NESTING_OFFSET * -this.location;

    // offset the tuplet for any manual yOffset:
    const yOffset = this.options.yOffset || 0;

    // now iterate through the notes and find our highest
    // or lowest locations, to form a base yPosition
    const firstNote = this.notes[0];
    let yPosition;
    if (this.location === Tuplet.LOCATION_TOP) {
      yPosition = firstNote.checkStave().getYForLine(0) - Tuplet.metrics.topModifierOffset;

      // check modifiers above note to see if they will collide with tuplet beam
      for (let i = 0; i < this.notes.length; ++i) {
        const note = this.notes[i];
        let modLines = 0;
        const mc = note.getModifierContext();
        if (mc) {
          modLines = Math.max(modLines, mc.getState().topTextLine);
        }
        const modY = note.getYForTopText(modLines) - Tuplet.metrics.noteHeadOffset;
        if (note.hasStem() || note.isRest()) {
          const topY =
            note.getStemDirection() === Stem.UP
              ? note.getStemExtents().topY - Tuplet.metrics.stemOffset
              : note.getStemExtents().baseY - Tuplet.metrics.noteHeadOffset;
          yPosition = Math.min(topY, yPosition);
          if (modLines > 0) {
            yPosition = Math.min(modY, yPosition);
          }
        }
      }
    } else {
      let lineCheck = Tuplet.metrics.bottomLine; // tuplet default on line 4
      // check modifiers below note to see if they will collide with tuplet beam
      this.notes.forEach((nn) => {
        const mc = nn.getModifierContext();
        if (mc) {
          lineCheck = Math.max(lineCheck, mc.getState().textLine + 1);
        }
      });
      yPosition = firstNote.checkStave().getYForLine(lineCheck) + Tuplet.metrics.noteHeadOffset;

      for (let i = 0; i < this.notes.length; ++i) {
        if (this.notes[i].hasStem() || this.notes[i].isRest()) {
          const bottomY =
            this.notes[i].getStemDirection() === Stem.UP
              ? this.notes[i].getStemExtents().baseY + Tuplet.metrics.noteHeadOffset
              : this.notes[i].getStemExtents().topY + Tuplet.metrics.stemOffset;
          if (bottomY > yPosition) {
            yPosition = bottomY;
          }
        }
      }
    }

    return yPosition + nestedTupletYOffset + yOffset;
  }

  draw(): void {
    const ctx = this.checkContext();
    this.setRendered();

    // determine x value of left bound of tuplet
    const firstNote = this.notes[0] as StemmableNote;
    const lastNote = this.notes[this.notes.length - 1] as StemmableNote;

    if (!this.bracketed) {
      this.xPos = firstNote.getStemX();
      this.width = lastNote.getStemX() - this.xPos;
    } else {
      this.xPos = firstNote.getTieLeftX() - 5;
      this.width = lastNote.getTieRightX() - this.xPos + 5;
    }

    // determine y value for tuplet
    this.yPos = this.getYPosition();

    const addGlyphWidth = (width: number, glyph: Glyph) => width + defined(glyph.getMetrics().width);

    // calculate total width of tuplet notation
    let width = this.numeratorGlyphs.reduce(addGlyphWidth, 0);
    if (this.ratioed) {
      width = this.denominatorGlyphs.reduce(addGlyphWidth, width);
      width += this.point * 0.32;
    }

    const notationCenterX = this.xPos + this.width / 2;
    const notationStartX = notationCenterX - width / 2;

    // draw bracket if the tuplet is not beamed
    if (this.bracketed) {
      const lineWidth = this.width / 2 - width / 2 - 5;

      // only draw the bracket if it has positive length
      if (lineWidth > 0) {
        ctx.fillRect(this.xPos, this.yPos, lineWidth, 1);
        ctx.fillRect(this.xPos + this.width / 2 + width / 2 + 5, this.yPos, lineWidth, 1);
        ctx.fillRect(this.xPos, this.yPos + (this.location === Tuplet.LOCATION_BOTTOM ? 1 : 0), 1, this.location * 10);
        ctx.fillRect(
          this.xPos + this.width,
          this.yPos + (this.location === Tuplet.LOCATION_BOTTOM ? 1 : 0),
          1,
          this.location * 10
        );
      }
    }

    // draw numerator glyphs
    const shiftY = Tables.currentMusicFont().lookupMetric('digits.shiftY', 0);

    let xOffset = 0;
    this.numeratorGlyphs.forEach((glyph) => {
      glyph.render(ctx, notationStartX + xOffset, this.yPos + this.point / 3 - 2 + shiftY);
      xOffset += defined(glyph.getMetrics().width);
    });

    // display colon and denominator if the ratio is to be shown
    if (this.ratioed) {
      const colonX = notationStartX + xOffset + this.point * 0.16;
      const colonRadius = this.point * 0.06;
      ctx.beginPath();
      ctx.arc(colonX, this.yPos - this.point * 0.08, colonRadius, 0, Math.PI * 2, false);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(colonX, this.yPos + this.point * 0.12, colonRadius, 0, Math.PI * 2, false);
      ctx.closePath();
      ctx.fill();
      xOffset += this.point * 0.32;
      this.denominatorGlyphs.forEach((glyph) => {
        glyph.render(ctx, notationStartX + xOffset, this.yPos + this.point / 3 - 2 + shiftY);
        xOffset += defined(glyph.getMetrics().width);
      });
    }
  }
}
