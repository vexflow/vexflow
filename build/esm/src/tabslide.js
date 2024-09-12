import { TabTie } from './tabtie.js';
import { RuntimeError } from './util.js';
export class TabSlide extends TabTie {
    static get CATEGORY() {
        return "TabSlide";
    }
    static get SLIDE_UP() {
        return 1;
    }
    static get SLIDE_DOWN() {
        return -1;
    }
    static createSlideUp(notes) {
        return new TabSlide(notes, TabSlide.SLIDE_UP);
    }
    static createSlideDown(notes) {
        return new TabSlide(notes, TabSlide.SLIDE_DOWN);
    }
    constructor(notes, direction) {
        super(notes, 'sl.');
        if (!direction) {
            let firstFret = notes.firstNote.getPositions()[0].fret;
            if (typeof firstFret === 'string') {
                firstFret = parseInt(firstFret, 10);
            }
            let lastFret = notes.lastNote.getPositions()[0].fret;
            if (typeof lastFret === 'string') {
                lastFret = parseInt(lastFret, 10);
            }
            if (isNaN(firstFret) || isNaN(lastFret)) {
                direction = TabSlide.SLIDE_UP;
            }
            else {
                direction = firstFret > lastFret ? TabSlide.SLIDE_DOWN : TabSlide.SLIDE_UP;
            }
        }
        this.direction = direction;
        this.renderOptions.cp1 = 11;
        this.renderOptions.cp2 = 14;
        this.renderOptions.yShift = 0.5;
    }
    renderTie(params) {
        if (params.firstYs.length === 0 || params.lastYs.length === 0) {
            throw new RuntimeError('BadArguments', 'No Y-values to render');
        }
        const ctx = this.checkContext();
        const firstX = params.firstX;
        const firstYs = params.firstYs;
        const lastX = params.lastX;
        const direction = params.direction;
        if (direction !== TabSlide.SLIDE_UP && direction !== TabSlide.SLIDE_DOWN) {
            throw new RuntimeError('BadSlide', 'Invalid slide direction');
        }
        const firstIndexes = this.notes.firstIndexes;
        for (let i = 0; i < firstIndexes.length; ++i) {
            const slideY = firstYs[firstIndexes[i]] + this.renderOptions.yShift;
            if (isNaN(slideY)) {
                throw new RuntimeError('BadArguments', 'Bad indexes for slide rendering.');
            }
            ctx.beginPath();
            ctx.moveTo(firstX, slideY + 3 * direction);
            ctx.lineTo(lastX, slideY - 3 * direction);
            ctx.closePath();
            ctx.stroke();
        }
        this.setRendered();
    }
}
