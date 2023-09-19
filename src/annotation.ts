// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
import { Font } from './font';
import { Metrics } from './metrics';
import { Modifier, ModifierPosition } from './modifier';
import { ModifierContextState } from './modifiercontext';
import { Stave } from './stave';
import { Stem } from './stem';
import { StemmableNote } from './stemmablenote';
import { Tables } from './tables';
import { Category, isStemmableNote, isTabNote } from './typeguard';
import { log } from './util';

// eslint-disable-next-line
function L(...args: any[]) {
  if (Annotation.DEBUG) log('Vex.Flow.Annotation', args);
}

export enum AnnotationHorizontalJustify {
  LEFT = 1,
  CENTER = 2,
  RIGHT = 3,
  CENTER_STEM = 4,
}

export enum AnnotationVerticalJustify {
  TOP = 1,
  CENTER = 2,
  BOTTOM = 3,
  CENTER_STEM = 4,
}

/**
 * Annotations are modifiers that can be attached to
 * notes.
 *
 * See `tests/annotation_tests.ts` for usage examples.
 */
export class Annotation extends Modifier {
  /** To enable logging for this class. Set `Vex.Flow.Annotation.DEBUG` to `true`. */
  static DEBUG: boolean = false;

  /** Annotations category string. */
  static get CATEGORY(): string {
    return Category.Annotation;
  }

  /** Text annotations can be positioned and justified relative to the note. */
  static HorizontalJustify = AnnotationHorizontalJustify;

  static HorizontalJustifyString: Record<string, number> = {
    left: AnnotationHorizontalJustify.LEFT,
    right: AnnotationHorizontalJustify.RIGHT,
    center: AnnotationHorizontalJustify.CENTER,
    centerStem: AnnotationHorizontalJustify.CENTER_STEM,
  };

  static VerticalJustify = AnnotationVerticalJustify;

  static VerticalJustifyString: Record<string, number> = {
    above: AnnotationVerticalJustify.TOP,
    top: AnnotationVerticalJustify.TOP,
    below: AnnotationVerticalJustify.BOTTOM,
    bottom: AnnotationVerticalJustify.BOTTOM,
    center: AnnotationVerticalJustify.CENTER,
    centerStem: AnnotationVerticalJustify.CENTER_STEM,
  };

