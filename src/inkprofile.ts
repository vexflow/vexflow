// Horizontal columns of engraved ink used to fit staves, screen rows, and printed systems.
import type { Bounds } from './boundingbox';

/** Profiles with a common grid can be compared after any vertical translation. */
export class InkProfile {
  private readonly top: Float64Array;
  private readonly bottom: Float64Array;
  private readonly step: number;

  /** Create an empty profile in score coordinates shared by all rows of this layout. */
  constructor(
    private readonly x: number,
    width: number
  ) {
    // A half-space samples narrow stems. Cap storage at very large requested widths.
    const columns = Math.max(1, Math.min(4096, Math.ceil(width / 5)));
    this.step = width / columns || 1;
    this.top = new Float64Array(columns).fill(Infinity);
    this.bottom = new Float64Array(columns).fill(-Infinity);
  }

  /** Round outwards, retaining overhanging ink in the nearest edge column. */
  add(box: Bounds, dy = 0): void {
    const column = (x: number) => Math.max(0, Math.min(this.top.length - 1, Math.floor((x - this.x) / this.step)));
    const last = column(box.x + box.w + 0.5);
    for (let i = column(box.x - 0.5); i <= last; i++) {
      this.top[i] = Math.min(this.top[i], box.y + dy);
      this.bottom[i] = Math.max(this.bottom[i], box.y + box.h + dy);
    }
  }

  /** Add a vertically translated copy of another profile on the same horizontal grid. */
  include(other: InkProfile, dy = 0): void {
    for (let i = 0; i < this.top.length; i++) {
      this.top[i] = Math.min(this.top[i], other.top[i] + dy);
      this.bottom[i] = Math.max(this.bottom[i], other.bottom[i] + dy);
    }
  }

  get minY(): number {
    return Math.min(...this.top);
  }

  get maxY(): number {
    return Math.max(...this.bottom);
  }

  /** Space that adjacent systems can share, with room for a third system on either side. */
  sharedHeight(lower: InkProfile, upperHeight: number, lowerHeight: number): number {
    return Math.max(0, Math.min(upperHeight / 2, lowerHeight / 2, upperHeight - this.distance(lower)));
  }

  /** Minimum offset of the lower origin from the upper origin, comparing only overlapping columns. */
  distance(lower: InkProfile): number {
    let result = -Infinity;
    for (let i = 0; i < this.bottom.length; i++) result = Math.max(result, this.bottom[i] - lower.top[i]);
    return result;
  }
}
