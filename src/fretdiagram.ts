// Standalone chord frames, including standard-guitar voicings in low-to-high string order.
import { BoundingBox } from './boundingbox';
import { Element } from './element';
import { ChordHarmony, NotationSpelling } from './notationspelling';
import { RenderContext } from './rendercontext';
import { Tuning } from './tuning';
import { Category } from './typeguard';
import { RuntimeError } from './util';

/** Frets are absolute; 0 = open, 'x' = muted. A barre names one-based string numbers. */
export interface FretDiagramSpec {
  frets: readonly (number | 'x')[];
  /** Left-hand fingers 1–4, low string first. Null or an omitted entry leaves the dot plain. */
  fingerings?: readonly (number | null | undefined)[];
  firstFret?: number;
  rows?: number;
  barre?: { fret: number; from: number; to: number };
}

/** Standard-tuned major chords in preference order. Slash basses have their own entries. */
const standardMajorVoicings: readonly {
  root: string;
  bass?: string;
  name: string;
  frame: FretDiagramSpec;
}[] = [
  { root: 'C', name: 'open', frame: { frets: ['x', 3, 2, 0, 1, 0] } },
  {
    root: 'C',
    name: 'third-position',
    frame: { frets: ['x', 3, 5, 5, 5, 3], firstFret: 3, barre: { fret: 3, from: 5, to: 1 } },
  },
  { root: 'C', bass: 'E', name: 'open', frame: { frets: [0, 3, 2, 0, 1, 0] } },
  { root: 'D', name: 'open', frame: { frets: ['x', 'x', 0, 2, 3, 2] } },
  { root: 'G', name: 'open', frame: { frets: [3, 2, 0, 0, 0, 3] } },
];

export class FretDiagram extends Element {
  /** The registry and font metrics both use the diagram category. */
  static override get CATEGORY(): string {
    return Category.FretDiagram;
  }

  /** Return a fresh frame for this harmony and tuning. Omitting the name selects the first registered shape. */
  static lookupVoicing(harmony: ChordHarmony, tuning: string, name?: string): FretDiagramSpec | undefined {
    const pitches = tuning
      .split(',')
      .map((key) => key.trim().toUpperCase())
      .join(',');
    if (tuning !== 'standard' && pitches !== Tuning.names.standard) return undefined;
    if (!['', 'maj', 'major', 'M'].includes(harmony.quality ?? '')) return undefined;
    const root = NotationSpelling.chordText({ root: harmony.root });
    const bass = harmony.bass === undefined ? undefined : NotationSpelling.chordText({ root: harmony.bass });
    const match = standardMajorVoicings.find(
      (v) => v.root === root && v.bass === bass && (name === undefined || v.name === name)
    );
    if (!match) return undefined;
    const frame = match.frame;
    return { ...frame, frets: [...frame.frets], ...(frame.barre && { barre: { ...frame.barre } }) };
  }

  private readonly frets: readonly (number | 'x')[];
  private fingerings: NonNullable<FretDiagramSpec['fingerings']> = [];
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

  /** The top-left position includes the open-string marks and starting fret label. */
  override getBoundingBox(): BoundingBox {
    return new BoundingBox(this.getX(), this.getY(), 28 + (this.frets.length - 1) * 9, 17 + this.rows * 11);
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
    const strings = this.frets.map((fret, i) =>
      this.fingerings[i] ? `${fret} (finger ${this.fingerings[i]})` : String(fret)
    );
    group?.setAttribute(
      'aria-label',
      'Chord frame, low to high: ' + strings.join(', ') + (this.barre ? ', barre at fret ' + this.barre.fret : '')
    );
    if (this.first > 1) {
      ctx.setFont(this.fontInfo);
      ctx.fillText(String(this.first), this.getX() + 2, top + 9);
    }
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
        const radius = this.fingerings[i] ? 4 : 3;
        ctx.arc(x, fret ? fretY(fret) : top - 5.5, fret ? radius : 2.5, 0, 2 * Math.PI, false);
        if (fret) ctx.fill();
        else ctx.stroke();
      }
    });
    if (this.barre) {
      const { from, to, fret } = this.barre;
      ctx.setLineWidth(5);
      line(right - (from - 1) * 9, fretY(fret), right - (to - 1) * 9, fretY(fret));
    }
    this.fingerings.forEach((finger, i) => {
      const fret = this.frets[i];
      if (finger && typeof fret === 'number') this.drawFinger(ctx, finger, left + i * 9, fretY(fret));
    });
    ctx.closeGroup();
    ctx.restore();
    this.setRendered();
  }
}
