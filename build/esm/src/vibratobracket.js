import { Element } from './element.js';
import { log } from './util.js';
import { Vibrato } from './vibrato.js';
function L(...args) {
    if (VibratoBracket.DEBUG)
        log('VexFlow.VibratoBracket', args);
}
export class VibratoBracket extends Element {
    static get CATEGORY() {
        return "VibratoBracket";
    }
    constructor(bracketData) {
        super();
        this.vibrato = new Vibrato();
        if (bracketData.start)
            this.start = bracketData.start;
        if (bracketData.stop)
            this.stop = bracketData.stop;
        this.line = 1;
    }
    setLine(line) {
        this.line = line;
        return this;
    }
    setVibratoCode(code) {
        this.vibrato.setVibratoCode(code);
        return this;
    }
    draw() {
        const ctx = this.checkContext();
        this.setRendered();
        const y = (this.start && this.start.checkStave().getYForTopText(this.line)) ||
            (this.stop && this.stop.checkStave().getYForTopText(this.line)) ||
            0;
        const startX = (this.start && this.start.getAbsoluteX()) || (this.stop && this.stop.checkStave().getTieStartX()) || 0;
        const stopX = (this.stop && this.stop.getAbsoluteX() - this.stop.getWidth() - 5) ||
            (this.start && this.start.checkStave().getTieEndX() - 10) ||
            0;
        this.vibrato.setVibratoWidth(stopX - startX);
        L('Rendering VibratoBracket: startX:', startX, 'stopX:', stopX, 'y:', y);
        this.vibrato.renderText(ctx, startX, y);
    }
}
VibratoBracket.DEBUG = false;
