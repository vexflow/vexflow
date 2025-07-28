// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors

/**
 * ## Description
 *
 * Create a new tuplet from the specified notes. The notes must
 * be part of the same voice. If they are of different rhythmic
 * values, then options.numNotes must be set.
 *
 * @constructor
 * @param {Array.<VexFlow.StaveNote>} A set of notes: staveNotes,
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
 *
 *   suffix: string
 *      suffix to show after ratio.
 *      NOTE: any of the Glyphs.met... work well for note glyphs
 * }
 */

import { BoundingBox } from './boundingbox';
import { Element } from './element';
import { Formatter } from './formatter';
import { Glyphs } from './glyphs';
import { Metrics } from './metrics';
import { Note } from './note';
import { Stem } from './stem';
import { StemmableNote } from './stemmablenote';
import { Tables } from './tables';
import { Category } from './typeguard';
import { RuntimeError } from './util';

export interface TupletOptions {
  bracketed?: boolean;
  location?: number;
  notesOccupied?: number;
  numNotes?: number;
  ratioed?: boolean;
  yOffset?: number;
  textYOffset?: number;
  suffix?: string;
}

export const enum TupletLocation {
  BOTTOM = -1,
  TOP = +1,
}

export class Tuplet extends Element {
  static override get CATEGORY(): string {
    return Category.Tuplet;
  }

  notes: Note[];
  protected options: Required<TupletOptions>;
  protected textElement: Element;
  protected suffixElement: Element;

  static get LOCATION_TOP(): number {
    return TupletLocation.TOP;
  }
  static get LOCATION_BOTTOM(): number {
    return TupletLocation.BOTTOM;
  }
  static get NESTING_OFFSET(): number {
    return 15;
  }

  constructor(notes: Note[], options: TupletOptions = {}) {
    super();

    if (!notes || !notes.length) {
      throw new RuntimeError('BadArguments', 'No notes provided for tuplet.');
    }

    this.notes = notes;
    const numNotes = options.numNotes !== undefined ? options.numNotes : notes.length;
    const notesOccupied = options.notesOccupied || 2;
    const bracketed = options.bracketed !== undefined ? options.bracketed : notes.some((note) => !note.hasBeam());
    const ratioed = options.ratioed !== undefined ? options.ratioed : Math.abs(notesOccupied - numNotes) > 1;
    const location = options.location || Tuplet.LOCATION_TOP;
    const yOffset = options.yOffset || Metrics.get('Tuplet.yOffset');
    const textYOffset = options.textYOffset || Metrics.get('Tuplet.textYOffset');
    const suffix = options.suffix || '';

    this.options = {
      bracketed,
      location,
      notesOccupied,
      numNotes,
      ratioed,
      yOffset,
      textYOffset,
      suffix,
    };
    this.textElement = new Element('Tuplet');
    this.suffixElement = new Element('Tuplet.suffix');

    this.setTupletLocation(location || Tuplet.LOCATION_TOP);

    Formatter.AlignRestsToNotes(notes, true, true);
    this.resolveGlyphs();
    this.attach();
  }

  attach(): void {
    for (let i = 0; i < this.notes.length; i++) {
      const note = this.notes[i];
      if (!note.getTupletStack().includes(this)) {
        note.addTuplet(this);
      }
    }
  }

  detach(): void {
    for (let i = 0; i < this.notes.length; i++) {
      const note = this.notes[i];
      note.removeTuplet(this);
    }
  }

  /**
   * Set whether or not the bracket is drawn.
   */
  setBracketed(bracketed: boolean): this {
    this.options.bracketed = bracketed;
    return this;
  }

  /**
   * Set whether or not the ratio is shown.
   */
  setRatioed(ratioed: boolean): this {
    this.options.ratioed = ratioed;
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

    this.options.location = location;
    return this;
  }

  getNotes(): Note[] {
    return this.notes;
  }

  getNoteCount(): number {
    return this.options.numNotes;
  }

  getNotesOccupied(): number {
    return this.options.notesOccupied;
  }

  setNotesOccupied(notes: number): void {
    this.detach();
    this.options.notesOccupied = notes;
    this.resolveGlyphs();
    this.attach();
  }

