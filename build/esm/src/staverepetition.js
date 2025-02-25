import { Glyphs } from './glyphs.js';
import { Metrics } from './metrics.js';
import { StaveModifier } from './stavemodifier.js';
export class Repetition extends StaveModifier {
    static get CATEGORY() {
        return "Repetition";
    }
    constructor(type, x, yShift) {
        super();
        this.symbolType = type;
        this.x = x;
        this.xShift = 0;
        this.yShift = yShift;
    }
    setShiftX(x) {
        this.xShift = x;
        return this;
    }
    setShiftY(y) {
        this.yShift = y;
        return this;
    }
    draw() {
        const stave = this.checkStave();
        const x = stave.getModifierXShift(this.getPosition());
        this.setRendered();
        switch (this.symbolType) {
            case Repetition.type.CODA_RIGHT:
                this.drawCodaFixed(stave, x + stave.getWidth());
                break;
            case Repetition.type.CODA_LEFT:
                this.drawSymbolText(stave, x, 'Coda', true);
                break;
            case Repetition.type.SEGNO_LEFT:
                this.drawSegnoFixed(stave, x);
                break;
            case Repetition.type.SEGNO_RIGHT:
                this.drawSegnoFixed(stave, x + stave.getWidth());
                break;
            case Repetition.type.DC:
                this.drawSymbolText(stave, x, 'D.C.', false);
                break;
            case Repetition.type.DC_AL_CODA:
                this.drawSymbolText(stave, x, 'D.C. al', true);
                break;
            case Repetition.type.DC_AL_FINE:
                this.drawSymbolText(stave, x, 'D.C. al Fine', false);
                break;
            case Repetition.type.DS:
                this.drawSymbolText(stave, x, 'D.S.', false);
                break;
            case Repetition.type.DS_AL_CODA:
                this.drawSymbolText(stave, x, 'D.S. al', true);
                break;
            case Repetition.type.DS_AL_FINE:
                this.drawSymbolText(stave, x, 'D.S. al Fine', false);
                break;
            case Repetition.type.FINE:
                this.drawSymbolText(stave, x, 'Fine', false);
                break;
            case Repetition.type.TO_CODA:
                this.drawSymbolText(stave, x, 'To', true);
                break;
            default:
                break;
        }
    }
    drawCodaFixed(stave, x) {
        const y = stave.getYForTopText(stave.getNumLines());
        this.text = Glyphs.coda;
        this.renderText(stave.checkContext(), x, y + Metrics.get('Repetition.coda.offsetY'));
        return this;
    }
    drawSegnoFixed(stave, x) {
        const y = stave.getYForTopText(stave.getNumLines());
        this.text = Glyphs.segno;
        this.renderText(stave.checkContext(), x, y + Metrics.get('Repetition.segno.offsetY'));
        return this;
    }
    drawSymbolText(stave, x, text, drawCoda) {
        const ctx = stave.checkContext();
        let textX = 0;
        this.text = text;
        if (drawCoda) {
            this.text += ' \ue048';
        }
        this.setFont(Metrics.getFontInfo('Repetition.text'));
        switch (this.symbolType) {
            case Repetition.type.CODA_LEFT:
                textX = stave.getVerticalBarWidth();
                break;
            case Repetition.type.DC:
            case Repetition.type.DC_AL_FINE:
            case Repetition.type.DS:
            case Repetition.type.DS_AL_FINE:
            case Repetition.type.FINE:
            default:
                textX =
                    x - (stave.getNoteStartX() - this.x) + stave.getWidth() - this.width - Metrics.get('Repetition.text.offsetX');
        }
        const y = stave.getYForTopText(stave.getNumLines()) + Metrics.get('Repetition.text.offsetY');
        this.renderText(ctx, textX, y);
        return this;
    }
}
Repetition.type = {
    NONE: 1,
    CODA_LEFT: 2,
    CODA_RIGHT: 3,
    SEGNO_LEFT: 4,
    SEGNO_RIGHT: 5,
    DC: 6,
    DC_AL_CODA: 7,
    DC_AL_FINE: 8,
    DS: 9,
    DS_AL_CODA: 10,
    DS_AL_FINE: 11,
    FINE: 12,
    TO_CODA: 13,
};
