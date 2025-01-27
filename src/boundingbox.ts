// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License

// Bounding boxes for interactive notation.

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class BoundingBox implements Bounds {
  x: number;
  y: number;
  w: number;
  h: number;

  /**
   * Create a new copy.
   */
  static copy(that: BoundingBox): BoundingBox {
    return new BoundingBox(that.x, that.y, that.w, that.h);
  }

  constructor(x: number, y: number, w: number, h: number) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  /** Get x position. */
  getX(): number {
    return this.x;
  }

  /** Get y position. */
  getY(): number {
    return this.y;
  }

  /** Get width. */
  getW(): number {
    return this.w;
  }

  /** Get height. */
  getH(): number {
    return this.h;
  }

  /** Set x position. */
  setX(x: number): this {
    this.x = x;
    return this;
  }

  /** Set y position. */
  setY(y: number): this {
    this.y = y;
    return this;
  }

  /** Set width. */
  setW(w: number): this {
    this.w = w;
    return this;
  }

  /** Set height. */
  setH(h: number): this {
    this.h = h;
    return this;
  }

  /** Move to position. */
  move(x: number, y: number): this {
    this.x += x;
    this.y += y;
    return this;
  }

  /** Clone. */
  clone(): BoundingBox {
    return BoundingBox.copy(this);
  }

  /**
   * Merge my box with given box. Creates a bigger bounding box unless
   * the given box is contained in this one.
   */
  mergeWith(boundingBox: BoundingBox): this {
    const that = boundingBox;

    const newX = this.x < that.x ? this.x : that.x;
    const newY = this.y < that.y ? this.y : that.y;
    const newW = Math.max(this.x + this.w, that.x + that.w) - newX;
    const newH = Math.max(this.y + this.h, that.y + that.h) - newY;

    this.x = newX;
    this.y = newY;
    this.w = newW;
    this.h = newH;

    return this;
  }
}