  resolveGlyphs(): void {
    // Ratio glyph calculations
    let numerator = '';
    let denominator = '';
    let n = this.options.numNotes;
    while (n >= 1) {
      numerator = String.fromCharCode(0xe880 /* tuplet0 */ + (n % 10)) + numerator;
      n = Math.floor(n / 10);
    }

    if (this.options.ratioed) {
      n = this.options.notesOccupied;
      while (n >= 1) {
        denominator = String.fromCharCode(0xe880 /* tuplet0 */ + (n % 10)) + denominator;
        n = Math.floor(n / 10);
      }
      denominator = Glyphs.tupletColon + denominator;
    }
    this.textElement.setText(numerator + denominator);

    // resolve shown glyph if needed
    if (this.options.suffix) {
      this.suffixElement.setText(this.options.suffix);
    }
  }

  // determine how many tuplets are nested within this tuplet
  // on the same side (above/below), to calculate a y
  // offset for this tuplet:
  getNestedTupletCount(): number {
    const { location } = this.options;

    let maxOffset = 0;
    for (const note of this.notes) {
      // Find the array of tuplets that note belongs to
      const stack = note
        .getTupletStack()
        // Count the tuplets that are on the same side (above/below) as this tuplet.
        .filter((tuplet) => tuplet.options.location === location);

      // Find where “this” appears in that filtered stack
      const index = stack.indexOf(this);
      if (index >= 0 && index > maxOffset) {
        maxOffset = index;
      }
    }

    return maxOffset;
  }

  // determine the y position of the tuplet:
  getYPosition(): number {
    // offset the tuplet for any nested tuplets between
    // it and the notes:
    const nestedTupletYOffset = this.getNestedTupletCount() * Tuplet.NESTING_OFFSET * -this.options.location;

    // offset the tuplet for any manual yOffset:
    const yOffset = this.options.yOffset ?? 0;

    // now iterate through the notes and find our highest
    // or lowest locations, to form a base yPosition
    const firstNote = this.notes[0];
    let yPosition;
    if (this.options.location === Tuplet.LOCATION_TOP) {
      yPosition = firstNote.checkStave().getYForLine(0) - 1.5 * Tables.STAVE_LINE_DISTANCE;

      // check modifiers above note to see if they will collide with tuplet beam
      for (let i = 0; i < this.notes.length; ++i) {
        const note = this.notes[i];
        let modLines = 0;
        const mc = note.getModifierContext();
        if (mc) {
          modLines = Math.max(modLines, mc.getState().topTextLine);
        }
        const modY = note.getYForTopText(modLines) - 2 * Tables.STAVE_LINE_DISTANCE;
        if (note.hasStem() || note.isRest()) {
          const topY =
            note.getStemDirection() === Stem.UP
              ? note.getStemExtents().topY - Tables.STAVE_LINE_DISTANCE
              : note.getStemExtents().baseY - 2 * Tables.STAVE_LINE_DISTANCE;
          yPosition = Math.min(topY, yPosition);
          if (modLines > 0) {
            yPosition = Math.min(modY, yPosition);
          }
        }
      }
    } else {
      let lineCheck = 4; // tuplet default on line 4
      // check modifiers below note to see if they will collide with tuplet beam
      this.notes.forEach((nn) => {
        const mc = nn.getModifierContext();
        if (mc) {
          lineCheck = Math.max(lineCheck, mc.getState().textLine + 1);
        }
      });
      yPosition = firstNote.checkStave().getYForLine(lineCheck) + 2 * Tables.STAVE_LINE_DISTANCE;

      for (let i = 0; i < this.notes.length; ++i) {
        if (this.notes[i].hasStem() || this.notes[i].isRest()) {
          const bottomY =
            this.notes[i].getStemDirection() === Stem.UP
              ? this.notes[i].getStemExtents().baseY + 2 * Tables.STAVE_LINE_DISTANCE
              : this.notes[i].getStemExtents().topY + Tables.STAVE_LINE_DISTANCE;
          if (bottomY > yPosition) {
            yPosition = bottomY;
          }
        }
      }
    }

    return yPosition + nestedTupletYOffset + yOffset;
  }

