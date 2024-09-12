import { BoundingBox } from './boundingbox.js';
import { Font } from './font.js';
import { Metrics } from './metrics.js';
import { Registry } from './registry.js';
import { defined, prefix, RuntimeError } from './util.js';
export class Element {
    static get CATEGORY() {
        return "Element";
    }
    static newID() {
        return `auto${Element.ID++}`;
    }
    static setTextMeasurementCanvas(canvas) {
        Element.txtCanvas = canvas;
    }
    static getTextMeasurementCanvas() {
        let txtCanvas = Element.txtCanvas;
        if (!txtCanvas) {
            if (typeof document !== 'undefined') {
                txtCanvas = document.createElement('canvas');
            }
            else if (typeof OffscreenCanvas !== 'undefined') {
                txtCanvas = new OffscreenCanvas(300, 150);
            }
            Element.txtCanvas = txtCanvas;
        }
        return txtCanvas;
    }
    constructor(category) {
        var _a;
        this.children = [];
        this.style = {};
        this._text = '';
        this.metricsValid = false;
        this._textMetrics = {
            fontBoundingBoxAscent: 0,
            fontBoundingBoxDescent: 0,
            actualBoundingBoxAscent: 0,
            actualBoundingBoxDescent: 0,
            actualBoundingBoxLeft: 0,
            actualBoundingBoxRight: 0,
            width: 0,
            alphabeticBaseline: 0,
            emHeightAscent: 0,
            emHeightDescent: 0,
            hangingBaseline: 0,
            ideographicBaseline: 0,
        };
        this._height = 0;
        this._width = 0;
        this.xShift = 0;
        this.yShift = 0;
        this.x = 0;
        this.y = 0;
        this.attrs = {
            id: Element.newID(),
            type: category !== null && category !== void 0 ? category : this.constructor.CATEGORY,
            class: '',
        };
        this.rendered = false;
        this._fontInfo = Metrics.getFontInfo(this.attrs.type);
        this.style = Metrics.getStyle(this.attrs.type);
        this.fontScale = Metrics.get(`${this.attrs.type}.fontScale`);
        (_a = Registry.getDefaultRegistry()) === null || _a === void 0 ? void 0 : _a.register(this);
    }
    addChild(child) {
        if (child.parent)
            throw new RuntimeError('Element', 'Parent already defined');
        child.parent = this;
        this.children.push(child);
        return this;
    }
    getCategory() {
        return this.attrs.type;
    }
    setStyle(style) {
        this.style = style;
        return this;
    }
    setGroupStyle(style) {
        this.style = style;
        this.children.forEach((child) => child.setGroupStyle(style));
        return this;
    }
    getStyle() {
        return this.style;
    }
    applyStyle(context = this.context, style = this.getStyle()) {
        if (!context)
            return this;
        if (style.shadowColor)
            context.setShadowColor(style.shadowColor);
        if (style.shadowBlur)
            context.setShadowBlur(style.shadowBlur);
        if (style.fillStyle)
            context.setFillStyle(style.fillStyle);
        if (style.strokeStyle)
            context.setStrokeStyle(style.strokeStyle);
        if (style.lineWidth)
            context.setLineWidth(style.lineWidth);
        if (style.lineDash)
            context.setLineDash(style.lineDash.split(' ').map(Number));
        return this;
    }
    drawWithStyle() {
        const ctx = this.checkContext();
        ctx.save();
        this.applyStyle(ctx);
        this.draw();
        ctx.restore();
        return this;
    }
    draw() {
        throw new RuntimeError('Element', 'Draw not defined');
    }
    hasClass(className) {
        var _a;
        if (!this.attrs.class)
            return false;
        return ((_a = this.attrs.class) === null || _a === void 0 ? void 0 : _a.split(' ').indexOf(className)) !== -1;
    }
    addClass(className) {
        var _a;
        if (this.hasClass(className))
            return this;
        if (!this.attrs.class)
            this.attrs.class = `${className}`;
        else
            this.attrs.class = `${this.attrs.class} ${className}`;
        (_a = this.registry) === null || _a === void 0 ? void 0 : _a.onUpdate({
            id: this.attrs.id,
            name: 'class',
            value: className,
            oldValue: undefined,
        });
        return this;
    }
    removeClass(className) {
        var _a, _b;
        if (!this.hasClass(className))
            return this;
        const arr = (_a = this.attrs.class) === null || _a === void 0 ? void 0 : _a.split(' ');
        if (arr) {
            arr.splice(arr.indexOf(className));
            this.attrs.class = arr.join(' ');
        }
        (_b = this.registry) === null || _b === void 0 ? void 0 : _b.onUpdate({
            id: this.attrs.id,
            name: 'class',
            value: undefined,
            oldValue: className,
        });
        return this;
    }
    onRegister(registry) {
        this.registry = registry;
        return this;
    }
    isRendered() {
        return this.rendered;
    }
    setRendered(rendered = true) {
        this.rendered = rendered;
        return this;
    }
    getAttributes() {
        return this.attrs;
    }
    getAttribute(name) {
        return this.attrs[name];
    }
    getSVGElement(suffix = '') {
        const id = prefix(this.attrs.id + suffix);
        const element = document.getElementById(id);
        if (element)
            return element;
    }
    setAttribute(name, value) {
        var _a;
        const oldID = this.attrs.id;
        const oldValue = this.attrs[name];
        this.attrs[name] = value;
        (_a = this.registry) === null || _a === void 0 ? void 0 : _a.onUpdate({ id: oldID, name, value, oldValue });
        return this;
    }
    getBoundingBox() {
        return new BoundingBox(this.x + this.xShift, this.y + this.yShift - this.textMetrics.actualBoundingBoxAscent, this.width, this.height);
    }
    getContext() {
        return this.context;
    }
    setContext(context) {
        this.context = context;
        return this;
    }
    checkContext() {
        return defined(this.context, 'NoContext', 'No rendering context attached to instance.');
    }
    set font(f) {
        this.setFont(f);
    }
    get font() {
        return Font.toCSSString(this._fontInfo);
    }
    setFont(font, size, weight, style) {
        const defaultTextFont = Metrics.getFontInfo(this.attrs.type);
        const fontIsObject = typeof font === 'object';
        const fontIsString = typeof font === 'string';
        const sizeWeightStyleAreUndefined = size === undefined && weight === undefined && style === undefined;
        this.metricsValid = false;
        if (fontIsObject) {
            this._fontInfo = Object.assign(Object.assign({}, defaultTextFont), font);
        }
        else if (fontIsString && sizeWeightStyleAreUndefined) {
            this._fontInfo = Font.fromCSSString(font);
        }
        else {
            this._fontInfo = Font.validate(font !== null && font !== void 0 ? font : defaultTextFont.family, size !== null && size !== void 0 ? size : defaultTextFont.size, weight !== null && weight !== void 0 ? weight : defaultTextFont.weight, style !== null && style !== void 0 ? style : defaultTextFont.style);
        }
        return this;
    }
    getFont() {
        return Font.toCSSString(this._fontInfo);
    }
    get fontInfo() {
        return this._fontInfo;
    }
    set fontInfo(fontInfo) {
        this.setFont(fontInfo);
    }
    setFontSize(size) {
        const fontInfo = this.fontInfo;
        this.setFont(fontInfo.family, size, fontInfo.weight, fontInfo.style);
        return this;
    }
    getFontSize() {
        return this.fontSize;
    }
    getFontScale() {
        return this.fontScale;
    }
    set fontSize(size) {
        this.setFontSize(size);
    }
    get fontSize() {
        let size = this.fontInfo.size;
        if (typeof size === 'number') {
            size = `${size}pt`;
        }
        return size;
    }
    get fontSizeInPoints() {
        return Font.convertSizeToPointValue(this.fontSize);
    }
    get fontSizeInPixels() {
        return Font.convertSizeToPixelValue(this.fontSize);
    }
    get fontStyle() {
        return this.fontInfo.style;
    }
    set fontStyle(style) {
        const fontInfo = this.fontInfo;
        this.setFont(fontInfo.family, fontInfo.size, fontInfo.weight, style);
    }
    get fontWeight() {
        return this.fontInfo.weight + '';
    }
    set fontWeight(weight) {
        const fontInfo = this.fontInfo;
        this.setFont(fontInfo.family, fontInfo.size, weight, fontInfo.style);
    }
    getWidth() {
        return this.width;
    }
    get width() {
        if (!this.metricsValid)
            this.measureText();
        return this._width;
    }
    setWidth(width) {
        this.width = width;
        return this;
    }
    set width(width) {
        if (!this.metricsValid)
            this.measureText();
        this._width = width;
    }
    setX(x) {
        this.x = x;
        return this;
    }
    getX() {
        return this.x;
    }
    getY() {
        return this.y;
    }
    setY(y) {
        this.y = y;
        return this;
    }
    setYShift(yShift) {
        this.yShift = yShift;
        return this;
    }
    getYShift() {
        return this.yShift;
    }
    setXShift(xShift) {
        this.xShift = xShift;
        return this;
    }
    getXShift() {
        return this.xShift;
    }
    setText(text) {
        this.text = text;
        return this;
    }
    set text(text) {
        this.metricsValid = false;
        this._text = text;
    }
    getText() {
        return this._text;
    }
    get text() {
        return this._text;
    }
    renderText(ctx, xPos, yPos) {
        ctx.setFont(this._fontInfo);
        ctx.fillText(this._text, xPos + this.x + this.xShift, yPos + this.y + this.yShift);
        this.children.forEach((child) => {
            ctx.setFont(child.fontInfo);
            ctx.fillText(child.text, xPos + child.x + child.xShift, yPos + child.y + child.yShift);
        });
    }
    measureText() {
        var _a;
        const context = (_a = Element.getTextMeasurementCanvas()) === null || _a === void 0 ? void 0 : _a.getContext('2d');
        if (!context) {
            console.warn('Element: No context for txtCanvas. Returning empty text metrics.');
            return this._textMetrics;
        }
        context.font = Font.toCSSString(Font.validate(this.fontInfo));
        this._textMetrics = context.measureText(this.text);
        this._height = this._textMetrics.actualBoundingBoxAscent + this._textMetrics.actualBoundingBoxDescent;
        this._width = this._textMetrics.width;
        this.metricsValid = true;
        return this._textMetrics;
    }
    static measureWidth(text, key = '') {
        var _a;
        const context = (_a = Element.getTextMeasurementCanvas()) === null || _a === void 0 ? void 0 : _a.getContext('2d');
        if (!context) {
            console.warn('Element: No context for txtCanvas. Returning empty text metrics.');
            return 0;
        }
        context.font = Font.toCSSString(Metrics.getFontInfo(key));
        return context.measureText(text).width;
    }
    getTextMetrics() {
        return this.textMetrics;
    }
    get textMetrics() {
        if (!this.metricsValid)
            this.measureText();
        return this._textMetrics;
    }
    getHeight() {
        return this.height;
    }
    get height() {
        if (!this.metricsValid)
            this.measureText();
        return this._height;
    }
    set height(height) {
        if (!this.metricsValid)
            this.measureText();
        this._height = height;
    }
    setOriginX(x) {
        const bbox = this.getBoundingBox();
        const originX = Math.abs((bbox.getX() - this.xShift) / bbox.getW());
        const xShift = (x - originX) * bbox.getW();
        this.xShift = -xShift;
    }
    setOriginY(y) {
        const bbox = this.getBoundingBox();
        const originY = Math.abs((bbox.getY() - this.yShift) / bbox.getH());
        const yShift = (y - originY) * bbox.getH();
        this.yShift = -yShift;
    }
    setOrigin(x, y) {
        this.setOriginX(x);
        this.setOriginY(y);
    }
}
Element.ID = 1000;
