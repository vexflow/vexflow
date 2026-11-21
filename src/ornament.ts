// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author Cyril Silverman
// MIT License
// Places ornaments, accidental signs and written trill partners on their principal notes.

import { getBottomY, getInitialOffset, getTopY } from './articulation';
import { BoundingBox } from './boundingbox';
import { Element } from './element';
import { Glyphs } from './glyphs';
import { Metrics } from './metrics';
import { Modifier, ModifierPosition } from './modifier';
import { ModifierContextState } from './modifiercontext';
import { Note } from './note';
import { Stem } from './stem';
import { StemmableNote } from './stemmablenote';
import { Tables } from './tables';
import { Category, isStaveNote } from './typeguard';
import { log, RuntimeError } from './util';

// eslint-disable-next-line
function L(...args: any[]) {
  if (Ornament.DEBUG) log('VexFlow.Ornament', args);
}

/**
 * Ornament implements ornaments as modifiers that can be
 * attached to notes. The complete list of ornaments is available in
 * `tables.ts` under `VexFlow.ornamentCodes`.
 *
 * See `tests/ornament_tests.ts` for usage examples.
 */
export class Ornament extends Modifier {
  /** To enable logging for this class. Set `VexFlow.Ornament.DEBUG` to `true`. */
  static DEBUG: boolean = false;

  /** Ornaments category string. */
  static override get CATEGORY(): string {
    return Category.Ornament;
  }
  static get minPadding(): number {
    return Metrics.get('NoteHead.minPadding');
  }

  protected ornamentAlignWithNoteHead: string[] | boolean;
  protected type: string;

  protected delayed: boolean;
  /** A written, untimed trill partner. Its column follows earlier right-hand modifiers. */
  private auxiliary?: { pitch: string; glyph: Element; headOffset: number; headWidth: number };
  private auxiliaryOffset = 0;
  /** Side spacing is recomputed per format and is independent of authored shifts. */
  private sideOffset = 0;
  protected adjustForStemDirection: boolean;
  public renderOptions: {
    accidentalUpperPadding: number;
    accidentalLowerPadding: number;
  };
  protected accidentalUpper?: Element;
  protected accidentalLower?: Element;
  protected delayXShift?: number;

  /** Arrange ornaments inside `ModifierContext` */
  static format(ornaments: Ornament[], state: ModifierContextState): boolean {
    if (!ornaments || ornaments.length === 0) return false;

    let width = 0; // width is used by ornaments, which are always centered on the note head
    let rightShift = state.rightShift; // jazz ornaments calculate r/l shift separately
    let leftShift = state.leftShift;

    for (let i = 0; i < ornaments.length; ++i) {
      const ornament = ornaments[i];
      const increment = 2;

      ornament.sideOffset = 0;
      if (ornament.auxiliary) {
        ornament.auxiliaryOffset = rightShift;
        rightShift += ornament.auxiliary.glyph.getWidth() + Ornament.minPadding + 2;
      }
      if (ornament.position === ModifierPosition.RIGHT) {
        ornament.sideOffset = rightShift + 2;
        rightShift += ornament.width + Ornament.minPadding;
      } else if (ornament.position === ModifierPosition.LEFT) {
        ornament.sideOffset = -(leftShift + ornament.width + 2);
        leftShift += ornament.width + Ornament.minPadding;
      } else if (ornament.position === ModifierPosition.ABOVE) {
        width = Math.max(ornament.getWidth(), width);
        const note = ornament.getNote() as StemmableNote;
        let curTop = note.getLineNumber(true) + state.topTextLine;
        const stem = note.getStem();
        if (stem && note.getStemDirection() === Stem.UP) {
          curTop += Math.abs(stem.getHeight()) / Tables.STAVE_LINE_DISTANCE;
        }
        const numLines = note.getStave()?.getNumLines() ?? 0;
        // make sure that the ornaments stay above the staff
        if (curTop < numLines) state.topTextLine += numLines - curTop;
        ornament.setTextLine(state.topTextLine);
        state.topTextLine += increment;
      } else {
        width = Math.max(ornament.getWidth(), width);
        ornament.setTextLine(state.textLine);
        state.textLine += increment;
      }
    }

    // Note: 'legit' ornaments don't consider other modifiers when calculating their
    // X position, but jazz ornaments sometimes need to.
    state.leftShift = leftShift + width / 2;
    state.rightShift = rightShift + width / 2;
    return true;
  }

  /**
   * ornamentNoteTransition means the jazz ornament represents an effect from one note to another,
   * these are generally on the top of the staff.
   */
  static get ornamentNoteTransition(): string[] {
    return ['flip', 'jazzTurn', 'smear'];
  }

  /**
   * ornamentAttack indicates something that happens in the attach, placed before the note and
   * any accidentals
   */
  static get ornamentAttack(): string[] {
    return ['scoop'];
  }

  /**
   * The ornament is aligned based on the note head, but without regard to whether the
   * stem goes up or down.
   */
  static get ornamentAlignWithNoteHead(): string[] {
    return ['doit', 'fall', 'fallLong', 'doitLong', 'scoop'];
  }

