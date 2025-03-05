import { Element } from './element.js';
import { Metrics } from './metrics.js';
import { Tables } from './tables.js';
import { log, RuntimeError } from './util.js';
function L(...args) {
    if (Stem.DEBUG)
        log('VexFlow.Stem', args);
}
export class Stem extends Element {
    static get CATEGORY() {
        return "Stem";
    }
    static get UP() {
        return 1;
    }
    static get DOWN() {
        return -1;
    }
    static get WIDTH() {
        return Tables.STEM_WIDTH;
    }
    static get HEIGHT() {
        return Tables.STEM_HEIGHT;
    }
    constructor(options) {
        var _a, _b, _c, _d, _e, _f, _g;
        super();
        this.stemUpYOffset = 0;
        this.stemDownYOffset = 0;
        this.stemUpYBaseOffset = 0;
        this.stemDownYBaseOffset = 0;
        this.xBegin = (_a = options === null || options === void 0 ? void 0 : options.xBegin) !== null && _a !== void 0 ? _a : 0;
        this.xEnd = (_b = options === null || options === void 0 ? void 0 : options.xEnd) !== null && _b !== void 0 ? _b : 0;
        this.yTop = (_c = options === null || options === void 0 ? void 0 : options.yTop) !== null && _c !== void 0 ? _c : 0;
        this.yBottom = (_d = options === null || options === void 0 ? void 0 : options.yBottom) !== null && _d !== void 0 ? _d : 0;
        this.stemExtension = (_e = options === null || options === void 0 ? void 0 : options.stemExtension) !== null && _e !== void 0 ? _e : 0;
        this.stemDirection = (_f = options === null || options === void 0 ? void 0 : options.stemDirection) !== null && _f !== void 0 ? _f : 0;
        this.hide = (options === null || options === void 0 ? void 0 : options.hide) || false;
        this.isStemlet = (options === null || options === void 0 ? void 0 : options.isStemlet) || false;
        this.stemletHeight = (_g = options === null || options === void 0 ? void 0 : options.stemletHeight) !== null && _g !== void 0 ? _g : 0;
        this.renderHeightAdjustment = 0;
        this.setOptions(options);
    }
    setOptions(options) {
        var _a, _b, _c, _d;
        this.stemUpYOffset = (_a = options === null || options === void 0 ? void 0 : options.stemUpYOffset) !== null && _a !== void 0 ? _a : 0;
        this.stemDownYOffset = (_b = options === null || options === void 0 ? void 0 : options.stemDownYOffset) !== null && _b !== void 0 ? _b : 0;
        this.stemUpYBaseOffset = (_c = options === null || options === void 0 ? void 0 : options.stemUpYBaseOffset) !== null && _c !== void 0 ? _c : 0;
        this.stemDownYBaseOffset = (_d = options === null || options === void 0 ? void 0 : options.stemDownYBaseOffset) !== null && _d !== void 0 ? _d : 0;
    }
    setNoteHeadXBounds(xBegin, xEnd) {
        this.xBegin = xBegin;
        this.xEnd = xEnd;
        return this;
    }
    setDirection(direction) {
        this.stemDirection = direction;
    }
    setExtension(ext) {
        this.stemExtension = ext;
    }
    getExtension() {
        return this.stemExtension;
    }
    setYBounds(yTop, yBottom) {
        this.yTop = yTop;
        this.yBottom = yBottom;
    }
    getHeight() {
        const yOffset = this.stemDirection === Stem.UP ? this.stemUpYOffset : this.stemDownYOffset;
        const unsignedHeight = this.yBottom - this.yTop + (Stem.HEIGHT - yOffset + this.stemExtension);
        return unsignedHeight * this.stemDirection;
    }
    getBoundingBox() {
        throw new RuntimeError('NotImplemented', 'getBoundingBox() not implemented.');
    }
    getExtents() {
        const isStemUp = this.stemDirection === Stem.UP;
        const ys = [this.yTop, this.yBottom];
        const stemHeight = Stem.HEIGHT + this.stemExtension;
        const innerMostNoteheadY = (isStemUp ? Math.min : Math.max)(...ys);
        const outerMostNoteheadY = (isStemUp ? Math.max : Math.min)(...ys);
        const stemTipY = innerMostNoteheadY + stemHeight * -this.stemDirection;
        return { topY: stemTipY, baseY: outerMostNoteheadY };
    }
    setVisibility(isVisible) {
        this.hide = !isVisible;
        return this;
    }
    setStemlet(isStemlet, stemletHeight) {
        this.isStemlet = isStemlet;
        this.stemletHeight = stemletHeight;
        return this;
    }
    adjustHeightForFlag() {
        this.renderHeightAdjustment = Metrics.get('Stem.heightAdjustmentForFlag', -3);
    }
    adjustHeightForBeam() {
        this.renderHeightAdjustment = -Stem.WIDTH / 2;
    }
    draw() {
        this.setRendered();
        if (this.hide)
            return;
        const ctx = this.checkContext();
        let stemX;
        let stemY;
        const stemDirection = this.stemDirection;
        let yBaseOffset = 0;
        if (stemDirection === Stem.DOWN) {
            stemX = this.xBegin;
            stemY = this.yTop + this.stemDownYOffset;
            yBaseOffset = this.stemDownYBaseOffset;
        }
        else {
            stemX = this.xEnd;
            stemY = this.yBottom - this.stemUpYOffset;
            yBaseOffset = this.stemUpYBaseOffset;
        }
        const stemHeight = this.getHeight();
        L('Rendering stem - ', 'Top Y: ', this.yTop, 'Bottom Y: ', this.yBottom);
        const stemletYOffset = this.isStemlet ? stemHeight - this.stemletHeight * this.stemDirection : 0;
        ctx.openGroup('stem', this.getAttribute('id'));
        ctx.beginPath();
        ctx.setLineWidth(Stem.WIDTH);
        ctx.moveTo(stemX, stemY - stemletYOffset + yBaseOffset);
        ctx.lineTo(stemX, stemY - stemHeight - this.renderHeightAdjustment * stemDirection);
        ctx.stroke();
        ctx.closeGroup();
    }
}
Stem.DEBUG = false;
