// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// Canvas and SVG renderer setup and shared path drawing.
// MIT License

import { CanvasContext } from './canvascontext';
import { dashStops } from './dashpattern';
import { RenderContext } from './rendercontext';
import { SVGContext } from './svgcontext';
import { isRenderContext } from './typeguard';
import { RuntimeError } from './util';
import { isHTMLCanvas, isHTMLDiv } from './web';

// A ContextBuilder is either Renderer.getSVGContext or Renderer.getCanvasContext.
export type ContextBuilder = typeof Renderer.getSVGContext | typeof Renderer.getCanvasContext;

export enum RendererBackends {
  CANVAS = 1,
  SVG = 2,
}

// End of line types
export enum RendererLineEndType {
  NONE = 1, // No leg
  UP = 2, // Upward leg
  DOWN = 3, // Downward leg
}

/**
 * Support Canvas & SVG rendering contexts.
 */
export class Renderer {
  static Backends = RendererBackends;

  static LineEndType = RendererLineEndType;

  // Used by vexflow_test_helpers.ts
  // Should this be private?
  // Can we do this in a cleaner way?
  static lastContext?: RenderContext = undefined;

  static buildContext(
    elementId: string | HTMLCanvasElement | HTMLDivElement,
    backend: number,
    width: number,
    height: number,
    background: string = '#FFF'
  ): RenderContext {
    const renderer = new Renderer(elementId, backend);
    if (width && height) {
      renderer.resize(width, height);
    }

    const ctx = renderer.getContext();
    ctx.setBackgroundFillStyle(background);
    Renderer.lastContext = ctx;
    return ctx;
  }

  static getCanvasContext(elementId: string, width: number, height: number, background?: string): RenderContext {
    return Renderer.buildContext(elementId, Renderer.Backends.CANVAS, width, height, background);
  }

  static getSVGContext(elementId: string, width: number, height: number, background?: string): RenderContext {
    return Renderer.buildContext(elementId, Renderer.Backends.SVG, width, height, background);
  }

  /**
   * Draw alternating dashes and gaps in any direction. [3, 0] draws a continuous line.
   * Reject nonfinite geometry and patterns that would require more than 16,384 dash or gap segments.
   */
  static drawDashedLine(
    context: RenderContext,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    dashPattern: number[]
  ): void {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const length = Math.hypot(dx, dy);
    if (!Number.isFinite(length)) {
      throw new RuntimeError('BadDashLine', 'Dashed lines require finite endpoints and a finite length.');
    }
    const stops = dashStops(length, dashPattern);

    context.beginPath();
    context.moveTo(fromX, fromY);
    for (const [index, distance] of stops.entries()) {
      // Measure from the original point so rounding in a small step cannot stall the path.
      const x = distance === length ? toX : fromX + (dx / length) * distance;
      const y = distance === length ? toY : fromY + (dy / length) * distance;
      if (index % 2 === 0) context.lineTo(x, y);
      else context.moveTo(x, y);
    }
    context.closePath();
    context.stroke();
  }

  protected ctx: RenderContext;

  /**
   * @param canvasId can be:
   *   - a string element ID (of a canvas or div element)
   *   - a canvas element
   *   - a div element, which will contain the SVG output
   * @param backend Renderer.Backends.CANVAS or Renderer.Backends.SVG
   */
  constructor(context: RenderContext);
  constructor(canvas: string | HTMLCanvasElement | HTMLDivElement, backend: number);
  constructor(arg0: string | HTMLCanvasElement | HTMLDivElement | RenderContext, arg1?: number) {
    if (isRenderContext(arg0)) {
      // The user has provided what looks like a RenderContext, let's just use it.
      this.ctx = arg0;
    } else {
      if (arg1 === undefined) {
        // The backend must be specified if the render context isn't directly provided.
        throw new RuntimeError('InvalidArgument', 'Missing backend argument');
      }
      const backend: number = arg1;

      let element: HTMLElement;
      if (typeof arg0 === 'string') {
        const maybeElement = document.getElementById(arg0);
        if (!maybeElement) {
          throw new RuntimeError('BadElementId', `Can't find element with ID "${maybeElement}"`);
        }
        element = maybeElement;
      } else {
        element = arg0 as HTMLElement;
      }

      // Verify backend and create context
      if (backend === Renderer.Backends.CANVAS) {
        if (!isHTMLCanvas(element)) {
          throw new RuntimeError('BadElement', 'CANVAS context requires an HTMLCanvasElement.');
        }
        const context = element.getContext('2d', { willReadFrequently: true });
        if (!context) {
          throw new RuntimeError('BadElement', "Can't get canvas context");
        }
        this.ctx = new CanvasContext(context);
      } else if (backend === Renderer.Backends.SVG) {
        if (!isHTMLDiv(element)) {
          throw new RuntimeError('BadElement', 'SVG context requires an HTMLDivElement.');
        }
        this.ctx = new SVGContext(element);
      } else {
        throw new RuntimeError('InvalidBackend', `No support for backend: ${backend}`);
      }
    }
  }

  resize(width: number, height: number): this {
    this.ctx.resize(width, height);
    return this;
  }

  getContext(): RenderContext {
    return this.ctx;
  }
}
