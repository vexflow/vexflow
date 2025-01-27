// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
// @author Gregory Ristow (2015)

import { Element } from './element';
import { Font, FontInfo, FontStyle, FontWeight } from './font';
import { Metrics } from './metrics';
import { RenderContext, TextMeasure } from './rendercontext';
import { Tables } from './tables';
import { normalizeAngle, prefix, RuntimeError } from './util';

export type Attributes = {
  [name: string]: string | number | undefined;
  'font-family'?: string;
  'font-size'?: string | number;
  'font-style'?: string;
  'font-weight'?: string | number;
  scaleX?: number;
  scaleY?: number;
};

/** For a particular element type (e.g., rect), we will not apply certain presentation attributes. */
const ATTRIBUTES_TO_IGNORE: Record<string /* element type */, Record<string, boolean> /* ignored attributes */> = {
  path: {
    x: true,
    y: true,
    width: true,
    height: true,
    'font-family': true,
    'font-weight': true,
    'font-style': true,
    'font-size': true,
  },
  rect: {
    'font-family': true,
    'font-weight': true,
    'font-style': true,
    'font-size': true,
  },
  text: {
    width: true,
    height: true,
  },
};

/** Create the SVG in the SVG namespace. */
const SVG_NS = 'http://www.w3.org/2000/svg';

const TWO_PI = 2 * Math.PI;

export interface State {
  state: Attributes;
  attributes: Attributes;
}

/**
 * SVG rendering context with an API similar to CanvasRenderingContext2D.
 */
export class SVGContext extends RenderContext {
  protected static measureTextElement = new Element();

  element: HTMLElement; // the parent DOM object
  svg: SVGSVGElement;
  width: number = 0;
  height: number = 0;
  path: string;
  pen: { x: number; y: number };
  attributes: Attributes;
  state: Attributes;
  stateStack: State[];

  // Always points to the current group.
  // Calls to add() or openGroup() will append the new element to `this.parent`.
  parent: SVGGElement;
  // The stack of groups.
  groups: SVGGElement[];
  // The stack of attributes associated with each group.
  protected groupAttributes: Attributes[];

  protected precision = 1;

  backgroundFillStyle: string = 'white';

  /** Formatted as CSS font shorthand (e.g., 'italic bold 12pt Arial') */
  protected fontCSSString: string = '';

  constructor(element: HTMLElement) {
    super();
    this.element = element;

    this.precision = Math.pow(10, Tables.RENDER_PRECISION_PLACES);

    // Create an SVG element and add it to the container element.
    const svg = this.create('svg');
    svg.setAttribute('pointer-events', 'none');
    this.element.appendChild(svg);
    this.svg = svg;

    this.parent = this.svg;
    this.groups = [this.svg];

    this.path = '';
    this.pen = { x: NaN, y: NaN };

    const defaultFontAttributes = {
      'font-family': Metrics.get('fontFamily') as string,
      'font-size': '10pt',
      'font-weight': FontWeight.NORMAL,
      'font-style': FontStyle.NORMAL,
    };

    this.state = {
      scaleX: 1,
      scaleY: 1,
      ...defaultFontAttributes,
    };

    this.attributes = {
      'stroke-width': 1.0,
      'stroke-dasharray': 'none',
      fill: 'black',
      stroke: 'black',
      shadowBlur: 0,
      shadowColor: 'black',
      ...defaultFontAttributes,
    };

    this.groupAttributes = [];
    this.applyAttributes(svg, this.attributes);
    this.groupAttributes.push({ ...this.attributes });

    this.stateStack = [];
  }

  protected round(n: number): number {
    return Math.round(n * this.precision) / this.precision;
  }