  // Use the same padding for annotations as note head so the
  // words don't run into each other.
  static get minAnnotationPadding(): number {
    return Metrics.get('NoteHead.minPadding');
  }
  /** Arrange annotations within a `ModifierContext` */
  static format(annotations: Annotation[], state: ModifierContextState): boolean {
    if (!annotations || annotations.length === 0) return false;
    let leftWidth = 0;
    let rightWidth = 0;
    let maxLeftGlyphWidth = 0;
    let maxRightGlyphWidth = 0;
    for (let i = 0; i < annotations.length; ++i) {
      const annotation = annotations[i];
      // Text height is expressed in fractional stave spaces.
      const textLines = (2 + Font.convertSizeToPixelValue(annotation.fontInfo.size)) / Tables.STAVE_LINE_DISTANCE;
      let verticalSpaceNeeded = textLines;

      const note = annotation.checkAttachedNote();
      const glyphWidth = note.getGlyphWidth();
      // Get the text width from the font metrics.
      const textWidth = annotation.getWidth();
      if (annotation.horizontalJustification === AnnotationHorizontalJustify.LEFT) {
        maxLeftGlyphWidth = Math.max(glyphWidth, maxLeftGlyphWidth);
        leftWidth = Math.max(leftWidth, textWidth) + Annotation.minAnnotationPadding;
      } else if (annotation.horizontalJustification === AnnotationHorizontalJustify.RIGHT) {
        maxRightGlyphWidth = Math.max(glyphWidth, maxRightGlyphWidth);
        rightWidth = Math.max(rightWidth, textWidth);
      } else {
        leftWidth = Math.max(leftWidth, textWidth / 2) + Annotation.minAnnotationPadding;
        rightWidth = Math.max(rightWidth, textWidth / 2);
        maxLeftGlyphWidth = Math.max(glyphWidth / 2, maxLeftGlyphWidth);
        maxRightGlyphWidth = Math.max(glyphWidth / 2, maxRightGlyphWidth);
      }

      const stave: Stave | undefined = note.getStave();
      const stemDirection = note.hasStem() ? note.getStemDirection() : Stem.UP;
      let stemHeight = 0;
      let lines = 5;

      if (isTabNote(note)) {
        if (note.renderOptions.drawStem) {
          const stem = (note as StemmableNote).getStem();
          if (stem) {
            stemHeight = Math.abs(stem.getHeight()) / Tables.STAVE_LINE_DISTANCE;
          }
        } else {
          stemHeight = 0;
        }
      } else if (isStemmableNote(note)) {
        const stem = note.getStem();
        if (stem && note.getNoteType() === 'n') {
          stemHeight = Math.abs(stem.getHeight()) / Tables.STAVE_LINE_DISTANCE;
        }
      }
      if (stave) {
        lines = stave.getNumLines();
      }

      if (annotation.verticalJustification === this.VerticalJustify.TOP) {
        let noteLine = note.getLineNumber(true);
        if (isTabNote(note)) {
          noteLine = lines - (note.leastString() - 0.5);
        }
        if (stemDirection === Stem.UP) {
          noteLine += stemHeight;
        }
        const curTop = noteLine + state.topTextLine + 0.5;
        if (curTop < lines) {
          annotation.setTextLine(lines - noteLine);
          verticalSpaceNeeded += lines - noteLine;
          state.topTextLine = verticalSpaceNeeded;
        } else {
          annotation.setTextLine(state.topTextLine);
          state.topTextLine += verticalSpaceNeeded;
        }
      } else if (annotation.verticalJustification === this.VerticalJustify.BOTTOM) {
        let noteLine = lines - note.getLineNumber();
        if (isTabNote(note)) {
          noteLine = note.greatestString() - 1;
        }
        if (stemDirection === Stem.DOWN) {
          noteLine += stemHeight;
        }
        const curBottom = noteLine + state.textLine + 1;
        if (curBottom < lines) {
          annotation.setTextLine(lines - curBottom);
          verticalSpaceNeeded += lines - curBottom;
          state.textLine = verticalSpaceNeeded;
        } else {
          annotation.setTextLine(state.textLine);
          state.textLine += verticalSpaceNeeded;
        }
      } else {
        annotation.setTextLine(state.textLine);
      }
    }
    const rightOverlap = Math.min(
      Math.max(rightWidth - maxRightGlyphWidth, 0),
      Math.max(rightWidth - state.rightShift, 0)
    );
    const leftOverlap = Math.min(Math.max(leftWidth - maxLeftGlyphWidth, 0), Math.max(leftWidth - state.leftShift, 0));
    state.leftShift += leftOverlap;
    state.rightShift += rightOverlap;
    return true;
  }

  protected horizontalJustification: AnnotationHorizontalJustify;
  protected verticalJustification: AnnotationVerticalJustify;

  /**
   * Annotations inherit from `Modifier` and is positioned correctly when
   * in a `ModifierContext`.
   * Create a new `Annotation` with the string `text`.
   */
  constructor(text: string) {
    super();

    this.text = text;
    this.horizontalJustification = AnnotationHorizontalJustify.CENTER;
    // warning: the default in the constructor is TOP, but in the factory the default is BOTTOM.
    // this is to support legacy application that may expect this.
    this.verticalJustification = AnnotationVerticalJustify.TOP;
  }