  /**
   * An ornament that happens on the release of the note, generally placed after the
   * note and overlapping the next beat/measure..
   */
  static get ornamentRelease(): string[] {
    return ['doit', 'fall', 'fallLong', 'doitLong', 'jazzTurn', 'smear', 'flip'];
  }

  static get ornamentLeft(): string[] {
    return ['scoop'];
  }

  static get ornamentRight(): string[] {
    return ['doit', 'fall', 'fallLong', 'doitLong'];
  }

  static get ornamentYShift(): string[] {
    return ['fallLong'];
  }

  /** ornamentArticulation goes above/below the note based on space availablity */
  static get ornamentArticulation(): string[] {
    return ['bend', 'plungerClosed', 'plungerOpen'];
  }

  /**
   * Create a new ornament of type `type`, which is an entry in
   * `VexFlow.ornamentCodes` in `tables.ts`.
   */
  constructor(type: string) {
    super();

    // Default position ABOVE
    this.position = ModifierPosition.ABOVE;
    if (Ornament.ornamentRight.indexOf(type) >= 0) {
      this.position = ModifierPosition.RIGHT;
    }
    if (Ornament.ornamentLeft.indexOf(type) >= 0) {
      this.position = ModifierPosition.LEFT;
    }
    this.type = type;
    this.delayed = false;

    this.renderOptions = {
      accidentalLowerPadding: 3,
      accidentalUpperPadding: 3,
    };

    // some jazz ornaments are above or below depending on stem direction.
    this.adjustForStemDirection = false;

    this.ornamentAlignWithNoteHead = Ornament.ornamentAlignWithNoteHead.indexOf(this.type) >= 0;

    // Is this a jazz ornament that goes between this note and the next note.
    if (Ornament.ornamentNoteTransition.indexOf(this.type) >= 0) {
      this.delayed = true;
    }

    this.text = Tables.ornamentCodes(this.type);
  }

  /** Set note attached to ornament. */
  override setNote(note: Note): this {
    super.setNote(note);
    // articulations above/below the line can be stacked.
    if (Ornament.ornamentArticulation.indexOf(this.type) >= 0) {
      // Unfortunately we don't know the stem direction.  So we base it
      // on the line number, but also allow it to be overridden.
      if (note.getLineNumber() >= 3) {
        this.position = Modifier.Position.ABOVE;
      } else {
        this.position = Modifier.Position.BELOW;
      }
    }
    return this;
  }

  /** Set whether the ornament is to be delayed. */
  setDelayed(delayed: boolean): this {
    this.delayed = delayed;
    return this;
  }

  /** Set the upper accidental for the ornament. */
  setUpperAccidental(accid: string): this {
    this.accidentalUpper = new Element();
    this.accidentalUpper.setText(Tables.accidentalCodes(accid));
    return this;
  }

  /** Set the lower accidental for the ornament. */
  setLowerAccidental(accid: string): this {
    this.accidentalLower = new Element();
    this.accidentalLower.setText(Tables.accidentalCodes(accid));
    return this;
  }