  /**
   * Use one of the overload signatures to create an SVG element of a specific type.
   * The last overload accepts an arbitrary string, and is identical to the
   * implementation signature.
   * Feel free to add new overloads for other SVG element types as required.
   */
  create(svgElementType: 'g'): SVGGElement;
  create(svgElementType: 'path'): SVGPathElement;
  create(svgElementType: 'rect'): SVGRectElement;
  create(svgElementType: 'svg'): SVGSVGElement;
  create(svgElementType: 'text'): SVGTextElement;
  create(svgElementType: string): SVGElement;
  create(svgElementType: string): SVGElement {
    return document.createElementNS(SVG_NS, svgElementType);
  }

  // Allow grouping elements in containers for interactivity.
  openGroup(cls?: string, id?: string): SVGGElement {
    const group = this.create('g');
    this.groups.push(group);
    this.parent.appendChild(group);
    this.parent = group;
    if (cls) group.setAttribute('class', prefix(cls));
    if (id) group.setAttribute('id', prefix(id));

    this.applyAttributes(group, this.attributes);
    this.groupAttributes.push({ ...this.groupAttributes[this.groupAttributes.length - 1], ...this.attributes });
    return group;
  }

  closeGroup(): void {
    this.groups.pop();
    this.groupAttributes.pop();
    this.parent = this.groups[this.groups.length - 1];
  }

  openRotation(angleDegrees: number, x: number, y: number) {
    this.openGroup().setAttribute('transform', `translate(${x},${y}) rotate(${angleDegrees}) translate(-${x},-${y})`);
  }

  closeRotation() {
    this.closeGroup();
  }

  add(elem: SVGElement): void {
    this.parent.appendChild(elem);
  }

  setFillStyle(style: string): this {
    this.attributes.fill = style;
    return this;
  }

  /**
   * Used to set the fill color for `clearRect()`. This allows us to simulate
   * cutting a "hole" into the SVG drawing.
   */
  setBackgroundFillStyle(style: string): this {
    this.backgroundFillStyle = style;
    return this;
  }

  setStrokeStyle(style: string): this {
    this.attributes.stroke = style;
    return this;
  }

  setShadowColor(color: string): this {
    this.attributes.shadowColor = color;
    return this;
  }

  /**
   * @param blur A non-negative float specifying the level of shadow blur, where 0
   *             represents no blur and larger numbers represent increasingly more blur.
   * @returns this
   */
  setShadowBlur(blur: number): this {
    this.attributes.shadowBlur = blur;
    return this;
  }

  /**
   * @param width
   * @returns this
   */
  setLineWidth(width: number): this {
    this.attributes['stroke-width'] = width;
    return this;
  }

  /**
   * @param lineDash an array of integers in the form of [dash, space, dash, space, etc...]
   * @returns this
   *
   * See: [SVG `stroke-dasharray` attribute](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-dasharray)
   */
  setLineDash(lineDash: number[]): this {
    if (Object.prototype.toString.call(lineDash) === '[object Array]') {
      this.attributes['stroke-dasharray'] = lineDash.join(',');
      return this;
    } else {
      throw new RuntimeError('ArgumentError', 'lineDash must be an array of integers.');
    }
  }

  /**
   * @param capType
   * @returns this
   */
  setLineCap(capType: CanvasLineCap): this {
    this.attributes['stroke-linecap'] = capType;
    return this;
  }

  // ### Sizing & Scaling Methods:

  // TODO (GCR): See note at scale() -- separate our internal
  // conception of pixel-based width/height from the style.width
  // and style.height properties eventually to allow users to
  // apply responsive sizing attributes to the SVG.
  resize(width: number, height: number): this {
    this.width = width;
    this.height = height;
    this.element.style.width = width.toString();

    this.svg.style.width = width.toString();
    this.svg.style.height = height.toString();

    const attributes = {
      width,
      height,
    };

    this.applyAttributes(this.svg, attributes);
    this.scale(this.state.scaleX as number, this.state.scaleY as number);
    return this;
  }

