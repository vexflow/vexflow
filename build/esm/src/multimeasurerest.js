import { Element } from './element.js';
import { Glyphs } from './glyphs.js';
import { Metrics } from './metrics.js';
import { StaveModifierPosition } from './stavemodifier.js';
import { Tables } from './tables.js';
import { isBarline } from './typeguard.js';
import { defined, RuntimeError } from './util.js';
export class MultiMeasureRest extends Element {
    static get CATEGORY() {
        return "MultiMeasureRest";
    }
    constructor(numberOfMeasures, options) {
        var _a;
        super();
        this.xs = { left: NaN, right: NaN };
        this.hasPaddingLeft = false;
        this.hasPaddingRight = false;
        this.hasLineThickness = false;
        this.hasSymbolSpacing = false;
        const fontSize = (_a = options.numberGlyphPoint) !== null && _a !== void 0 ? _a : Metrics.get('MultiMeasureRest.fontSize');
        this.fontInfo.size = fontSize;
        this.numberOfMeasures = numberOfMeasures;
        this.text = '';
        const t = `${this.numberOfMeasures}`;
        for (const digit of t) {
            this.text += String.fromCodePoint(0xe080 + Number(digit));
        }
        this.hasPaddingLeft = typeof options.paddingLeft === 'number';
        this.hasPaddingRight = typeof options.paddingRight === 'number';
        this.hasLineThickness = typeof options.lineThickness === 'number';
        this.hasSymbolSpacing = typeof options.symbolSpacing === 'number';
        this.renderOptions = Object.assign({ useSymbols: false, showNumber: true, numberLine: -0.5, numberGlyphPoint: fontSize, line: 2, spacingBetweenLinesPx: Tables.STAVE_LINE_DISTANCE, serifThickness: 2, semibreveRestGlyphScale: Metrics.get('fontSize'), paddingLeft: 0, paddingRight: 0, lineThickness: 5, symbolSpacing: 0 }, options);
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
    drawLine(stave, ctx, left, right) {
        const options = this.renderOptions;
        const y = stave.getYForLine(options.line);
        const padding = (right - left) * 0.1;
        left += padding;
        right -= padding;
        let txt = '\ue4ef';
        const el = new Element();
        el.setText(txt);
        const elWidth = el.getWidth();
        if (!elWidth) {
            throw new RuntimeError('Cannot drawLine if width is 0');
        }
        for (let i = 1; (i + 2) * elWidth + left <= right; i++) {
            txt += '\ue4f0';
        }
        txt += '\ue4f1';
        el.setText(txt);
        el.renderText(ctx, left + (right - left) * 0.5 - el.getWidth() * 0.5, y);
    }
    drawSymbols(stave, ctx, left, right) {
        const n4 = Math.floor(this.numberOfMeasures / 4);
        const n = this.numberOfMeasures % 4;
        const n2 = Math.floor(n / 2);
        const n1 = n % 2;
        const options = this.renderOptions;
        const elMiddle = new Element();
        let txt = '';
        for (let i = 0; i < n4; ++i) {
            txt += Glyphs.restLonga + ' ';
        }
        for (let i = 0; i < n2; ++i) {
            txt += Glyphs.restDoubleWhole + ' ';
        }
        elMiddle.setText(txt);
        const elTop = new Element();
        txt = '';
        for (let i = 0; i < n1; ++i) {
            txt += Glyphs.restWhole + ' ';
        }
        elTop.setText(txt);
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
        if (this.hasPaddingLeft) {
            left = stave.getX() + options.paddingLeft;
        }
        if (this.hasPaddingRight) {
            right = stave.getX() + stave.getWidth() - options.paddingRight;
        }
        this.xs.left = left;
        this.xs.right = right;
        if (options.useSymbols) {
            this.drawSymbols(stave, ctx, left, right);
        }
        else {
            this.drawLine(stave, ctx, left, right);
        }
        if (options.showNumber) {
            this.renderText(ctx, left + (right - left) * 0.5 - this.width * 0.5, stave.getYForLine(options.numberLine) - this.height * 0.5);
        }
    }
}
