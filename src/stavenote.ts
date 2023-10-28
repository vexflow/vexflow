// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
//
// This file implements notes for standard notation. This consists of one or
// more `NoteHeads`, an optional stem, and an optional flag.
//
// Throughout these comments, a "note" refers to the entire `StaveNote`,
// and a "key" refers to a specific pitch/notehead within a note.
//
// See `tests/stavenote_tests.ts` for usage examples.

import { Beam } from './beam';
import { BoundingBox } from './boundingbox';
import { ElementStyle } from './element';
import { Glyphs } from './glyphs';
import { Metrics } from './metrics';
import { Modifier } from './modifier';
import { ModifierContextState } from './modifiercontext';
import { KeyProps, Note, NoteStruct } from './note';
import { NoteHead } from './notehead';
import { Stave } from './stave';
import { Stem, StemOptions } from './stem';
import { StemmableNote } from './stemmablenote';
import { Tables } from './tables';
import { Category } from './typeguard';
import { defined, log, midLine, RuntimeError } from './util';

export interface StaveNoteHeadBounds {
  yTop: number;
  yBottom: number;
  displacedX?: number;
  nonDisplacedX?: number;
  highestLine: number;
  lowestLine: number;
  highestDisplacedLine?: number;
  lowestDisplacedLine?: number;
  highestNonDisplacedLine: number;
  lowestNonDisplacedLine: number;
}

export interface StaveNoteFormatSettings {
  line: number;
  maxLine: number;
  minLine: number;
  isrest: boolean;
  stemDirection?: number;
  stemMax: number;
  stemMin: number;
  voiceShift: number;
  isDisplaced: boolean;
  note: StaveNote;
}

export interface StaveNoteStruct extends NoteStruct {
  /** `Stem.UP` or `Stem.DOWN`. */
  stemDirection?: number;
  autoStem?: boolean;
  strokePx?: number;
  octaveShift?: number;
  clef?: string;
}

// To enable logging for this class. Set `Vex.Flow.StaveNote.DEBUG` to `true`.
// eslint-disable-next-line
function L(...args: any[]) {
  if (StaveNote.DEBUG) log('Vex.Flow.StaveNote', args);
}

const isInnerNoteIndex = (note: StaveNote, index: number) =>
  index === (note.getStemDirection() === Stem.UP ? note.keyProps.length - 1 : 0);

// Helper methods for rest positioning in ModifierContext.
function shiftRestVertical(rest: StaveNoteFormatSettings, note: StaveNoteFormatSettings, dir: number) {
  const delta = dir;

  rest.line += delta;
  rest.maxLine += delta;
  rest.minLine += delta;
  rest.note.setKeyLine(0, rest.note.getKeyLine(0) + delta);
}

// Called from formatNotes :: center a rest between two notes
function centerRest(rest: StaveNoteFormatSettings, noteU: StaveNoteFormatSettings, noteL: StaveNoteFormatSettings) {
  const delta = rest.line - midLine(noteU.minLine, noteL.maxLine);
  rest.note.setKeyLine(0, rest.note.getKeyLine(0) - delta);
  rest.line -= delta;
  rest.maxLine -= delta;
  rest.minLine -= delta;
}

export class StaveNote extends StemmableNote {
  static DEBUG: boolean = false;

  static get CATEGORY(): string {
    return Category.StaveNote;
  }

  static get LEDGER_LINE_OFFSET(): number {
    return 3;
  }

  static get minNoteheadPadding(): number {
    return Metrics.get('NoteHead.minPadding');
  }

