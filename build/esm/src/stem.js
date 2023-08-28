import { Element } from './element.js';
import { Tables } from './tables.js';
import { log, RuntimeError } from './util.js';
function L(...args) {
    if (Stem.DEBUG)
        log('Vex.Flow.Stem', args);
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
        super();
        this.stemUpYOffset = 0;
        this.stemDownYOffset = 0;
        this.stemUpYBaseOffset = 0;
        this.stemDownYBaseOffset = 0;
        this.xBegin = (options === null || options === void 0 ? void 0 : options.xBegin) || 0;
        this.xEnd = (options === null || options === void 0 ? void 0 : options.xEnd) || 0;
        this.yTop = (options === null || options === void 0 ? void 0 : options.yTop) || 0;
        this.yBottom = (options === null || options === void 0 ? void 0 : options.yBottom) || 0;
        this.stemExtension = (options === null || options === void 0 ? void 0 : options.stemExtension) || 0;
        this.stemDirection = (options === null || options === void 0 ? void 0 : options.stemDirection) || 0;
        this.hide = (options === null || options === void 0 ? void 0 : options.hide) || false;
        this.isStemlet = (options === null || options === void 0 ? void 0 : options.isStemlet) || false;
        this.stemletHeight = (options === null || options === void 0 ? void 0 : options.stemletHeight) || 0;
        this.renderHeightAdjustment = 0;
        this.setOptions(options);
    }
    setOptions(options) {
        this.stemUpYOffset = (options === null || options === void 0 ? void 0 : options.stemUpYOffset) || 0;
        this.stemDownYOffset = (options === null || options === void 0 ? void 0 : options.stemDownYOffset) || 0;
        this.stemUpYBaseOffset = (options === null || options === void 0 ? void 0 : options.stemUpYBaseOffset) || 0;
        this.stemDownYBaseOffset = (options === null || options === void 0 ? void 0 : options.stemDownYBaseOffset) || 0;
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
        this.renderHeightAdjustment = Tables.currentMusicFont().lookupMetric('stem.heightAdjustmentForFlag', -3);
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
        ctx.save();
        this.applyStyle();
        ctx.openGroup('stem', this.getAttribute('id'), { pointerBBox: true });
        ctx.beginPath();
        ctx.setLineWidth(Stem.WIDTH);
        ctx.moveTo(stemX, stemY - stemletYOffset + yBaseOffset);
        ctx.lineTo(stemX, stemY - stemHeight - this.renderHeightAdjustment * stemDirection);
        ctx.stroke();
        ctx.closeGroup();
        this.restoreStyle();
        ctx.restore();
    }
}
Stem.DEBUG = false;
