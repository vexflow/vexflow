// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License

import { Element } from './element';
import { Glyphs } from './glyphs';
import { Metrics } from './metrics';
import { RenderContext } from './rendercontext';
import { StaveNote } from './stavenote';
import { Tables } from './tables';
import { Category } from './typeguard';
import { log, RuntimeError } from './util';

// eslint-disable-next-line
function L(...args: any[]) {
  if (PedalMarking.DEBUG) log('VexFlow.PedalMarking', args);
}

/**
 * Draws a pedal glyph with the provided `name` on a rendering `context`
 * at the coordinates `x` and `y. Takes into account the glyph data
 * coordinate shifts.
 */
function drawPedalGlyph(name: string, ctx: RenderContext, x: number, y: number): number {
  const glyph = new Element(PedalMarking.CATEGORY);
  glyph.setText(PedalMarking.GLYPHS[name] ?? name);
  glyph.renderText(ctx, x - (glyph.getWidth() - Tables.STAVE_LINE_DISTANCE) / 2, y);
  return glyph.getWidth();
}

/**
 * PedalMarking implements different types of pedal markings. These notation
 * elements indicate to the performer when to depress and release the a pedal.
 *
 * In order to create "Sostenuto", and "una corda" markings, you must set
 * custom text for the release/depress pedal markings.
 */
export class PedalMarking extends Element {
  /** To enable logging for this class. Set `VexFlow.PedalMarking.DEBUG` to `true`. */
  static DEBUG: boolean = false;

  static get CATEGORY(): string {
    return Category.PedalMarking;
  }

  protected line: number;
  protected type: number;
  protected customDepressText: string;
  protected customReleaseText: string;

  public renderOptions: {
    color: string;
    bracketHeight: number;
    textMarginRight: number;
    bracketLineWidth: number;
  };
  protected notes: StaveNote[];

  /** Glyph data */
  static readonly GLYPHS: Record<string, string> = {
    pedalDepress: Glyphs.keyboardPedalPed,
    pedalRelease: Glyphs.keyboardPedalUp,
  };

  /** Pedal type as number. */
  static readonly type = {
    TEXT: 1,
    BRACKET: 2,
    MIXED: 3,
  };

  /** Pedal type as string. */
  static readonly typeString: Record<string, number> = {
    text: PedalMarking.type.TEXT,
    bracket: PedalMarking.type.BRACKET,
    mixed: PedalMarking.type.MIXED,
  };

  /**
   * Create a sustain pedal marking. Returns the defaults PedalMarking.
   * Which uses the traditional "Ped" and "*"" markings.
   */
  static createSustain(notes: StaveNote[]): PedalMarking {
    const pedal = new PedalMarking(notes);
    return pedal;
  }

  /** Create a sostenuto pedal marking */
  static createSostenuto(notes: StaveNote[]): PedalMarking {
    const pedal = new PedalMarking(notes);
    pedal.setType(PedalMarking.type.MIXED);
    pedal.setCustomText('Sost. Ped.');
    return pedal;
  }

  /** Create an una corda pedal marking */
  static createUnaCorda(notes: StaveNote[]): PedalMarking {
    const pedal = new PedalMarking(notes);
    pedal.setType(PedalMarking.type.TEXT);
    pedal.setCustomText('una corda', 'tre corda');
    return pedal;
  }

  constructor(notes: StaveNote[]) {
    super();

    this.notes = notes;
    this.type = PedalMarking.type.TEXT;
    this.line = 0;

    // Custom text for the release/depress markings
    this.customDepressText = '';
    this.customReleaseText = '';

    this.renderOptions = {
      bracketHeight: 10,
      textMarginRight: 6,
      bracketLineWidth: 1,
      color: 'black',
    };
  }

  /** Set pedal type. */
  setType(type: string | number): this {
    type = typeof type === 'string' ? PedalMarking.typeString[type] : type;

    if (type >= PedalMarking.type.TEXT && type <= PedalMarking.type.MIXED) {
      this.type = type;
    }
    return this;
  }

  /**
   * Set custom text for the `depress`/`release` pedal markings. No text is
   * set if the parameter is falsy.
   */
  setCustomText(depress: string, release?: string): this {
    this.customDepressText = depress || '';
    this.customReleaseText = release || '';
    return this;
  }

  /** Set the staff line to render the markings on. */
  setLine(line: number): this {
    this.line = line;
    return this;
  }

