import { Element } from './element.js';
import { Tables } from './tables.js';
import { log, RuntimeError } from './util.js';
function L(...args) {
    if (PedalMarking.DEBUG)
        log('Vex.Flow.PedalMarking', args);
}
function drawPedalGlyph(name, ctx, x, y) {
    var _a;
    const glyph = new Element(PedalMarking.CATEGORY);
    glyph.setText((_a = PedalMarking.GLYPHS[name]) !== null && _a !== void 0 ? _a : name);
    glyph.measureText();
    glyph.renderText(ctx, x - (glyph.getWidth() - Tables.STAVE_LINE_DISTANCE) / 2, y);
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
        this.customDepressText = '';
        this.customReleaseText = '';
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
        this.customDepressText = depress || '';
        this.customReleaseText = release || '';
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
        this.notes.forEach((note, index, notes) => {
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
                    if (this.customDepressText) {
                        const textWidth = ctx.measureText(this.customDepressText).width;
                        ctx.fillText(this.customDepressText, x - textWidth / 2, y);
                        xShift = textWidth / 2 + this.renderOptions.textMarginRight;
                    }
                    else {
                        drawPedalGlyph('pedalDepress', ctx, x, y);
                        xShift = 20 + this.renderOptions.textMarginRight;
                    }
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
                xShift = nextNoteIsSame ? -5 : 0;
                ctx.beginPath();
                ctx.moveTo(prevX, prevY);
                ctx.lineTo(x + xShift, y);
                ctx.lineTo(x, y - this.renderOptions.bracketHeight);
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
        this.notes.forEach((note) => {
            isPedalDepressed = !isPedalDepressed;
            const stave = note.checkStave();
            const x = note.getAbsoluteX();
            const y = stave.getYForBottomText(this.line + 3);
            let textWidth = 0;
            if (isPedalDepressed) {
                if (this.customDepressText) {
                    textWidth = ctx.measureText(this.customDepressText).width;
                    ctx.fillText(this.customDepressText, x - textWidth / 2, y);
                }
                else {
                    drawPedalGlyph('pedalDepress', ctx, x, y);
                }
            }
            else {
                if (this.customReleaseText) {
                    textWidth = ctx.measureText(this.customReleaseText).width;
                    ctx.fillText(this.customReleaseText, x - textWidth / 2, y);
                }
                else {
                    drawPedalGlyph('pedalRelease', ctx, x, y);
                }
            }
        });
    }
    draw() {
        const ctx = this.checkContext();
        this.setRendered();
        ctx.save();
        ctx.setStrokeStyle(this.renderOptions.color);
        ctx.setFillStyle(this.renderOptions.color);
        ctx.setFont(Tables.lookupMetricFontInfo('PedalMarking.text'));
        L('Rendering Pedal Marking');
        if (this.type === PedalMarking.type.BRACKET || this.type === PedalMarking.type.MIXED) {
            ctx.setLineWidth(this.renderOptions.bracketLineWidth);
            this.drawBracketed();
        }
        else if (this.type === PedalMarking.type.TEXT) {
            this.drawText();
        }
        ctx.restore();
    }
}
PedalMarking.DEBUG = false;
PedalMarking.GLYPHS = {
    pedalDepress: '\uE650',
    pedalRelease: '\uE655',
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
