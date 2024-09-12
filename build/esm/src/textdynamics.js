import { Glyphs } from './glyphs.js';
import { Note } from './note.js';
import { log, RuntimeError } from './util.js';
function L(...args) {
    if (TextDynamics.DEBUG)
        log('VexFlow.TextDynamics', args);
}
export class TextDynamics extends Note {
    static get CATEGORY() {
        return "TextDynamics";
    }
    static get GLYPHS() {
        return {
            f: Glyphs.dynamicForte,
            p: Glyphs.dynamicPiano,
            m: Glyphs.dynamicMezzo,
            s: Glyphs.dynamicSforzando,
            z: Glyphs.dynamicZ,
            r: Glyphs.dynamicRinforzando,
        };
    }
    constructor(noteStruct) {
        var _a, _b;
        super(noteStruct);
        this.sequence = ((_a = noteStruct.text) !== null && _a !== void 0 ? _a : '').toLowerCase();
        this.line = (_b = noteStruct.line) !== null && _b !== void 0 ? _b : 0;
        this.text = '';
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
