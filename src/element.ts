// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
// @author Mohit Cheppudira

import { BoundingBox } from './boundingbox';
import { Font, FontInfo } from './font';
import { Metrics } from './metrics';
import { Registry } from './registry';
import { RenderContext } from './rendercontext';
import { Category } from './typeguard';
import { defined, prefix, RuntimeError } from './util';

/** Element attributes. */
export interface ElementAttributes {
  [name: string]: string | undefined;
  id: string;
  type: string;
  class: string;
}

/** Element style. */
export interface ElementStyle {
  /**
   * CSS color used for the shadow.
   *
   * Examples: 'red', '#ff0000', '#ff000010', 'rgb(255,0,0)'
   *
   * See [CSS Legal Color Values](https://www.w3schools.com/cssref/css_colors_legal.asp)
   */
  shadowColor?: string;
  /**
   * Level of blur applied to shadows.
   *
   * Values that are not finite numbers greater than or equal to zero are ignored.
   */
  shadowBlur?: number;
  /**
   * CSS color used with context fill command.
   *
   * Examples: 'red', '#ff0000', '#ff000010', 'rgb(255,0,0)'
   *
   * See [CSS Legal Color Values](https://www.w3schools.com/cssref/css_colors_legal.asp)
   */
  fillStyle?: string;
  /**
   * CSS color used with context stroke command.
   *
   * Examples: 'red', '#ff0000', '#ff000010', 'rgb(255,0,0)'
   *
   * See [CSS Legal Color Values](https://www.w3schools.com/cssref/css_colors_legal.asp)
   */
  strokeStyle?: string;
  /**
   * Line width, 1.0 by default.
   */
  lineWidth?: number;
}

/**
 * Element implements a generic base class for VexFlow, with implementations
 * of general functions and properties that can be inherited by all VexFlow elements.
 *
 * The Element handles style and font properties for the Element and any child
 * elements, along with working with the Registry to create unique ids.
 *
 * The `text` is a series of unicode characters (including SMuFL codes).
 * The `textFont` property contains information required to style the text (i.e., font family, size, weight, and style).
 * This font family is a comma separated list of fonts.
 * The method `measureText` calculates the `textMetrics`, `boundingBox`, `height` and `width` of the `text`.
 * The method `renderText(...)` will render the text using the provided context and coordinates,
 * taking `xShift` and `yShift` into account.
 */
export class Element {
  static get CATEGORY(): string {
    return Category.Element;
  }

  // Element objects keep a list of children that they are responsible for.
  // Children inherit the style from their parents (see: setGroupStyle(s)).
  protected children: Element[] = [];
  protected static ID: number = 1000;
  protected static newID(): string {
    return `auto${Element.ID++}`;
  }

  /** Canvas used to measure text. See measureText(): TextMetrics. */
  static #txtCanvas?: HTMLCanvasElement | OffscreenCanvas;

  // Note: Canvas is node-canvas.
  // https://www.npmjs.com/package/canvas
  static setTextMeasurementCanvas(canvas: HTMLCanvasElement | OffscreenCanvas /* | Canvas */): void {
    Element.#txtCanvas = canvas;
  }

  static getTextMeasurementCanvas(): HTMLCanvasElement | OffscreenCanvas | undefined {
    let txtCanvas: HTMLCanvasElement | OffscreenCanvas | undefined = Element.#txtCanvas;
    // Create the canvas element that will be used to measure text.
    if (!txtCanvas) {
      if (typeof document !== 'undefined') {
        txtCanvas = document.createElement('canvas'); // Defaults to 300 x 150. See: https://www.w3.org/TR/2012/WD-html5-author-20120329/the-canvas-element.html#the-canvas-element
      } else if (typeof OffscreenCanvas !== 'undefined') {
        txtCanvas = new OffscreenCanvas(300, 150);
      }
      Element.#txtCanvas = txtCanvas;
    }
    return txtCanvas;
  }

  #context?: RenderContext;
  #attrs: ElementAttributes;

  protected rendered: boolean;
  protected style?: ElementStyle;
  protected registry?: Registry;

