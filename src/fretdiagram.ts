// A standalone chord frame. Strings run from the lowest (left) to the highest (right).
import { BoundingBox } from './boundingbox';
import { Element } from './element';
import { RuntimeError } from './util';

/** Frets are absolute; 0 = open, 'x' = muted. A barre names one-based string numbers. */
export interface FretDiagramSpec {
  frets: readonly (number | 'x')[];
  firstFret?: number;
  rows?: number;
  barre?: { fret: number; from: number; to: number };
}

export class FretDiagram extends Element {
  private readonly frets: readonly (number | 'x')[];
  private readonly first: number;
  private readonly rows: number;
  private readonly barre?: FretDiagramSpec['barre'];

  constructor(spec: FretDiagramSpec) {
    super();
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
  }

  /** The top-left position includes the open-string marks and starting fret label. */
  override getBoundingBox(): BoundingBox {
    return new BoundingBox(this.getX(), this.getY(), 28 + (this.frets.length - 1) * 9, 17 + this.rows * 11);
  }

  override draw(): void {
    const ctx = this.checkContext();
    const left = this.getX() + 22,
      top = this.getY() + 14;
    const right = left + (this.frets.length - 1) * 9;
    const fretY = (fret: number) => top + (fret - this.first + 0.5) * 11;
    const line = (x1: number, y1: number, x2: number, y2: number) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };
    ctx.save();
    const group = ctx.openGroup('fret-diagram', this.getAttribute('id'));
    group?.setAttribute(
      'aria-label',
      'Chord frame, low to high: ' + this.frets.join(', ') + (this.barre ? ', barre at fret ' + this.barre.fret : '')
    );
    ctx.setFont('sans-serif', 9);
    if (this.first > 1) ctx.fillText(String(this.first), this.getX() + 2, top + 9);
    for (let row = 0; row <= this.rows; row++) {
      ctx.setLineWidth(row === 0 && this.first === 1 ? 2.5 : 1);
      line(left, top + row * 11, right, top + row * 11);
    }
    this.frets.forEach((fret, i) => {
      const x = left + i * 9;
      line(x, top, x, top + this.rows * 11);
      if (fret === 'x') {
        line(x - 2.5, top - 8, x + 2.5, top - 3);
        line(x + 2.5, top - 8, x - 2.5, top - 3);
      } else {
        ctx.beginPath();
        ctx.arc(x, fret ? fretY(fret) : top - 5.5, fret ? 3 : 2.5, 0, 2 * Math.PI, false);
        if (fret) ctx.fill();
        else ctx.stroke();
      }
    });
    if (this.barre) {
      const { from, to, fret } = this.barre;
      ctx.setLineWidth(5);
      line(right - (from - 1) * 9, fretY(fret), right - (to - 1) * 9, fretY(fret));
    }
    ctx.closeGroup();
    ctx.restore();
    this.setRendered();
  }
}
