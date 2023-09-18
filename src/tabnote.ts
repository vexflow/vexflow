// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
//
// ## Description
//
// The file implements notes for Tablature notation. This consists of one or
// more fret positions, and can either be drawn with or without stems.
//
// See `tests/tabnote_tests.ts` for usage examples.

import { Element } from './element';
import { Metrics } from './metrics';
import { Modifier } from './modifier';
import { Note } from './note';
import { Stave } from './stave';
import { StaveNoteStruct } from './stavenote';
import { Stem } from './stem';
import { StemmableNote } from './stemmablenote';
import { Category, isDot } from './typeguard';
import { defined, RuntimeError } from './util';

export interface TabNotePosition {
  // For example, on a six stringed instrument, `str` ranges from 1 to 6.
  str: number;

  // fret: 'X' indicates an unused/muted string.
  // fret: 3 indicates the third fret.
  fret: number | string;
}

export interface TabNoteStruct extends StaveNoteStruct {
  positions: TabNotePosition[];
}

/**
 * Gets the unused strings grouped together if consecutive.
 * @param numLines The number of lines.
 * @param stringsUsed An array of numbers representing which strings have fret positions.
 * @returns
 */
function getUnusedStringGroups(numLines: number, stringsUsed: number[]): number[][] {
  const stemThrough = [];
  let group = [];
  for (let string = 1; string <= numLines; string++) {
    const isUsed = stringsUsed.indexOf(string) > -1;

    if (!isUsed) {
      group.push(string);
    } else {
      stemThrough.push(group);
      group = [];
    }
  }
  if (group.length > 0) stemThrough.push(group);

  return stemThrough;
}

// Gets groups of points that outline the partial stem lines
// between fret positions
//
// Parameters:
// * stemY - The `y` coordinate the stem is located on
// * unusedStrings - An array of groups of unused strings
// * stave - The stave to use for reference
// * stemDirection - The direction of the stem
function getPartialStemLines(stemY: number, unusedStrings: number[][], stave: Stave, stemDirection: number) {
  const upStem = stemDirection !== 1;
  const downStem = stemDirection !== -1;

  const lineSpacing = stave.getSpacingBetweenLines();
  const totalLines = stave.getNumLines();

  const stemLines: number[][] = [];

  unusedStrings.forEach((strings) => {
    const containsLastString = strings.indexOf(totalLines) > -1;
    const containsFirstString = strings.indexOf(1) > -1;

    if ((upStem && containsFirstString) || (downStem && containsLastString)) {
      return;
    }

    // If there's only one string in the group, push a duplicate value.
    // We do this because we need 2 strings to convert into upper/lower y
    // values.
    if (strings.length === 1) {
      strings.push(strings[0]);
    }

    const lineYs: number[] = [];
    // Iterate through each group string and store it's y position
    strings.forEach((string, index, strings) => {
      const isTopBound = string === 1;
      const isBottomBound = string === totalLines;

      // Get the y value for the appropriate staff line,
      // we adjust for a 0 index array, since string numbers are index 1
      let y = stave.getYForLine(string - 1);

      // Unless the string is the first or last, add padding to each side
      // of the line
      if (index === 0 && !isTopBound) {
        y -= lineSpacing / 2 - 1;
      } else if (index === strings.length - 1 && !isBottomBound) {
        y += lineSpacing / 2 - 1;
      }

      // Store the y value
      lineYs.push(y);

      // Store a subsequent y value connecting this group to the main
      // stem above/below the stave if it's the top/bottom string
      if (stemDirection === 1 && isTopBound) {
        lineYs.push(stemY - 2);
      } else if (stemDirection === -1 && isBottomBound) {
        lineYs.push(stemY + 2);
      }
    });

    // Add the sorted y values to the
    stemLines.push(lineYs.sort((a, b) => a - b));
  });

  return stemLines;
}

export class TabNote extends StemmableNote {
  static get CATEGORY(): string {
    return Category.TabNote;
  }

  protected ghost: boolean;
  protected fretElement: Element[] = [];
  protected positions: TabNotePosition[];