  /** Show a parenthesized cue beside the trill's written principal, e.g. bb/4, an/4 or a/4. */
  setAuxiliaryPitch(pitch?: string): this {
    if (pitch === undefined) {
      this.auxiliary = undefined;
      return this;
    }
    const spelling = /^([a-g])(bb|##|b|#|n)?\/(-?\d)$/i.exec(pitch);
    if (this.type !== 'tr' || !spelling) {
      throw new RuntimeError('BadArguments', 'A pitched trill needs a written pitch such as bb/4.');
    }
    const accidental = spelling[2] ? Tables.accidentalCodes(spelling[2].toLowerCase()) : '';
    const glyph = new Element().setFont(this.fontInfo).setFontSize(this.fontSizeInPoints * 0.65);
    const prefix = Glyphs.accidentalParensLeft + accidental;
    const headOffset = glyph.setText(prefix).getWidth();
    const headWidth = glyph.setText(Glyphs.noteheadBlack).getWidth();
    glyph.setText(prefix + Glyphs.noteheadBlack + Glyphs.accidentalParensRight);
    this.auxiliary = { pitch: pitch.toLowerCase(), glyph, headOffset, headWidth };
    return this;
  }

  private layoutShiftY = 0;
  /** Move the whole ornament and its auxiliary signs together. */
  setLayoutShiftY(y: number): void {
    this.layoutShiftY = y;
  }
  /** Recompute delayed and auxiliary positions against the current tick contexts. */
  private positionElements(): { element: Element; x: number; y: number }[] {
    const note = this.checkAttachedNote() as StemmableNote;
    const stave = note.checkStave();
    const parts: { element: Element; x: number; y: number }[] = [];
    // Get initial coordinates for the modifier position
    const start = note.getModifierStartXY(this.position, this.index);
    let glyphX = start.x + this.sideOffset;

    const staffSpace = stave.getSpacingBetweenLines();
    const initialOffset = getInitialOffset(note, this.position);

    // If the ornament is aligned with the note head, don't consider the stave y
    // but use the 'natural' modifier y
    let glyphY = this.ornamentAlignWithNoteHead ? start.y : 0;
    if (this.position === ModifierPosition.ABOVE) {
      glyphY = getTopY(note, this.textLine) - (this.textLine + initialOffset) * staffSpace;
    }
    if (this.position === ModifierPosition.BELOW) {
      glyphY = getBottomY(note, this.textLine) + (this.textLine + initialOffset + 1.5) * staffSpace;
    }

    glyphY += this.layoutShiftY;
    // Adjust x position if ornament is delayed
    if (this.delayed) {
      let delayXShift = 0;
      const startX = note.getTickContext().getX();
      if (this.delayXShift !== undefined) {
        delayXShift = this.delayXShift;
      } else {
        const tickables = note.getVoice().getTickables();
        const index = tickables.indexOf(note);
        const nextContext = index + 1 < tickables.length ? tickables[index + 1].checkTickContext() : undefined;
        if (nextContext) {
          delayXShift += (nextContext.getX() - startX) * 0.5;
        } else {
          delayXShift += (stave.getX() + stave.getWidth() - glyphX) * 0.5;
        }
      }
      glyphX += delayXShift;
    }

    L('Rendering ornament: ', this.text.charCodeAt(0), glyphX, glyphY);
    if (this.accidentalLower) {
      parts.push({
        element: this.accidentalLower,
        x: glyphX + this.xShift - this.accidentalLower.getWidth() / 2,
        y: glyphY + this.yShift - this.accidentalLower.getTextMetrics().actualBoundingBoxDescent,
      });
      glyphY -= this.accidentalLower.getHeight() + this.renderOptions.accidentalLowerPadding;
    }

    const offset = Ornament.ornamentYShift.includes(this.type) ? this.getHeight() : 0;
    this.x =
      glyphX -
      (this.position === ModifierPosition.ABOVE || this.position === ModifierPosition.BELOW ? this.width / 2 : 0);
    this.y = glyphY + offset;
    parts.push({ element: this, x: 0, y: 0 });
    if (this.accidentalUpper) {
      parts.push({
        element: this.accidentalUpper,
        x: glyphX + this.xShift - this.accidentalUpper.getWidth() / 2,
        y:
          this.y +
          this.yShift -
          this.getHeight() -
          this.renderOptions.accidentalUpperPadding -
          this.accidentalUpper.getTextMetrics().actualBoundingBoxDescent,
      });
    }
    if (this.auxiliary) {
      if (!isStaveNote(note) || note.isRest())
        throw new RuntimeError('BadArguments', 'A trill partner needs a pitched staff note.');
      // Measure the diatonic interval from the written key. The principal's actual line
      // also accounts for octave clefs and authored staff placement.
      const index = this.checkIndex();
      const principal = Tables.keyProperties(note.getKeys()[index], 'treble');
      const partner = Tables.keyProperties(this.auxiliary.pitch, 'treble');
      const y = note.getYs()[index] - (partner.line - principal.line) * staffSpace;
      const right = note.getModifierStartXY(ModifierPosition.RIGHT, index, { forceFlagRight: true });
      const headEdge = Math.max(...note.getHeadInk().map((box) => box.x + box.w));
      parts.push({ element: this.auxiliary.glyph, x: Math.max(right.x, headEdge + 2) + this.auxiliaryOffset, y });
    }
    return parts;
  }

  /** Outside the staff, ledger lines belong to the cue head alone. */
  private cueLedgers(element: Element, x: number, y: number): BoundingBox[] {
    if (!this.auxiliary || element !== this.auxiliary.glyph) return [];
    const stave = this.checkAttachedNote().checkStave();
    const top = stave.getYForLine(0);
    const bottom = stave.getYForLine(stave.getNumLines() - 1);
    const step = stave.getSpacingBetweenLines();
    if (!(step > 0) || !Number.isFinite(y)) return [];
    const lines: BoundingBox[] = [];
    const left = x + this.auxiliary.headOffset - 1;
    const width = this.auxiliary.headWidth + 2;
    for (let line = top - step; line >= y; line -= step) lines.push(new BoundingBox(left, line, width, 1));
    for (let line = bottom + step; line <= y; line += step) lines.push(new BoundingBox(left, line, width, 1));
    return lines;
  }

  /** Include the trill sign, its accidentals and the complete pitched cue in layout. */
  override getBoundingBox(): BoundingBox {
    const boxes = this.positionElements().flatMap(({ element, x, y }) => [
      element.getTextInk(x + element.getX(), y + element.getY()),
      ...this.cueLedgers(element, x, y),
    ]);
    return boxes.reduce((bounds, box) => bounds.mergeWith(box));
  }

  override draw(): void {
    const ctx = this.checkContext();
    this.setRendered();
    const clsAttribute = this.getAttribute('class');
    ctx.openGroup('ornament' + (clsAttribute ? ' ' + clsAttribute : ''), this.getAttribute('id'));
    for (const { element, x, y } of this.positionElements()) {
      for (const line of this.cueLedgers(element, x, y)) ctx.fillRect(line.x, line.y, line.w, line.h);
      element.renderText(ctx, x, y);
    }
    this.drawPointerRect();
    ctx.closeGroup();
  }
}
