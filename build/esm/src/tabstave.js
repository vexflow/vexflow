import { Stave } from './stave.js';
export class TabStave extends Stave {
    static get CATEGORY() {
        return "TabStave";
    }
    constructor(x, y, width, options) {
        const tabOptions = Object.assign({ spacingBetweenLinesPx: 13, numLines: 6, topTextPosition: 1 }, options);
        super(x, y, width, tabOptions);
    }
    getYForGlyphs() {
        return this.getYForLine(2.5);
    }
    addTabGlyph() {
        this.addClef('tab');
        return this;
    }
}
