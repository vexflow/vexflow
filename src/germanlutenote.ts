// Staffless German Renaissance lute signs for the five principal courses.
import { BoundingBox } from './boundingbox';
import { Element } from './element';
import { Glyphs } from './glyphs';
import { Note } from './note';
import { Tables } from './tables';
import { Category } from './typeguard';

/** A fretted attack. Course 1 is the highest course. */
export interface GermanLuteNoteStruct {
  course: number;
  fret: number;
  duration: string;
}

/** SMuFL's German lowercase alphabet, by fret, reading from course 5 down to course 1. */
const signsByFret = [
  [
    Glyphs.luteGermanALower,
    Glyphs.luteGermanBLower,
    Glyphs.luteGermanCLower,
    Glyphs.luteGermanDLower,
    Glyphs.luteGermanELower,
  ],
  [
    Glyphs.luteGermanFLower,
    Glyphs.luteGermanGLower,
    Glyphs.luteGermanHLower,
    Glyphs.luteGermanILower,
    Glyphs.luteGermanKLower,
  ],
  [
    Glyphs.luteGermanLLower,
    Glyphs.luteGermanMLower,
    Glyphs.luteGermanNLower,
    Glyphs.luteGermanOLower,
    Glyphs.luteGermanPLower,
  ],
  [
    Glyphs.luteGermanQLower,
    Glyphs.luteGermanRLower,
    Glyphs.luteGermanSLower,
    Glyphs.luteGermanTLower,
    Glyphs.luteGermanVLower,
  ],
  [Glyphs.luteGermanXLower, Glyphs.luteGermanYLower, Glyphs.luteGermanZLower],
];

/** Measure the tallest letter once per font through the shared text metrics cache. */
const principalAlphabet = signsByFret.flat().join('');

/** Independent flags above each attack use the written duration. */
const rhythmSigns: Record<string, string> = {
  '1/2': Glyphs.luteDurationDoubleWhole,
  '1': Glyphs.luteDurationWhole,
  '2': Glyphs.luteDurationHalf,
  '4': Glyphs.luteDurationQuarter,
  '8': Glyphs.luteDuration8th,
  '16': Glyphs.luteDuration16th,
  '32': Glyphs.luteDuration32nd,
};

/** A timed letter below a rhythm sign. Use a Stave with zero lines and both barlines disabled. */
export class GermanLuteNote extends Note {
  static override get CATEGORY(): string {
    return Category.GermanLuteNote;
  }

  private readonly rhythm = new Element();
  private readonly rhythmSign: string;
  private rhythmOffset = 0;
  private course!: number;
  private fret!: number;

  constructor(spec: GermanLuteNoteStruct) {
    super(spec);
    this.rhythmSign = rhythmSigns[Tables.sanitizeDuration(this.duration)];
    if (!this.rhythmSign || this.writtenDots || this.noteType !== 'n') {
      throw new RangeError('German lute attacks require an undotted duration from double whole through 32nd.');
    }
    this.setPosition(spec.course, spec.fret);
  }

  /** Read the numeric position independently of the selected music font. */
  getPosition(): { course: number; fret: number } {
    return { course: this.course, fret: this.fret };
  }

  /** Change the stopped course or fret, preserving the duration and tick context. */
  setPosition(course: number, fret: number): this {
    const sign = signsByFret[fret - 1]?.[5 - course];
    if (!Number.isInteger(fret) || !Number.isInteger(course) || !sign) {
      throw new RangeError(`No principal-course German lute sign for course ${course}, fret ${fret}.`);
    }
    this.course = course;
    this.fret = fret;
    this.text = sign;
    if (this.preFormatted) this.preFormat();
    return this;
  }

  /** Reserve the widest letter at this fret so course edits retain the same attack columns. */
  override preFormat(): this {
    this.modifierContext?.preFormat();
    this.rhythm.setFont(this.fontInfo);
    let width = 0;
    for (const sign of signsByFret[this.fret - 1]) {
      width = Math.max(width, this.rhythm.setText(sign).getWidth());
    }
    const ascent = this.rhythm.setText(principalAlphabet).getTextMetrics().actualBoundingBoxAscent;
    this.rhythm.setText(this.rhythmSign);
    this.rhythmOffset = ascent + this.rhythm.getTextMetrics().actualBoundingBoxDescent + this.fontSizeInPixels / 5;
    this.width = Math.max(width, this.rhythm.getWidth());
    this.preFormatted = true;
    return this;
  }

  /** Leave room for the tallest principal-course ascenders below the rhythm signs. */
  private rhythmY(): number {
    return this.getYs()[0] - this.rhythmOffset + this.yShift;
  }

  /** Both signs share the attack's horizontal anchor. Measure each one separately for hit testing. */
  getInkParts(): BoundingBox[] {
    const x = this.getAbsoluteX();
    return [this.getTextInk(x, this.getYs()[0]), this.rhythm.getTextInk(x + this.xShift, this.rhythmY())];
  }

  override getBoundingBox(): BoundingBox {
    const [letter, rhythm] = this.getInkParts();
    return letter.mergeWith(rhythm);
  }

  /** Draw all course letters on the stave's common baseline. */
  override draw(): void {
    const ctx = this.checkContext();
    const x = this.getAbsoluteX();
    this.setRendered();
    ctx.openGroup('german-lute-note', this.getAttribute('id'));
    this.renderText(ctx, x, this.getYs()[0]);
    this.rhythm.renderText(ctx, x + this.xShift, this.rhythmY());
    for (const modifier of this.modifiers) modifier.setContext(ctx).drawWithStyle();
    this.drawPointerRect();
    ctx.closeGroup();
  }
}
