var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _a, _Element_txtCanvas, _Element_context, _Element_attrs, _Element_fontInfo, _Element_fontScale, _Element_text, _Element_metricsValid, _Element_textMetrics, _Element_height, _Element_width;
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
        return `auto${_a.ID++}`;
    }
    static setTextMeasurementCanvas(canvas) {
        __classPrivateFieldSet(_a, _a, canvas, "f", _Element_txtCanvas);
    }
    constructor(category) {
        var _b;
        this.children = [];
        _Element_context.set(this, void 0);
        _Element_attrs.set(this, void 0);
        _Element_fontInfo.set(this, void 0);
        _Element_fontScale.set(this, void 0);
        _Element_text.set(this, '');
        _Element_metricsValid.set(this, false);
        _Element_textMetrics.set(this, {
            fontBoundingBoxAscent: 0,
            fontBoundingBoxDescent: 0,
            actualBoundingBoxAscent: 0,
            actualBoundingBoxDescent: 0,
            actualBoundingBoxLeft: 0,
            actualBoundingBoxRight: 0,
            width: 0,
        });
        _Element_height.set(this, 0);
        _Element_width.set(this, 0);
        this.xShift = 0;
        this.yShift = 0;
        this.x = 0;
        this.y = 0;
        __classPrivateFieldSet(this, _Element_attrs, {
            id: _a.newID(),
            type: category !== null && category !== void 0 ? category : this.constructor.CATEGORY,
            class: '',
        }, "f");
        this.rendered = false;
        __classPrivateFieldSet(this, _Element_fontInfo, Metrics.getFontInfo(__classPrivateFieldGet(this, _Element_attrs, "f").type), "f");
        __classPrivateFieldSet(this, _Element_fontScale, Metrics.get(`${__classPrivateFieldGet(this, _Element_attrs, "f").type}.fontScale`), "f");
        (_b = Registry.getDefaultRegistry()) === null || _b === void 0 ? void 0 : _b.register(this);
    }
    addChildElement(child) {
        this.children.push(child);
        return this;
    }
    getCategory() {
        return __classPrivateFieldGet(this, _Element_attrs, "f").type;
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
    applyStyle(context = __classPrivateFieldGet(this, _Element_context, "f"), style = this.getStyle()) {
        if (!style)
            return this;
        if (!context)
            return this;
        context.save();
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
        return this;
    }
    restoreStyle(context = __classPrivateFieldGet(this, _Element_context, "f"), style = this.getStyle()) {
        if (!style)
            return this;
        if (!context)
            return this;
        context.restore();
        return this;
    }
    drawWithStyle() {
        this.checkContext();
        this.applyStyle();
        this.draw();
        this.restoreStyle();
    }
    draw() {
        throw new RuntimeError('Element', 'Draw not defined');
    }
    hasClass(className) {
        var _b;
        if (!__classPrivateFieldGet(this, _Element_attrs, "f").class)
            return false;
        return ((_b = __classPrivateFieldGet(this, _Element_attrs, "f").class) === null || _b === void 0 ? void 0 : _b.split(' ').indexOf(className)) !== -1;
    }
    addClass(className) {
        var _b;
        if (this.hasClass(className))
            return this;
        if (!__classPrivateFieldGet(this, _Element_attrs, "f").class)
            __classPrivateFieldGet(this, _Element_attrs, "f").class = `${className}`;
        else
            __classPrivateFieldGet(this, _Element_attrs, "f").class = `${__classPrivateFieldGet(this, _Element_attrs, "f").class} ${className}`;
        (_b = this.registry) === null || _b === void 0 ? void 0 : _b.onUpdate({
            id: __classPrivateFieldGet(this, _Element_attrs, "f").id,
            name: 'class',
            value: className,
            oldValue: undefined,
        });
        return this;
    }
    removeClass(className) {
        var _b, _c;
        if (!this.hasClass(className))
            return this;
        const arr = (_b = __classPrivateFieldGet(this, _Element_attrs, "f").class) === null || _b === void 0 ? void 0 : _b.split(' ');
        if (arr) {
            arr.splice(arr.indexOf(className));
            __classPrivateFieldGet(this, _Element_attrs, "f").class = arr.join(' ');
        }
        (_c = this.registry) === null || _c === void 0 ? void 0 : _c.onUpdate({
            id: __classPrivateFieldGet(this, _Element_attrs, "f").id,
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
        return __classPrivateFieldGet(this, _Element_attrs, "f");
    }
    getAttribute(name) {
        return __classPrivateFieldGet(this, _Element_attrs, "f")[name];
    }
    getSVGElement(suffix = '') {
        const id = prefix(__classPrivateFieldGet(this, _Element_attrs, "f").id + suffix);
        const element = document.getElementById(id);
        if (element)
            return element;
    }
    setAttribute(name, value) {
        var _b;
        const oldID = __classPrivateFieldGet(this, _Element_attrs, "f").id;
        const oldValue = __classPrivateFieldGet(this, _Element_attrs, "f")[name];
        __classPrivateFieldGet(this, _Element_attrs, "f")[name] = value;
        (_b = this.registry) === null || _b === void 0 ? void 0 : _b.onUpdate({ id: oldID, name, value, oldValue });
        return this;
    }
    getBoundingBox() {
        return new BoundingBox(0, -this.textMetrics.actualBoundingBoxAscent, this.width, this.height);
    }
    getContext() {
        return __classPrivateFieldGet(this, _Element_context, "f");
    }
    setContext(context) {
        __classPrivateFieldSet(this, _Element_context, context, "f");
        return this;
    }
    checkContext() {
        return defined(__classPrivateFieldGet(this, _Element_context, "f"), 'NoContext', 'No rendering context attached to instance.');
    }
    set font(f) {
        this.setFont(f);
    }
    get font() {
        return Font.toCSSString(__classPrivateFieldGet(this, _Element_fontInfo, "f"));
    }
    setFont(font, size, weight, style) {
        const defaultTextFont = Metrics.getFontInfo(__classPrivateFieldGet(this, _Element_attrs, "f").type);
        const fontIsObject = typeof font === 'object';
        const fontIsString = typeof font === 'string';
        const sizeWeightStyleAreUndefined = size === undefined && weight === undefined && style === undefined;
        __classPrivateFieldSet(this, _Element_metricsValid, false, "f");
        if (fontIsObject) {
            __classPrivateFieldSet(this, _Element_fontInfo, Object.assign(Object.assign({}, defaultTextFont), font), "f");
        }
        else if (fontIsString && sizeWeightStyleAreUndefined) {
            __classPrivateFieldSet(this, _Element_fontInfo, Font.fromCSSString(font), "f");
        }
        else {
            __classPrivateFieldSet(this, _Element_fontInfo, Font.validate(font !== null && font !== void 0 ? font : defaultTextFont.family, size !== null && size !== void 0 ? size : defaultTextFont.size, weight !== null && weight !== void 0 ? weight : defaultTextFont.weight, style !== null && style !== void 0 ? style : defaultTextFont.style), "f");
        }
        return this;
    }
    getFont() {
        return Font.toCSSString(__classPrivateFieldGet(this, _Element_fontInfo, "f"));
    }
    get fontInfo() {
        return __classPrivateFieldGet(this, _Element_fontInfo, "f");
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
        return __classPrivateFieldGet(this, _Element_fontScale, "f");
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
        if (!__classPrivateFieldGet(this, _Element_metricsValid, "f"))
            this.measureText();
        return __classPrivateFieldGet(this, _Element_width, "f");
    }
    setWidth(width) {
        this.width = width;
        return this;
    }
    set width(width) {
        if (!__classPrivateFieldGet(this, _Element_metricsValid, "f"))
            this.measureText();
        __classPrivateFieldSet(this, _Element_width, width, "f");
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
        __classPrivateFieldSet(this, _Element_metricsValid, false, "f");
        __classPrivateFieldSet(this, _Element_text, text, "f");
    }
    getText() {
        return __classPrivateFieldGet(this, _Element_text, "f");
    }
    get text() {
        return __classPrivateFieldGet(this, _Element_text, "f");
    }
    renderText(ctx, xPos, yPos) {
        ctx.save();
        ctx.setFont(__classPrivateFieldGet(this, _Element_fontInfo, "f"));
        ctx.fillText(__classPrivateFieldGet(this, _Element_text, "f"), xPos + this.x + this.xShift, yPos + this.y + this.yShift);
        this.children.forEach((child) => {
            ctx.setFont(__classPrivateFieldGet(child, _Element_fontInfo, "f"));
            ctx.fillText(__classPrivateFieldGet(child, _Element_text, "f"), xPos + child.x + child.xShift, yPos + child.y + child.yShift);
        });
        ctx.restore();
    }
    measureText() {
        let txtCanvas = __classPrivateFieldGet(_a, _a, "f", _Element_txtCanvas);
        if (!txtCanvas) {
            if (typeof document !== 'undefined') {
                txtCanvas = document.createElement('canvas');
            }
            else if (typeof OffscreenCanvas !== 'undefined') {
                txtCanvas = new OffscreenCanvas(300, 150);
            }
            __classPrivateFieldSet(_a, _a, txtCanvas, "f", _Element_txtCanvas);
        }
        const context = txtCanvas === null || txtCanvas === void 0 ? void 0 : txtCanvas.getContext('2d');
        if (!context) {
            console.warn('Element: No context for txtCanvas. Returning empty text metrics.');
            return __classPrivateFieldGet(this, _Element_textMetrics, "f");
        }
        context.font = Font.toCSSString(Font.validate(__classPrivateFieldGet(this, _Element_fontInfo, "f")));
        __classPrivateFieldSet(this, _Element_textMetrics, context.measureText(__classPrivateFieldGet(this, _Element_text, "f")), "f");
        __classPrivateFieldSet(this, _Element_height, __classPrivateFieldGet(this, _Element_textMetrics, "f").actualBoundingBoxAscent + __classPrivateFieldGet(this, _Element_textMetrics, "f").actualBoundingBoxDescent, "f");
        __classPrivateFieldSet(this, _Element_width, __classPrivateFieldGet(this, _Element_textMetrics, "f").width, "f");
        __classPrivateFieldSet(this, _Element_metricsValid, true, "f");
        return __classPrivateFieldGet(this, _Element_textMetrics, "f");
    }
    getTextMetrics() {
        return this.textMetrics;
    }
    get textMetrics() {
        if (!__classPrivateFieldGet(this, _Element_metricsValid, "f"))
            this.measureText();
        return __classPrivateFieldGet(this, _Element_textMetrics, "f");
    }
    getHeight() {
        return this.height;
    }
    get height() {
        if (!__classPrivateFieldGet(this, _Element_metricsValid, "f"))
            this.measureText();
        return __classPrivateFieldGet(this, _Element_height, "f");
    }
    set height(height) {
        if (!__classPrivateFieldGet(this, _Element_metricsValid, "f"))
            this.measureText();
        __classPrivateFieldSet(this, _Element_height, height, "f");
    }
    setOriginX(x) {
        const bbox = this.getBoundingBox();
        const originX = Math.abs(bbox.getX() / bbox.getW());
        const xShift = (x - originX) * bbox.getW();
        this.xShift = -xShift;
    }
    setOriginY(y) {
        const bbox = this.getBoundingBox();
        const originY = Math.abs(bbox.getY() / bbox.getH());
        const yShift = (y - originY) * bbox.getH();
        this.yShift = -yShift;
    }
    setOrigin(x, y) {
        this.setOriginX(x);
        this.setOriginY(y);
    }
}
_a = Element, _Element_context = new WeakMap(), _Element_attrs = new WeakMap(), _Element_fontInfo = new WeakMap(), _Element_fontScale = new WeakMap(), _Element_text = new WeakMap(), _Element_metricsValid = new WeakMap(), _Element_textMetrics = new WeakMap(), _Element_height = new WeakMap(), _Element_width = new WeakMap();
Element.ID = 1000;
_Element_txtCanvas = { value: void 0 };
