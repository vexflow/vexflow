import { Element } from './element.js';
import { Modifier } from './modifier.js';
import { RuntimeError } from './util.js';
export class StaveHairpin extends Element {
    static get CATEGORY() {
        return "StaveHairpin";
    }
    static FormatByTicksAndDraw(ctx, formatter, notes, type, position, options) {
        var _a, _b;
        const ppt = formatter.pixelsPerTick;
        if (ppt === null) {
            throw new RuntimeError('BadArguments', 'A valid Formatter must be provide to draw offsets by ticks.');
        }
        const leftShiftPx = ppt * ((_a = options.leftShiftTicks) !== null && _a !== void 0 ? _a : 0);
        const rightShiftPx = ppt * ((_b = options.rightShiftTicks) !== null && _b !== void 0 ? _b : 0);
        const hairpinOptions = {
            height: options.height,
            yShift: options.yShift,
            leftShiftPx,
            rightShiftPx,
            rightShiftTicks: 0,
            leftShiftTicks: 0,
        };
        new StaveHairpin({
            firstNote: notes.firstNote,
            lastNote: notes.lastNote,
        }, type)
            .setContext(ctx)
            .setRenderOptions(hairpinOptions)
            .setPosition(position)
            .drawWithStyle();
    }
    constructor(notes, type) {
        super();
        this.setNotes(notes);
        this.hairpin = type;
        this.position = Modifier.Position.BELOW;
        this.renderOptions = {
            height: 10,
            yShift: 0,
            leftShiftPx: 0,
            rightShiftPx: 0,
            rightShiftTicks: 0,
            leftShiftTicks: 0,
        };
    }
    setPosition(position) {
        if (position === Modifier.Position.ABOVE || position === Modifier.Position.BELOW) {
            this.position = position;
        }
        return this;
    }
    setRenderOptions(options) {
        this.renderOptions = options;
        return this;
    }
    setNotes(notes) {
        if (!notes.firstNote && !notes.lastNote) {
            throw new RuntimeError('BadArguments', 'Hairpin needs to have either firstNote or lastNote set.');
        }
        this.notes = notes;
        this.firstNote = notes.firstNote;
        this.lastNote = notes.lastNote;
        return this;
    }
    renderHairpin(params) {
        const ctx = this.checkContext();
        let dis = this.renderOptions.yShift + 20;
        let yShift = params.firstY;
        if (this.position === Modifier.Position.ABOVE) {
            dis = -dis + 30;
            yShift = params.firstY - params.staffHeight;
        }
        const leftShiftPx = this.renderOptions.leftShiftPx;
        const rightShiftPx = this.renderOptions.rightShiftPx;
        ctx.beginPath();
        switch (this.hairpin) {
            case StaveHairpin.type.CRESC:
                ctx.moveTo(params.lastX + rightShiftPx, yShift + dis);
                ctx.lineTo(params.firstX + leftShiftPx, yShift + this.renderOptions.height / 2 + dis);
                ctx.lineTo(params.lastX + rightShiftPx, yShift + this.renderOptions.height + dis);
                break;
            case StaveHairpin.type.DECRESC:
                ctx.moveTo(params.firstX + leftShiftPx, yShift + dis);
                ctx.lineTo(params.lastX + rightShiftPx, yShift + this.renderOptions.height / 2 + dis);
                ctx.lineTo(params.firstX + leftShiftPx, yShift + this.renderOptions.height + dis);
                break;
            default:
                break;
        }
        ctx.stroke();
        ctx.closePath();
    }
    draw() {
        this.checkContext();
        this.setRendered();
        const firstNote = this.firstNote;
        const lastNote = this.lastNote;
        if (!firstNote || !lastNote)
            throw new RuntimeError('NoNote', 'Notes required to draw');
        const start = firstNote.getModifierStartXY(this.position, 0);
        const end = lastNote.getModifierStartXY(this.position, 0);
        this.renderHairpin({
            firstX: start.x,
            lastX: end.x,
            firstY: firstNote.checkStave().getY() + firstNote.checkStave().getHeight(),
            lastY: lastNote.checkStave().getY() + lastNote.checkStave().getHeight(),
            staffHeight: firstNote.checkStave().getHeight(),
        });
    }
}
StaveHairpin.type = {
    CRESC: 1,
    DECRESC: 2,
};
