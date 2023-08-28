import { Font } from './font.js';
import { Glyph } from './glyph.js';
import { StaveModifier } from './stavemodifier.js';
import { Tables } from './tables.js';
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
    draw(stave, x) {
        this.setRendered();
        switch (this.symbolType) {
            case Repetition.type.CODA_RIGHT:
                this.drawCodaFixed(stave, x + stave.getWidth());
                break;
            case Repetition.type.CODA_LEFT:
                this.drawSymbolText(stave, x, 'Coda', true);
                break;
            case Repetition.type.SEGNO_LEFT:
                this.drawSignoFixed(stave, x);
                break;
            case Repetition.type.SEGNO_RIGHT:
                this.drawSignoFixed(stave, x + stave.getWidth());
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
        return this;
    }
    drawCodaFixed(stave, x) {
        const y = stave.getYForTopText(stave.getNumLines()) + this.yShift;
        Glyph.renderGlyph(stave.checkContext(), this.x + x + this.xShift, y + Tables.currentMusicFont().lookupMetric('staveRepetition.coda.offsetY'), 40, 'coda', { category: 'coda' });
        return this;
    }
    drawSignoFixed(stave, x) {
        const y = stave.getYForTopText(stave.getNumLines()) + this.yShift;
        Glyph.renderGlyph(stave.checkContext(), this.x + x + this.xShift, y + Tables.currentMusicFont().lookupMetric('staveRepetition.segno.offsetY'), 30, 'segno', { category: 'segno' });
        return this;
    }
    drawSymbolText(stave, x, text, drawCoda) {
        var _a;
        const ctx = stave.checkContext();
        ctx.save();
        ctx.setFont(this.textFont);
        let textX = 0;
        let symbolX = 0;
        const modifierWidth = stave.getNoteStartX() - this.x;
        switch (this.symbolType) {
            case Repetition.type.CODA_LEFT:
                textX = this.x + stave.getVerticalBarWidth();
                symbolX =
                    textX +
                        ctx.measureText(text).width +
                        Tables.currentMusicFont().lookupMetric('staveRepetition.symbolText.offsetX');
                break;
            case Repetition.type.DC:
            case Repetition.type.DC_AL_FINE:
            case Repetition.type.DS:
            case Repetition.type.DS_AL_FINE:
            case Repetition.type.FINE:
                textX =
                    this.x +
                        x +
                        this.xShift +
                        stave.getWidth() -
                        Tables.currentMusicFont().lookupMetric('staveRepetition.symbolText.spacing') -
                        modifierWidth -
                        ctx.measureText(text).width;
                break;
            default:
                textX =
                    this.x +
                        x +
                        this.xShift +
                        stave.getWidth() -
                        Tables.currentMusicFont().lookupMetric('staveRepetition.symbolText.spacing') -
                        modifierWidth -
                        ctx.measureText(text).width -
                        Tables.currentMusicFont().lookupMetric('staveRepetition.symbolText.offsetX');
                symbolX =
                    textX +
                        ctx.measureText(text).width +
                        Tables.currentMusicFont().lookupMetric('staveRepetition.symbolText.offsetX');
                break;
        }
        const y = stave.getYForTopText(stave.getNumLines()) +
            this.yShift +
            Tables.currentMusicFont().lookupMetric('staveRepetition.symbolText.offsetY');
        if (drawCoda) {
            Glyph.renderGlyph(ctx, symbolX, y, Font.convertSizeToPointValue((_a = this.textFont) === null || _a === void 0 ? void 0 : _a.size) * 2, 'coda', {
                category: 'coda',
            });
        }
        ctx.fillText(text, textX, y + 5);
        ctx.restore();
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
