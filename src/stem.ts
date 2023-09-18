// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
//
// ## Description
// This file implements the `Stem` object. Generally this object is handled
// by its parent `StemmableNote`.

import { BoundingBox } from './boundingbox';
import { Element } from './element';
import { Metrics } from './metrics';
import { Tables } from './tables';
import { Category } from './typeguard';
import { log, RuntimeError } from './util';

// eslint-disable-next-line
function L(...args: any[]) {
  if (Stem.DEBUG) log('Vex.Flow.Stem', args);
}

export interface StemOptions {
  stemDownYBaseOffset?: number;
  stemUpYBaseOffset?: number;
  stemDownYOffset?: number;
  stemUpYOffset?: number;
  stemletHeight?: number;
  isStemlet?: boolean;
  hide?: boolean;
  stemDirection?: number;
  stemExtension?: number;
  yBottom?: number;
  yTop?: number;
  xEnd?: number;
  xBegin?: number;
}

export class Stem extends Element {
  /** To enable logging for this class. Set `Vex.Flow.Stem.DEBUG` to `true`. */
  static DEBUG: boolean = false;

  static get CATEGORY(): string {
    return Category.Stem;
  }

  // Stem directions
  static get UP(): number {
    return 1;
  }
  static get DOWN(): number {
    return -1;
  }

  // Theme
  static get WIDTH(): number {
    return Tables.STEM_WIDTH;
  }
  static get HEIGHT(): number {
    return Tables.STEM_HEIGHT;
  }

  protected hide: boolean;
  protected isStemlet: boolean;
  protected stemletHeight: number;
  protected xBegin: number;
  protected xEnd: number;
  protected yTop: number;
  protected stemUpYOffset: number = 0;
  protected yBottom: number;
  protected stemDownYOffset: number = 0;
  protected stemUpYBaseOffset: number = 0;
  protected stemDownYBaseOffset: number = 0;
  protected stemDirection: number;
  protected stemExtension: number;
  protected renderHeightAdjustment: number;

  constructor(options?: StemOptions) {
    super();

    // Default notehead x bounds
    this.xBegin = options?.xBegin ?? 0;
    this.xEnd = options?.xEnd ?? 0;

    // Y bounds for top/bottom most notehead
    this.yTop = options?.yTop ?? 0;
    this.yBottom = options?.yBottom ?? 0;

    // Stem top extension
    this.stemExtension = options?.stemExtension ?? 0;

    // Direction of the stem
    this.stemDirection = options?.stemDirection ?? 0;

    // Flag to override all draw calls
    this.hide = options?.hide || false;

    this.isStemlet = options?.isStemlet || false;
    this.stemletHeight = options?.stemletHeight ?? 0;

    // Use to adjust the rendered height without affecting
    // the results of `.getExtents()`
    this.renderHeightAdjustment = 0;
    this.setOptions(options);
  }

  setOptions(options?: StemOptions): void {
    // Changing where the stem meets the head
    this.stemUpYOffset = options?.stemUpYOffset ?? 0;
    this.stemDownYOffset = options?.stemDownYOffset ?? 0;
    this.stemUpYBaseOffset = options?.stemUpYBaseOffset ?? 0;
    this.stemDownYBaseOffset = options?.stemDownYBaseOffset ?? 0;
  }

  // Set the x bounds for the default notehead
  setNoteHeadXBounds(xBegin: number, xEnd: number): this {
    this.xBegin = xBegin;
    this.xEnd = xEnd;
    return this;
  }

  // Set the direction of the stem in relation to the noteheads
  setDirection(direction: number): void {
    this.stemDirection = direction;
  }

  // Set the extension for the stem, generally for flags or beams
  setExtension(ext: number): void {
    this.stemExtension = ext;
  }

  getExtension(): number {
    return this.stemExtension;
  }

  // The the y bounds for the top and bottom noteheads
  setYBounds(yTop: number, yBottom: number): void {
    this.yTop = yTop;
    this.yBottom = yBottom;
  }

  // Gets the entire height for the stem
  getHeight(): number {
    const yOffset = this.stemDirection === Stem.UP ? this.stemUpYOffset : this.stemDownYOffset;
    const unsignedHeight = this.yBottom - this.yTop + (Stem.HEIGHT - yOffset + this.stemExtension); // parentheses just for grouping.
    return unsignedHeight * this.stemDirection;
  }

  getBoundingBox(): BoundingBox {
    throw new RuntimeError('NotImplemented', 'getBoundingBox() not implemented.');
  }

  // Get the y coordinates for the very base of the stem to the top of
  // the extension
  getExtents(): { topY: number; baseY: number } {
    const isStemUp = this.stemDirection === Stem.UP;
    const ys = [this.yTop, this.yBottom];
    const stemHeight = Stem.HEIGHT + this.stemExtension;

    const innerMostNoteheadY = (isStemUp ? Math.min : Math.max)(...ys);
    const outerMostNoteheadY = (isStemUp ? Math.max : Math.min)(...ys);
    const stemTipY = innerMostNoteheadY + stemHeight * -this.stemDirection;

    return { topY: stemTipY, baseY: outerMostNoteheadY };
  }

  setVisibility(isVisible: boolean): this {
    this.hide = !isVisible;
    return this;
  }

  setStemlet(isStemlet: boolean, stemletHeight: number): this {
    this.isStemlet = isStemlet;
    this.stemletHeight = stemletHeight;
    return this;
  }

  adjustHeightForFlag(): void {
    this.renderHeightAdjustment = Metrics.lookupMetric('Stem.heightAdjustmentForFlag', -3);
  }

  adjustHeightForBeam(): void {
    this.renderHeightAdjustment = -Stem.WIDTH / 2;
  }

  // Render the stem onto the canvas
  draw(): void {
    this.setRendered();
    if (this.hide) return;
    const ctx = this.checkContext();

    let stemX;
    let stemY;
    const stemDirection = this.stemDirection;

    let yBaseOffset: number = 0;
    if (stemDirection === Stem.DOWN) {
      // Down stems are rendered to the left of the head.
      stemX = this.xBegin;
      stemY = this.yTop + this.stemDownYOffset;
      yBaseOffset = this.stemDownYBaseOffset;
    } else {
      // Up stems are rendered to the right of the head.
      stemX = this.xEnd;
      stemY = this.yBottom - this.stemUpYOffset;
      yBaseOffset = this.stemUpYBaseOffset;
    }

    const stemHeight = this.getHeight();

    L('Rendering stem - ', 'Top Y: ', this.yTop, 'Bottom Y: ', this.yBottom);

    // The offset from the stem's base which is required fo satisfy the stemlet height
    const stemletYOffset = this.isStemlet ? stemHeight - this.stemletHeight * this.stemDirection : 0;

    // Draw the stem
    ctx.save();
    this.applyStyle();
    ctx.openGroup('stem', this.getAttribute('id'), { pointerBBox: true });
    ctx.beginPath();
    ctx.setLineWidth(Stem.WIDTH);
    ctx.moveTo(stemX, stemY - stemletYOffset + yBaseOffset);
    ctx.lineTo(stemX, stemY - stemHeight - this.renderHeightAdjustment * stemDirection);
    ctx.stroke();
    ctx.closeGroup();
    this.restoreStyle();
    ctx.restore();
  }
}
