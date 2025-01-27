// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author Larry Kuhns.
// MIT License

import { Builder } from './easyscore';
import { Glyphs } from './glyphs';
import { Modifier } from './modifier';
import { ModifierContextState } from './modifiercontext';
import { Note } from './note';
import { Stave } from './stave';
import { Stem } from './stem';
import { StemmableNote } from './stemmablenote';
import { Tables } from './tables';
import { Category, isGraceNote, isStaveNote, isStemmableNote, isTabNote } from './typeguard';
import { log, RuntimeError } from './util';

export interface ArticulationStruct {
  code?: string;
  aboveCode?: string;
  belowCode?: string;
  betweenLines: boolean;
}

// eslint-disable-next-line
function L(...args: any[]) {
  if (Articulation.DEBUG) log('VexFlow.Articulation', args);
}

const { ABOVE, BELOW } = Modifier.Position;

function roundToNearestHalf(mathFn: (a: number) => number, value: number): number {
  return mathFn(value / 0.5) * 0.5;
}

// This includes both staff and ledger lines
function isWithinLines(line: number, position: number): boolean {
  return position === ABOVE ? line <= 5 : line >= 1;
}

function getRoundingFunction(line: number, position: number): (a: number) => number {
  if (isWithinLines(line, position)) {
    if (position === ABOVE) {
      return Math.ceil;
    } else {
      return Math.floor;
    }
  } else {
    return Math.round;
  }
}

function snapLineToStaff(canSitBetweenLines: boolean, line: number, position: number, offsetDirection: number): number {
  // Initially, snap to nearest staff line or space
  const snappedLine = roundToNearestHalf(getRoundingFunction(line, position), line);
  const canSnapToStaffSpace = canSitBetweenLines && isWithinLines(snappedLine, position);
  const onStaffLine = snappedLine % 1 === 0;

  if (canSnapToStaffSpace && onStaffLine) {
    const HALF_STAFF_SPACE = 0.5;
    return snappedLine + HALF_STAFF_SPACE * -offsetDirection;
  } else {
    return snappedLine;
  }
}

// Helper function for checking if a Note object is either a StaveNote or a GraceNote.
const isStaveOrGraceNote = (note: Note) => isStaveNote(note) || isGraceNote(note);

export function getTopY(note: Note, textLine: number): number {
  const stemDirection = note.getStemDirection();
  const { topY: stemTipY, baseY: stemBaseY } = note.getStemExtents();

  if (isStaveOrGraceNote(note)) {
    if (note.hasStem()) {
      if (stemDirection === Stem.UP) {
        return stemTipY;
      } else {
        return stemBaseY;
      }
    } else {
      return Math.min(...note.getYs());
    }
  } else if (isTabNote(note)) {
    if (note.hasStem()) {
      if (stemDirection === Stem.UP) {
        return stemTipY;
      } else {
        return note.checkStave().getYForTopText(textLine);
      }
    } else {
      return note.checkStave().getYForTopText(textLine);
    }
  } else {
    throw new RuntimeError('UnknownCategory', 'Only can get the top and bottom ys of stavenotes and tabnotes');
  }
}

export function getBottomY(note: Note, textLine: number): number {
  const stemDirection = note.getStemDirection();
  const { topY: stemTipY, baseY: stemBaseY } = note.getStemExtents();

  if (isStaveOrGraceNote(note)) {
    if (note.hasStem()) {
      if (stemDirection === Stem.UP) {
        return stemBaseY;
      } else {
        return stemTipY;
      }
    } else {
      return Math.max(...note.getYs());
    }
  } else if (isTabNote(note)) {
    if (note.hasStem()) {
      if (stemDirection === Stem.UP) {
        return note.checkStave().getYForBottomText(textLine);
      } else {
        return stemTipY;
      }
    } else {
      return note.checkStave().getYForBottomText(textLine);
    }
  } else {
    throw new RuntimeError('UnknownCategory', 'Only can get the top and bottom ys of stavenotes and tabnotes');
  }
}

/**
 * Get the initial offset of the articulation from the y value of the starting position.
 * This is required because the top/bottom text positions already have spacing applied to
 * provide a "visually pleasant" default position. However the y values provided from
 * the stavenote's top/bottom do *not* have any pre-applied spacing. This function
 * normalizes this asymmetry.
 * @param note
 * @param position
 * @returns
 */
