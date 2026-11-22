// Timed Synodal Kievan half notes with native line and space forms.
import { Element } from './element';
import { GlyphNote } from './glyphnote';
import { Glyphs } from './glyphs';
import { Stave } from './stave';
import { Tables } from './tables';
import { Category } from './typeguard';

/** The tse-fa-ut clef places C4 on the middle line of a five-line stave. */
export interface KievanNoteStruct {
  pitch: string;
  duration: string;
}

/** Each historical glyph contains the full note, including its stem. */
export class KievanNote extends GlyphNote {
  static override get CATEGORY(): string {
    return Category.KievanNote;
  }

  private readonly alternate = new Element();

  constructor({ pitch, duration }: KievanNoteStruct) {
    super(Glyphs.kievanNoteHalfStaffLine, { duration });
    if (Tables.sanitizeDuration(this.duration) !== '2' || this.writtenDots || this.noteType !== 'n')
      throw new RangeError('A Kievan half note requires an undotted half-note duration.');
    this.setPitch(pitch);
  }

  /** Edit the written pitch without replacing the event or its tick context. */
  setPitch(pitch: string): this {
    if (!/^[a-g]\/-?\d+$/i.test(pitch) || !Number.isSafeInteger(Number(pitch.split('/')[1])))
      throw new RangeError('Expected a natural written pitch such as c/4.');
    const props = Tables.keyProperties(pitch, 'kievan');
    this.keys = [pitch];
    this.keyProps = [props];
    // Note positions count up from the bottom. GlyphNote positions count down from the top.
    this.options.line = 5 - props.line;
    const onLine = Number.isInteger(props.line);
    this.setGlyph(onLine ? Glyphs.kievanNoteHalfStaffLine : Glyphs.kievanNoteHalfStaffSpace);
    this.alternate.setText(onLine ? Glyphs.kievanNoteHalfStaffSpace : Glyphs.kievanNoteHalfStaffLine);
    if (this.stave) this.setYs([this.stave.getYForLine(this.options.line)]);
    if (this.preFormatted) this.preFormat();
    return this;
  }

  /** Keep native note anchors at the pitched glyph when a voice moves to a new stave. */
  override setStave(stave: Stave): this {
    super.setStave(stave);
    return this.setYs([stave.getYForLine(this.options.line)]);
  }

  /** Both choices occupy an equal attack slot, including after an edit and reformat. */
  override preFormat(): this {
    super.preFormat();
    this.width = Math.max(this.textMetrics.width, this.alternate.setFont(this.fontInfo).width);
    return this;
  }
}
