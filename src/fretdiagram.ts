// Standalone guitar chord frames in vertical and horizontal orientations.
import { BoundingBox } from './boundingbox';
import { Element } from './element';
import { RenderContext } from './rendercontext';
import { Category } from './typeguard';
import { RuntimeError } from './util';

/** Grid spacing in renderer pixels, measured across the strings and along the neck. */
const STRING_SPACING = 9;
const FRET_SPACING = 11;

/** Frets are absolute; 0 = open, 'x' = muted. A barre names one-based string numbers. */
export interface FretDiagramSpec {
  /** In a horizontal frame the nut is at the left and the highest string is on top. */
  orientation?: 'vertical' | 'horizontal';
  frets: readonly (number | 'x')[];
  /** Left-hand fingers 1–4, low string first. Null or an omitted entry leaves the dot plain. */
  fingerings?: readonly (number | null | undefined)[];
  firstFret?: number;
  rows?: number;
  barre?: { fret: number; from: number; to: number };
}

export class FretDiagram extends Element {
  /** The registry and font metrics both use the diagram category. */
  static override get CATEGORY(): string {
    return Category.FretDiagram;
  }

  private readonly orientation: NonNullable<FretDiagramSpec['orientation']>;
  private readonly frets: readonly (number | 'x')[];
  private fingerings: NonNullable<FretDiagramSpec['fingerings']> = [];
  private readonly first: number;
  private readonly rows: number;
  private readonly barre?: FretDiagramSpec['barre'];

  constructor(spec: FretDiagramSpec) {
    super();
    this.orientation = spec.orientation ?? 'vertical';
    if (this.orientation !== 'vertical' && this.orientation !== 'horizontal')
      throw new RuntimeError('BadArguments', 'Unknown chord frame orientation.');
    this.frets = [...spec.frets];
    this.first = spec.firstFret ?? 1;
    this.rows = spec.rows ?? 4;
    this.barre = spec.barre && { ...spec.barre };
    const visible = (n: number) => Number.isSafeInteger(n) && n >= this.first && n < this.first + this.rows;
    if (
      this.frets.length < 2 ||
      !Number.isSafeInteger(this.first) ||
      this.first < 1 ||
      !Number.isSafeInteger(this.rows) ||
      this.rows < 1 ||
      this.frets.some((n) => n !== 'x' && n !== 0 && !visible(n))
    )
      throw new RuntimeError('BadArguments', 'Invalid chord frame or fret outside the displayed range.');
    if (this.barre) {
      const { from, to, fret } = this.barre;
      if (
        ![from, to].every((n) => Number.isSafeInteger(n) && n >= 1 && n <= this.frets.length) ||
        from === to ||
        !visible(fret)
      )
        throw new RuntimeError('BadArguments', 'Barre outside chord frame.');
    }
    if (this.first > 1) this.setText(String(this.first));
    this.setFingerings(spec.fingerings);
  }

  /** Replace the finger assignments for this chord. Passing no assignments clears all labels. */
  setFingerings(fingerings: NonNullable<FretDiagramSpec['fingerings']> = []): this {
    if (
      fingerings.length > this.frets.length ||
      fingerings.some((finger, i) => {
        if (finger == null) return false;
        return !Number.isInteger(finger) || finger < 1 || finger > 4 || this.frets[i] === 0 || this.frets[i] === 'x';
      })
    )
      throw new RuntimeError('BadArguments', 'Assign fingers 1–4 to stopped strings only.');
    this.fingerings = [...fingerings];
    return this;
  }

  /** Grid coordinates run across strings (low to high) and along the neck (nut to bridge). */
  private gridPoint(across: number, along: number): [number, number] {
    if (this.orientation === 'horizontal')
      return [this.getX() + 14 + along, this.getY() + 6 + (this.frets.length - 1) * STRING_SPACING - across];
    return [this.getX() + 22 + across, this.getY() + 14 + along];
  }

