// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
//
// This class implements curves (for slurs)

import { BoundingBox } from './boundingbox';
import { Element } from './element';
import { Note } from './note';
import { Category } from './typeguard';
import { RuntimeError } from './util';

export interface CurveOptions {
  /** Two control points for the bezier curves. */
  cps?: { x: number; y: number }[];
  thickness?: number;
  xShift?: number;
  yShift?: number;
  position?: string | number;
  positionEnd?: string | number;
  invert?: boolean;
  openingDirection?: 'up' | 'down' | 'auto';
}

type Point = { x: number; y: number };

interface CurveRenderParams {
  firstX: number;
  firstY: number;
  lastX: number;
  lastY: number;
  direction: number;
}

/**
 * Get the values of a cubic bezier curve (along one axis) at its end points and at its local extrema.
 * The extrema are where the derivative, a quadratic in t, is zero.
 */
function bezierExtrema(p0: number, p1: number, p2: number, p3: number): number[] {
  const values = [p0, p3];
  // Derivative / 3 = a * t^2 + b * t + c
  const a = -p0 + 3 * p1 - 3 * p2 + p3;
  const b = 2 * (p0 - 2 * p1 + p2);
  const c = p1 - p0;

  const ts: number[] = [];
  if (Math.abs(a) < 1e-12) {
    if (Math.abs(b) > 1e-12) ts.push(-c / b);
  } else {
    const discriminant = b * b - 4 * a * c;
    if (discriminant >= 0) {
      const root = Math.sqrt(discriminant);
      ts.push((-b + root) / (2 * a), (-b - root) / (2 * a));
    }
  }
  for (const t of ts) {
    if (t > 0 && t < 1) {
      const u = 1 - t;
      values.push(u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3);
    }
  }
  return values;
}

export enum CurvePosition {
  NEAR_HEAD = 1,
  NEAR_TOP = 2,
}

export class Curve extends Element {
  static override get CATEGORY(): string {
    return Category.Curve;
  }

  public renderOptions: Required<CurveOptions>;
  protected from?: Note;
  protected to?: Note;

  static get Position(): typeof CurvePosition {
    return CurvePosition;
  }

  static get PositionString(): Record<string, number> {
    return {
      nearHead: CurvePosition.NEAR_HEAD,
      nearTop: CurvePosition.NEAR_TOP,
    };
  }

  // from: Start note
  // to: End note
  // options:
  //    cps: List of control points
  //    xShift: pixels to shift
  //    yShift: pixels to shift
  constructor(from: Note | undefined, to: Note | undefined, options: CurveOptions) {
    super();

    this.renderOptions = {
      thickness: 2,
      xShift: 0,
      yShift: 10,
      position: CurvePosition.NEAR_HEAD,
      positionEnd: CurvePosition.NEAR_HEAD,
      invert: false,
      cps: [
        { x: 0, y: 10 },
        { x: 0, y: 10 },
      ],
      openingDirection: 'auto',
      ...options,
    };

    this.setNotes(from, to);
  }

  setNotes(from: Note | undefined, to: Note | undefined): this {
    if (!from && !to) {
      throw new RuntimeError('BadArguments', 'Curve needs to have either `from` or `to` set.');
    }

    this.from = from;
    this.to = to;
    return this;
  }

  /**
   * @return {boolean} Returns true if this is a partial bar.
   */
  isPartial(): boolean {
    return !this.from || !this.to;
  }

  /**
   * Compute the end points and control points of the bezier curve(s) for `renderCurve()`.
   * The first bezier is the upper edge of the slur, the second one (only drawn for solid lines) goes back
   * from the last to the first point, at a distance of `thickness`.
   */
  private getBezierPoints(params: CurveRenderParams): {
    first: Point;
    last: Point;
    cps: Point[];
    thicknessCps: Point[];
  } {
    const xShift = this.renderOptions.xShift;
    const yShift = this.renderOptions.yShift * params.direction;

    const firstX = params.firstX + xShift;
    const firstY = params.firstY + yShift;
    const lastX = params.lastX - xShift;
    const lastY = params.lastY + yShift;
    const thickness = this.renderOptions.thickness;

    const cps = this.renderOptions.cps;
    const { x: cp0x, y: cp0y } = cps[0];
    const { x: cp1x, y: cp1y } = cps[1];

    const controlPointSpacing = (lastX - firstX) / (cps.length + 2);

    return {
      first: { x: firstX, y: firstY },
      last: { x: lastX, y: lastY },
      cps: [
        { x: firstX + controlPointSpacing + cp0x, y: firstY + cp0y * params.direction },
        { x: lastX - controlPointSpacing + cp1x, y: lastY + cp1y * params.direction },
      ],
      thicknessCps: [
        { x: lastX - controlPointSpacing + cp1x, y: lastY + (cp1y + thickness) * params.direction },
        { x: firstX + controlPointSpacing + cp0x, y: firstY + (cp0y + thickness) * params.direction },
      ],
    };
  }

