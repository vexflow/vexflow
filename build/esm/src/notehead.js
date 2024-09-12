import { Note } from './note.js';
import { Stem } from './stem.js';
import { defined, log } from './util.js';
function L(...args) {
    if (NoteHead.DEBUG)
        log('VexFlow.NoteHead', args);
}
export class NoteHead extends Note {
    static get CATEGORY() {
        return "NoteHead";
    }
    constructor(noteStruct) {
        var _a;
        super(noteStruct);
        this.customGlyph = false;
        this.ledger = {
            '\ue4e3': '\ue4f4',
            '\ue4e4': '\ue4f5',
        };
        this.index = noteStruct.index;
        this.x = noteStruct.x || 0;
        this.y = noteStruct.y || 0;
        if (noteStruct.noteType)
            this.noteType = noteStruct.noteType;
        this.displaced = noteStruct.displaced || false;
        this.stemDirection = noteStruct.stemDirection || Stem.UP;
        this.line = noteStruct.line || 0;
        this.glyphProps = Note.getGlyphProps(this.duration, this.noteType);
        defined(this.glyphProps, 'BadArguments', `No glyph found for duration '${this.duration}' and type '${this.noteType}'`);
        if ((this.line > 5 || this.line < 0) && this.ledger[this.glyphProps.codeHead]) {
            this.glyphProps.codeHead = this.ledger[this.glyphProps.codeHead];
        }
        this.text = this.glyphProps.codeHead;
        if (noteStruct.customGlyphCode) {
            this.customGlyph = true;
            this.text = noteStruct.customGlyphCode;
        }
        this.setStyle((_a = noteStruct.style) !== null && _a !== void 0 ? _a : {});
        this.slashed = noteStruct.slashed || false;
        this.renderOptions = Object.assign({}, this.renderOptions);
    }
    getWidth() {
        return this.width;
    }
    isDisplaced() {
        return this.displaced === true;
    }
    getLine() {
        return this.line;
    }
    setLine(line) {
        this.line = line;
        return this;
    }
    getAbsoluteX() {
        const x = !this.preFormatted ? this.x : super.getAbsoluteX();
        const displacementStemAdjustment = Stem.WIDTH / 2;
        return x + (this.displaced ? (this.width - displacementStemAdjustment) * this.stemDirection : 0);
    }
    setStave(stave) {
        const line = this.getLine();
        this.stave = stave;
        if (this.stave) {
            this.setY(this.stave.getYForNote(line));
            this.setContext(this.stave.getContext());
        }
        return this;
    }
    preFormat() {
        if (this.preFormatted)
            return this;
        this.preFormatted = true;
        return this;
    }
    draw() {
        var _a;
        const ctx = this.checkContext();
        this.setRendered();
        ctx.openGroup('notehead', this.getAttribute('id'));
        L("Drawing note head '", this.noteType, this.duration, "' at", this.x, this.y);
        this.x = this.getAbsoluteX();
        this.renderText(ctx, 0, 0);
        (_a = this.parent) === null || _a === void 0 ? void 0 : _a.drawModifiers(this);
        ctx.closeGroup();
    }
}
NoteHead.DEBUG = false;