  /** Format notes inside a ModifierContext. */
  static format(notes: StaveNote[], state: ModifierContextState): boolean {
    if (!notes || notes.length < 2) return false;

    const notesList: StaveNoteFormatSettings[] = [];

    for (let i = 0; i < notes.length; i++) {
      // Formatting uses sortedKeyProps to calculate line and minL.
      const props = notes[i].#sortedKeyProps;
      const line = props[0].keyProps.line;
      let minL = props[props.length - 1].keyProps.line;
      const stemDirection = notes[i].getStemDirection();
      const stemMax = notes[i].getStemLength() / 10;
      const stemMin = notes[i].getStemMinimumLength() / 10;

      let maxL;
      if (notes[i].isRest()) {
        maxL =
          line +
          Math.ceil(notes[i].#noteHeads[0].getTextMetrics().actualBoundingBoxAscent / Tables.STAVE_LINE_DISTANCE);
        minL =
          line -
          Math.ceil(notes[i].#noteHeads[0].getTextMetrics().actualBoundingBoxDescent / Tables.STAVE_LINE_DISTANCE);
      } else {
        maxL =
          stemDirection === 1 ? props[props.length - 1].keyProps.line + stemMax : props[props.length - 1].keyProps.line;

        minL = stemDirection === 1 ? props[0].keyProps.line : props[0].keyProps.line - stemMax;
      }

      notesList.push({
        line: props[0].keyProps.line, // note/rest base line
        maxLine: maxL, // note/rest upper bounds line
        minLine: minL, // note/rest lower bounds line
        isrest: notes[i].isRest(),
        stemDirection,
        stemMax, // Maximum (default) note stem length;
        stemMin, // minimum note stem length
        voiceShift: notes[i].getVoiceShiftWidth(),
        isDisplaced: notes[i].isDisplaced(), // note manually displaced
        note: notes[i],
      });
    }

    let voices = 0;
    let noteU = undefined;
    let noteM = undefined;
    let noteL = undefined;
    const draw = [false, false, false];

    for (let i = 0; i < notesList.length; i++) {
      // If .draw is true or undefined, we set draw[i] = true
      draw[i] = notesList[i].note.renderOptions.draw !== false;
    }

    if (draw[0] && draw[1] && draw[2]) {
      // Three visible notes
      voices = 3;
      noteU = notesList[0];
      noteM = notesList[1];
      noteL = notesList[2];
    } else if (draw[0] && draw[1]) {
      // Two visible notes, 0 & 1
      voices = 2;
      noteU = notesList[0];
      noteL = notesList[1];
    } else if (draw[0] && draw[2]) {
      // Two visible notes, 0 & 2
      voices = 2;
      noteU = notesList[0];
      noteL = notesList[2];
    } else if (draw[1] && draw[2]) {
      // Two visible notes, 1 & 2
      voices = 2;
      noteU = notesList[1];
      noteL = notesList[2];
    } else {
      // No shift required for less than 2 visible notes
      return true;
    }

    // for two voice backward compatibility, ensure upper voice is stems up
    // for three voices, the voices must be in order (upper, middle, lower)
    if (voices === 2 && noteU.stemDirection === -1 && noteL.stemDirection === 1) {
      noteU = notesList[1];
      noteL = notesList[0];
    }

    const voiceXShift = Math.max(noteU.voiceShift, noteL.voiceShift);
    let xShift = 0;

    // Test for two voice note intersection
    if (voices === 2) {
      const lineSpacing =
        noteU.note.hasStem() && noteL.note.hasStem() && noteU.stemDirection === noteL.stemDirection ? 0.0 : 0.5;
      if (noteL.isrest && noteU.isrest && noteU.note.duration === noteL.note.duration) {
        noteL.note.renderOptions.draw = false;
      } else if (noteU.minLine <= noteL.maxLine + lineSpacing) {
        if (noteU.isrest) {
          // shift rest up
          shiftRestVertical(noteU, noteL, 1);
        } else if (noteL.isrest) {
          // shift rest down
          shiftRestVertical(noteL, noteU, -1);
        } else {
          //Instead of shifting notes, remove the appropriate flag
          //If we are sharing a line, switch one notes stem direction.
          //If we are sharing a line and in the same voice, only then offset one note
          const lineDiff = Math.abs(noteU.line - noteL.line);
          if (noteU.note.hasStem() && noteL.note.hasStem()) {
            const noteUHead = noteU.note.#sortedKeyProps[0].keyProps.code;
            const noteLHead = noteL.note.#sortedKeyProps[noteL.note.#sortedKeyProps.length - 1].keyProps.code;
            if (
              // If unison is not configured, shift
              !Tables.UNISON ||
              // If we have different noteheads, shift
              noteUHead !== noteLHead ||
              // If we have different dot values, shift
              noteU.note.getModifiers().filter((item) => item.getCategory() === Category.Dot && item.getIndex() === 0)
                .length !==
                noteL.note.getModifiers().filter((item) => item.getCategory() === Category.Dot && item.getIndex() === 0)
                  .length ||
              // If the notes are quite close but not on the same line, shift
              (lineDiff < 1 && lineDiff > 0) ||
              // If styles are different, shift
              JSON.stringify(noteU.note.getStyle()) !== JSON.stringify(noteL.note.getStyle())
            ) {
              xShift = voiceXShift + 2;
              if (noteU.stemDirection === noteL.stemDirection) {
                // upper voice is middle voice, so shift it right
                noteU.note.setXShift(xShift);
              } else {
                // shift lower voice right
                noteL.note.setXShift(xShift);
              }
            } else if (noteU.note.voice !== noteL.note.voice) {
              //If we are not in the same voice
              if (noteU.stemDirection === noteL.stemDirection) {
                if (noteU.line !== noteL.line) {
                  xShift = voiceXShift + 2;
                  noteU.note.setXShift(xShift);
                } else {
                  //same line, swap stem direction for one note
                  if (noteL.stemDirection === 1) {
                    noteL.stemDirection = -1;
                    noteL.note.setStemDirection(-1);
                  }
                }
              }
            } //Very close whole notes
          } else if (lineDiff < 1) {
            xShift = voiceXShift + 2;
            if (noteU.note.duration < noteL.note.duration) {
              // upper voice is shorter, so shift it right
              noteU.note.setXShift(xShift);
            } else {
              // shift lower voice right
              noteL.note.setXShift(xShift);
            }
          } else if (noteU.note.hasStem()) {
            noteU.stemDirection = -noteU.note.getStemDirection();
            noteU.note.setStemDirection(noteU.stemDirection);
          } else if (noteL.note.hasStem()) {
            noteL.stemDirection = -noteL.note.getStemDirection();
            noteL.note.setStemDirection(noteL.stemDirection);
          }
        }
      }

      // format complete
      state.rightShift += xShift;
      return true;
    }

    if (!noteM) throw new RuntimeError('InvalidState', 'noteM not defined.');

    // For three voices, test if rests can be repositioned
    //
    // Special case 1 :: middle voice rest between two notes
    //
    if (noteM.isrest && !noteU.isrest && !noteL.isrest) {
      if (noteU.minLine <= noteM.maxLine || noteM.minLine <= noteL.maxLine) {
        const restHeight = noteM.maxLine - noteM.minLine;
        const space = noteU.minLine - noteL.maxLine;
        if (restHeight < space) {
          // center middle voice rest between the upper and lower voices
          centerRest(noteM, noteU, noteL);
        } else {
          xShift = voiceXShift + 2; // shift middle rest right
          noteM.note.setXShift(xShift);
          if (noteL.note.hasBeam() === false) {
            noteL.stemDirection = -1;
            noteL.note.setStemDirection(-1);
          }
          if (noteU.minLine <= noteL.maxLine && noteU.note.hasBeam() === false) {
            noteU.stemDirection = 1;
            noteU.note.setStemDirection(1);
          }
        }
        // format complete
        state.rightShift += xShift;
        return true;
      }
    }

    // Special case 2 :: all voices are rests
    if (noteU.isrest && noteM.isrest && noteL.isrest) {
      // Hide upper voice rest
      noteU.note.renderOptions.draw = false;
      // Hide lower voice rest
      noteL.note.renderOptions.draw = false;
      // format complete
      state.rightShift += xShift;
      return true;
    }

    // Test if any other rests can be repositioned
    if (noteM.isrest && noteU.isrest && noteM.minLine <= noteL.maxLine) {
      // Hide middle voice rest
      noteM.note.renderOptions.draw = false;
    }
    if (noteM.isrest && noteL.isrest && noteU.minLine <= noteM.maxLine) {
      // Hide middle voice rest
      noteM.note.renderOptions.draw = false;
    }
    if (noteU.isrest && noteU.minLine <= noteM.maxLine) {
      // shift upper voice rest up;
      shiftRestVertical(noteU, noteM, 1);
    }
    if (noteL.isrest && noteM.minLine <= noteL.maxLine) {
      // shift lower voice rest down
      shiftRestVertical(noteL, noteM, -1);
    }
    // If middle voice intersects upper or lower voice
    if (noteU.minLine <= noteM.maxLine + 0.5 || noteM.minLine <= noteL.maxLine) {
      // shift middle note right
      xShift = voiceXShift + 2;
      noteM.note.setXShift(xShift);
      if (noteL.note.hasBeam() === false) {
        noteL.stemDirection = -1;
        noteL.note.setStemDirection(-1);
      }
      if (noteU.minLine <= noteL.maxLine && noteU.note.hasBeam() === false) {
        noteU.stemDirection = 1;
        noteU.note.setStemDirection(1);
      }
    }

    state.rightShift += xShift;
    return true;
  }

  static postFormat(notes: Note[]): boolean {
    if (!notes) return false;

    notes.forEach((note) => note.postFormat());

    return true;
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // INSTANCE MEMBERS

  minLine: number = 0;
  maxLine: number = 0;

  protected readonly clef: string;
  protected readonly octaveShift?: number;

  protected displaced: boolean;
  protected dotShiftY: number;
  protected useDefaultHeadX: boolean;
  protected ledgerLineStyle: ElementStyle;

  #noteHeads: NoteHead[];

  // Sorted variant of keyProps used internally.
  #sortedKeyProps: { keyProps: KeyProps; index: number }[] = [];

  constructor(noteStruct: StaveNoteStruct) {
    super(noteStruct);

    this.ledgerLineStyle = {};

    this.clef = noteStruct.clef ?? 'treble';
    this.octaveShift = noteStruct.octaveShift ?? 0;

    // Pull note rendering properties.
    this.glyphProps = Note.getGlyphProps(this.duration, this.noteType);
    defined(
      this.glyphProps,
      'BadArguments',
      `No glyph found for duration '${this.duration}' and type '${this.noteType}'`
    );

    // if true, displace note to right
    this.displaced = false;
    this.dotShiftY = 0;
    // for displaced ledger lines
    this.useDefaultHeadX = false;

    // Drawing
    this.#noteHeads = [];
    this.modifiers = [];

    this.renderOptions = {
      ...this.renderOptions,
      // number of stroke px to the left and right of head
      strokePx: noteStruct.strokePx || StaveNote.LEDGER_LINE_OFFSET,
    };

    this.calculateKeyProps();
    this.buildStem();

    // Set the stem direction
    if (noteStruct.autoStem) {
      this.autoStem();
    } else {
      this.setStemDirection(noteStruct.stemDirection ?? Stem.UP);
    }
    this.reset();
    this.buildFlag();
  }

  reset(): this {
    super.reset();

    // Save prior noteHead styles & reapply them after making new noteheads.
    const noteHeadStyles = this.#noteHeads.map((noteHead) => noteHead.getStyle());
    this.buildNoteHeads();
    this.#noteHeads.forEach((noteHead, index) => {
      const noteHeadStyle = noteHeadStyles[index];
      if (noteHeadStyle) noteHead.setStyle(noteHeadStyle);
    });

    const stave = this.stave;
    if (stave) {
      this.setStave(stave);
    }
    this.calcNoteDisplacements();
    return this;
  }

  setBeam(beam: Beam): this {
    this.beam = beam;
    this.calcNoteDisplacements();
    // Update stem extension if a beam is assigned.
    if (this.stem) {
      this.stem.setExtension(this.getStemExtension());
    }
    return this;
  }

  // Builds a `Stem` for the note
  buildStem(): this {
    this.setStem(new Stem({ hide: !!this.isRest() }));
    return this;
  }

  // Builds a `NoteHead` for each key in the note
  buildNoteHeads(): NoteHead[] {
    this.#noteHeads = [];
    const stemDirection = this.getStemDirection();
    const keys = this.getKeys();

    let lastLine = undefined;
    let lineDiff = undefined;
    let displaced = false;

    // Draw notes from bottom to top.

    // For down-stem notes, we draw from top to bottom.
    let start: number;
    let end: number;
    let step: number;
    if (stemDirection === Stem.UP) {
      start = 0;
      end = keys.length;
      step = 1;
    } else {
      start = keys.length - 1;
      end = -1;
      step = -1;
    }

    for (let i = start; i !== end; i += step) {
      // Building noteheads rely on sortedKeNotes in order to calculate the displacements
      const noteProps = this.#sortedKeyProps[i].keyProps;
      const line = noteProps.line;

      // Keep track of last line with a note head, so that consecutive heads
      // are correctly displaced.
      if (lastLine === undefined) {
        lastLine = line;
      } else {
        lineDiff = Math.abs(lastLine - line);
        if (lineDiff === 0 || lineDiff === 0.5) {
          displaced = !displaced;
        } else {
          displaced = false;
          this.useDefaultHeadX = true;
        }
      }
      lastLine = line;

      const notehead = new NoteHead({
        duration: this.duration,
        noteType: this.noteType,
        displaced,
        stemDirection,
        customGlyphCode: noteProps.code,
        line: noteProps.line,
      });

      notehead.fontInfo = this.fontInfo;

      this.addChildElement(notehead);
      this.#noteHeads[this.#sortedKeyProps[i].index] = notehead;
    }
    return this.#noteHeads;
  }

  // Automatically sets the stem direction based on the keys in the note
  autoStem(): void {
    this.setStemDirection(this.calculateOptimalStemDirection());
  }

  calculateOptimalStemDirection(): number {
    // Figure out optimal stem direction based on given notes
    // minLine & maxLine rely on sortedKeyProps
    this.minLine = this.#sortedKeyProps[0].keyProps.line;
    this.maxLine = this.#sortedKeyProps[this.keyProps.length - 1].keyProps.line;

    const MIDDLE_LINE = 3;
    const decider = (this.minLine + this.maxLine) / 2;
    const stemDirection = decider < MIDDLE_LINE ? Stem.UP : Stem.DOWN;

    return stemDirection;
  }

  // Calculates and stores the properties for each key in the note
  calculateKeyProps(): void {
    let lastLine: number | undefined;
    for (let i = 0; i < this.keys.length; ++i) {
      const key = this.keys[i];

      const options = { octaveShift: this.octaveShift ?? 0, duration: this.duration };
      const props = Tables.keyProperties(key, this.clef, this.noteType, options);

      if (!props) {
        throw new RuntimeError('BadArguments', `Invalid key for note properties: ${key}`);
      }

      // Override line placement for default rests
      if (props.key === 'R') {
        if (this.duration === '1' || this.duration === 'w') {
          props.line = 4;
        } else {
          props.line = 3;
        }
      }

      // Calculate displacement of this note
      const line = props.line;
      if (lastLine === undefined) {
        lastLine = line;
      } else {
        if (Math.abs(lastLine - line) === 0.5) {
          this.displaced = true;
          props.displaced = true;

          // Have to mark the previous note as
          // displaced as well, for modifier placement
          if (this.keyProps.length > 0) {
            this.keyProps[i - 1].displaced = true;
          }
        }
      }

      lastLine = line;
      this.keyProps.push(props);
    }
    // Sort the notes from lowest line to highest line in sortedKeyProps
    // Warn no longer required as keyProps remains unsorted
    this.keyProps.forEach((keyProps, index) => {
      this.#sortedKeyProps.push({ keyProps, index });
    });
    this.#sortedKeyProps.sort((a, b) => a.keyProps.line - b.keyProps.line);
  }

  // Get the `BoundingBox` for the entire note
  getBoundingBox(): BoundingBox {
    const boundingBox = new BoundingBox(this.getAbsoluteX(), this.ys[0], 0, 0);
    this.#noteHeads.forEach((notehead) => {
      boundingBox.mergeWith(notehead.getBoundingBox());
    });
    const { yTop, yBottom } = this.getNoteHeadBounds();
    // eslint-disable-next-line
    const noteStemHeight = this.stem!.getHeight();
    const flagX = this.getStemX() - Tables.STEM_WIDTH / 2;
    const flagY =
      this.getStemDirection() === Stem.DOWN
        ? yTop - noteStemHeight - this.flag.getTextMetrics().actualBoundingBoxDescent
        : yBottom - noteStemHeight + this.flag.getTextMetrics().actualBoundingBoxAscent;

