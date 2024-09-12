import { Bend } from './bend.js';
import { Modifier } from './modifier.js';
import { Tables } from './tables.js';
import { RuntimeError } from './util.js';
export class Vibrato extends Modifier {
    static get CATEGORY() {
        return "Vibrato";
    }
    static format(vibratos, state, context) {
        if (!vibratos || vibratos.length === 0)
            return false;
        let textLine = state.topTextLine;
        let width = 0;
        let shift = state.rightShift - 7;
        const bends = context.getMembers(Bend.CATEGORY);
        if (bends && bends.length > 0) {
            const bendHeight = bends.map((bb) => bb.getTextHeight()).reduce((a, b) => (a > b ? a : b)) / Tables.STAVE_LINE_DISTANCE;
            textLine = textLine - (bendHeight + 1);
        }
        else {
            state.topTextLine += 1;
        }
        for (let i = 0; i < vibratos.length; ++i) {
            const vibrato = vibratos[i];
            vibrato.setXShift(shift);
            vibrato.setTextLine(textLine);
            width += vibrato.getWidth();
            shift += width;
        }
        state.rightShift += width;
        return true;
    }
    constructor() {
        super();
        this.position = Modifier.Position.RIGHT;
        this.renderOptions = {
            code: 0xeab0,
            width: 20,
        };
        this.setVibratoWidth(this.renderOptions.width);
    }
    setVibratoWidth(width) {
        this.renderOptions.width = width;
        this.text = String.fromCodePoint(this.renderOptions.code);
        const myWidth = this.getWidth();
        if (!myWidth) {
            throw new RuntimeError('Cannot set vibrato width if width is 0');
        }
        const items = Math.round(this.renderOptions.width / myWidth);
        for (let i = 1; i < items; i++) {
            this.text += String.fromCodePoint(this.renderOptions.code);
        }
        return this;
    }
    setVibratoCode(code) {
        this.renderOptions.code = code;
        return this.setVibratoWidth(this.renderOptions.width);
    }
    draw() {
        const ctx = this.checkContext();
        const note = this.checkAttachedNote();
        this.setRendered();
        const start = note.getModifierStartXY(Modifier.Position.RIGHT, this.index);
        const vx = start.x;
        const vy = note.getYForTopText(this.textLine) + 5;
        this.renderText(ctx, vx, vy);
    }
}
