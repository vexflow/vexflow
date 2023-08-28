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
var _GlyphOutline_i, _GlyphOutline_outline, _GlyphOutline_originX, _GlyphOutline_originY, _GlyphOutline_scale, _GlyphOutline_precision;
import { BoundingBox } from './boundingbox.js';
import { BoundingBoxComputation } from './boundingboxcomputation.js';
import { Element } from './element.js';
import { Tables } from './tables.js';
import { defined, RuntimeError } from './util.js';
class GlyphCacheEntry {
    constructor(fontStack, code, category) {
        this.point = -1;
        this.metrics = Glyph.loadMetrics(fontStack, code, category);
        this.bbox = Glyph.getOutlineBoundingBox(this.metrics.outline, this.metrics.scale, this.metrics.xShift, this.metrics.yShift);
        if (category) {
            this.point = Glyph.lookupFontMetric(this.metrics.font, category, code, 'point', -1);
        }
    }
}
class GlyphCache {
    constructor() {
        this.cache = new Map();
    }
    lookup(code, category) {
        let entries = this.cache.get(Glyph.CURRENT_CACHE_KEY);
        if (entries === undefined) {
            entries = {};
            this.cache.set(Glyph.CURRENT_CACHE_KEY, entries);
        }
        const key = category ? `${code}%${category}` : code;
        let entry = entries[key];
        if (entry === undefined) {
            entry = new GlyphCacheEntry(Glyph.MUSIC_FONT_STACK, code, category);
            entries[key] = entry;
        }
        return entry;
    }
}
class GlyphOutline {
    constructor(outline, originX, originY, scale) {
        _GlyphOutline_i.set(this, 0);
        _GlyphOutline_outline.set(this, void 0);
        _GlyphOutline_originX.set(this, void 0);
        _GlyphOutline_originY.set(this, void 0);
        _GlyphOutline_scale.set(this, void 0);
        _GlyphOutline_precision.set(this, 1);
        __classPrivateFieldSet(this, _GlyphOutline_outline, outline, "f");
        __classPrivateFieldSet(this, _GlyphOutline_originX, originX, "f");
        __classPrivateFieldSet(this, _GlyphOutline_originY, originY, "f");
        __classPrivateFieldSet(this, _GlyphOutline_scale, scale, "f");
        __classPrivateFieldSet(this, _GlyphOutline_precision, Math.pow(10, Tables.RENDER_PRECISION_PLACES), "f");
    }
    done() {
        return __classPrivateFieldGet(this, _GlyphOutline_i, "f") >= __classPrivateFieldGet(this, _GlyphOutline_outline, "f").length;
    }
    next() {
        var _a, _b;
        return Math.round((__classPrivateFieldGet(this, _GlyphOutline_outline, "f")[__classPrivateFieldSet(this, _GlyphOutline_i, (_b = __classPrivateFieldGet(this, _GlyphOutline_i, "f"), _a = _b++, _b), "f"), _a] * __classPrivateFieldGet(this, _GlyphOutline_precision, "f")) / __classPrivateFieldGet(this, _GlyphOutline_precision, "f"));
    }
    nextX() {
        var _a, _b;
        return Math.round((__classPrivateFieldGet(this, _GlyphOutline_originX, "f") + __classPrivateFieldGet(this, _GlyphOutline_outline, "f")[__classPrivateFieldSet(this, _GlyphOutline_i, (_b = __classPrivateFieldGet(this, _GlyphOutline_i, "f"), _a = _b++, _b), "f"), _a] * __classPrivateFieldGet(this, _GlyphOutline_scale, "f")) * __classPrivateFieldGet(this, _GlyphOutline_precision, "f")) / __classPrivateFieldGet(this, _GlyphOutline_precision, "f");
    }
    nextY() {
        var _a, _b;
        return Math.round((__classPrivateFieldGet(this, _GlyphOutline_originY, "f") - __classPrivateFieldGet(this, _GlyphOutline_outline, "f")[__classPrivateFieldSet(this, _GlyphOutline_i, (_b = __classPrivateFieldGet(this, _GlyphOutline_i, "f"), _a = _b++, _b), "f"), _a] * __classPrivateFieldGet(this, _GlyphOutline_scale, "f")) * __classPrivateFieldGet(this, _GlyphOutline_precision, "f")) / __classPrivateFieldGet(this, _GlyphOutline_precision, "f");
    }
    static parse(str) {
        const result = [];
        const parts = str.split(' ');
        let i = 0;
        while (i < parts.length) {
            switch (parts[i++]) {
                case 'm':
                    result.push(0, parseInt(parts[i++]), parseInt(parts[i++]));
                    break;
                case 'l':
                    result.push(1, parseInt(parts[i++]), parseInt(parts[i++]));
                    break;
                case 'q':
                    result.push(2, parseInt(parts[i++]), parseInt(parts[i++]), parseInt(parts[i++]), parseInt(parts[i++]));
                    break;
                case 'b':
                    result.push(3, parseInt(parts[i++]), parseInt(parts[i++]), parseInt(parts[i++]), parseInt(parts[i++]), parseInt(parts[i++]), parseInt(parts[i++]));
                    break;
            }
        }
        return result;
    }
}
_GlyphOutline_i = new WeakMap(), _GlyphOutline_outline = new WeakMap(), _GlyphOutline_originX = new WeakMap(), _GlyphOutline_originY = new WeakMap(), _GlyphOutline_scale = new WeakMap(), _GlyphOutline_precision = new WeakMap();
export class Glyph extends Element {
    static get CATEGORY() {
        return "Glyph";
    }
    static lookupFontMetric(font, category, code, key, defaultValue) {
        let value = font.lookupMetric(`glyphs.${category}.${code}.${key}`, undefined);
        if (value === undefined) {
            value = font.lookupMetric(`glyphs.${category}.${key}`, defaultValue);
        }
        return value;
    }
    static lookupGlyph(fontStack, code) {
        defined(fontStack, 'BadFontStack', 'Font stack is misconfigured');
        let glyph;
        let font;
        if (fontStack[0].getName() == 'MuseJazz')
            code = 'timeSigMinus';
        for (let i = 0; i < fontStack.length; i++) {
            font = fontStack[i];
            glyph = font.getGlyphs()[code];
            if (glyph)
                return { glyph, font };
        }
        throw new RuntimeError('BadGlyph', `Glyph ${code} does not exist in font.`);
    }
    static loadMetrics(fontStack, code, category) {
        const { glyph, font } = Glyph.lookupGlyph(fontStack, code);
        if (!glyph.o)
            throw new RuntimeError('BadGlyph', `Glyph ${code} has no outline defined.`);
        let xShift = 0;
        let yShift = 0;
        let scale = 1;
        if (category && font) {
            xShift = Glyph.lookupFontMetric(font, category, code, 'shiftX', 0);
            yShift = Glyph.lookupFontMetric(font, category, code, 'shiftY', 0);
            scale = Glyph.lookupFontMetric(font, category, code, 'scale', 1);
        }
        const xMin = glyph.xMin;
        const xMax = glyph.xMax;
        const ha = glyph.ha;
        if (!glyph.cachedOutline) {
            glyph.cachedOutline = GlyphOutline.parse(glyph.o);
        }
        return {
            xMin,
            xMax,
            xShift,
            yShift,
            scale,
            ha,
            outline: glyph.cachedOutline,
            font,
            width: xMax - xMin,
            height: ha,
        };
    }
    static renderGlyph(ctx, xPos, yPos, point, code, options) {
        var _a;
        const data = Glyph.cache.lookup(code, options === null || options === void 0 ? void 0 : options.category);
        const metrics = data.metrics;
        if (data.point != -1) {
            point = data.point;
        }
        const customScale = (_a = options === null || options === void 0 ? void 0 : options.scale) !== null && _a !== void 0 ? _a : 1;
        const scale = ((point * 72.0) / (metrics.font.getResolution() * 100.0)) * metrics.scale * customScale;
        Glyph.renderOutline(ctx, metrics.outline, scale, xPos + metrics.xShift * customScale, yPos + metrics.yShift * customScale);
        return metrics;
    }
    static renderOutline(ctx, outline, scale, xPos, yPos) {
        const go = new GlyphOutline(outline, xPos, yPos, scale);
        ctx.beginPath();
        let x, y;
        while (!go.done()) {
            switch (go.next()) {
                case 0:
                    ctx.moveTo(go.nextX(), go.nextY());
                    break;
                case 1:
                    ctx.lineTo(go.nextX(), go.nextY());
                    break;
                case 2:
                    x = go.nextX();
                    y = go.nextY();
                    ctx.quadraticCurveTo(go.nextX(), go.nextY(), x, y);
                    break;
                case 3:
                    x = go.nextX();
                    y = go.nextY();
                    ctx.bezierCurveTo(go.nextX(), go.nextY(), go.nextX(), go.nextY(), x, y);
                    break;
            }
        }
        ctx.fill();
    }
    static getOutlineBoundingBox(outline, scale, xPos, yPos) {
        const go = new GlyphOutline(outline, xPos, yPos, scale);
        const bboxComp = new BoundingBoxComputation();
        let penX = xPos;
        let penY = yPos;
        let x, y;
        while (!go.done()) {
            switch (go.next()) {
                case 0:
                    penX = go.nextX();
                    penY = go.nextY();
                    break;
                case 1:
                    bboxComp.addPoint(penX, penY);
                    penX = go.nextX();
                    penY = go.nextY();
                    bboxComp.addPoint(penX, penY);
                    break;
                case 2:
                    x = go.nextX();
                    y = go.nextY();
                    bboxComp.addQuadraticCurve(penX, penY, go.nextX(), go.nextY(), x, y);
                    penX = x;
                    penY = y;
                    break;
                case 3:
                    x = go.nextX();
                    y = go.nextY();
                    bboxComp.addBezierCurve(penX, penY, go.nextX(), go.nextY(), go.nextX(), go.nextY(), x, y);
                    penX = x;
                    penY = y;
                    break;
            }
        }
        return new BoundingBox(bboxComp.getX1(), bboxComp.getY1(), bboxComp.width(), bboxComp.height());
    }
    static getWidth(code, point, category) {
        const data = Glyph.cache.lookup(code, category);
        if (data.point != -1) {
            point = data.point;
        }
        const scale = (point * 72) / (data.metrics.font.getResolution() * 100);
        return data.bbox.getW() * scale;
    }
    constructor(code, point, options) {
        super();
        this.bbox = new BoundingBox(0, 0, 0, 0);
        this.topGlyphs = [];
        this.botGlyphs = [];
        this.options = {};
        this.scale = 1;
        this.code = code;
        this.point = point;
        this.originShift = { x: 0, y: 0 };
        this.xShift = 0;
        this.yShift = 0;
        if (options) {
            this.setOptions(options);
        }
        else {
            this.reset();
        }
    }
    draw(...args) {
    }
    getCode() {
        return this.code;
    }
    setOptions(options) {
        this.options = Object.assign(Object.assign({}, this.options), options);
        this.reset();
    }
    setPoint(point) {
        this.point = point;
        return this;
    }
    setStave(stave) {
        this.stave = stave;
        return this;
    }
    getXShift() {
        return this.xShift;
    }
    setXShift(xShift) {
        this.xShift = xShift;
        return this;
    }
    getYshift() {
        return this.yShift;
    }
    setYShift(yShift) {
        this.yShift = yShift;
        return this;
    }
    reset() {
        const data = Glyph.cache.lookup(this.code, this.options.category);
        this.metrics = data.metrics;
        if (data.point != -1) {
            this.point = data.point;
        }
        this.scale = (this.point * 72) / (this.metrics.font.getResolution() * 100);
        this.bbox = new BoundingBox(data.bbox.getX() * this.scale, data.bbox.getY() * this.scale, data.bbox.getW() * this.scale, data.bbox.getH() * this.scale);
    }
    checkMetrics() {
        return defined(this.metrics, 'BadGlyph', `Glyph ${this.code} is not initialized.`);
    }
    getMetrics() {
        const metrics = this.checkMetrics();
        const metricsScale = metrics.scale;
        return {
            xMin: metrics.xMin * this.scale * metricsScale,
            xMax: metrics.xMax * this.scale * metricsScale,
            width: this.bbox.getW(),
            height: this.bbox.getH(),
            scale: this.scale * metricsScale,
            xShift: metrics.xShift,
            yShift: metrics.yShift,
            outline: metrics.outline,
            font: metrics.font,
            ha: metrics.ha,
        };
    }
    setOriginX(x) {
        const { bbox } = this;
        const originX = Math.abs(bbox.getX() / bbox.getW());
        const xShift = (x - originX) * bbox.getW();
        this.originShift.x = -xShift;
    }
    setOriginY(y) {
        const { bbox } = this;
        const originY = Math.abs(bbox.getY() / bbox.getH());
        const yShift = (y - originY) * bbox.getH();
        this.originShift.y = -yShift;
    }
    setOrigin(x, y) {
        this.setOriginX(x);
        this.setOriginY(y);
    }
    render(ctx, x, y) {
        const metrics = this.checkMetrics();
        const outline = metrics.outline;
        const scale = this.scale * metrics.scale;
        this.setRendered();
        this.applyStyle(ctx);
        const xPos = x + this.originShift.x + metrics.xShift;
        const yPos = y + this.originShift.y + metrics.yShift;
        Glyph.renderOutline(ctx, outline, scale, xPos, yPos);
        this.restoreStyle(ctx);
    }
    checkStave() {
        return defined(this.stave, 'NoStave', 'No stave attached to instance.');
    }
    renderToStave(x) {
        const context = this.checkContext();
        const metrics = this.checkMetrics();
        const stave = this.checkStave();
        const outline = metrics.outline;
        const scale = this.scale * metrics.scale;
        this.setRendered();
        this.applyStyle();
        const xPos = x + this.xShift + metrics.xShift;
        const yPos = stave.getYForGlyphs() + this.yShift + metrics.yShift;
        Glyph.renderOutline(context, outline, scale, xPos, yPos);
        this.restoreStyle();
    }
}
Glyph.cache = new GlyphCache();
Glyph.CURRENT_CACHE_KEY = '';
Glyph.MUSIC_FONT_STACK = [];