export function getInitialOffset(note: Note, position: number): number {
  const isOnStemTip =
    (position === ABOVE && note.getStemDirection() === Stem.UP) ||
    (position === BELOW && note.getStemDirection() === Stem.DOWN);

  if (isStaveOrGraceNote(note)) {
    if (note.hasStem() && isOnStemTip) {
      return 0.5;
    } else {
      // this amount is larger than the stem-tip offset because we start from
      // the center of the notehead
      return 1;
    }
  } else {
    if (note.hasStem() && isOnStemTip) {
      return 1;
    } else {
      return 0;
    }
  }
}

/**
 * Articulations and Accents are modifiers that can be
 * attached to notes. The complete list of articulations is available in
 * `tables.ts` under `VexFlow.articulationCodes`.
 *
 * See `tests/articulation_tests.ts` for usage examples.
 */
export class Articulation extends Modifier {
  /** To enable logging for this class. Set `VexFlow.Articulation.DEBUG` to `true`. */
  static DEBUG: boolean = false;

  /** Articulations category string. */
  static get CATEGORY(): string {
    return Category.Articulation;
  }

  protected static readonly INITIAL_OFFSET: number = -0.5;

  /** Articulation code provided to the constructor. */
  readonly type: string;

  protected articulation: ArticulationStruct;

  protected heightShift = 0;
  /**
   * FIXME:
   * Most of the complex formatting logic (ie: snapping to space) is
   * actually done in .render(). But that logic belongs in this method.
   *
   * Unfortunately, this isn't possible because, by this point, stem lengths
   * have not yet been finalized. Finalized stem lengths are required to determine the
   * initial position of any stem-side articulation.
   *
   * This indicates that all objects should have their stave set before being
   * formatted. It can't be an optional if you want accurate vertical positioning.
   * Consistently positioned articulations that play nice with other modifiers
   * won't be possible until we stop relying on render-time formatting.
   *
   * Ideally, when this function has completed, the vertical articulation positions
   * should be ready to render without further adjustment. But the current state
   * is far from this ideal.
   */
  static format(articulations: Articulation[], state: ModifierContextState): boolean {
    if (!articulations || articulations.length === 0) return false;

    const margin = 0.5;
    let maxGlyphWidth = 0;

    const getIncrement = (articulation: Articulation, line: number, position: number) =>
      roundToNearestHalf(getRoundingFunction(line, position), articulation.height / 10 + margin);

    articulations.forEach((articulation) => {
      const note = articulation.checkAttachedNote();
      maxGlyphWidth = Math.max(note.getGlyphWidth(), maxGlyphWidth);
      let lines = 5;
      const stemDirection = note.hasStem() ? note.getStemDirection() : Stem.UP;
      let stemHeight = 0;
      // Decide if we need to consider beam direction in placement.

      if (isStemmableNote(note)) {
        const stem = note.getStem();
        if (stem) {
          stemHeight = Math.abs(stem.getHeight()) / Tables.STAVE_LINE_DISTANCE;
        }
      }
      const stave: Stave | undefined = note.getStave();
      if (stave) {
        lines = stave.getNumLines();
      }
      if (articulation.getPosition() === ABOVE) {
        let noteLine = note.getLineNumber(true);
        if (stemDirection === Stem.UP) {
          noteLine += stemHeight;
        }
        let increment = getIncrement(articulation, state.topTextLine, ABOVE);
        const curTop = noteLine + state.topTextLine + 0.5;
        // If articulation must be above stave, add lines between note and stave top
        if (!articulation.articulation.betweenLines && curTop < lines) {
          increment += lines - curTop;
        }
        articulation.setTextLine(state.topTextLine);
        state.topTextLine += increment;
      } else if (articulation.getPosition() === BELOW) {
        let noteLine = Math.max(lines - note.getLineNumber(), 0);
        if (stemDirection === Stem.DOWN) {
          noteLine += stemHeight;
        }
        let increment = getIncrement(articulation, state.textLine, BELOW);
        const curBottom = noteLine + state.textLine + 0.5;
        // if articulation must be below stave, add lines from note to stave bottom
        if (!articulation.articulation.betweenLines && curBottom < lines) {
          increment += lines - curBottom;
        }
        articulation.setTextLine(state.textLine);
        state.textLine += increment;
      }
    });

    const width = articulations
      .map((articulation) => articulation.getWidth())
      .reduce((maxWidth, articWidth) => Math.max(articWidth, maxWidth));
    const overlap = Math.min(
      Math.max(width - maxGlyphWidth, 0),
      Math.max(width - (state.leftShift + state.rightShift), 0)
    );

    state.leftShift += overlap / 2;
    state.rightShift += overlap / 2;
    return true;
  }