  scale(x: number, y: number): this {
    // uses viewBox to scale
    // TODO (GCR): we may at some point want to distinguish the
    // style.width / style.height properties that are applied to
    // the SVG object from our internal conception of the SVG
    // width/height.  This would allow us to create automatically
    // scaling SVGs that filled their containers, for instance.
    //
    // As this isn't implemented in Canvas contexts,
    // I've left as is for now, but in using the viewBox to
    // handle internal scaling, am trying to make it possible
    // for us to eventually move in that direction.

    this.state.scaleX = this.state.scaleX ? this.state.scaleX * x : x;
    this.state.scaleY = this.state.scaleY ? this.state.scaleY * y : y;
    const visibleWidth = this.width / this.state.scaleX;
    const visibleHeight = this.height / this.state.scaleY;
    this.setViewBox(0, 0, visibleWidth, visibleHeight);

    return this;
  }

  /**
   * 1 arg: string in the "x y w h" format
   * 4 args: x:number, y:number, w:number, h:number
   */
  setViewBox(viewBoxOrMinX: string | number, minY?: number, width?: number, height?: number): void {
    if (typeof viewBoxOrMinX === 'string') {
      this.svg.setAttribute('viewBox', viewBoxOrMinX);
    } else {
      const viewBoxString = viewBoxOrMinX + ' ' + minY + ' ' + width + ' ' + height;
      this.svg.setAttribute('viewBox', viewBoxString);
    }
  }

  // ### Drawing helper methods:

  applyAttributes(element: SVGElement, attributes: Attributes): SVGElement {
    const attrNamesToIgnore = ATTRIBUTES_TO_IGNORE[element.nodeName];
    for (const attrName in attributes) {
      if (attrNamesToIgnore && attrNamesToIgnore[attrName]) {
        continue;
      }
      if (
        attributes[attrName] &&
        (this.groupAttributes.length === 0 ||
          attributes[attrName] != this.groupAttributes[this.groupAttributes.length - 1][attrName])
      )
        element.setAttributeNS(null, attrName, attributes[attrName] as string);
    }

    return element;
  }

  // ### Shape & Path Methods:

  clear(): void {
    // Clear the SVG by removing all inner children.

    // (This approach is usually slightly more efficient
    // than removing the old SVG & adding a new one to
    // the container element, since it does not cause the
    // container to resize twice.  Also, the resize
    // triggered by removing the entire SVG can trigger
    // a touchcancel event when the element resizes away
    // from a touch point.)

    while (this.svg.lastChild) {
      this.svg.removeChild(this.svg.lastChild);
    }
  }

  // ## Rectangles:
  rect(x: number, y: number, width: number, height: number, attributes?: Attributes): this {
    // Avoid invalid negative height attributes by flipping the rectangle on its head:
    if (height < 0) {
      y += height;
      height *= -1;
    }

    const rectangle = this.create('rect');
    attributes = attributes ?? { fill: 'none', 'stroke-width': this.attributes['stroke-width'], stroke: 'black' };
    x = this.round(x);
    y = this.round(y);
    width = this.round(width);
    height = this.round(height);
    this.applyAttributes(rectangle, { x, y, width, height, ...attributes });
    this.add(rectangle);
    return this;
  }

  fillRect(x: number, y: number, width: number, height: number): this {
    const attributes = { fill: this.attributes.fill, stroke: 'none' };
    this.rect(x, y, width, height, attributes);
    return this;
  }

  pointerRect(x: number, y: number, width: number, height: number): this {
    const attributes = { opacity: '0', 'pointer-events': 'auto' };
    this.rect(x, y, width, height, attributes);
    return this;
  }

  clearRect(x: number, y: number, width: number, height: number): this {
    // Currently this fills a rect with the backgroundFillStyle, rather
    // than "cut a hole" into the existing shapes.
    //
    // Since tabNote seems to be the only module that makes use of this
    // it may be worth creating a separate tabStave that would
    // draw lines around locations of tablature fingering.
    this.rect(x, y, width, height, { fill: this.backgroundFillStyle, stroke: 'none' });
    return this;
  }

