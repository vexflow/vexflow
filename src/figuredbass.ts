// Engrave figured-bass rows and their note-anchored continuation lines beneath a staff.
import { BoundingBox } from './boundingbox';
import { Element } from './element';
import { Glyphs } from './glyphs';
import { StaveNote } from './stavenote';
import { Category } from './typeguard';
import { RuntimeError } from './util';

/** One written interval, with an optional attack through which the interval is held. */
export interface FiguredBassFigure {
  note: StaveNote;
  figure: string;
  extendTo?: StaveNote;
}

/** Rows read from top to bottom. Within each row, list only the written figures in musical order. */
export interface FiguredBassSpec {
  rows: readonly (readonly FiguredBassFigure[])[];
}

/** SMuFL includes altered figures between its ordinary digits. */
const digits = [
  Glyphs.figbass0,
  Glyphs.figbass1,
  Glyphs.figbass2,
  Glyphs.figbass3,
  Glyphs.figbass4,
  Glyphs.figbass5,
  Glyphs.figbass6,
  Glyphs.figbass7,
  Glyphs.figbass8,
  Glyphs.figbass9,
];

/** A drawn figure and its continuation share their ink geometry with measurements. */
interface PlacedFigure {
  glyph: Element;
  x: number;
  baseline: number;
  ink: BoundingBox;
  line?: BoundingBox;
}

/** A passage of independent figured-bass rows on a formatted staff. */
export class FiguredBass extends Element {
  static override get CATEGORY(): string {
    return Category.FiguredBass;
  }

  private readonly rows: { note: StaveNote; extendTo?: StaveNote; glyph: Element }[][];
  private readonly anchors = new Set<StaveNote>();

  constructor({ rows }: FiguredBassSpec) {
    super();
    if (!rows.length || rows.some((row) => !row.length))
      throw new RuntimeError('BadArguments', 'Each figured-bass row needs a written figure.');
    this.rows = rows.map((row) =>
      row.map(({ note, figure, extendTo }) => {
        if (typeof figure !== 'string' || !/^[0-9]+$/.test(figure))
          throw new RuntimeError('BadArguments', 'Expected decimal digits for the figured-bass interval.');
        this.anchors.add(note);
        if (extendTo) this.anchors.add(extendTo);
        const text = Array.from(figure, (digit) => digits[Number(digit)]).join('');
        return { note, extendTo, glyph: new Element().setText(text) };
      })
    );
  }

  /** Use current notehead positions so spacing edits move every digit and endpoint together. */
  private layout(): PlacedFigure[] {
    const stave = this.rows[0][0].note.checkStave();
    const gap = stave.space(0.3);
    let top = stave.getBottomLineY();
    const centers = new Map<StaveNote, number>();
    for (const note of this.anchors) {
      if (note.checkStave().getYForLine(0) !== stave.getYForLine(0))
        throw new RuntimeError('BadArguments', 'Figured-bass anchors must share a staff line on one system.');
      const ink = note.getBoundingBox(false);
      top = Math.max(top, ink.y + ink.h + gap);
      centers.set(note, (note.getNoteHeadBeginX() + note.getNoteHeadEndX()) / 2);
    }

    const placed: PlacedFigure[] = [];
    for (const row of this.rows) {
      const figures = row.map(({ note, glyph }) => {
        const ink = glyph.setFont(this.fontInfo).getTextInk(0, 0);
        const center = centers.get(note)!;
        return { glyph, center, ink, x: center - (ink.x + ink.w / 2) };
      });
      // Accents and descenders in the music font must share a baseline within the row.
      const ascent = Math.max(...figures.map(({ ink }) => -ink.y));
      const descent = Math.max(...figures.map(({ ink }) => ink.y + ink.h));
      const baseline = top + ascent;
      const thickness = this.getStyle().lineWidth ?? 1;
      const lineY = top + (ascent + descent - thickness) / 2;
      figures.forEach(({ glyph, center, ink, x }, i) => {
        const next = figures[i + 1];
        if (next && next.center <= center)
          throw new RuntimeError('BadArguments', 'Order each figured-bass row from left to right.');
        ink.move(x, baseline);
        const figure: PlacedFigure = { glyph, x, baseline, ink };
        const stop = row[i].extendTo;
        if (stop) {
          const end = centers.get(stop)!;
          if (end <= center || (next && end > next.center))
            throw new RuntimeError(
              'BadArguments',
              'A figure may extend only up to the next written figure in its row.'
            );
          const start = ink.x + ink.w + gap;
          // A resolving digit at the endpoint needs room for its own ink.
          const right = next ? Math.min(end, next.center - next.ink.w / 2 - gap) : end;
          if (right > start) figure.line = new BoundingBox(start, lineY, right - start, thickness);
        }
        placed.push(figure);
      });
      top = baseline + descent + gap;
    }
    return placed;
  }

  /** Individual digit groups and continuation strokes in drawing order. */
  getInkParts(): BoundingBox[] {
    return this.layout().flatMap(({ ink, line }) => (line ? [ink, line] : [ink]));
  }

  override getBoundingBox(): BoundingBox {
    return this.getInkParts().reduce((bounds, part) => bounds.mergeWith(part));
  }

  override draw(): void {
    const ctx = this.checkContext();
    const figures = this.layout();
    ctx.save();
    ctx.openGroup('figured-bass', this.getAttribute('id'));
    for (const { glyph, x, baseline, line } of figures) {
      glyph.renderText(ctx, x, baseline);
      if (line) {
        const y = line.y + line.h / 2;
        ctx.setLineWidth(line.h);
        ctx.beginPath();
        ctx.moveTo(line.x, y);
        ctx.lineTo(line.x + line.w, y);
        ctx.stroke();
      }
    }
    ctx.closeGroup();
    ctx.restore();
    this.setRendered();
  }
}
