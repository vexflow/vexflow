import { Note } from './note.js';
import { TimeSignature } from './timesignature.js';
export class TimeSigNote extends Note {
    static get CATEGORY() {
        return "TimeSigNote";
    }
    constructor(timeSpec, customPadding) {
        super({ duration: 'b' });
        this.timeSig = new TimeSignature(timeSpec, customPadding);
        this.setWidth(this.timeSig.getWidth());
        this.ignoreTicks = true;
    }
    addToModifierContext(mc) {
        return this;
    }
    preFormat() {
        this.preFormatted = true;
        return this;
    }
    draw() {
        const stave = this.checkStave();
        const ctx = this.checkContext();
        this.setRendered();
        ctx.openGroup('timesignote', this.getAttribute('id'));
        this.timeSig.drawAt(ctx, stave, this.getAbsoluteX());
        ctx.closeGroup();
    }
}
