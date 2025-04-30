// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License

import { ElementStyle } from './element';
import { Note, NoteStruct } from './note';
import { Stave } from './stave';
import { StaveNote } from './stavenote';
import { Stem } from './stem';
import { Category } from './typeguard';
import { defined, log } from './util';

// eslint-disable-next-line
function L(...args: any[]) {
  if (NoteHead.DEBUG) log('VexFlow.NoteHead', args);
}

export interface NoteHeadStruct extends NoteStruct {
  line?: number;
  slashed?: boolean;
  style?: ElementStyle;
  customGlyphCode?: string;
  stemDirection?: number;
  displaced?: boolean;
  noteType?: string;
  x?: number;
  y?: number;
  index?: number;
}

/**
 * `NoteHeads` are typically not manipulated
 * directly, but used internally in `StaveNote`.
 *
 * See `tests/notehead_tests.ts` for usage examples.
 */
export class NoteHead extends Note {
  /** To enable logging for this class. Set `VexFlow.NoteHead.DEBUG` to `true`. */
  static DEBUG: boolean = false;

  static override get CATEGORY(): string {
    return Category.NoteHead;
  }

  protected customGlyph: boolean = false;
  protected displaced: boolean;
  protected stemDirection: number;

  protected line: number;
  protected index?: number;
  protected slashed: boolean;

  // map notehead SMuFL codes to the corresponding SMuFL code with ledger line
  protected ledger: Record<string, string> = {
    '\ue4e3' /*restWhole*/: '\ue4f4' /*restWholeLegerLine*/,
    '\ue4e4' /*restHalf*/: '\ue4f5' /*restHalfLegerLine*/,
  };

  constructor(noteStruct: NoteHeadStruct) {
    super(noteStruct);

    this.index = noteStruct.index;
    this.x = noteStruct.x || 0;
    this.y = noteStruct.y || 0;
    if (noteStruct.noteType) this.noteType = noteStruct.noteType;
    this.displaced = noteStruct.displaced || false;
    this.stemDirection = noteStruct.stemDirection || Stem.UP;
    this.line = noteStruct.line || 0;

    // Get glyph code based on duration and note type. This could be
    // regular notes, rests, or other custom codes.
    this.glyphProps = Note.getGlyphProps(this.duration, this.noteType);
    defined(
      this.glyphProps,
      'BadArguments',
      `No glyph found for duration '${this.duration}' and type '${this.noteType}'`
    );

    // Swap out the glyph with ledger lines
    if ((this.line > 5 || this.line < 0) && this.ledger[this.glyphProps.codeHead]) {
      this.glyphProps.codeHead = this.ledger[this.glyphProps.codeHead];
    }
    this.text = this.glyphProps.codeHead;
    if (noteStruct.customGlyphCode) {
      this.customGlyph = true;
      this.text = noteStruct.customGlyphCode;
    }

    this.setStyle(noteStruct.style ?? {});
    this.slashed = noteStruct.slashed || false;

    this.renderOptions = {
      ...this.renderOptions,
    };
  }
  /** Get the width of the notehead. */
  override getWidth(): number {
    return this.width;
  }

  /** Determine if the notehead is displaced. */
  isDisplaced(): boolean {
    return this.displaced === true;
  }

  /** Get the stave line the notehead is placed on. */
  getLine(): number {
    return this.line;
  }

  /** Set the stave line the notehead is placed on. */
  setLine(line: number): this {
    this.line = line;
    return this;
  }

  /** Get the canvas `x` coordinate position of the notehead. */
  override getAbsoluteX(): number {
    // If the note has not been preformatted, then get the static x value
    // Otherwise, it's been formatted and we should use it's x value relative
    // to its tick context
    const x = !this.preFormatted ? this.x : super.getAbsoluteX();

    // For a more natural displaced notehead, we adjust the displacement amount
    // by half the stem width in order to maintain a slight overlap with the stem
    const displacementStemAdjustment = Stem.WIDTH / 2;

    return x + (this.displaced ? (this.width - displacementStemAdjustment) * this.stemDirection : 0);
  }

  /** Set notehead to a provided `stave`. */
  override setStave(stave: Stave): this {
    const line = this.getLine();

    this.stave = stave;
    if (this.stave) {
      this.setY(this.stave.getYForNote(line));
      this.setContext(this.stave.getContext());
    }
    return this;
  }

  /** Pre-render formatting. */
  override preFormat(): this {
    if (this.preFormatted) return this;

    this.preFormatted = true;
    return this;
  }

  /** Draw the notehead. */
  override draw(): void {
    const ctx = this.checkContext();
    this.setRendered();
    ctx.openGroup('notehead', this.getAttribute('id'));

    L("Drawing note head '", this.noteType, this.duration, "' at", this.x, this.y);
    this.x = this.getAbsoluteX();
    this.renderText(ctx, 0, 0);
    (this.parent as StaveNote)?.drawModifiers(this);
    this.drawPointerRect();
    ctx.closeGroup();
  }
}
