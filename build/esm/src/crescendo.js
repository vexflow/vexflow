import { Note } from './note.js';
import { TickContext } from './tickcontext.js';
import { log } from './util.js';
function L(...args) {
    if (Crescendo.DEBUG)
        log('VexFlow.Crescendo', args);
}
function renderHairpin(ctx, params) {
    const beginX = params.beginX;
    const endX = params.endX;
    const y = params.y;
    const halfHeight = params.height / 2;
    ctx.beginPath();
    if (params.reverse) {
        ctx.moveTo(beginX, y - halfHeight);
        ctx.lineTo(endX, y);
        ctx.lineTo(beginX, y + halfHeight);
    }
    else {
        ctx.moveTo(endX, y - halfHeight);
        ctx.lineTo(beginX, y);
        ctx.lineTo(endX, y + halfHeight);
    }
    ctx.stroke();
    ctx.closePath();
}
export class Crescendo extends Note {
    static get CATEGORY() {
        return "Crescendo";
    }
    constructor(noteStruct) {
        var _a;
        super(noteStruct);
        this.options = {
            extendLeft: 0,
            extendRight: 0,
            yShift: 0,
        };
        this.decrescendo = false;
        this.line = (_a = noteStruct.line) !== null && _a !== void 0 ? _a : 0;
        this.height = 15;
    }
    setLine(line) {
        this.line = line;
        return this;
    }
    setHeight(height) {
        this.height = height;
        return this;
    }
    setDecrescendo(decresc) {
        this.decrescendo = decresc;
        return this;
    }
    preFormat() {
        this.preFormatted = true;
        return this;
    }
    draw() {
        const ctx = this.checkContext();
        const stave = this.checkStave();
        this.setRendered();
        const tickContext = this.getTickContext();
        const nextContext = TickContext.getNextContext(tickContext);
        const beginX = this.getAbsoluteX();
        const endX = nextContext ? nextContext.getX() : stave.getX() + stave.getWidth();
        const y = stave.getYForLine(this.line + -3) + 1;
        L('Drawing ', this.decrescendo ? 'decrescendo ' : 'crescendo ', this.height, 'x', beginX - endX);
        renderHairpin(ctx, {
            beginX: beginX - this.options.extendLeft,
            endX: endX + this.options.extendRight,
            y: y + this.options.yShift,
            height: this.height,
            reverse: this.decrescendo,
        });
    }
}
Crescendo.DEBUG = false;
