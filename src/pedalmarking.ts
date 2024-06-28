// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License

import { Element } from './element';
import { Glyphs } from './glyphs';
import { Metrics } from './metrics';
import { StaveNote } from './stavenote';
import { Category } from './typeguard';
import { log, RuntimeError } from './util';

// eslint-disable-next-line
function L(...args: any[]) {
  if (PedalMarking.DEBUG) log('VexFlow.PedalMarking', args);
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
  protected depressText: string;
  protected releaseText: string;

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

    // Text for the release/depress markings
    this.depressText = PedalMarking.GLYPHS.pedalDepress;
    this.releaseText = PedalMarking.GLYPHS.pedalRelease;

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
    this.depressText = depress || '';
    this.releaseText = release || '';
    this.setFont(Metrics.getFontInfo('PedalMarking.text'));
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
          textWidth = ctx.measureText(this.depressText).width;
          ctx.fillText(this.depressText, x, y);
          // Adjust the xShift for the next note
          xShift = textWidth + this.renderOptions.textMarginRight;
        } else {
          // Draw start bracket
          ctx.beginPath();
          ctx.moveTo(x, y - this.renderOptions.bracketHeight);
          ctx.lineTo(x + xShift, y);
          ctx.stroke();
          ctx.closePath();
        }
      } else {
        // Get the current note index and the total notes in the associated voice
        const noteNdx = note.getVoice().getTickables().indexOf(note);
        const voiceNotes = note.getVoice().getTickables().length;
        // Get the absolute x position of the end of the current note
        const noteEndX =
          noteNdx + 1 < voiceNotes ? 
          // If the next note is in the same voice, use the x position of the next note
          note.getVoice().getTickables()[noteNdx+1].getAbsoluteX() :
          // If this is the last note is the voice, use the x position of the next stave
          (note.getStave()?.getX() ?? 0) + (note.getStave()?.getWidth() ?? 0);

        // Draw end bracket
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(nextNoteIsSame ? x - 5 : noteEndX - 5, y);
        // No shift if next note is the same
        ctx.lineTo(nextNoteIsSame ? x : noteEndX - 5, y - this.renderOptions.bracketHeight);
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
    let textWidth = 0;

    // Iterate through each note, placing glyphs or custom text accordingly
    this.notes.forEach((note) => {
      isPedalDepressed = !isPedalDepressed;
      const stave = note.checkStave();
      const x = note.getAbsoluteX();
      const y = stave.getYForBottomText(this.line + 3);

      if (isPedalDepressed) {
        textWidth = ctx.measureText(this.depressText).width;
        ctx.fillText(this.depressText, x, y);
      } else {
        const noteNdx = note.getVoice().getTickables().indexOf(note);
        const voiceNotes = note.getVoice().getTickables().length;
        // Get the shift for the next note
        const noteEndX =
          noteNdx + 1 < voiceNotes ? 
          // If the next note is in the same voice, use the x position of the next note
          note.getVoice().getTickables()[noteNdx+1].getAbsoluteX() :
          // If this is the last note is the voice, use the x position of the next stave
          (note.getStave()?.getX() ?? 0) + (note.getStave()?.getWidth() ?? 0) ;
        textWidth = ctx.measureText(this.releaseText).width;
        ctx.fillText(this.releaseText, noteEndX - textWidth, y);
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
    ctx.setFont(this.font);
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