  #fontInfo: Required<FontInfo>;
  #fontScale: number;
  #text = '';
  #metricsValid = false;
  #textMetrics: TextMetrics = {
    fontBoundingBoxAscent: 0,
    fontBoundingBoxDescent: 0,
    actualBoundingBoxAscent: 0,
    actualBoundingBoxDescent: 0,
    actualBoundingBoxLeft: 0,
    actualBoundingBoxRight: 0,
    width: 0,
  };

  #height: number = 0;
  #width: number = 0;
  protected xShift: number = 0;
  protected yShift: number = 0;
  protected x: number = 0;
  protected y: number = 0;

  constructor(category?: string) {
    this.#attrs = {
      id: Element.newID(),
      type: category ?? (<typeof Element>this.constructor).CATEGORY,
      class: '',
    };

    this.rendered = false;
    this.#fontInfo = Metrics.getFontInfo(this.#attrs.type);
    this.#fontScale = Metrics.get(`${this.#attrs.type}.fontScale`);

    // If a default registry exist, then register with it right away.
    Registry.getDefaultRegistry()?.register(this);
  }

  /**
   * Adds a child Element to the Element, which lets it inherit the
   * same style as the parent when setGroupStyle() is called.
   *
   * Examples of children are noteheads and stems.  Modifiers such
   * as Accidentals are generally not set as children.
   *
   * Note that StaveNote calls setGroupStyle() when setStyle() is called.
   */
  addChildElement(child: Element): this {
    this.children.push(child);
    return this;
  }

  getCategory(): string {
    return this.#attrs.type;
  }

  /**
   * Set the element style used to render.
   *
   * Example:
   * ```typescript
   * element.setStyle({ fillStyle: 'red', strokeStyle: 'red' });
   * element.draw();
   * ```
   * Note: If the element draws additional sub-elements (ie.: Modifiers in a Stave),
   * the style can be applied to all of them by means of the context:
   * ```typescript
   * element.setStyle({ fillStyle: 'red', strokeStyle: 'red' });
   * element.getContext().setFillStyle('red');
   * element.getContext().setStrokeStyle('red');
   * element.draw();
   * ```
   * or using drawWithStyle:
   * ```typescript
   * element.setStyle({ fillStyle: 'red', strokeStyle: 'red' });
   * element.drawWithStyle();
   * ```
   */
  setStyle(style: ElementStyle | undefined): this {
    this.style = style;
    return this;
  }

  /** Set the element & associated children style used for rendering. */
  setGroupStyle(style: ElementStyle): this {
    this.style = style;
    this.children.forEach((child) => child.setGroupStyle(style));
    return this;
  }

  /** Get the element style used for rendering. */
  getStyle(): ElementStyle | undefined {
    return this.style;
  }

  /** Apply the element style to `context`. */
  applyStyle(
    context: RenderContext | undefined = this.#context,
    style: ElementStyle | undefined = this.getStyle()
  ): this {
    if (!style) return this;
    if (!context) return this;

    context.save();
    if (style.shadowColor) context.setShadowColor(style.shadowColor);
    if (style.shadowBlur) context.setShadowBlur(style.shadowBlur);
    if (style.fillStyle) context.setFillStyle(style.fillStyle);
    if (style.strokeStyle) context.setStrokeStyle(style.strokeStyle);
    if (style.lineWidth) context.setLineWidth(style.lineWidth);
    return this;
  }

  /** Restore the style of `context`. */
  restoreStyle(
    context: RenderContext | undefined = this.#context,
    style: ElementStyle | undefined = this.getStyle()
  ): this {
    if (!style) return this;
    if (!context) return this;
    context.restore();
    return this;
  }

  /**
   * Draw the element and all its sub-elements (ie.: Modifiers in a Stave)
   * with the element's style (see `getStyle()` and `setStyle()`)
   */
  drawWithStyle(): void {
    this.checkContext();
    this.applyStyle();
    this.draw();
    this.restoreStyle();
  }

  /** Draw an element. */
  draw(): void {
    throw new RuntimeError('Element', 'Draw not defined');
  }

  /** Check if it has a class label (An element can have multiple class labels). */
  hasClass(className: string): boolean {
    if (!this.#attrs.class) return false;
    return this.#attrs.class?.split(' ').indexOf(className) !== -1;
  }

  /** Add a class label (An element can have multiple class labels). */
  addClass(className: string): this {
    if (this.hasClass(className)) return this;
    if (!this.#attrs.class) this.#attrs.class = `${className}`;
    else this.#attrs.class = `${this.#attrs.class} ${className}`;
    this.registry?.onUpdate({
      id: this.#attrs.id,
      name: 'class',
      value: className,
      oldValue: undefined,
    });
    return this;
  }

  /** Remove a class label (An element can have multiple class labels). */
  removeClass(className: string): this {
    if (!this.hasClass(className)) return this;
    const arr = this.#attrs.class?.split(' ');
    if (arr) {
      arr.splice(arr.indexOf(className));
      this.#attrs.class = arr.join(' ');
    }
    this.registry?.onUpdate({
      id: this.#attrs.id,
      name: 'class',
      value: undefined,
      oldValue: className,
    });
    return this;
  }

  /** Call back from registry after the element is registered. */
  onRegister(registry: Registry): this {
    this.registry = registry;
    return this;
  }

  /** Return the rendered status. */
  isRendered(): boolean {
    return this.rendered;
  }

  /** Set the rendered status. */
  setRendered(rendered = true): this {
    this.rendered = rendered;
    return this;
  }

  /** Return the element attributes. */
  getAttributes(): ElementAttributes {
    return this.#attrs;
  }

  /** Return an attribute, such as 'id', 'type' or 'class'. */
  // eslint-disable-next-line
  getAttribute(name: string): any {
    return this.#attrs[name];
  }

  /** Return associated SVGElement. */
  getSVGElement(suffix: string = ''): SVGElement | undefined {
    const id = prefix(this.#attrs.id + suffix);
    const element = document.getElementById(id);
    if (element) return element as unknown as SVGElement;
  }

  /** Set an attribute such as 'id', 'class', or 'type'. */
  setAttribute(name: string, value: string | undefined): this {
    const oldID = this.#attrs.id;
    const oldValue = this.#attrs[name];
    this.#attrs[name] = value;
    // Register with old id to support id changes.
    this.registry?.onUpdate({ id: oldID, name, value, oldValue });
    return this;
  }

  /** Get the boundingBox. */
  getBoundingBox(): BoundingBox {
    return new BoundingBox(0, -this.textMetrics.actualBoundingBoxAscent, this.width, this.height);
  }

  /** Return the context, such as an SVGContext or CanvasContext object. */
  getContext(): RenderContext | undefined {
    return this.#context;
  }

  /** Set the context to an SVGContext or CanvasContext object */
  setContext(context?: RenderContext): this {
    this.#context = context;
    return this;
  }

  /** Validate and return the rendering context. */
  checkContext(): RenderContext {
    return defined(this.#context, 'NoContext', 'No rendering context attached to instance.');
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // Font Handling

  /**
   * Provide a CSS compatible font string (e.g., 'bold 16px Arial') that will be applied
   * to text (not glyphs).
   */
  set font(f: string) {
    this.setFont(f);
  }

  /** Returns the CSS compatible font string for the text font. */
  get font(): string {
    return Font.toCSSString(this.#fontInfo);
  }

  /**
   * Set the element's text font family, size, weight, style
   * (e.g., `Arial`, `10pt`, `bold`, `italic`).
   *
   * This attribute does not determine the font used for musical Glyphs like treble clefs.
   *
   * @param font is 1) a `FontInfo` object or
   *                2) a string formatted as CSS font shorthand (e.g., 'bold 10pt Arial') or
   *                3) a string representing the font family (at least one of `size`, `weight`, or `style` must also be provided).
   * @param size a string specifying the font size and unit (e.g., '16pt'), or a number (the unit is assumed to be 'pt').
   * @param weight is a string (e.g., 'bold', 'normal') or a number (100, 200, ... 900).
   * @param style is a string (e.g., 'italic', 'normal').
   * If no arguments are provided, then the font is set to the default font.
   * Each Element subclass may specify its own default by overriding the static `TEXT_FONT` property.
   */
  setFont(font?: string | FontInfo, size?: string | number, weight?: string | number, style?: string): this {
    const defaultTextFont: Required<FontInfo> = Metrics.getFontInfo(this.#attrs.type);

    const fontIsObject = typeof font === 'object';
    const fontIsString = typeof font === 'string';
    const sizeWeightStyleAreUndefined = size === undefined && weight === undefined && style === undefined;

    this.#metricsValid = false;
    if (fontIsObject) {
      // `font` is case 1) a FontInfo object
      this.#fontInfo = { ...defaultTextFont, ...font };
    } else if (fontIsString && sizeWeightStyleAreUndefined) {
      // `font` is case 2) CSS font shorthand.
      this.#fontInfo = Font.fromCSSString(font);
    } else {
      // `font` is case 3) a font family string (e.g., 'Times New Roman').
      // The other parameters represent the size, weight, and style.
      // It is okay for `font` to be undefined while one or more of the other arguments is provided.
      // Following CSS conventions, unspecified params are reset to the default.
      this.#fontInfo = Font.validate(
        font ?? defaultTextFont.family,
        size ?? defaultTextFont.size,
        weight ?? defaultTextFont.weight,
        style ?? defaultTextFont.style
      );
    }
    return this;
  }

  /**
   * Get the css string describing this Element's text font. e.g.,
   * 'bold 10pt Arial'.
   */
  getFont(): string {
    return Font.toCSSString(this.#fontInfo);
  }

  /** Return a copy of the current FontInfo object. */
  get fontInfo(): Required<FontInfo> {
    // We can cast to Required<FontInfo> here, because
    // we just called resetFont() above to ensure this.fontInfo is set.
    return this.#fontInfo;
  }

  /** Set the current FontInfo object. */
  set fontInfo(fontInfo: FontInfo) {
    this.setFont(fontInfo);
  }

  /** Change the font size, while keeping everything else the same. */
  setFontSize(size?: string | number): this {
    const fontInfo = this.fontInfo;
    this.setFont(fontInfo.family, size, fontInfo.weight, fontInfo.style);
    return this;
  }

  /**
   * @returns a CSS font-size string (e.g., '18pt', '12px', '1em').
   * See Element.fontSizeInPixels or Element.fontSizeInPoints if you need to get a number for calculation purposes.
   */
  getFontSize(): string {
    return this.fontSize;
  }

  getFontScale(): number {
    return this.#fontScale;
  }

  /**
   * The size is 1) a string of the form '10pt' or '16px', compatible with the CSS font-size property.
   *          or 2) a number, which is interpreted as a point size (i.e. 12 == '12pt').
   */
  set fontSize(size: string | number) {
    this.setFontSize(size);
  }

  /** @returns a CSS font-size string (e.g., '18pt', '12px', '1em'). */
  get fontSize(): string {
    let size = this.fontInfo.size;
    if (typeof size === 'number') {
      size = `${size}pt`;
    }
    return size;
  }

  /** @returns the font size in `pt`. */
  get fontSizeInPoints(): number {
    return Font.convertSizeToPointValue(this.fontSize);
  }

  /** @returns the font size in `px`. */
  get fontSizeInPixels(): number {
    return Font.convertSizeToPixelValue(this.fontSize);
  }

  /** @returns a CSS font-style string (e.g., 'italic'). */
  get fontStyle(): string {
    return this.fontInfo.style;
  }

  /** Set the font style. */
  set fontStyle(style: string) {
    const fontInfo = this.fontInfo;
    this.setFont(fontInfo.family, fontInfo.size, fontInfo.weight, style);
  }

  /**
   * @returns a CSS font-weight string (e.g., 'bold').
   * As in CSS, font-weight is always returned as a string, even if it was set as a number.
   */
  get fontWeight(): string {
    return this.fontInfo.weight + '';
  }

  /** Set the font weight. */
  set fontWeight(weight: string | number) {
    const fontInfo = this.fontInfo;
    this.setFont(fontInfo.family, fontInfo.size, weight, fontInfo.style);
  }

  /** Get element width. */
  getWidth(): number {
    return this.width;
  }

  get width(): number {
    if (!this.#metricsValid) this.measureText();
    return this.#width;
  }

  /** Set element width. */
  setWidth(width: number): this {
    this.width = width;
    return this;
  }

  set width(width: number) {
    if (!this.#metricsValid) this.measureText();
    this.#width = width;
  }

  /** Set the X coordinate. */
  setX(x: number): this {
    this.x = x;
    return this;
  }

  /** Get the X coordinate. */
  getX(): number {
    return this.x;
  }
  /** Get the Y coordinate. */
  getY(): number {
    return this.y;
  }

  /** Set the Y coordinate. */
  setY(y: number): this {
    this.y = y;
    return this;
  }

  /** Shift element down `yShift` pixels. Negative values shift up. */
  setYShift(yShift: number): this {
    this.yShift = yShift;
    return this;
  }

  /** Get shift element `yShift`. */
  getYShift(): number {
    return this.yShift;
  }

  /** Set shift element right `xShift` pixels. Negative values shift left. */
  setXShift(xShift: number): this {
    this.xShift = xShift;
    return this;
  }

  /** Get shift element `xShift`. */
  getXShift(): number {
    return this.xShift;
  }

  /** Set element text. */
  setText(text: string): this {
    this.text = text;
    return this;
  }

  set text(text: string) {
    this.#metricsValid = false;
    this.#text = text;
  }

  /** Get element text. */
  getText(): string {
    return this.#text;
  }

  get text(): string {
    return this.#text;
  }

  /** Render the element text. */
  renderText(ctx: RenderContext, xPos: number, yPos: number): void {
    ctx.save();
    ctx.setFont(this.#fontInfo);
    ctx.fillText(this.#text, xPos + this.x + this.xShift, yPos + this.y + this.yShift);
    this.children.forEach((child) => {
      ctx.setFont(child.#fontInfo);
      ctx.fillText(child.#text, xPos + child.x + child.xShift, yPos + child.y + child.yShift);
    });
    ctx.restore();
  }

  /** Measure the text using the textFont. */
  measureText(): TextMetrics {
    // TODO: What about SVG.getBBox()?
    // https://developer.mozilla.org/en-US/docs/Web/API/SVGGraphicsElement/getBBox
    const context = Element.getTextMeasurementCanvas()?.getContext('2d');
    if (!context) {
      // eslint-disable-next-line no-console
      console.warn('Element: No context for txtCanvas. Returning empty text metrics.');
      return this.#textMetrics;
    }
    context.font = Font.toCSSString(Font.validate(this.#fontInfo));
    this.#textMetrics = context.measureText(this.#text);
    this.#height = this.#textMetrics.actualBoundingBoxAscent + this.#textMetrics.actualBoundingBoxDescent;
    this.#width = this.#textMetrics.width;
    this.#metricsValid = true;
    return this.#textMetrics;
  }

  /** Measure the text using the FontInfo related with key. */
  static measureWidth(text: string, key = ''): number {
    const context = Element.getTextMeasurementCanvas()?.getContext('2d');
    if (!context) {
      // eslint-disable-next-line no-console
      console.warn('Element: No context for txtCanvas. Returning empty text metrics.');
      return 0;
    }
    context.font = Font.toCSSString(Metrics.getFontInfo(key));
    return context.measureText(text).width;
  }

  /** Get the text metrics. */
  getTextMetrics(): TextMetrics {
    return this.textMetrics;
  }

  get textMetrics(): TextMetrics {
    if (!this.#metricsValid) this.measureText();
    return this.#textMetrics;
  }

  /** Get the text height. */
  getHeight() {
    return this.height;
  }

  get height() {
    if (!this.#metricsValid) this.measureText();
    return this.#height;
  }

  set height(height: number) {
    if (!this.#metricsValid) this.measureText();
    this.#height = height;
  }

  setOriginX(x: number): void {
    const bbox = this.getBoundingBox();
    const originX = Math.abs(bbox.getX() / bbox.getW());
    const xShift = (x - originX) * bbox.getW();
    this.xShift = -xShift;
  }

  setOriginY(y: number): void {
    const bbox = this.getBoundingBox();
    const originY = Math.abs(bbox.getY() / bbox.getH());
    const yShift = (y - originY) * bbox.getH();
    this.yShift = -yShift;
  }

  setOrigin(x: number, y: number): void {
    this.setOriginX(x);
    this.setOriginY(y);
  }
}