    if (!this.isRest() && this.hasStem()) {
      boundingBox.mergeWith(new BoundingBox(this.getAbsoluteX(), flagY, 0, 0));
    }
    if (this.hasFlag()) {
      const bbFlag = this.flag.getBoundingBox();
      boundingBox.mergeWith(bbFlag.move(flagX, flagY));
    }
    return boundingBox;
  }

  // Gets the line number of the bottom note in the chord.
  // If `isTopNote` is `true` then get the top note's line number instead
  getLineNumber(isTopNote?: boolean): number {
    if (!this.keyProps.length) {
      throw new RuntimeError('NoKeyProps', "Can't get bottom note line, because note is not initialized properly.");
    }

    let resultLine = this.keyProps[0].line;

    // No precondition assumed for sortedness of keyProps array
    for (let i = 0; i < this.keyProps.length; i++) {
      const thisLine = this.keyProps[i].line;
      if (isTopNote) {
        if (thisLine > resultLine) resultLine = thisLine;
      } else {
        if (thisLine < resultLine) resultLine = thisLine;
      }
    }

    return resultLine;
  }

  /**
   * @returns true if this note is a type of rest. Rests don't have pitches, but take up space in the score.
   */
  isRest(): boolean {
    const val = this.glyphProps.codeHead;
    return val >= '\ue4e0' && val <= '\ue4ff';
  }

  // Determine if the current note is a chord
  isChord(): boolean {
    return !this.isRest() && this.keys.length > 1;
  }

  // Determine if the `StaveNote` has a stem
  hasStem(): boolean {
    return this.glyphProps.stem;
  }

  hasFlag(): boolean {
    return super.hasFlag() && !this.isRest();
  }

  getStemX(): number {
    if (this.noteType === 'r') {
      return this.getCenterGlyphX();
    } else {
      // We adjust the origin of the stem because we want the stem left-aligned
      // with the notehead if stemmed-down, and right-aligned if stemmed-up
      return super.getStemX() + (this.stemDirection ? Stem.WIDTH / (2 * -this.stemDirection) : 0);
    }
  }

  // Get the `y` coordinate for text placed on the top/bottom of a
  // note at a desired `textLine`
  getYForTopText(textLine: number): number {
    const extents = this.getStemExtents();
    return Math.min(
      this.checkStave().getYForTopText(textLine),
      extents.topY - this.renderOptions.annotationSpacing * (textLine + 1)
    );
  }
  getYForBottomText(textLine: number): number {
    const extents = this.getStemExtents();
    return Math.max(
      this.checkStave().getYForTopText(textLine),
      extents.baseY + this.renderOptions.annotationSpacing * textLine
    );
  }

  // Sets the current note to the provided `stave`. This applies
  // `y` values to the `NoteHeads`.
  setStave(stave: Stave): this {
    super.setStave(stave);

    const ys = this.#noteHeads.map((notehead) => {
      notehead.setStave(stave);
      return notehead.getY();
    });

    this.setYs(ys);

    if (this.stem) {
      const { yTop, yBottom } = this.getNoteHeadBounds();
      this.stem.setYBounds(yTop, yBottom);
    }

    return this;
  }

  // Check if note is shifted to the right
  isDisplaced(): boolean {
    return this.displaced;
  }

  // Sets whether shift note to the right. `displaced` is a `boolean`
  setNoteDisplaced(displaced: boolean): this {
    this.displaced = displaced;
    return this;
  }

  // Get the starting `x` coordinate for a `StaveTie`
  getTieRightX(): number {
    let tieStartX = this.getAbsoluteX();
    tieStartX += this.getGlyphWidth() + this.xShift + this.rightDisplacedHeadPx;
    if (this.modifierContext) tieStartX += this.modifierContext.getRightShift();
    return tieStartX;
  }

  // Get the ending `x` coordinate for a `StaveTie`
  getTieLeftX(): number {
    let tieEndX = this.getAbsoluteX();
    tieEndX += this.xShift - this.leftDisplacedHeadPx;
    return tieEndX;
  }

  // Get the stave line on which to place a rest
  getLineForRest(): number {
    let restLine = this.keyProps[0].line;
    if (this.keyProps.length > 1) {
      const lastLine = this.keyProps[this.keyProps.length - 1].line;
      const top = Math.max(restLine, lastLine);
      const bot = Math.min(restLine, lastLine);
      restLine = midLine(top, bot);
    }

    return restLine;
  }

  // Get the default `x` and `y` coordinates for the provided `position`
  // and key `index`
  getModifierStartXY(
    position: number,
    index: number,
    options: { forceFlagRight?: boolean } = {}
  ): { x: number; y: number } {
    if (!this.preFormatted) {
      throw new RuntimeError('UnformattedNote', "Can't call GetModifierStartXY on an unformatted note");
    }

    if (this.ys.length === 0) {
      throw new RuntimeError('NoYValues', 'No Y-Values calculated for this note.');
    }

    const { ABOVE, BELOW, LEFT, RIGHT } = Modifier.Position;
    let x = 0;
    if (position === LEFT) {
      // FIXME: Left modifier padding, move to font file
      x = -1 * 2;
    } else if (position === RIGHT) {
      // FIXME: Right modifier padding, move to font file
      x = this.getGlyphWidth() + this.xShift + 2;

      if (
        this.stemDirection === Stem.UP &&
        this.hasFlag() &&
        (options.forceFlagRight || isInnerNoteIndex(this, index))
      ) {
        x += this.flag.getWidth();
      }
    } else if (position === BELOW || position === ABOVE) {
      x = this.getGlyphWidth() / 2;
    }

    // addtional y shifts for rests
    let restShift = 0;
    switch (this.#noteHeads[index].getText()) {
      case Glyphs.restDoubleWhole:
      case Glyphs.restWhole:
        restShift += 0.5;
        break;
      case Glyphs.restHalf:
      case Glyphs.restQuarter:
      case Glyphs.rest8th:
      case Glyphs.rest16th:
        restShift -= 0.5;
        break;
      case Glyphs.rest32nd:
      case Glyphs.rest64th:
        restShift -= 1.5;
        break;
      case Glyphs.rest128th:
        restShift -= 2.5;
        break;
    }

    return {
      x: this.getAbsoluteX() + x,
      y: this.ys[index] + restShift * this.checkStave().getSpacingBetweenLines(),
    };
  }

  // Sets the style of the complete StaveNote, including all keys
  // and the stem.
  setStyle(style: ElementStyle): this {
    return super.setGroupStyle(style);
  }

  setStemStyle(style: ElementStyle): this {
    const stem = this.getStem();
    if (stem) stem.setStyle(style);
    return this;
  }
  getStemStyle(): ElementStyle | undefined {
    return this.stem?.getStyle();
  }

  setLedgerLineStyle(style: ElementStyle): void {
    this.ledgerLineStyle = style;
  }

  getLedgerLineStyle(): ElementStyle {
    return this.ledgerLineStyle;
  }

  setFlagStyle(style: ElementStyle): void {
    this.flagStyle = style;
  }
  getFlagStyle(): ElementStyle | undefined {
    return this.flagStyle;
  }

  /** Get the glyph width. */
  getGlyphWidth(): number {
    return this.noteHeads[0].getWidth();
  }

  // Sets the notehead at `index` to the provided coloring `style`.
  //
  // `style` is an `object` with the following properties: `shadowColor`,
  // `shadowBlur`, `fillStyle`, `strokeStyle`
  setKeyStyle(index: number, style: ElementStyle): this {
    this.#noteHeads[index].setStyle(style);
    return this;
  }

  setKeyLine(index: number, line: number): this {
    this.keyProps[index].line = line;
    this.reset();
    return this;
  }

  getKeyLine(index: number): number {
    return this.keyProps[index].line;
  }

  // Get the width of the note if it is displaced. Used for `Voice`
  // formatting
  getVoiceShiftWidth(): number {
    // TODO: may need to accommodate for dot here.
    return this.getGlyphWidth() * (this.displaced ? 2 : 1);
  }

  // Calculates and sets the extra pixels to the left or right
  // if the note is displaced.
  calcNoteDisplacements(): void {
    this.setLeftDisplacedHeadPx(this.displaced && this.stemDirection === Stem.DOWN ? this.getGlyphWidth() : 0);

    // For upstems with flags, the extra space is unnecessary, since it's taken
    // up by the flag.
    this.setRightDisplacedHeadPx(
      !this.hasFlag() && this.displaced && this.stemDirection === Stem.UP ? this.getGlyphWidth() : 0
    );
  }

  // Pre-render formatting
  preFormat(): void {
    if (this.preFormatted) return;

    let noteHeadPadding = 0;
    if (this.modifierContext) {
      this.modifierContext.preFormat();
      // If there are no modifiers on this note, make sure there is adequate padding
      // between the notes.
      if (this.modifierContext.getWidth() === 0) {
        noteHeadPadding = StaveNote.minNoteheadPadding;
      }
    }

    let width = this.getGlyphWidth() + this.leftDisplacedHeadPx + this.rightDisplacedHeadPx + noteHeadPadding;

    // For upward flagged notes, the width of the flag needs to be added
    if (this.shouldDrawFlag() && this.stemDirection === Stem.UP) {
      width += this.getGlyphWidth();
      // TODO: Add flag width as a separate metric
    }

    this.setWidth(width);
    this.preFormatted = true;
  }

  /**
   * @typedef {Object} noteHeadBounds
   * @property {number} yTop the highest notehead bound
   * @property {number} yBottom the lowest notehead bound
   * @property {number|Null} displacedX the starting x for displaced noteheads
   * @property {number|Null} nonDisplacedX the starting x for non-displaced noteheads
   * @property {number} highestLine the highest notehead line in traditional music line
   *  numbering (bottom line = 1, top line = 5)
   * @property {number} lowestLine the lowest notehead line
   * @property {number|false} highestDisplacedLine the highest staff line number
   *   for a displaced notehead
   * @property {number|false} lowestDisplacedLine
   * @property {number} highestNonDisplacedLine
   * @property {number} lowestNonDisplacedLine
   */

  /**
   * Get the staff line and y value for the highest & lowest noteheads
   * @returns {noteHeadBounds}
   */
  getNoteHeadBounds(): StaveNoteHeadBounds {
    // Top and bottom Y values for stem.
    let yTop: number = +Infinity;
    let yBottom: number = -Infinity;
    let nonDisplacedX: number | undefined;
    let displacedX: number | undefined;

    let highestLine = this.checkStave().getNumLines();
    let lowestLine = 1;
    let highestDisplacedLine: number | undefined;
    let lowestDisplacedLine: number | undefined;
    let highestNonDisplacedLine = highestLine;
    let lowestNonDisplacedLine = lowestLine;

    this.#noteHeads.forEach((notehead) => {
      const line: number = notehead.getLine();
      const y = notehead.getY();

      yTop = Math.min(y, yTop);
      yBottom = Math.max(y, yBottom);

      if (displacedX === undefined && notehead.isDisplaced()) {
        displacedX = notehead.getAbsoluteX();
      }

      if (nonDisplacedX === undefined && !notehead.isDisplaced()) {
        nonDisplacedX = notehead.getAbsoluteX();
      }

      highestLine = Math.max(line, highestLine);
      lowestLine = Math.min(line, lowestLine);

      if (notehead.isDisplaced()) {
        highestDisplacedLine = highestDisplacedLine === undefined ? line : Math.max(line, highestDisplacedLine);
        lowestDisplacedLine = lowestDisplacedLine === undefined ? line : Math.min(line, lowestDisplacedLine);
      } else {
        highestNonDisplacedLine = Math.max(line, highestNonDisplacedLine);
        lowestNonDisplacedLine = Math.min(line, lowestNonDisplacedLine);
      }
    }, this);

    return {
      yTop,
      yBottom,
      displacedX,
      nonDisplacedX,
      highestLine,
      lowestLine,
      highestDisplacedLine,
      lowestDisplacedLine,
      highestNonDisplacedLine,
      lowestNonDisplacedLine,
    };
  }

  // Get the starting `x` coordinate for the noteheads
  getNoteHeadBeginX(): number {
    return this.getAbsoluteX() + this.xShift;
  }

  // Get the ending `x` coordinate for the noteheads
  getNoteHeadEndX(): number {
    const xBegin = this.getNoteHeadBeginX();
    return xBegin + this.getGlyphWidth();
  }

  get noteHeads(): NoteHead[] {
    return this.#noteHeads.slice();
  }

  // Draw the ledger lines between the stave and the highest/lowest keys
  drawLedgerLines(): void {
    const stave = this.checkStave();
    const {
      renderOptions: { strokePx },
    } = this;
    const ctx = this.checkContext();
    const width = this.getGlyphWidth() + strokePx * 2;
    const doubleWidth = 2 * (this.getGlyphWidth() + strokePx) - Stem.WIDTH / 2;

    if (this.isRest()) return;
    if (!ctx) {
      throw new RuntimeError('NoCanvasContext', "Can't draw without a canvas context.");
    }

    const {
      highestLine,
      lowestLine,
      highestDisplacedLine,
      highestNonDisplacedLine,
      lowestDisplacedLine,
      lowestNonDisplacedLine,
      displacedX,
      nonDisplacedX,
    } = this.getNoteHeadBounds();

    // Early out if there are no ledger lines to draw.
    if (highestLine < 6 && lowestLine > 0) return;

    const minX = Math.min(displacedX ?? 0, nonDisplacedX ?? 0);

    const drawLedgerLine = (y: number, normal: boolean, displaced: boolean) => {
      let x;
      if (displaced && normal) x = minX - strokePx;
      else if (normal) x = (nonDisplacedX ?? 0) - strokePx;
      else x = (displacedX ?? 0) - strokePx;
      const ledgerWidth = normal && displaced ? doubleWidth : width;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + ledgerWidth, y);
      ctx.stroke();
    };

    const style = { ...stave.getDefaultLedgerLineStyle(), ...this.getLedgerLineStyle() };
    this.applyStyle(ctx, style);

    // Draw ledger lines below the staff:
    for (let line = 6; line <= highestLine; ++line) {
      const normal = nonDisplacedX !== undefined && line <= highestNonDisplacedLine;
      const displaced = highestDisplacedLine !== undefined && line <= highestDisplacedLine;
      drawLedgerLine(stave.getYForNote(line), normal, displaced);
    }

    // Draw ledger lines above the staff:
    for (let line = 0; line >= lowestLine; --line) {
      const normal = nonDisplacedX !== undefined && line >= lowestNonDisplacedLine;
      const displaced = lowestDisplacedLine !== undefined && line >= lowestDisplacedLine;
      drawLedgerLine(stave.getYForNote(line), normal, displaced);
    }

    this.restoreStyle(ctx, style);
  }

  // Draw all key modifiers
  drawModifiers(noteheadParam: NoteHead): void {
    const ctx = this.checkContext();
    for (let i = 0; i < this.modifiers.length; i++) {
      const modifier = this.modifiers[i];
      const index = modifier.checkIndex();
      const notehead = this.#noteHeads[index];
      if (notehead === noteheadParam) {
        const noteheadStyle = notehead.getStyle();
        notehead.applyStyle(ctx, noteheadStyle);
        modifier.setContext(ctx);
        modifier.drawWithStyle();
        notehead.restoreStyle(ctx, noteheadStyle);
      }
    }
  }

  shouldDrawFlag(): boolean {
    const hasStem = this.stem !== undefined;
    const hasFlag = this.glyphProps.codeFlagUp !== undefined;
    const hasNoBeam = this.beam === undefined;
    return hasStem && hasFlag && hasNoBeam && !this.isRest();
  }

  // Draw the flag for the note
  drawFlag(): void {
    const ctx = this.checkContext();
    if (!ctx) {
      throw new RuntimeError('NoCanvasContext', "Can't draw without a canvas context.");
    }

    if (this.shouldDrawFlag()) {
      const { yTop, yBottom } = this.getNoteHeadBounds();
      // eslint-disable-next-line
      const noteStemHeight = this.stem!.getHeight();
      const flagX = this.getStemX() - Tables.STEM_WIDTH / 2;
      const flagY =
        this.getStemDirection() === Stem.DOWN
          ? // Down stems are below the note head and have flags on the right.
            yTop - noteStemHeight - this.flag.getTextMetrics().actualBoundingBoxDescent
          : // Up stems are above the note head and have flags on the right.
            yBottom - noteStemHeight + this.flag.getTextMetrics().actualBoundingBoxAscent;

      // Draw the Flag
      this.applyStyle(ctx, this.flagStyle);
      this.flag.renderText(ctx, flagX, flagY);
      this.restoreStyle(ctx, this.flagStyle);
    }
  }

  // Draw the NoteHeads
  drawNoteHeads(): void {
    const ctx = this.checkContext();
    this.#noteHeads.forEach((notehead) => {
      notehead.applyStyle(ctx);
      ctx.openGroup('notehead', notehead.getAttribute('id'), { pointerBBox: true });
      notehead.setContext(ctx).draw();
      this.drawModifiers(notehead);
      ctx.closeGroup();
      notehead.restoreStyle(ctx);
    });
  }

  drawStem(stemOptions?: StemOptions): void {
    // GCR TODO: I can't find any context in which this is called with the stemStruct
    // argument in the codebase or tests. Nor can I find a case where super.drawStem
    // is called at all. Perhaps these should be removed?
    const ctx = this.checkContext();

    if (stemOptions) {
      this.setStem(new Stem(stemOptions));
    }

    // If we will render a flag, we shorten the stem so that the tip
    // does not poke through the flag.
    if (this.shouldDrawFlag() && this.stem) {
      this.stem.adjustHeightForFlag();
    }

    if (this.stem) {
      this.stem.setContext(ctx).draw();
    }
  }

  /**
   * Override stemmablenote stem extension to adjust for distance from middle line.
   */
  getStemExtension(): number {
    const superStemExtension = super.getStemExtension();
    if (!this.glyphProps.stem) {
      return superStemExtension;
    }

    const stemDirection = this.getStemDirection();
    if (stemDirection !== this.calculateOptimalStemDirection()) {
      return superStemExtension; // no adjustment for manually set stem direction.
    }
    let midLineDistance;
    const MIDDLE_LINE = 3;
    if (stemDirection === Stem.UP) {
      // Note that the use of maxLine here instead of minLine might
      // seem counterintuitive, but in the case of (say) treble clef
      // chord(F2, E4) stem up, we do not want to extend the stem because
      // of F2, when a normal octave-length stem above E4 is fine.
      //
      // maxLine and minLine are set in calculateOptimalStemDirection() so
      // will be known.
      midLineDistance = MIDDLE_LINE - this.maxLine;
    } else {
      midLineDistance = this.minLine - MIDDLE_LINE;
    }

    // how many lines more than an octave is the relevant notehead?
    const linesOverOctaveFromMidLine = midLineDistance - 3.5;
    if (linesOverOctaveFromMidLine <= 0) {
      return superStemExtension;
    }
    const stave = this.getStave();
    let spacingBetweenLines = 10;
    if (stave !== undefined) {
      spacingBetweenLines = stave.getSpacingBetweenLines();
    }
    return superStemExtension + linesOverOctaveFromMidLine * spacingBetweenLines;
  }

  // Draws all the `StaveNote` parts. This is the main drawing method.
  draw(): void {
    if (this.renderOptions.draw === false) return;

    if (this.ys.length === 0) {
      throw new RuntimeError('NoYValues', "Can't draw note without Y values.");
    }

    const ctx = this.checkContext();
    const xBegin = this.getNoteHeadBeginX();
    const shouldRenderStem = this.hasStem() && !this.beam;

    // Format note head x positions
    this.#noteHeads.forEach((notehead) => notehead.setX(xBegin));

    if (this.stem) {
      // Format stem x positions
      const stemX = this.getStemX();
      this.stem.setNoteHeadXBounds(stemX, stemX);
    }

    L('Rendering ', this.isChord() ? 'chord :' : 'note :', this.keys);

    // Apply the overall style -- may be contradicted by local settings:
    this.applyStyle();
    ctx.openGroup('stavenote', this.getAttribute('id'));
    this.drawLedgerLines();
    if (shouldRenderStem) this.drawStem();
    this.drawNoteHeads();
    this.drawFlag();
    ctx.closeGroup();
    this.restoreStyle();
    this.setRendered();
  }
}