  static easyScoreHook({ articulations }: { articulations: string }, note: StemmableNote, builder: Builder): void {
    if (!articulations) return;

    const articNameToCode: Record<string, string> = {
      staccato: 'a.',
      tenuto: 'a-',
      accent: 'a>',
    };

    articulations
      .split(',')
      .map((articString) => articString.trim().split('.'))
      .map(([name, position]) => {
        const artic: { type: string; position?: number } = { type: articNameToCode[name] };
        if (position) artic.position = Modifier.PositionString[position];
        return builder.getFactory().Articulation(artic);
      })
      .map((artic) => note.addModifier(artic, 0));
  }

  /**
   * Create a new articulation.
   * @param type entry in `VexFlow.articulationCodes` in `tables.ts` or Glyph code.
   *
   * Notes default positions (see https://w3c.github.io/smufl/latest/tables/articulation.html):
   * - Even codes will be positioned ABOVE
   * - Odd codes will be positioned BELOW
   */
  constructor(type: string) {
    super();

    this.type = type;
    this.position = ABOVE;
    if (!Tables.articulationCodes(this.type)) {
      if ((this.type.codePointAt(0) ?? 0) % 2 === 0) this.position = ABOVE;
      else this.position = BELOW;
    }

    this.articulation = { betweenLines: false };
    this.reset();
  }

  protected reset(): void {
    this.articulation = Tables.articulationCodes(this.type);
    // Use type as glyph code, if not defined as articulation code
    if (!this.articulation) {
      this.articulation = { code: this.type, betweenLines: false };
    }
    const code =
      (this.position === ABOVE ? this.articulation.aboveCode : this.articulation.belowCode) ||
      this.articulation.code ||
      Glyphs.null;
    this.text = code;
  }

  /** Set if articulation should be rendered between lines. */
  setBetweenLines(betweenLines = true): this {
    this.articulation.betweenLines = betweenLines;
    return this;
  }

  /** Render articulation in position next to note. */
  draw(): void {
    const ctx = this.checkContext();
    const note = this.checkAttachedNote();
    this.setRendered();

    const index = this.checkIndex();
    const { position, textLine } = this;
    const canSitBetweenLines = this.articulation.betweenLines;

    const stave = note.checkStave();
    const staffSpace = stave.getSpacingBetweenLines();
    const isTab = isTabNote(note);

    // Articulations are centered over/under the note head.
    const { x } = note.getModifierStartXY(position, index);
    const shouldSitOutsideStaff = !canSitBetweenLines || isTab;

    const initialOffset = getInitialOffset(note, position);

    let y = (
      {
        [ABOVE]: () => {
          this.setOrigin(0.5, 1);
          const y = getTopY(note, textLine) - (textLine + initialOffset) * staffSpace;
          return shouldSitOutsideStaff ? Math.min(stave.getYForTopText(Articulation.INITIAL_OFFSET), y) : y;
        },
        [BELOW]: () => {
          this.setOrigin(0.5, 0);
          const y = getBottomY(note, textLine) + (textLine + initialOffset) * staffSpace;
          return shouldSitOutsideStaff ? Math.max(stave.getYForBottomText(Articulation.INITIAL_OFFSET), y) : y;
        },
      } as Record<number, () => number>
    )[position]();

    if (!isTab) {
      const offsetDirection = position === ABOVE ? -1 : +1;
      const noteLine = note.getKeyProps()[index].line;
      const distanceFromNote = (note.getYs()[index] - y) / staffSpace;
      const articLine = distanceFromNote + Number(noteLine);
      const snappedLine = snapLineToStaff(canSitBetweenLines, articLine, position, offsetDirection);

      if (isWithinLines(snappedLine, position)) this.setOrigin(0.5, 0.5);

      y += Math.abs(snappedLine - articLine) * staffSpace * offsetDirection;
    }

    L(`Rendering articulation at (x: ${x}, y: ${y})`);
    this.x = x;
    this.y = y;
    this.renderText(ctx, 0, 0);
  }
}