  // Initialize the TabNote with a `noteStruct` full of properties
  // and whether to `drawStem` when rendering the note
  constructor(noteStruct: TabNoteStruct, drawStem: boolean = false) {
    super(noteStruct);

    this.ghost = false; // Renders parenthesis around notes

    // Note properties
    // The fret positions in the note. An array of `{ str: X, fret: X }`
    this.positions = noteStruct.positions || [];

    // Render Options
    this.renderOptions = {
      ...this.renderOptions,
      // font size for note heads and rests
      glyphFontScale: Metrics.lookupMetric('TabNote.fontSize'),
      // Flag to draw a stem
      drawStem,
      // Flag to draw dot modifiers
      drawDots: drawStem,
      // Flag to extend the main stem through the stave and fret positions
      drawStemThroughStave: false,
      // vertical shift from stave line
      yShift: 0,
      // normal glyph scale
      scale: 1.0,
      // default tablature font
      font: Metrics.lookupMetric('fontFamily'),
    };

    this.glyphProps = Note.getGlyphProps(this.duration, this.noteType);
    defined(
      this.glyphProps,
      'BadArguments',
      `No glyph found for duration '${this.duration}' and type '${this.noteType}'`
    );

    this.buildStem();

    if (noteStruct.stemDirection) {
      this.setStemDirection(noteStruct.stemDirection);
    } else {
      this.setStemDirection(Stem.UP);
    }

    // Renders parenthesis around notes
    this.ghost = false;
    this.updateWidth();
  }
  // Return the number of the greatest string, which is the string lowest on the display
  greatestString = (): number => {
    return this.positions.map((x) => x.str).reduce((a, b) => (a > b ? a : b));
  };
  // Return the number of the least string, which is the string highest on the display
  leastString = (): number => {
    return this.positions.map((x) => x.str).reduce((a, b) => (a < b ? a : b));
  };

  reset(): this {
    super.reset();
    if (this.stave) this.setStave(this.stave);
    return this;
  }

  // Set as ghost `TabNote`, surrounds the fret positions with parenthesis.
  // Often used for indicating frets that are being bent to
  setGhost(ghost: boolean): this {
    this.ghost = ghost;
    this.updateWidth();
    return this;
  }

  // Determine if the note has a stem
  hasStem(): boolean {
    if (this.renderOptions.drawStem) return true;
    return false;
  }

  // Get the default stem extension for the note
  getStemExtension(): number {
    if (this.stemExtensionOverride !== undefined) {
      return this.stemExtensionOverride;
    }

    return this.flag.getHeight() > Stem.HEIGHT ? this.flag.getHeight() - Stem.HEIGHT : 0;
  }

  static tabToElement(fret: string): Element {
    let el: Element;

    if (fret.toUpperCase() === 'X') {
      el = new Element('TabNote');
      el.setText('\ue263' /*accidentalDoubleSharp*/);
    } else {
      el = new Element('TabNote.text');
      el.setText(fret);
      el.setYShift(el.getHeight() / 2);
    }

    return el;
  }

  // Calculate and store the width of the note
  updateWidth(): void {
    this.fretElement = [];
    this.width = 0;
    for (let i = 0; i < this.positions.length; ++i) {
      let fret = this.positions[i].fret;
      if (this.ghost) fret = '(' + fret + ')';
      const el = TabNote.tabToElement(fret.toString());
      this.fretElement.push(el);
      this.width = Math.max(el.getWidth(), this.width);
    }
  }

  // Set the `stave` to the note
  setStave(stave: Stave): this {
    super.setStave(stave);
    const ctx = stave.getContext();
    this.setContext(ctx);

    // we subtract 1 from `line` because getYForLine expects a 0-based index,
    // while the position.str is a 1-based index
    const ys = this.positions.map(({ str: line }) => stave.getYForLine(Number(line) - 1));

    this.setYs(ys);

    if (this.stem) {
      this.stem.setYBounds(this.getStemY(), this.getStemY());
    }

    return this;
  }

  // Get the fret positions for the note
  getPositions(): TabNotePosition[] {
    return this.positions;
  }

  // Get the default `x` and `y` coordinates for a modifier at a specific
  // `position` at a fret position `index`
  getModifierStartXY(position: number, index: number): { x: number; y: number } {
    if (!this.preFormatted) {
      throw new RuntimeError('UnformattedNote', "Can't call GetModifierStartXY on an unformatted note");
    }

    if (this.ys.length === 0) {
      throw new RuntimeError('NoYValues', 'No Y-Values calculated for this note.');
    }

    let x = 0;
    if (position === Modifier.Position.LEFT) {
      x = -1 * 2; // FIXME: modifier padding, move to font file
    } else if (position === Modifier.Position.RIGHT) {
      x = this.width + 2; // FIXME: modifier padding, move to font file
    } else if (position === Modifier.Position.BELOW || position === Modifier.Position.ABOVE) {
      const noteGlyphWidth = this.width;
      x = noteGlyphWidth / 2;
    }

    return {
      x: this.getAbsoluteX() + x,
      y: this.ys[index],
    };
  }

  // Get the default line for rest
  getLineForRest(): number {
    return Number(this.positions[0].str);
  }