  /**
   * Set vertical position of text (above or below stave).
   * @param just value in `AnnotationVerticalJustify`.
   */
  setVerticalJustification(just: string | AnnotationVerticalJustify): this {
    this.verticalJustification = typeof just === 'string' ? Annotation.VerticalJustifyString[just] : just;
    return this;
  }

  /**
   * Get horizontal justification.
   */
  getJustification(): AnnotationHorizontalJustify {
    return this.horizontalJustification;
  }

  /**
   * Set horizontal justification.
   * @param justification value in `Annotation.Justify`.
   */
  setJustification(just: string | AnnotationHorizontalJustify): this {
    this.horizontalJustification = typeof just === 'string' ? Annotation.HorizontalJustifyString[just] : just;
    return this;
  }

  /** Render text beside the note. */
  draw(): void {
    const ctx = this.checkContext();
    const note = this.checkAttachedNote();
    const stemDirection = note.hasStem() ? note.getStemDirection() : Stem.UP;
    const start = note.getModifierStartXY(ModifierPosition.ABOVE, this.index);

    this.setRendered();

    // Apply style might not save context, if this.style is undefined, so we
    // still need to save context state just before this, since we will be
    // changing ctx parameters below.
    this.applyStyle();
    ctx.openGroup('annotation', this.getAttribute('id'));

    const textWidth = this.getWidth();
    const textHeight = Font.convertSizeToPixelValue(this.fontInfo.size);
    let x;
    let y;

    if (this.horizontalJustification === AnnotationHorizontalJustify.LEFT) {
      x = start.x;
    } else if (this.horizontalJustification === AnnotationHorizontalJustify.RIGHT) {
      x = start.x - textWidth;
    } else if (this.horizontalJustification === AnnotationHorizontalJustify.CENTER) {
      x = start.x - textWidth / 2;
    } /* CENTER_STEM */ else {
      x = (note as StemmableNote).getStemX() - textWidth / 2;
    }

    let stemExt: Record<string, number> = {};
    let spacing = 0;
    const hasStem = note.hasStem();
    const stave = note.checkStave();

    // The position of the text varies based on whether or not the note
    // has a stem.
    if (hasStem) {
      stemExt = (note as StemmableNote).checkStem().getExtents();
      spacing = stave.getSpacingBetweenLines();
    }

    if (this.verticalJustification === AnnotationVerticalJustify.BOTTOM) {
      // Use the largest (lowest) Y value
      const ys: number[] = note.getYs();
      y = ys.reduce((a, b) => (a > b ? a : b));
      y += (this.textLine + 1) * Tables.STAVE_LINE_DISTANCE + textHeight;
      if (hasStem && stemDirection === Stem.DOWN) {
        y = Math.max(y, stemExt.topY + textHeight + spacing * this.textLine);
      }
    } else if (this.verticalJustification === AnnotationVerticalJustify.CENTER) {
      const yt = note.getYForTopText(this.textLine) - 1;
      const yb = stave.getYForBottomText(this.textLine);
      y = yt + (yb - yt) / 2 + textHeight / 2;
    } else if (this.verticalJustification === AnnotationVerticalJustify.TOP) {
      const topY = Math.min(...note.getYs());
      y = topY - (this.textLine + 1) * Tables.STAVE_LINE_DISTANCE;
      if (hasStem && stemDirection === Stem.UP) {
        // If the stem is above the stave already, go with default line width vs. actual
        // since the lines between don't really matter.
        spacing = stemExt.topY < stave.getTopLineTopY() ? Tables.STAVE_LINE_DISTANCE : spacing;
        y = Math.min(y, stemExt.topY - spacing * (this.textLine + 1));
      }
    } /* CENTER_STEM */ else {
      const extents = note.getStemExtents();
      y = extents.topY + (extents.baseY - extents.topY) / 2 + textHeight / 2;
    }

    L('Rendering annotation: ', this.text, x, y);
    this.renderText(ctx, x, y);
    ctx.closeGroup();
    this.restoreStyle();
  }
}
