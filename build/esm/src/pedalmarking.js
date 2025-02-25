import { Element } from './element.js';
import { Glyphs } from './glyphs.js';
import { Metrics } from './metrics.js';
import { log, RuntimeError } from './util.js';
function L(...args) {
    if (PedalMarking.DEBUG)
        log('VexFlow.PedalMarking', args);
}
export class PedalMarking extends Element {
    static get CATEGORY() {
        return "PedalMarking";
    }
    static createSustain(notes) {
        const pedal = new PedalMarking(notes);
        return pedal;
    }
    static createSostenuto(notes) {
        const pedal = new PedalMarking(notes);
        pedal.setType(PedalMarking.type.MIXED);
        pedal.setCustomText('Sost. Ped.');
        return pedal;
    }
    static createUnaCorda(notes) {
        const pedal = new PedalMarking(notes);
        pedal.setType(PedalMarking.type.TEXT);
        pedal.setCustomText('una corda', 'tre corda');
        return pedal;
    }
    constructor(notes) {
        super();
        this.notes = notes;
        this.type = PedalMarking.type.TEXT;
        this.line = 0;
        this.depressText = PedalMarking.GLYPHS.pedalDepress;
        this.releaseText = PedalMarking.GLYPHS.pedalRelease;
        this.renderOptions = {
            bracketHeight: 10,
            textMarginRight: 6,
            bracketLineWidth: 1,
            color: 'black',
        };
    }
    setType(type) {
        type = typeof type === 'string' ? PedalMarking.typeString[type] : type;
        if (type >= PedalMarking.type.TEXT && type <= PedalMarking.type.MIXED) {
            this.type = type;
        }
        return this;
    }
    setCustomText(depress, release) {
        this.depressText = depress || '';
        this.releaseText = release || '';
        this.setFont(Metrics.getFontInfo('PedalMarking.text'));
        return this;
    }
    setLine(line) {
        this.line = line;
        return this;
    }
    drawBracketed() {
        const ctx = this.checkContext();
        let isPedalDepressed = false;
        let prevX;
        let prevY;
        let textWidth = 0;
        this.notes.forEach((note, index, notes) => {
            var _a, _b, _c, _d;
            isPedalDepressed = !isPedalDepressed;
            const x = note.getAbsoluteX();
            const y = note.checkStave().getYForBottomText(this.line + 3);
            if (x < prevX) {
                throw new RuntimeError('InvalidConfiguration', 'The notes provided must be in order of ascending x positions');
            }
            const nextNoteIsSame = notes[index + 1] === note;
            const prevNoteIsSame = notes[index - 1] === note;
            let xShift = 0;
            if (isPedalDepressed) {
                xShift = prevNoteIsSame ? 5 : 0;
                if (this.type === PedalMarking.type.MIXED && !prevNoteIsSame) {
                    textWidth = ctx.measureText(this.depressText).width;
                    ctx.fillText(this.depressText, x, y);
                    xShift = textWidth + this.renderOptions.textMarginRight;
                }
                else {
                    ctx.beginPath();
                    ctx.moveTo(x, y - this.renderOptions.bracketHeight);
                    ctx.lineTo(x + xShift, y);
                    ctx.stroke();
                    ctx.closePath();
                }
            }
            else {
                const noteNdx = note.getVoice().getTickables().indexOf(note);
                const voiceNotes = note.getVoice().getTickables().length;
                const noteEndX = noteNdx + 1 < voiceNotes
                    ?
                        note.getVoice().getTickables()[noteNdx + 1].getAbsoluteX()
                    :
                        ((_b = (_a = note.getStave()) === null || _a === void 0 ? void 0 : _a.getX()) !== null && _b !== void 0 ? _b : 0) + ((_d = (_c = note.getStave()) === null || _c === void 0 ? void 0 : _c.getWidth()) !== null && _d !== void 0 ? _d : 0);
                ctx.beginPath();
                ctx.moveTo(prevX, prevY);
                ctx.lineTo(nextNoteIsSame ? x - 5 : noteEndX - 5, y);
                ctx.lineTo(nextNoteIsSame ? x : noteEndX - 5, y - this.renderOptions.bracketHeight);
                ctx.stroke();
                ctx.closePath();
            }
            prevX = x + xShift;
            prevY = y;
        });
    }
    drawText() {
        const ctx = this.checkContext();
        let isPedalDepressed = false;
        let textWidth = 0;
        this.notes.forEach((note) => {
            var _a, _b, _c, _d;
            isPedalDepressed = !isPedalDepressed;
            const stave = note.checkStave();
            const x = note.getAbsoluteX();
            const y = stave.getYForBottomText(this.line + 3);
            if (isPedalDepressed) {
                textWidth = ctx.measureText(this.depressText).width;
                ctx.fillText(this.depressText, x, y);
            }
            else {
                const noteNdx = note.getVoice().getTickables().indexOf(note);
                const voiceNotes = note.getVoice().getTickables().length;
                const noteEndX = noteNdx + 1 < voiceNotes
                    ?
                        note.getVoice().getTickables()[noteNdx + 1].getAbsoluteX()
                    :
                        ((_b = (_a = note.getStave()) === null || _a === void 0 ? void 0 : _a.getX()) !== null && _b !== void 0 ? _b : 0) + ((_d = (_c = note.getStave()) === null || _c === void 0 ? void 0 : _c.getWidth()) !== null && _d !== void 0 ? _d : 0);
                textWidth = ctx.measureText(this.releaseText).width;
                ctx.fillText(this.releaseText, noteEndX - textWidth, y);
            }
        });
    }
    draw() {
        const ctx = this.checkContext();
        this.setRendered();
        ctx.setStrokeStyle(this.renderOptions.color);
        ctx.setFillStyle(this.renderOptions.color);
        ctx.setFont(this.font);
        L('Rendering Pedal Marking');
        if (this.type === PedalMarking.type.BRACKET || this.type === PedalMarking.type.MIXED) {
            ctx.setLineWidth(this.renderOptions.bracketLineWidth);
            this.drawBracketed();
        }
        else if (this.type === PedalMarking.type.TEXT) {
            this.drawText();
        }
    }
}
PedalMarking.DEBUG = false;
PedalMarking.GLYPHS = {
    pedalDepress: Glyphs.keyboardPedalPed,
    pedalRelease: Glyphs.keyboardPedalUp,
};
PedalMarking.type = {
    TEXT: 1,
    BRACKET: 2,
    MIXED: 3,
};
PedalMarking.typeString = {
    text: PedalMarking.type.TEXT,
    bracket: PedalMarking.type.BRACKET,
    mixed: PedalMarking.type.MIXED,
};