  override draw(): void {
    const { location, bracketed, textYOffset, suffix } = this.options;

    const bracketPadding = Metrics.get('Tuplet.bracket.padding');
    const bracketThickness = Metrics.get('Tuplet.bracket.lineWidth');
    const bracketLegLength = Metrics.get('Tuplet.bracket.legLength');
    const extraSpacing = Metrics.get('Tuplet.suffix.extraSpacing');
    const suffixOffsetY = Metrics.get('Tuplet.suffix.suffixOffsetY');

    const ctx = this.checkContext();
    let xPos = 0;
    let yPos = 0;

    // determine x value of left bound of tuplet
    const firstNote = this.notes[0] as StemmableNote;
    const lastNote = this.notes[this.notes.length - 1] as StemmableNote;
    let bodyWidth = 0;
    if (!bracketed) {
      xPos = firstNote.getStemX();
      bodyWidth = lastNote.getStemX() - xPos;
      this.setWidth(bodyWidth);
    } else {
      xPos = firstNote.getTieLeftX() - bracketPadding;
      bodyWidth = lastNote.getTieRightX() - xPos + bracketPadding;
      // value added to fully include right bracket leg in bounding box
      this.setWidth(bodyWidth + bracketThickness);
    }

    this.setX(xPos);

    // determine y value for tuplet
    yPos = this.getYPosition();

    // set y and height for bounding box calculations
    this.setY(location === TupletLocation.TOP ? yPos : yPos - bracketLegLength + bracketThickness);
    this.height = bracketLegLength;

    // calculate width taken by all text elements
    const ratioWidth = this.textElement.getWidth();
    let totalTextWidth = ratioWidth;
    let noteWidth = 0;
    if (suffix) {
      noteWidth = this.suffixElement.getWidth();
      totalTextWidth = ratioWidth + extraSpacing + noteWidth;
    }

    // find center of notation for text placement
    const notationCenterX = xPos + bodyWidth / 2;
    const notationStartX = notationCenterX - totalTextWidth / 2;

    // Compute a common vertical coordinate for text rendering.
    // (Using the text element’s height as a reference)
    const commonTextY =
      yPos + this.textElement.getHeight() / 2 + (location === Tuplet.LOCATION_TOP ? -1 : 1) * textYOffset;

    // start grouping
    const clsAttribute = this.getAttribute('class');
    ctx.openGroup('tuplet' + (clsAttribute ? ' ' + clsAttribute : ''), this.getAttribute('id'));

    // draw bracket if the tuplet is not beamed
    if (bracketed) {
      const lineWidth = bodyWidth / 2 - totalTextWidth / 2 - bracketPadding;
      const isTupletBottom = location === Tuplet.LOCATION_BOTTOM;

      if (lineWidth > 0) {
        ctx.fillRect(xPos, yPos, lineWidth, bracketThickness);
        ctx.fillRect(xPos + bodyWidth / 2 + totalTextWidth / 2 + bracketPadding, yPos, lineWidth, bracketThickness);
        ctx.fillRect(xPos, yPos + (isTupletBottom ? 1 : 0), bracketThickness, location * bracketLegLength);
        ctx.fillRect(xPos + bodyWidth, yPos + (isTupletBottom ? 1 : 0), bracketThickness, location * bracketLegLength);
      }
    }

    // draw ratio text (x:y)
    let currentX = notationStartX;
    this.textElement.renderText(ctx, currentX, commonTextY);
    // set text element proper x and y
    this.textElement.setX(currentX);
    this.textElement.setY(commonTextY);
    currentX += ratioWidth + extraSpacing;

    // draw note glyph if wanted
    if (suffix) {
      const suffixY = commonTextY + suffixOffsetY;
      this.suffixElement.renderText(ctx, currentX, suffixY);
      this.suffixElement.setX(currentX);
      this.suffixElement.setY(suffixY);
      currentX += noteWidth;
    }

    this.drawPointerRect();
    ctx.closeGroup();
    this.setRendered();
  }

  override getBoundingBox(): BoundingBox {
    const { bracketed, suffix } = this.options;

    const ratioBounding = this.textElement.getBoundingBox();
    const suffixBounding = this.suffixElement.getBoundingBox();

    const mergedText = suffix ? ratioBounding.mergeWith(suffixBounding) : ratioBounding;

    if (!bracketed) {
      return mergedText;
    }

    const bracketBounding = new BoundingBox(this.x, this.y, this.width, this.height);

    return bracketBounding.mergeWith(mergedText);
  }
}
