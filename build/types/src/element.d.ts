import { BoundingBox } from './boundingbox';
import { FontInfo } from './font';
import { Registry } from './registry';
import { RenderContext } from './rendercontext';
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
    /**
     * See: [SVG `stroke-dasharray` attribute](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-dasharray)
     */
    lineDash?: string;
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
export declare class Element {
    static get CATEGORY(): string;
    protected parent?: Element;
    protected children: Element[];
    protected static ID: number;
    protected static newID(): string;
    /** Canvas used to measure text. See measureText(): TextMetrics. */
    private static txtCanvas?;
    static setTextMeasurementCanvas(canvas: HTMLCanvasElement | OffscreenCanvas): void;
    static getTextMeasurementCanvas(): HTMLCanvasElement | OffscreenCanvas | undefined;
    private context?;
    protected attrs: ElementAttributes;
    protected rendered: boolean;
    protected style: ElementStyle;
    protected registry?: Registry;
    protected _fontInfo: Required<FontInfo>;
    protected fontScale: number;
    protected _text: string;
    protected metricsValid: boolean;
    protected _textMetrics: TextMetrics;
    protected _height: number;
    protected _width: number;
    protected xShift: number;
    protected yShift: number;
    protected x: number;
    protected y: number;
    constructor(category?: string);
    /**
     * Adds a child to the Element, which lets it inherit the
     * same style as the parent when setGroupStyle() is called.
     *
     * Examples of children are noteheads and stems.  Modifiers such
     * as Accidentals are generally not set as children.
     *
     * Note that StaveNote calls setGroupStyle() when setStyle() is called.
     */
    addChild(child: Element): this;
    getCategory(): string;
    /**
     * Set the element style used to render.
     *
     * Example:
     * ```typescript
     * element.setStyle({ fillStyle: 'red', strokeStyle: 'red' });
     * element.drawWithStyle();
     * ```
     * Note: If the element draws additional sub-elements (i.e.: Modifiers in a Stave),
     * the style can be applied to all of them by means of the context:
     * ```typescript
     * element.setStyle({ fillStyle: 'red', strokeStyle: 'red' });
     * element.getContext().setFillStyle('red');
     * element.getContext().setStrokeStyle('red');
     * element.drawWithStyle();
     * ```
     * or using drawWithStyle:
     * ```typescript
     * element.setStyle({ fillStyle: 'red', strokeStyle: 'red' });
     * element.drawWithStyle();
     * ```
     */
    setStyle(style: ElementStyle): this;
    /** Set the element & associated children style used for rendering. */
    setGroupStyle(style: ElementStyle): this;
    /** Get the element style used for rendering. */
    getStyle(): ElementStyle;
    /** Apply the element style to `context`. */
    applyStyle(context?: RenderContext | undefined, style?: ElementStyle): this;
    /**
     * Draw the element and all its sub-elements (i.e.: Modifiers in a Stave)
     * with the element's style (see `getStyle()` and `setStyle()`)
     */
    drawWithStyle(): this;
    /** Draw an element. */
    draw(): void;
    /** Check if it has a class label (An element can have multiple class labels). */
    hasClass(className: string): boolean;
    /** Add a class label (An element can have multiple class labels). */
    addClass(className: string): this;
    /** Remove a class label (An element can have multiple class labels). */
    removeClass(className: string): this;
    /** Call back from registry after the element is registered. */
    onRegister(registry: Registry): this;
    /** Return the rendered status. */
    isRendered(): boolean;
    /** Set the rendered status. */
    setRendered(rendered?: boolean): this;
    /** Return the element attributes. */
    getAttributes(): ElementAttributes;
    /** Return an attribute, such as 'id', 'type' or 'class'. */
    getAttribute(name: string): any;
    /** Return associated SVGElement. */
    getSVGElement(suffix?: string): SVGElement | undefined;
    /** Set an attribute such as 'id', 'class', or 'type'. */
    setAttribute(name: string, value: string | undefined): this;
    /** Get the boundingBox. */
    getBoundingBox(): BoundingBox;
    /** Return the context, such as an SVGContext or CanvasContext object. */
    getContext(): RenderContext | undefined;
    /** Set the context to an SVGContext or CanvasContext object */
    setContext(context?: RenderContext): this;
    /** Validate and return the rendering context. */
    checkContext(): RenderContext;
    /**
     * Provide a CSS compatible font string (e.g., 'bold 16px Arial') that will be applied
     * to text (not glyphs).
     */
    set font(f: string);
    /** Returns the CSS compatible font string for the text font. */
    get font(): string;
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
    setFont(font?: string | FontInfo, size?: string | number, weight?: string | number, style?: string): this;
    /**
     * Get the css string describing this Element's text font. e.g.,
     * 'bold 10pt Arial'.
     */
    getFont(): string;
    /** Return a copy of the current FontInfo object. */
    get fontInfo(): Required<FontInfo>;
    /** Set the current FontInfo object. */
    set fontInfo(fontInfo: FontInfo);
    /** Change the font size, while keeping everything else the same. */
    setFontSize(size?: string | number): this;
    /**
     * @returns a CSS font-size string (e.g., '18pt', '12px', '1em').
     * See Element.fontSizeInPixels or Element.fontSizeInPoints if you need to get a number for calculation purposes.
     */
    getFontSize(): string;
    getFontScale(): number;
    /**
     * The size is 1) a string of the form '10pt' or '16px', compatible with the CSS font-size property.
     *          or 2) a number, which is interpreted as a point size (i.e. 12 == '12pt').
     */
    set fontSize(size: string | number);
    /** @returns a CSS font-size string (e.g., '18pt', '12px', '1em'). */
    get fontSize(): string;
    /** @returns the font size in `pt`. */
    get fontSizeInPoints(): number;
    /** @returns the font size in `px`. */
    get fontSizeInPixels(): number;
    /** @returns a CSS font-style string (e.g., 'italic'). */
    get fontStyle(): string;
    /** Set the font style. */
    set fontStyle(style: string);
    /**
     * @returns a CSS font-weight string (e.g., 'bold').
     * As in CSS, font-weight is always returned as a string, even if it was set as a number.
     */
    get fontWeight(): string;
    /** Set the font weight. */
    set fontWeight(weight: string | number);
    /** Get element width. */
    getWidth(): number;
    get width(): number;
    /** Set element width. */
    setWidth(width: number): this;
    set width(width: number);
    /** Set the X coordinate. */
    setX(x: number): this;
    /** Get the X coordinate. */
    getX(): number;
    /** Get the Y coordinate. */
    getY(): number;
    /** Set the Y coordinate. */
    setY(y: number): this;
    /** Shift element down `yShift` pixels. Negative values shift up. */
    setYShift(yShift: number): this;
    /** Get shift element `yShift`. */
    getYShift(): number;
    /** Set shift element right `xShift` pixels. Negative values shift left. */
    setXShift(xShift: number): this;
    /** Get shift element `xShift`. */
    getXShift(): number;
    /** Set element text. */
    setText(text: string): this;
    set text(text: string);
    /** Get element text. */
    getText(): string;
    get text(): string;
    /** Render the element text. */
    renderText(ctx: RenderContext, xPos: number, yPos: number): void;
    /** Measure the text using the textFont. */
    measureText(): TextMetrics;
    /** Measure the text using the FontInfo related with key. */
    static measureWidth(text: string, key?: string): number;
    /** Get the text metrics. */
    getTextMetrics(): TextMetrics;
    get textMetrics(): TextMetrics;
    /** Get the text height. */
    getHeight(): number;
    get height(): number;
    set height(height: number);
    setOriginX(x: number): void;
    setOriginY(y: number): void;
    setOrigin(x: number, y: number): void;
}