  /** Draw the bracket based pedal markings. */
  drawBracketed(): void {
    const ctx = this.checkContext();
    let isPedalDepressed = false;
    let prevX: number;
    let prevY: number;
    let textWidth = 0;

    // Iterate through each note
    this.notes.forEach((note, index, notes) => {
      // Each note triggers the opposite pedal action
      isPedalDepressed = !isPedalDepressed;

      // Get the initial coordinates for the note
      const x = note.getAbsoluteX();
      const y = note.checkStave().getYForBottomText(this.line + 3);

      // Throw if current note is positioned before the previous note
      if (x < prevX) {
        throw new RuntimeError('InvalidConfiguration', 'The notes provided must be in order of ascending x positions');
      }

      // Determine if the previous or next note are the same
      // as the current note. We need to keep track of this for
      // when adjustments are made for the release+depress action
      const nextNoteIsSame = notes[index + 1] === note;
      const prevNoteIsSame = notes[index - 1] === note;

      let xShift = 0;
 
      if (isPedalDepressed) {
        // Adjustment for release+depress
        xShift = prevNoteIsSame ? 5 : 0;

        if (this.type === PedalMarking.type.MIXED && !prevNoteIsSame) {
          // For MIXED style, start with text instead of bracket
          if (this.customDepressText) {
            // If we have custom text, use instead of the default "Ped" glyph
            textWidth = ctx.measureText(this.customDepressText).width;
            ctx.fillText(this.customDepressText, x - (textWidth - Tables.STAVE_LINE_DISTANCE) / 2, y);
          } else {
            // Render the Ped glyph in position
            textWidth = drawPedalGlyph('pedalDepress', ctx, x, y);
          }
          xShift = textWidth / 2 + Tables.STAVE_LINE_DISTANCE / 2 + this.renderOptions.textMarginRight;
        } else {
          // Draw start bracket
          ctx.beginPath();
          ctx.moveTo(x, y - this.renderOptions.bracketHeight);
          ctx.lineTo(x + xShift, y);
          ctx.stroke();
          ctx.closePath();
        }
      } else {
        // Get the current note index and the total notes in the voice
        const noteNdx = note.getVoice().getTickables().indexOf(note);
        const voiceNotes = note.getVoice().getTickables().length;
        // Get the shift to next note's x position or endd of stave
        const nextNoteShift = noteNdx + 1 < voiceNotes ? note.getVoice().getTickables()[noteNdx+1].getAbsoluteX() - x : (note.getStave()?.getX() ?? 0) + (note.getStave()?.getWidth() ?? 0) - x;
        // Adjustment for release+depress
        xShift = nextNoteIsSame ? -5 : nextNoteShift - (notes[index + 1]?textWidth / 2:0) - 5;
        
        // Draw end bracket
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x + xShift, y);
        // No shift if next note is the same
        ctx.lineTo(x + (nextNoteIsSame ? 0 : xShift), y - this.renderOptions.bracketHeight);
        ctx.stroke();
        ctx.closePath();
      }

      // Store previous coordinates
      prevX = x + xShift;
      prevY = y;
    });
  }

  /**
   * Draw the text based pedal markings. This defaults to the traditional
   * "Ped" and "*"" symbols if no custom text has been provided.
   */
  drawText(): void {
    const ctx = this.checkContext();
    let isPedalDepressed = false;

    // Iterate through each note, placing glyphs or custom text accordingly
    this.notes.forEach((note) => {
      isPedalDepressed = !isPedalDepressed;
      const stave = note.checkStave();
      const x = note.getAbsoluteX();
      const y = stave.getYForBottomText(this.line + 3);

      let textWidth = 0;
      if (isPedalDepressed) {
        if (this.customDepressText) {
          textWidth = ctx.measureText(this.customDepressText).width;
          ctx.fillText(this.customDepressText, x - textWidth / 2, y);
        } else {
          drawPedalGlyph('pedalDepress', ctx, x, y);
        }
      } else {
        if (this.customReleaseText) {
          textWidth = ctx.measureText(this.customReleaseText).width;
          ctx.fillText(this.customReleaseText, x - textWidth / 2, y);
        } else {
          drawPedalGlyph('pedalRelease', ctx, x, y);
        }
      }
    });
  }

  /** Render the pedal marking in position on the rendering context. */
  draw(): void {
    const ctx = this.checkContext();
    this.setRendered();

    ctx.save();
    ctx.setStrokeStyle(this.renderOptions.color);
    ctx.setFillStyle(this.renderOptions.color);
    ctx.setFont(Metrics.getFontInfo('PedalMarking.text'));
    L('Rendering Pedal Marking');

    if (this.type === PedalMarking.type.BRACKET || this.type === PedalMarking.type.MIXED) {
      ctx.setLineWidth(this.renderOptions.bracketLineWidth);
      this.drawBracketed();
    } else if (this.type === PedalMarking.type.TEXT) {
      this.drawText();
    }

    ctx.restore();
  }
}
