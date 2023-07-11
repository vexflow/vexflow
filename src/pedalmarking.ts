// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License

import { Element } from './element';
import { Glyph } from './glyph';
import { RenderContext } from './rendercontext';
import { StaveNote } from './stavenote';
import { Tables } from './tables';
import { Category } from './typeguard';
import { log, RuntimeError } from './util';

// eslint-disable-next-line
function L(...args: any[]) {
  if (PedalMarking.DEBUG) log('Vex.Flow.PedalMarking', args);
}

/**
 * Draws a pedal glyph with the provided `name` on a rendering `context`
 * at the coordinates `x` and `y. Takes into account the glyph data
 * coordinate shifts.
 */
function drawPedalGlyph(name: string, context: RenderContext, x: number, y: number, point: number): void {
  const glyphData = PedalMarking.GLYPHS[name];
  const glyph = new Glyph(glyphData.code, point, { category: 'pedalMarking' });
  // Center the middle of the glyph with the middle of the note head (Tables.STAVE_LINE_DISTANCE / 2)
  glyph.render(context, x - (glyph.getMetrics().width - Tables.STAVE_LINE_DISTANCE) / 2, y);
}

/**
 * PedalMarking implements different types of pedal markings. These notation
 * elements indicate to the performer when to depress and release the a pedal.
 *
 * In order to create "Sostenuto", and "una corda" markings, you must set
 * custom text for the release/depress pedal markings.
 */
export class PedalMarking extends Element {
  /** To enable logging for this class. Set `Vex.Flow.PedalMarking.DEBUG` to `true`. */
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
  static readonly GLYPHS: Record<string, { code: string }> = {
    pedalDepress: {
      code: 'keyboardPedalPed',
    },
    pedalRelease: {
      code: 'keyboardPedalUp',
    },
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
      const point =
        Tables.currentMusicFont().lookupMetric(`pedalMarking.${isPedalDepressed ? 'down' : 'up'}.point`) ??
        Tables.NOTATION_FONT_SCALE;

      if (isPedalDepressed) {
        // Adjustment for release+depress
        xShift = prevNoteIsSame ? 5 : 0;

        if (this.type === PedalMarking.type.MIXED && !prevNoteIsSame) {
          // For MIXED style, start with text instead of bracket
          if (this.customDepressText) {
            // If we have custom text, use instead of the default "Ped" glyph
            const textWidth = ctx.measureText(this.customDepressText).width;
            ctx.fillText(this.customDepressText, x - textWidth / 2, y);
            xShift = textWidth / 2 + this.renderOptions.textMarginRight;
          } else {
            // Render the Ped glyph in position
            drawPedalGlyph('pedalDepress', ctx, x, y, point);
            xShift = 20 + this.renderOptions.textMarginRight;
          }
        } else {
          // Draw start bracket
          ctx.beginPath();
          ctx.moveTo(x, y - this.renderOptions.bracketHeight);
          ctx.lineTo(x + xShift, y);
          ctx.stroke();
          ctx.closePath();
        }
      } else {
        // Adjustment for release+depress
        xShift = nextNoteIsSame ? -5 : 0;

        // Draw end bracket
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x + xShift, y);
        ctx.lineTo(x, y - this.renderOptions.bracketHeight);
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

      const point =
        Tables.currentMusicFont().lookupMetric(`pedalMarking.${isPedalDepressed ? 'down' : 'up'}.point`) ??
        Tables.NOTATION_FONT_SCALE;

      let textWidth = 0;
      if (isPedalDepressed) {
        if (this.customDepressText) {
          textWidth = ctx.measureText(this.customDepressText).width;
          ctx.fillText(this.customDepressText, x - textWidth / 2, y);
        } else {
          drawPedalGlyph('pedalDepress', ctx, x, y, point);
        }
      } else {
        if (this.customReleaseText) {
          textWidth = ctx.measureText(this.customReleaseText).width;
          ctx.fillText(this.customReleaseText, x - textWidth / 2, y);
        } else {
          drawPedalGlyph('pedalRelease', ctx, x, y, point);
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
    ctx.setFont(this.textFont);

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
