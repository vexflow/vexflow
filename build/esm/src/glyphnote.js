import { Note } from './note.js';
export class GlyphNote extends Note {
    static get CATEGORY() {
        return "GlyphNote";
    }
    constructor(glyph, noteStruct, options) {
        super(noteStruct);
        this.options = Object.assign({ ignoreTicks: false, line: 2 }, options);
        this.ignoreTicks = this.options.ignoreTicks;
        this.setGlyph(glyph);
    }
    setGlyph(glyph) {
        this.text = glyph;
        this.measureText();
        return this;
    }
    preFormat() {
        if (!this.preFormatted && this.modifierContext) {
            this.modifierContext.preFormat();
        }
        this.preFormatted = true;
        return this;
    }
    drawModifiers() {
        const ctx = this.checkContext();
        for (let i = 0; i < this.modifiers.length; i++) {
            const modifier = this.modifiers[i];
            modifier.setContext(ctx);
            modifier.drawWithStyle();
        }
    }
    draw() {
        const stave = this.checkStave();
        const ctx = stave.checkContext();
        this.setRendered();
        this.applyStyle(ctx);
        ctx.openGroup('glyphNote', this.getAttribute('id'));
        const x = this.isCenterAligned() ? this.getAbsoluteX() - this.getWidth() / 2 : this.getAbsoluteX();
        this.renderText(ctx, x, stave.getYForLine(this.options.line));
        this.drawModifiers();
        ctx.closeGroup();
        this.restoreStyle(ctx);
    }
}