  /** The top-left position includes the open-string marks and the upright starting-fret label. */
  override getBoundingBox(): BoundingBox {
    const across = (this.frets.length - 1) * STRING_SPACING;
    const along = this.rows * FRET_SPACING;
    if (this.orientation === 'vertical') return new BoundingBox(this.getX(), this.getY(), 28 + across, 17 + along);
    let width = 16 + along;
    let height = 12 + across;
    if (this.first > 1) {
      const metrics = this.textMetrics;
      width = Math.max(width, 15 + metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight);
      height += metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent + 1;
    }
    return new BoundingBox(this.getX(), this.getY(), width, height);
  }

  /** Paint the digit over the dot and any barre that passes through it. */
  private drawFinger(ctx: RenderContext, finger: number, x: number, y: number): void {
    ctx.save();
    ctx.setFont(this.fontInfo.family, '7.5px', 'bold');
    ctx.setFillStyle('white');
    const text = String(finger);
    // A digit's cap height is about five pixels at this fixed marker size.
    ctx.fillText(text, x - ctx.measureText(text).width / 2, y + 2.5);
    ctx.restore();
  }

  override draw(): void {
    const ctx = this.checkContext();
    const across = (this.frets.length - 1) * STRING_SPACING;
    const fretCenter = (fret: number) => (fret - this.first + 0.5) * FRET_SPACING;
    const line = (across1: number, along1: number, across2: number, along2: number) => {
      ctx.beginPath();
      ctx.moveTo(...this.gridPoint(across1, along1));
      ctx.lineTo(...this.gridPoint(across2, along2));
      ctx.stroke();
    };
    ctx.save();
    const group = ctx.openGroup('fret-diagram', this.getAttribute('id'));
    const strings = this.frets.map((fret, i) =>
      this.fingerings[i] ? `${fret} (finger ${this.fingerings[i]})` : String(fret)
    );
    group?.setAttribute(
      'aria-label',
      'Chord frame, low to high: ' + strings.join(', ') + (this.barre ? ', barre at fret ' + this.barre.fret : '')
    );
    if (this.first > 1) {
      ctx.setFont(this.fontInfo);
      if (this.orientation === 'horizontal') {
        // Leave room below the lowest string for its stopped dot or partial barre.
        const [left, bottom] = this.gridPoint(0, 0);
        const metrics = this.textMetrics;
        ctx.fillText(this.text, left + metrics.actualBoundingBoxLeft, bottom + 6 + metrics.actualBoundingBoxAscent);
      } else {
        ctx.fillText(this.text, this.getX() + 2, this.getY() + 23);
      }
    }
    for (let row = 0; row <= this.rows; row++) {
      ctx.setLineWidth(row === 0 && this.first === 1 ? 2.5 : 1);
      line(0, row * FRET_SPACING, across, row * FRET_SPACING);
    }
    this.frets.forEach((fret, i) => {
      const string = i * STRING_SPACING;
      line(string, 0, string, this.rows * FRET_SPACING);
      if (fret === 'x') {
        line(string - 2.5, -8, string + 2.5, -3);
        line(string + 2.5, -8, string - 2.5, -3);
      } else {
        ctx.beginPath();
        const radius = this.fingerings[i] ? 4 : 3;
        ctx.arc(...this.gridPoint(string, fret ? fretCenter(fret) : -5.5), fret ? radius : 2.5, 0, 2 * Math.PI, false);
        if (fret) ctx.fill();
        else ctx.stroke();
      }
    });
    if (this.barre) {
      const { from, to, fret } = this.barre;
      ctx.setLineWidth(5);
      line(
        across - (from - 1) * STRING_SPACING,
        fretCenter(fret),
        across - (to - 1) * STRING_SPACING,
        fretCenter(fret)
      );
    }
    this.fingerings.forEach((finger, i) => {
      const fret = this.frets[i];
      if (finger && typeof fret === 'number')
        this.drawFinger(ctx, finger, ...this.gridPoint(i * STRING_SPACING, fretCenter(fret)));
    });
    ctx.closeGroup();
    ctx.restore();
    this.setRendered();
  }
}