  renderCurve(params: CurveRenderParams): void {
    const ctx = this.checkContext();

    const { first, last, cps, thicknessCps } = this.getBezierPoints(params);

    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    ctx.bezierCurveTo(cps[0].x, cps[0].y, cps[1].x, cps[1].y, last.x, last.y);
    if (!this.style?.lineDash)
      ctx.bezierCurveTo(thicknessCps[0].x, thicknessCps[0].y, thicknessCps[1].x, thicknessCps[1].y, first.x, first.y);
    ctx.stroke();
    ctx.closePath();
    if (!this.style?.lineDash) ctx.fill();
  }

  /** Get the points where the curve starts and ends, and the direction it bulges to. Requires formatted notes. */
  private getRenderParams(): CurveRenderParams {
    const firstNote = this.from;
    const lastNote = this.to;
    let firstX;
    let lastX;
    let firstY;
    let lastY;
    let stemDirection = 0;

    let metric = 'baseY';
    let endMetric = 'baseY';

    function getPosition(position: string | number) {
      return typeof position === 'string' ? Curve.PositionString[position] : position;
    }
    const position = getPosition(this.renderOptions.position);
    const positionEnd = getPosition(this.renderOptions.positionEnd);

    if (position === CurvePosition.NEAR_TOP) {
      metric = 'topY';
      endMetric = 'topY';
    }

    if (positionEnd === CurvePosition.NEAR_HEAD) {
      endMetric = 'baseY';
    } else if (positionEnd === CurvePosition.NEAR_TOP) {
      endMetric = 'topY';
    }

    if (firstNote) {
      firstX = firstNote.getTieRightX();
      stemDirection = firstNote.getStemDirection();
      firstY = firstNote.getStemExtents()[metric];
    } else {
      const stave = lastNote!.checkStave();
      firstX = stave.getTieStartX();
      firstY = lastNote!.getStemExtents()[metric];
    }

    if (lastNote) {
      lastX = lastNote.getTieLeftX();
      stemDirection = lastNote.getStemDirection();
      lastY = lastNote.getStemExtents()[endMetric];
    } else {
      const stave = firstNote!.checkStave();
      lastX = stave.getTieEndX();
      lastY = firstNote!.getStemExtents()[endMetric];
    }

    if (this.renderOptions.openingDirection === 'up') {
      stemDirection = 1;
    }
    if (this.renderOptions.openingDirection === 'down') {
      stemDirection = -1;
    }

    return {
      firstX,
      lastX,
      firstY,
      lastY,
      direction: stemDirection * (this.renderOptions.invert === true ? -1 : 1),
    };
  }

  /**
   * Get the bounding box of the drawn curve, including its thickness but not the stroke width.
   * The notes must be formatted.
   * The box is exact: it is fitted to the extrema of the bezier curves, not to their control points.
   */
  override getBoundingBox(): BoundingBox {
    const { first, last, cps, thicknessCps } = this.getBezierPoints(this.getRenderParams());
    const xs = bezierExtrema(first.x, cps[0].x, cps[1].x, last.x);
    const ys = bezierExtrema(first.y, cps[0].y, cps[1].y, last.y);
    if (!this.style?.lineDash) {
      xs.push(...bezierExtrema(last.x, thicknessCps[0].x, thicknessCps[1].x, first.x));
      ys.push(...bezierExtrema(last.y, thicknessCps[0].y, thicknessCps[1].y, first.y));
    }
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return new BoundingBox(minX, minY, Math.max(...xs) - minX, Math.max(...ys) - minY);
  }

  override draw(): boolean {
    this.checkContext();
    this.setRendered();
    this.renderCurve(this.getRenderParams());
    return true;
  }
}
