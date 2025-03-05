import { Clef } from './clef.js';
import { Note } from './note.js';
export class ClefNote extends Note {
    static get CATEGORY() {
        return "ClefNote";
    }
    constructor(type, size = 'default', annotation) {
        super({ duration: 'b' });
        this.setType(type, size, annotation);
        this.ignoreTicks = true;
    }
    setType(type, size, annotation) {
        this.clef = new Clef(type, size, annotation);
        this.setWidth(this.clef.getWidth());
        return this;
    }
    getClef() {
        return this.clef;
    }
    preFormat() {
        this.preFormatted = true;
        return this;
    }
    draw() {
        const stave = this.checkStave();
        const ctx = this.checkContext();
        this.setRendered();
        this.clef.setX(this.getAbsoluteX());
        this.clef.setY(stave.getYForLine(this.clef.line));
        this.clef.renderText(ctx, 0, 0);
    }
    getBoundingBox() {
        return this.clef.getBoundingBox();
    }
}
