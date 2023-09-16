// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author Cyril Silverman
// MIT License

import { getBottomY, getInitialOffset, getTopY } from './articulation';
import { Element } from './element';
import { Modifier, ModifierPosition } from './modifier';
import { ModifierContextState } from './modifiercontext';
import { Note } from './note';
import { StemmableNote } from './stemmablenote';
import { Tables } from './tables';
import { TickContext } from './tickcontext';
import { Category } from './typeguard';
import { log } from './util';

// eslint-disable-next-line
function L(...args: any[]) {
  if (Ornament.DEBUG) log('Vex.Flow.Ornament', args);
}

/**
 * Ornament implements ornaments as modifiers that can be
 * attached to notes. The complete list of ornaments is available in
 * `tables.ts` under `Vex.Flow.ornamentCodes`.
 *
 * See `tests/ornament_tests.ts` for usage examples.
 */
export class Ornament extends Modifier {
  /** To enable logging for this class. Set `Vex.Flow.Ornament.DEBUG` to `true`. */
  static DEBUG: boolean = false;

  /** Ornaments category string. */
  static get CATEGORY(): string {
    return Category.Ornament;
  }
  static get minPadding(): number {
    return Tables.lookupMetric('NoteHead.minPadding');
  }

  protected ornamentAlignWithNoteHead: string[] | boolean;
  protected type: string;

  protected delayed: boolean;
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

      if (ornament.position === ModifierPosition.RIGHT) {
        ornament.xShift += rightShift + 2;
        rightShift += ornament.width + Ornament.minPadding;
      } else if (ornament.position === ModifierPosition.LEFT) {
        ornament.xShift -= leftShift + ornament.width + 2;
        leftShift += ornament.width + Ornament.minPadding;
      } else if (ornament.position === ModifierPosition.ABOVE) {
        width = Math.max(ornament.getWidth(), width);
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
   * `Vex.Flow.ornamentCodes` in `tables.ts`.
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
  setNote(note: Note): this {
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

  /** Render ornament in position next to note. */
  draw(): void {
    const ctx = this.checkContext();
    const note = this.checkAttachedNote() as StemmableNote;
    this.setRendered();

    const stave = note.checkStave();

    this.applyStyle();
    ctx.openGroup('ornament', this.getAttribute('id'));

    // Get initial coordinates for the modifier position
    const start = note.getModifierStartXY(this.position, this.index);
    let glyphX = start.x;

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

    // Ajdust x position if ornament is delayed
    if (this.delayed) {
      let delayXShift = 0;
      const startX = note.getTickContext().getX();
      if (this.delayXShift !== undefined) {
        delayXShift = this.delayXShift;
      } else {
        const nextContext = TickContext.getNextContext(note.getTickContext());
        if (nextContext) {
          delayXShift += (nextContext.getX() - startX) * 0.5;
        } else {
          delayXShift += (stave.getX() + stave.getWidth() - startX) * 0.5;
        }
        this.delayXShift = delayXShift;
      }
      glyphX += delayXShift;
    }

    L('Rendering ornament: ', this.text.charCodeAt(0), glyphX, glyphY);
    if (this.accidentalLower) {
      this.accidentalLower.renderText(
        ctx,
        glyphX + this.xShift - this.accidentalLower.getWidth() * 0.5,
        glyphY + this.yShift - this.accidentalLower.getTextMetrics().actualBoundingBoxDescent
      );
      glyphY -= this.accidentalLower.getHeight() + this.renderOptions.accidentalLowerPadding;
    }

    // ornament requires yShift
    if (Ornament.ornamentYShift.indexOf(this.type) >= 0) {
      this.yShift += this.getHeight();
    }

    this.renderText(
      ctx,
      glyphX -
        (this.position === ModifierPosition.ABOVE || this.position === ModifierPosition.BELOW ? this.width * 0.5 : 0),
      glyphY
    );

    if (this.accidentalUpper) {
      glyphY -= this.getHeight() + this.renderOptions.accidentalUpperPadding;
      this.accidentalUpper.renderText(
        ctx,
        glyphX + this.xShift - this.accidentalUpper.getWidth() * 0.5,
        glyphY + this.yShift - this.accidentalUpper.getTextMetrics().actualBoundingBoxDescent
      );
    }
    ctx.closeGroup();
    this.restoreStyle();
  }
}
