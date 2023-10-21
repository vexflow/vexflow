import { Element } from './element.js';
import { Font } from './font.js';
import { Metrics } from './metrics.js';
import { Note } from './note.js';
export var TextJustification;
(function (TextJustification) {
    TextJustification[TextJustification["LEFT"] = 1] = "LEFT";
    TextJustification[TextJustification["CENTER"] = 2] = "CENTER";
    TextJustification[TextJustification["RIGHT"] = 3] = "RIGHT";
})(TextJustification || (TextJustification = {}));
export class TextNote extends Note {
    static get CATEGORY() {
        return "TextNote";
    }
    static get GLYPHS() {
        return {
            segno: '\uE047',
            tr: '\uE566',
            mordent: '\uE56D',
            mordentUpper: '\uE56C',
            mordentLower: '\uE56D',
            f: '\uE522',
            p: '\uE520',
            m: '\uE521',
            s: '\uE524',
            z: '\uE525',
            coda: '\uE048',
            pedalOpen: '\uE650',
            pedalClose: '\uE655',
            caesuraStraight: '\uE4D1',
            caesuraCurved: '\uE4D4',
            breath: '\uE4CE',
            tick: '\uE4CF',
            turn: '\uE567',
            turnInverted: '\uE569',
        };
    }
    constructor(noteStruct) {
        var _a, _b;
        super(noteStruct);
        this.text = (_a = noteStruct.text) !== null && _a !== void 0 ? _a : '';
        if (noteStruct.glyph) {
            this.text += TextNote.GLYPHS[noteStruct.glyph] || noteStruct.glyph;
        }
        if (noteStruct.font) {
            this.setFont(noteStruct.font);
        }
        else if (noteStruct.glyph === undefined) {
            this.setFont(Metrics.getFontInfo('TextNote.text.fontSize'));
        }
        const smallerFontSize = Font.convertSizeToPointValue(this.fontInfo.size) * 0.769231;
        if (noteStruct.superscript) {
            this.superscript = new Element('TexNote.subSuper');
            this.superscript.setText(noteStruct.superscript);
            this.superscript.setFontSize(smallerFontSize);
        }
        if (noteStruct.subscript) {
            this.subscript = new Element('TexNote.subSuper');
            this.subscript.setText(noteStruct.subscript);
            this.subscript.setFontSize(smallerFontSize);
        }
        this.line = (_b = noteStruct.line) !== null && _b !== void 0 ? _b : 0;
        this.smooth = noteStruct.smooth || false;
        this.ignoreTicks = noteStruct.ignoreTicks || false;
        this.justification = TextJustification.LEFT;
    }
    setJustification(just) {
        this.justification = just;
        return this;
    }
    setLine(line) {
        this.line = line;
        return this;
    }
    getLine() {
        return this.line;
    }
    preFormat() {
        if (this.preFormatted)
            return;
        const tickContext = this.checkTickContext(`Can't preformat without a TickContext.`);
        if (this.justification === TextJustification.CENTER) {
            this.leftDisplacedHeadPx = this.width / 2;
        }
        else if (this.justification === TextJustification.RIGHT) {
            this.leftDisplacedHeadPx = this.width;
        }
        this.rightDisplacedHeadPx = tickContext.getMetrics().glyphPx / 2;
        this.preFormatted = true;
    }
    draw() {
        const ctx = this.checkContext();
        const stave = this.checkStave();
        const tickContext = this.checkTickContext(`Can't draw without a TickContext.`);
        this.setRendered();
        let x = this.getAbsoluteX() + tickContext.getMetrics().glyphPx / 2;
        const width = this.getWidth();
        if (this.justification === TextJustification.CENTER) {
            x -= width / 2;
        }
        else if (this.justification === TextJustification.RIGHT) {
            x -= width;
        }
        const y = stave.getYForLine(this.line + -3);
        this.applyStyle(ctx);
        this.renderText(ctx, x, y);
        const height = this.getHeight();
        if (this.superscript) {
            this.superscript.renderText(ctx, x + this.width + 2, y - height / 2.2);
        }
        if (this.subscript) {
            this.subscript.renderText(ctx, x + this.width + 2, y + height / 2.2 - 1);
        }
        this.restoreStyle(ctx);
    }
}
TextNote.Justification = TextJustification;