  // ## Paths:

  beginPath(): this {
    this.path = '';
    this.pen.x = NaN;
    this.pen.y = NaN;
    return this;
  }

  moveTo(x: number, y: number): this {
    x = this.round(x);
    y = this.round(y);
    this.path += 'M' + x + ' ' + y;
    this.pen.x = x;
    this.pen.y = y;
    return this;
  }

  lineTo(x: number, y: number): this {
    x = this.round(x);
    y = this.round(y);
    this.path += 'L' + x + ' ' + y;
    this.pen.x = x;
    this.pen.y = y;
    return this;
  }

  bezierCurveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number): this {
    x = this.round(x);
    y = this.round(y);
    x1 = this.round(x1);
    y1 = this.round(y1);
    x2 = this.round(x2);
    y2 = this.round(y2);
    this.path += 'C' + x1 + ' ' + y1 + ',' + x2 + ' ' + y2 + ',' + x + ' ' + y;
    this.pen.x = x;
    this.pen.y = y;
    return this;
  }

  quadraticCurveTo(x1: number, y1: number, x: number, y: number): this {
    x = this.round(x);
    y = this.round(y);
    x1 = this.round(x1);
    y1 = this.round(y1);
    this.path += 'Q' + x1 + ' ' + y1 + ',' + x + ' ' + y;
    this.pen.x = x;
    this.pen.y = y;
    return this;
  }

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise: boolean): this {
    let x0 = x + radius * Math.cos(startAngle);
    let y0 = y + radius * Math.sin(startAngle);
    x0 = this.round(x0);
    y0 = this.round(y0);

    // svg behavior different from canvas.  Don't normalize angles if
    // we are drawing a circle because they both normalize to 0
    const tmpStartTest = normalizeAngle(startAngle);
    const tmpEndTest = normalizeAngle(endAngle);
    if (
      (!counterclockwise && endAngle - startAngle >= TWO_PI) ||
      (counterclockwise && startAngle - endAngle >= TWO_PI) ||
      tmpStartTest === tmpEndTest
    ) {
      let x1 = x + radius * Math.cos(startAngle + Math.PI);
      let y1 = y + radius * Math.sin(startAngle + Math.PI);
      // There's no way to specify a completely circular arc in SVG so we have to
      // use two semi-circular arcs.
      x1 = this.round(x1);
      y1 = this.round(y1);
      radius = this.round(radius);
      this.path += `M${x0} ${y0} A${radius} ${radius} 0 0 0 ${x1} ${y1} `;
      this.path += `A${radius} ${radius} 0 0 0 ${x0} ${y0}`;
      this.pen.x = x0;
      this.pen.y = y0;
    } else {
      let x1 = x + radius * Math.cos(endAngle);
      let y1 = y + radius * Math.sin(endAngle);

      startAngle = tmpStartTest;
      endAngle = tmpEndTest;
      let large: boolean;
      if (Math.abs(endAngle - startAngle) < Math.PI) {
        large = counterclockwise;
      } else {
        large = !counterclockwise;
      }
      if (startAngle > endAngle) {
        large = !large;
      }

      const sweep = !counterclockwise;

      x1 = this.round(x1);
      y1 = this.round(y1);
      radius = this.round(radius);
      this.path += `M${x0} ${y0} A${radius} ${radius} 0 ${+large} ${+sweep} ${x1} ${y1}`;
      this.pen.x = x1;
      this.pen.y = y1;
    }
    return this;
  }

  closePath(): this {
    this.path += 'Z';
    return this;
  }

  protected getShadowStyle(): string {
    // A CSS drop-shadow filter blur looks different than a canvas shadowBlur
    // of the same radius, so we scale the drop-shadow radius here to make it
    // look close to the canvas shadow.
    return `filter: drop-shadow(0 0 ${(this.attributes.shadowBlur as number) / 1.5}px ${this.attributes.shadowColor})`;
  }

  fill(attributes?: Attributes): this {
    const path = this.create('path');
    if (typeof attributes === 'undefined') {
      attributes = { ...this.attributes, stroke: 'none' };
    }

    attributes.d = this.path;
    if ((this.attributes.shadowBlur as number) > 0) {
      attributes.style = this.getShadowStyle();
    }

    this.applyAttributes(path, attributes);
    this.add(path);
    return this;
  }

  stroke(): this {
    const path = this.create('path');
    const attributes: Attributes = {
      ...this.attributes,
      fill: 'none',
      d: this.path,
    };
    if ((this.attributes.shadowBlur as number) > 0) {
      attributes.style = this.getShadowStyle();
    }

    this.applyAttributes(path, attributes);
    this.add(path);
    return this;
  }

  // ## Text Methods:
  measureText(text: string): TextMeasure {
    SVGContext.measureTextElement.setText(text);
    SVGContext.measureTextElement.setFont(
      this.attributes['font-family'],
      this.attributes['font-size'],
      this.attributes['font-weight'],
      this.attributes['font-style']
    );
    const bb = SVGContext.measureTextElement.getBoundingBox();
    return { x: bb.x, y: bb.y, width: bb.w, height: bb.h };
  }

  fillText(text: string, x: number, y: number): this {
    if (!text || text.length <= 0) {
      return this;
    }
    x = this.round(x);
    y = this.round(y);
    const attributes: Attributes = {
      ...this.attributes,
      stroke: 'none',
      x,
      y,
    };

    const txt = this.create('text');
    txt.textContent = text;
    this.applyAttributes(txt, attributes);
    this.add(txt);
    return this;
  }

  save(): this {
    this.stateStack.push({
      state: structuredClone(this.state),
      attributes: structuredClone(this.attributes),
    });
    return this;
  }

  restore(): this {
    const savedState = this.stateStack.pop();
    if (savedState) {
      const state = savedState;
      this.state = structuredClone(state.state);
      this.attributes = structuredClone(state.attributes);
    }
    return this;
  }

  set fillStyle(style: string | CanvasGradient | CanvasPattern) {
    this.setFillStyle(style as string);
  }

  get fillStyle(): string | CanvasGradient | CanvasPattern {
    return this.attributes.fill as string;
  }

  set strokeStyle(style: string | CanvasGradient | CanvasPattern) {
    this.setStrokeStyle(style as string);
  }

  get strokeStyle(): string | CanvasGradient | CanvasPattern {
    return this.attributes.stroke as string;
  }

  /**
   * @param f is 1) a `FontInfo` object or
   *             2) a string formatted as CSS font shorthand (e.g., 'bold 10pt Arial') or
   *             3) a string representing the font family (one of `size`, `weight`, or `style` must also be provided).
   * @param size a string specifying the font size and unit (e.g., '16pt'), or a number (the unit is assumed to be 'pt').
   * @param weight is a string (e.g., 'bold', 'normal') or a number (100, 200, ... 900). It is inserted
   *               into the font-weight attribute (e.g., font-weight="bold")
   * @param style is a string (e.g., 'italic', 'normal') that is inserted into the
   *              font-style attribute (e.g., font-style="italic")
   */
  setFont(f?: string | FontInfo, size?: string | number, weight?: string | number, style?: string): this {
    const fontInfo = Font.validate(f, size, weight, style);
    this.fontCSSString = Font.toCSSString(fontInfo);
    const fontAttributes = {
      'font-family': fontInfo.family,
      'font-size': fontInfo.size,
      'font-weight': fontInfo.weight,
      'font-style': fontInfo.style,
    };
    this.attributes = { ...this.attributes, ...fontAttributes };
    this.state = { ...this.state, ...fontAttributes };
    return this;
  }

  /** Return a string of the form `'italic bold 15pt Arial'` */
  getFont(): string {
    return this.fontCSSString;
  }
}
