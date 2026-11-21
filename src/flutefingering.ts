// Draw and measure a note-attached fingering chart for the six main flute keys.
import { Annotation } from './annotation';
import { BoundingBox } from './boundingbox';
import { RenderContext } from './rendercontext';

/** Top-to-bottom reading order, first the left hand and then the right. */
const keys = ['L1', 'L2', 'L3', 'R1', 'R2', 'R3'] as const;
export type FluteKey = (typeof keys)[number];
export type FluteKeyState = 'open' | 'closed';

/** A six-key diagram entered as physical finger positions. Omitted keys are open. */
export class FluteFingering extends Annotation {
  private readonly states: Readonly<Record<FluteKey, FluteKeyState>>;
  private readonly scale: number;

  constructor(states: Partial<Record<FluteKey, FluteKeyState>>, { scale = 1 }: { scale?: number } = {}) {
    super('');
    if (!states || typeof states !== 'object' || Array.isArray(states)) {
      throw new TypeError('Expected a map of named flute keys to open or closed states.');
    }
    if (!Number.isFinite(scale) || scale <= 0) throw new RangeError('Expected a positive flute diagram scale.');
    this.scale = scale;
    const normalized: Record<FluteKey, FluteKeyState> = {
      L1: 'open',
      L2: 'open',
      L3: 'open',
      R1: 'open',
      R2: 'open',
      R3: 'open',
    };
    for (const [key, state] of Object.entries(states)) {
      if (!keys.includes(key as FluteKey)) throw new RangeError(`Unknown flute key: ${key}.`);
      if (state !== 'open' && state !== 'closed') throw new RangeError(`Expected an open or closed ${key}.`);
      normalized[key as FluteKey] = state;
    }
    this.states = Object.freeze(normalized);
  }

  /** Return all six named states, independent of the score's written pitch. */
  getKeyStates(): Readonly<Record<FluteKey, FluteKeyState>> {
    return this.states;
  }

  /** Describe the visible chart to screen readers and Canvas applications. */
  getDescription(): string {
    return 'Flute fingering. ' + keys.map((key) => `${key} ${this.states[key]}`).join(', ') + '.';
  }

  /** Include the left-hand labels and the offset right-hand circles in note spacing. */
  override getWidth(): number {
    return 28 * this.scale;
  }

  /** Allow five key intervals, a larger hand break and the outer edges of the circles. */
  protected override getLayoutHeight(): number {
    return 64 * this.scale;
  }

  /** Full diagram height in renderer pixels. */
  override getHeight(): number {
    return this.getLayoutHeight();
  }

  /** Use the diagram's lower edge as the baseline for annotation and tuplet layout. */
  override getTextInk(x: number, y: number): BoundingBox {
    const height = this.getLayoutHeight();
    return new BoundingBox(x + this.getXShift(), y + this.getYShift() - height, this.getWidth(), height);
  }

  /** Measure the full diagram from its current note position before or after drawing. */
  override getBoundingBox(): BoundingBox {
    return this.getTextInk(this.computeX().x, this.computeY().y);
  }

  /** Locate any named key after formatting. The right hand starts below and slightly to the right. */
  getKeyCenter(key: FluteKey): { x: number; y: number } {
    const index = keys.indexOf(key);
    if (index < 0) throw new RangeError(`Unknown flute key: ${key}.`);
    const rightHand = index >= 3;
    const box = this.getBoundingBox();
    return {
      x: box.x + (rightHand ? 23.5 : 17.5) * this.scale,
      y: box.y + (4.5 + 10 * index + (rightHand ? 5 : 0)) * this.scale,
    };
  }

  /** Stroke every outline and fill closed keys, keeping the outer radius fixed in both states. */
  protected drawKey(ctx: RenderContext, key: FluteKey, x: number, y: number, radius: number): void {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    if (this.states[key] === 'closed') ctx.fill();
    ctx.stroke();
  }

  /** Draw the six labeled keys using the same geometry measured by the score. */
  override draw(): void {
    const ctx = this.checkContext();
    this.setRendered();
    const group = ctx.openGroup('flute-fingering', this.getAttribute('id'));
    group?.setAttribute('role', 'img');
    group?.setAttribute('aria-label', this.getDescription());
    ctx.save();
    ctx.setFont('Arial, sans-serif', `${8 * this.scale}px`);
    ctx.setLineWidth(this.scale);
    for (const key of keys) {
      const { x, y } = this.getKeyCenter(key);
      ctx.fillText(key, x - 17.5 * this.scale, y + 2.8 * this.scale);
      this.drawKey(ctx, key, x, y, 4 * this.scale);
    }
    ctx.restore();
    this.drawPointerRect();
    ctx.closeGroup();
  }
}
