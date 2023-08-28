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
var _MultiMeasureRest_hasPaddingLeft, _MultiMeasureRest_hasPaddingRight, _MultiMeasureRest_hasLineThickness, _MultiMeasureRest_hasSymbolSpacing;
import { Element } from './element.js';
import { StaveModifierPosition } from './stavemodifier.js';
import { Tables } from './tables.js';
import { isBarline } from './typeguard.js';
import { defined } from './util.js';
export class MultiMeasureRest extends Element {
    static get CATEGORY() {
        return "MultiMeasureRest";
    }
    constructor(numberOfMeasures, options) {
        var _a;
        super();
        this.xs = { left: NaN, right: NaN };
        _MultiMeasureRest_hasPaddingLeft.set(this, false);
        _MultiMeasureRest_hasPaddingRight.set(this, false);
        _MultiMeasureRest_hasLineThickness.set(this, false);
        _MultiMeasureRest_hasSymbolSpacing.set(this, false);
        const fontSize = (_a = options.numberGlyphPoint) !== null && _a !== void 0 ? _a : Tables.lookupMetric('MultiMeasureRest.fontSize');
        this.textFont.size = fontSize;
        this.numberOfMeasures = numberOfMeasures;
        this.text = '';
        const t = `${this.numberOfMeasures}`;
        for (const digit of t) {
            this.text += String.fromCodePoint(0xe080 + Number(digit));
        }
        this.measureText();
        __classPrivateFieldSet(this, _MultiMeasureRest_hasPaddingLeft, typeof options.paddingLeft === 'number', "f");
        __classPrivateFieldSet(this, _MultiMeasureRest_hasPaddingRight, typeof options.paddingRight === 'number', "f");
        __classPrivateFieldSet(this, _MultiMeasureRest_hasLineThickness, typeof options.lineThickness === 'number', "f");
        __classPrivateFieldSet(this, _MultiMeasureRest_hasSymbolSpacing, typeof options.symbolSpacing === 'number', "f");
        this.renderOptions = Object.assign({ useSymbols: false, showNumber: true, numberLine: -0.5, numberGlyphPoint: fontSize, line: 2, spacingBetweenLinesPx: Tables.STAVE_LINE_DISTANCE, serifThickness: 2, semibreveRestGlyphScale: Tables.lookupMetric('fontSize'), paddingLeft: 0, paddingRight: 0, lineThickness: 5, symbolSpacing: 0 }, options);
    }
    getXs() {
        return this.xs;
    }
    setStave(stave) {
        this.stave = stave;
        return this;
    }
    getStave() {
        return this.stave;
    }
    checkStave() {
        return defined(this.stave, 'NoStave', 'No stave attached to instance.');
    }
    drawLine(stave, ctx, left, right, spacingBetweenLines) {
        const options = this.renderOptions;
        const y = stave.getYForLine(options.line);
        const padding = (right - left) * 0.1;
        left += padding;
        right -= padding;
        let txt = '\ue4ef';
        const el = new Element();
        el.setText(txt);
        el.measureText();
        for (let i = 1; (i + 2) * el.getWidth() + left <= right; i++) {
            txt += '\ue4f0';
        }
        txt += '\ue4f1';
        el.setText(txt);
        el.measureText();
        el.renderText(ctx, left + (right - left) * 0.5 - el.getWidth() * 0.5, y);
    }
    drawSymbols(stave, ctx, left, right, spacingBetweenLines) {
        const n4 = Math.floor(this.numberOfMeasures / 4);
        const n = this.numberOfMeasures % 4;
        const n2 = Math.floor(n / 2);
        const n1 = n % 2;
        const options = this.renderOptions;
        const elMiddle = new Element();
        let txt = '';
        for (let i = 0; i < n4; ++i) {
            txt += '\ue4e1' + ' ';
        }
        for (let i = 0; i < n2; ++i) {
            txt += '\ue4e2' + ' ';
        }
        elMiddle.setText(txt);
        elMiddle.measureText();
        const elTop = new Element();
        txt = '';
        for (let i = 0; i < n1; ++i) {
            txt += '\ue4e3' + ' ';
        }
        elTop.setText(txt);
        elTop.measureText();
        const width = elMiddle.getWidth() + elTop.getWidth();
        let x = left + (right - left) * 0.5 - width * 0.5;
        const line = options.line;
        const yTop = stave.getYForLine(line - 1);
        const yMiddle = stave.getYForLine(line);
        elMiddle.renderText(ctx, x, yMiddle);
        x += elMiddle.getWidth();
        elTop.renderText(ctx, x, yTop);
        x += elTop.getWidth();
    }
    draw() {
        const ctx = this.checkContext();
        this.setRendered();
        const stave = this.checkStave();
        let left = stave.getNoteStartX();
        let right = stave.getNoteEndX();
        const begModifiers = stave.getModifiers(StaveModifierPosition.BEGIN);
        if (begModifiers.length === 1 && isBarline(begModifiers[0])) {
            left -= begModifiers[0].getWidth();
        }
        const options = this.renderOptions;
        if (__classPrivateFieldGet(this, _MultiMeasureRest_hasPaddingLeft, "f")) {
            left = stave.getX() + options.paddingLeft;
        }
        if (__classPrivateFieldGet(this, _MultiMeasureRest_hasPaddingRight, "f")) {
            right = stave.getX() + stave.getWidth() - options.paddingRight;
        }
        this.xs.left = left;
        this.xs.right = right;
        const spacingBetweenLines = options.spacingBetweenLinesPx;
        if (options.useSymbols) {
            this.drawSymbols(stave, ctx, left, right, spacingBetweenLines);
        }
        else {
            this.drawLine(stave, ctx, left, right, spacingBetweenLines);
        }
        if (options.showNumber) {
            this.renderText(ctx, left + (right - left) * 0.5 - this.width * 0.5, stave.getYForLine(options.numberLine) - this.height * 0.5);
        }
    }
}
_MultiMeasureRest_hasPaddingLeft = new WeakMap(), _MultiMeasureRest_hasPaddingRight = new WeakMap(), _MultiMeasureRest_hasLineThickness = new WeakMap(), _MultiMeasureRest_hasSymbolSpacing = new WeakMap();
