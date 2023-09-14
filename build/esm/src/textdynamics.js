import { Note } from './note.js';
import { Tables } from './tables.js';
import { defined, log, RuntimeError } from './util.js';
function L(...args) {
    if (TextDynamics.DEBUG)
        log('Vex.Flow.TextDynamics', args);
}
export class TextDynamics extends Note {
    static get CATEGORY() {
        return "TextDynamics";
    }
    static get GLYPHS() {
        return {
            f: '\uE522',
            p: '\uE520',
            m: '\uE521',
            s: '\uE524',
            z: '\uE525',
            r: '\uE523',
        };
    }
    constructor(noteStruct) {
        var _a, _b;
        super(noteStruct);
        this.sequence = ((_a = noteStruct.text) !== null && _a !== void 0 ? _a : '').toLowerCase();
        this.line = (_b = noteStruct.line) !== null && _b !== void 0 ? _b : 0;
        this.text = '';
        this.renderOptions = Object.assign({ glyphFontSize: Tables.lookupMetric('fontSize') }, this.renderOptions);
        this.textFont.size = defined(this.renderOptions.glyphFontSize) * this.renderOptions.glyphFontScale;
        L('New Dynamics Text: ', this.sequence);
    }
    setLine(line) {
        this.line = line;
        return this;
    }
    preFormat() {
        this.text = '';
        this.sequence.split('').forEach((letter) => {
            const glyph = TextDynamics.GLYPHS[letter];
            if (!glyph)
                throw new RuntimeError('Invalid dynamics character: ' + letter);
            this.text += glyph;
        });
        this.measureText();
        this.preFormatted = true;
        return this;
    }
    draw() {
        this.setRendered();
        const x = this.getAbsoluteX();
        const y = this.checkStave().getYForLine(this.line + -3);
        L('Rendering Dynamics: ', this.sequence);
        this.renderText(this.checkContext(), x, y);
    }
}
TextDynamics.DEBUG = false;