  // Pre-render formatting
  preFormat(): void {
    if (this.preFormatted) return;
    if (this.modifierContext) this.modifierContext.preFormat();
    // width is already set during init()
    this.preFormatted = true;
  }

  // Get the x position for the stem
  getStemX(): number {
    return this.getCenterGlyphX();
  }

  // Get the y position for the stem
  getStemY(): number {
    const numLines = this.checkStave().getNumLines();

    // The decimal staff line amounts provide optimal spacing between the
    // fret number and the stem
    const stemUpLine = -0.5;
    const stemDownLine = numLines - 0.5;
    const stemStartLine = Stem.UP === this.stemDirection ? stemUpLine : stemDownLine;

    return this.checkStave().getYForLine(stemStartLine);
  }

  // Get the stem extents for the tabnote
  getStemExtents(): { topY: number; baseY: number } {
    return this.checkStem().getExtents();
  }

  // Draw the fal onto the context
  drawFlag(): void {
    const {
      beam,
      glyphProps,
      renderOptions: { drawStem },
    } = this;
    const context = this.checkContext();

    const shouldDrawFlag = beam === undefined && drawStem;

    // Now it's the flag's turn.
    if (glyphProps.codeFlagUp && shouldDrawFlag) {
      const flagX = this.getStemX();
      const flagY =
        this.getStemDirection() === Stem.DOWN
          ? // Down stems are below the note head and have flags on the right.
            this.getStemY() - this.checkStem().getHeight() - this.getStemExtension()
          : // Up stems are above the note head and have flags on the right.
            this.getStemY() - this.checkStem().getHeight() + this.getStemExtension();

      // Draw the Flag
      this.applyStyle(context, this.flagStyle);
      this.flag.renderText(context, flagX, flagY);
      this.restoreStyle(context, this.flagStyle);
    }
  }

  // Render the modifiers onto the context.
  drawModifiers(): void {
    this.modifiers.forEach((modifier) => {
      // Only draw the dots if enabled.
      if (isDot(modifier) && !this.renderOptions.drawDots) {
        return;
      }

      modifier.setContext(this.getContext());
      modifier.drawWithStyle();
    });
  }

  // Render the stem extension through the fret positions
  drawStemThrough(): void {
    const stemX = this.getStemX();
    const stemY = this.getStemY();
    const ctx = this.checkContext();

    const drawStem = this.renderOptions.drawStem;
    const stemThrough = this.renderOptions.drawStemThroughStave;
    if (drawStem && stemThrough) {
      const numLines = this.checkStave().getNumLines();
      const stringsUsed = this.positions.map((position) => Number(position.str));

      const unusedStrings = getUnusedStringGroups(numLines, stringsUsed);
      const stemLines = getPartialStemLines(stemY, unusedStrings, this.checkStave(), this.getStemDirection());

      ctx.save();
      ctx.setLineWidth(Stem.WIDTH);
      stemLines.forEach((bounds) => {
        if (bounds.length === 0) return;

        ctx.beginPath();
        ctx.moveTo(stemX, bounds[0]);
        ctx.lineTo(stemX, bounds[bounds.length - 1]);
        ctx.stroke();
        ctx.closePath();
      });
      ctx.restore();
    }
  }

  // Render the fret positions onto the context
  drawPositions(): void {
    const ctx = this.checkContext();
    const x = this.getAbsoluteX();
    const ys = this.ys;
    for (let i = 0; i < this.positions.length; ++i) {
      const y = ys[i] + this.renderOptions.yShift;
      const el = this.fretElement[i];

      // Center the fret text beneath the stem
      const tabX = x - el.getWidth() / 2;

      // FIXME: Magic numbers.
      ctx.clearRect(tabX - 2, y - 3, el.getWidth() + 4, 6);

      el.renderText(ctx, tabX, y);
    }
  }

  // The main rendering function for the entire note.
  draw(): void {
    const ctx = this.checkContext();

    if (this.ys.length === 0) {
      throw new RuntimeError('NoYValues', "Can't draw note without Y values.");
    }

    this.setRendered();
    const renderStem = this.beam === undefined && this.renderOptions.drawStem;

    this.applyStyle();
    ctx.openGroup('tabnote', this.getAttribute('id'), { pointerBBox: true });
    this.drawPositions();
    this.drawStemThrough();

    if (this.stem && renderStem) {
      const stemX = this.getStemX();
      this.stem.setNoteHeadXBounds(stemX, stemX);
      this.stem.setContext(ctx).draw();
    }

    this.drawFlag();
    this.drawModifiers();
    ctx.closeGroup();
    this.restoreStyle();
  }
}
