// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// Pedal text and brackets with annotation clearance and inherited styles.
// MIT License
// Pedal text and brackets with clearance for annotations in the marked passage.

import { Annotation } from './annotation';
import { BoundingBox } from './boundingbox';
import { Element } from './element';
import { Glyphs } from './glyphs';
import { Metrics } from './metrics';
import { Stave } from './stave';
import { StaveNote } from './stavenote';
import { Category, isAnnotation, isStaveNote } from './typeguard';
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

  static override get CATEGORY(): string {
    return Category.PedalMarking;
  }

  protected line: number;
  protected type: number;
  protected depressText: string;
  protected releaseText: string;

  public renderOptions: {
    color?: string;
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

  /** Ordered press, change and release anchors. Repeated notes represent a pedal change. */
  getNotes(): readonly StaveNote[] {
    return this.notes;
  }

  private layoutBaseline?: number;

  /** A single-stave phrase may supply the pedal baseline after arranging the surrounding lanes. */
  setLayoutBaseline(y?: number): void {
    this.layoutBaseline = y;
  }

  private releaseX(note: StaveNote): number {
    const notes = note.getVoice().getTickables();
    return notes[notes.indexOf(note) + 1]?.getAbsoluteX() ?? note.checkStave().getX() + note.checkStave().getWidth();
  }

  /** Enclose actual pedal text, changes, end hooks and bracket stroke. */
  override getBoundingBox(): BoundingBox {
    const text = new Element('PedalMarking').setFont(this.fontInfo);
    let box: BoundingBox | undefined;
    const include = (part: BoundingBox) => {
      box = box ? box.mergeWith(part) : part;
    };
    this.notes.forEach((note, i) => {
      const down = i % 2 === 0,
        x = note.getAbsoluteX(),
        y = this.getYForStave(note.checkStave());
      const repeated = note === this.notes[i - 1];
      const end = this.releaseX(note);
      if (this.type === PedalMarking.type.TEXT || (this.type === PedalMarking.type.MIXED && down && !repeated)) {
        text.setText(down ? this.depressText : this.releaseText);
        include(text.getTextInk(down ? x : end - text.getWidth(), y));
      }
      if (this.type !== PedalMarking.type.TEXT) {
        const edge = down ? x + (repeated ? 5 : 0) : note === this.notes[i + 1] ? x : end - 5;
        const pad = this.renderOptions.bracketLineWidth / 2,
          h = this.renderOptions.bracketHeight;
        include(new BoundingBox(edge - pad, y - h - pad, 2 * pad, h + 2 * pad));
      }
    });
    return box ?? new BoundingBox(0, 0, 0, 0);
  }

  /** Compute a baseline below annotations in participating voices on this stave. */
  getYForStave(stave: Stave): number {
    if (this.layoutBaseline !== undefined) return this.layoutBaseline;
    let y = stave.getYForBottomText(this.line + 3);
    const events = this.notes.filter((note) => note.getStave() === stave);
    if (!events.length) return y;
    const startX = Math.min(...events.map((note) => note.getAbsoluteX()));
    const endX = Math.max(...events.map((note) => note.getAbsoluteX()));
    const voices = new Set(events.map((note) => note.getVoice()));
    // Bracket notches and text both extend upward from the baseline.
    const text = new Element('PedalMarking').setFont(this.fontInfo);
    const textHeight = Math.max(
      text.setText(this.depressText).getTextMetrics().actualBoundingBoxAscent,
      text.setText(this.releaseText).getTextMetrics().actualBoundingBoxAscent
    );
    const height =
      this.type === PedalMarking.type.BRACKET
        ? this.renderOptions.bracketHeight
        : Math.max(textHeight, this.type === PedalMarking.type.MIXED ? this.renderOptions.bracketHeight : 0);
    for (const voice of voices) {
      for (const note of voice.getTickables()) {
        if (!isStaveNote(note) || note.getStave() !== stave) continue;
        if (note.getAbsoluteX() < startX || note.getAbsoluteX() > endX) continue;
        for (const modifier of note.getModifiers()) {
          if (!isAnnotation(modifier) || modifier.getVerticalJustification() !== Annotation.VerticalJustify.BOTTOM)
            continue;
          const bottom =
            modifier.computeY().y + modifier.getYShift() + modifier.getTextMetrics().actualBoundingBoxDescent;
          y = Math.max(y, bottom + 4 + height);
        }
      }
    }
    return y;
  }

  /** Draw the bracket based pedal markings. */
  drawBracketed(): void {
    const ctx = this.checkContext();
    let isPedalDepressed = false;
    let prevX: number;
    let prevY: number;
    let textWidth = 0;
    const baselines = new Map(this.notes.map((note) => [note.checkStave(), 0]));
    for (const stave of baselines.keys()) baselines.set(stave, this.getYForStave(stave));

    // Iterate through each note
    this.notes.forEach((note, index, notes) => {
      // Each note triggers the opposite pedal action
      isPedalDepressed = !isPedalDepressed;

      // Get the initial coordinates for the note
      const x = note.getAbsoluteX();
      const y = baselines.get(note.checkStave())!;

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
        const noteEndX = this.releaseX(note);
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
    const baselines = new Map(this.notes.map((note) => [note.checkStave(), 0]));
    for (const stave of baselines.keys()) baselines.set(stave, this.getYForStave(stave));

    // Iterate through each note, placing glyphs or custom text accordingly
    this.notes.forEach((note) => {
      isPedalDepressed = !isPedalDepressed;
      const stave = note.checkStave();
      const x = note.getAbsoluteX();
      const y = baselines.get(stave)!;

      if (isPedalDepressed) {
        textWidth = ctx.measureText(this.depressText).width;
        ctx.fillText(this.depressText, x, y);
      } else {
        const noteEndX = this.releaseX(note);
        textWidth = ctx.measureText(this.releaseText).width;
        ctx.fillText(this.releaseText, noteEndX - textWidth, y);
      }
    });
  }

  /** Render the pedal marking in position on the rendering context. */
  override draw(): void {
    const ctx = this.checkContext();
    this.setRendered();

    if (this.renderOptions.color !== undefined) {
      ctx.setStrokeStyle(this.renderOptions.color);
      ctx.setFillStyle(this.renderOptions.color);
    }
    this.applyStyle(ctx);
    ctx.setFont(this.fontInfo);
    L('Rendering Pedal Marking');

    if (this.type === PedalMarking.type.BRACKET || this.type === PedalMarking.type.MIXED) {
      ctx.setLineWidth(this.renderOptions.bracketLineWidth);
      this.drawBracketed();
    } else if (this.type === PedalMarking.type.TEXT) {
      this.drawText();
    }
  }
}
