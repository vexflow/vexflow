// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author Cyril Silverman
// MIT License

import { Glyph } from './glyph';
import { Modifier } from './modifier';
import { ModifierContextState } from './modifiercontext';
import { Stem } from './stem';
import { StemmableNote } from './stemmablenote';
import { Tables } from './tables';
import { TickContext } from './tickcontext';
import { Category, isTabNote } from './typeguard';
import { defined, log, RuntimeError } from './util';

// eslint-disable-next-line
function L(...args: any[]) {
  if (Ornament.DEBUG) log('Vex.Flow.Ornament', args);
}

export interface OrnamentMetrics {
  xOffset: number;
  yOffset: number;
  stemUpYOffset: number;
  reportedWidth: number;
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
    const musicFont = Tables.currentMusicFont();
    return musicFont.lookupMetric('noteHead.minPadding');
  }

  protected ornament: {
    code: string;
  };
  protected stemUpYOffset: number;
  protected ornamentAlignWithNoteHead: string[] | boolean;
  protected type: string;

  protected delayed: boolean;
  protected reportedWidth: number;
  protected adjustForStemDirection: boolean;
  public renderOptions: {
    accidentalUpperPadding: number;
    accidentalLowerPadding: number;
    fontScale: number;
  };
  protected glyph: Glyph;
  protected accidentalUpper?: Glyph;
  protected accidentalLower?: Glyph;
  protected delayXShift?: number;

  /** Arrange ornaments inside `ModifierContext` */
  static format(ornaments: Ornament[], state: ModifierContextState): boolean {
    if (!ornaments || ornaments.length === 0) return false;

    let width = 0; // width is used by ornaments, which are always centered on the note head
    let rightShift = state.rightShift; // jazz ornaments calculate r/l shift separately
    let leftShift = state.leftShift;
    let yOffset = 0;

    for (let i = 0; i < ornaments.length; ++i) {
      const ornament = ornaments[i];
      const increment = 2;

      if (Ornament.ornamentRelease.indexOf(ornament.type) >= 0) {
        ornament.xShift += rightShift + 2;
      }
      if (Ornament.ornamentAttack.indexOf(ornament.type) >= 0) {
        ornament.xShift -= leftShift + 2;
      }
      if (ornament.reportedWidth && ornament.xShift < 0) {
        leftShift += ornament.reportedWidth;
      } else if (ornament.reportedWidth && ornament.xShift >= 0) {
        rightShift += ornament.reportedWidth + Ornament.minPadding;
      } else {
        width = Math.max(ornament.getWidth(), width);
      }
      // articulations above/below the line can be stacked.
      if (Ornament.ornamentArticulation.indexOf(ornament.type) >= 0) {
        // Unfortunately we don't know the stem direction.  So we base it
        // on the line number, but also allow it to be overridden.
        const ornamentNote = defined(ornament.note, 'NoAttachedNote');
        if (ornamentNote.getLineNumber() >= 3 || ornament.getPosition() === Modifier.Position.ABOVE) {
          state.topTextLine += increment;
          ornament.yShift += yOffset;
          yOffset -= ornament.glyph.bbox.getH();
        } else {
          state.textLine += increment;
          ornament.yShift += yOffset;
          yOffset += ornament.glyph.bbox.getH();
        }
      } else {
        if (ornament.getPosition() === Modifier.Position.ABOVE) {
          ornament.setTextLine(state.topTextLine);
          state.topTextLine += increment;
        } else {
          ornament.setTextLine(state.textLine);
          state.textLine += increment;
        }
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
    return ['doit', 'fall', 'fallLong', 'doitLong', 'bend', 'plungerClosed', 'plungerOpen', 'scoop'];
  }

  /**
   * An ornament that happens on the release of the note, generally placed after the
   * note and overlapping the next beat/measure..
   */
  static get ornamentRelease(): string[] {
    return ['doit', 'fall', 'fallLong', 'doitLong', 'jazzTurn', 'smear', 'flip'];
  }

  /** ornamentArticulation goes above/below the note based on space availablity */
  static get ornamentArticulation(): string[] {
    return ['bend', 'plungerClosed', 'plungerOpen'];
  }

  /**
   * Legacy ornaments have hard-coded metrics.  If additional ornament types are
   * added, get their metrics here.
   */
  getMetrics(): OrnamentMetrics {
    const ornamentMetrics = Tables.currentMusicFont().getMetrics().ornament;

    if (!ornamentMetrics) throw new RuntimeError('BadMetrics', `ornament missing`);
    return ornamentMetrics[this.ornament.code];
  }

  /**
   * Create a new ornament of type `type`, which is an entry in
   * `Vex.Flow.ornamentCodes` in `tables.ts`.
   */
  constructor(type: string) {
    super();

    this.type = type;
    this.delayed = false;

    this.renderOptions = {
      fontScale: Tables.NOTATION_FONT_SCALE,
      accidentalLowerPadding: 3,
      accidentalUpperPadding: 3,
    };

    this.ornament = Tables.ornamentCodes(this.type);

    // new ornaments have their origin at the origin, and have more specific
    // metrics.  Legacy ornaments do some
    // x scaling, and have hard-coded metrics
    const metrics = this.getMetrics();

    // some jazz ornaments are above or below depending on stem direction.
    this.adjustForStemDirection = false;

    // some jazz ornaments like falls are supposed to overlap with future bars
    // and so we report a different width than they actually take up.
    this.reportedWidth = metrics && metrics.reportedWidth ? metrics.reportedWidth : 0;

    this.stemUpYOffset = metrics && metrics.stemUpYOffset ? metrics.stemUpYOffset : 0;

    this.ornamentAlignWithNoteHead = Ornament.ornamentAlignWithNoteHead.indexOf(this.type) >= 0;

    if (!this.ornament) {
      throw new RuntimeError('ArgumentError', `Ornament not found: '${this.type}'`);
    }

    this.xShift = metrics ? metrics.xOffset : 0;
    this.yShift = metrics ? metrics.yOffset : 0;

    this.glyph = new Glyph(this.ornament.code, this.renderOptions.fontScale, {
      category: `ornament.${this.ornament.code}`,
    });

    // Is this a jazz ornament that goes between this note and the next note.
    if (Ornament.ornamentNoteTransition.indexOf(this.type) >= 0) {
      this.delayed = true;
    }

    // Legacy ornaments need this.  I don't know why, but horizontal spacing issues
    // happen if I don't set it.
    if (!metrics) {
      this.glyph.setOrigin(0.5, 1.0); // FIXME: SMuFL won't require a vertical origin shift
    }
  }

  /** Set whether the ornament is to be delayed. */
  setDelayed(delayed: boolean): this {
    this.delayed = delayed;
    return this;
  }

  /** Set the upper accidental for the ornament. */
  setUpperAccidental(accid: string): this {
    const scale = this.renderOptions.fontScale / 1.3;
    this.accidentalUpper = new Glyph(Tables.accidentalCodes(accid).code, scale);
    this.accidentalUpper.setOrigin(0.5, 1.0);
    return this;
  }

  /** Set the lower accidental for the ornament. */
  setLowerAccidental(accid: string): this {
    const scale = this.renderOptions.fontScale / 1.3;
    this.accidentalLower = new Glyph(Tables.accidentalCodes(accid).code, scale);
    this.accidentalLower.setOrigin(0.5, 1.0);
    return this;
  }

  /** Render ornament in position next to note. */
  draw(): void {
    const ctx = this.checkContext();
    const note = this.checkAttachedNote() as StemmableNote;
    this.setRendered();

    const stemDir = note.getStemDirection();
    const stave = note.checkStave();

    this.applyStyle();
    ctx.openGroup('ornament', this.getAttribute('id'));

    // Get stem extents
    const stemExtents = note.checkStem().getExtents();
    let y = stemDir === Stem.DOWN ? stemExtents.baseY : stemExtents.topY;

    // TabNotes don't have stems attached to them. Tab stems are rendered outside the stave.
    if (isTabNote(note)) {
      if (note.hasStem()) {
        if (stemDir === Stem.DOWN) {
          y = stave.getYForTopText(this.textLine);
        }
      } else {
        // Without a stem
        y = stave.getYForTopText(this.textLine);
      }
    }

    const isPlacedOnNoteheadSide = stemDir === Stem.DOWN;
    const spacing = stave.getSpacingBetweenLines();
    let lineSpacing = 1;

    // Beamed stems are longer than quarter note stems, adjust accordingly
    if (!isPlacedOnNoteheadSide && note.hasBeam()) {
      lineSpacing += 0.5;
    }

    const totalSpacing = spacing * (this.textLine + lineSpacing);
    const glyphYBetweenLines = y - totalSpacing;

    // Get initial coordinates for the modifier position
    const start = note.getModifierStartXY(this.position, this.index);
    let glyphX = start.x;

    // If the ornament is aligned with the note head, don't consider the stave y
    // but use the 'natural' modifier y
    let glyphY = this.ornamentAlignWithNoteHead
      ? start.y
      : Math.min(stave.getYForTopText(this.textLine), glyphYBetweenLines);
    glyphY += this.yShift;

    // Ajdust x position if ornament is delayed
    if (this.delayed) {
      let delayXShift = 0;
      const startX = glyphX - (stave.getX() - 10);
      if (this.delayXShift !== undefined) {
        delayXShift = this.delayXShift;
      } else {
        delayXShift += this.glyph.getMetrics().width / 2;
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

    L('Rendering ornament: ', this.ornament, glyphX, glyphY);

    if (this.accidentalLower) {
      this.accidentalLower.render(ctx, glyphX, glyphY);
      glyphY -= this.accidentalLower.getMetrics().height;
      glyphY -= this.renderOptions.accidentalLowerPadding;
    }

    if (this.stemUpYOffset && note.hasStem() && note.getStemDirection() === 1) {
      glyphY += this.stemUpYOffset;
    }
    if (note.getLineNumber() < 5 && Ornament.ornamentNoteTransition.indexOf(this.type) >= 0) {
      glyphY = note.checkStave().getBoundingBox().getY() + 40;
    }

    this.glyph.render(ctx, glyphX + this.xShift, glyphY);

    if (this.accidentalUpper) {
      glyphY -= this.glyph.getMetrics().height + this.renderOptions.accidentalUpperPadding;
      this.accidentalUpper.render(ctx, glyphX, glyphY);
    }
    ctx.closeGroup();
    this.restoreStyle();
  }
}
