import { Element } from './element.js';
import { RuntimeError } from './util.js';
export class StaveTie extends Element {
    static get CATEGORY() {
        return "StaveTie";
    }
    constructor(notes, text = '') {
        super();
        this.setNotes(notes);
        this.text = text;
        this.renderOptions = {
            cp1: 8,
            cp2: 12,
            textShiftX: 0,
            firstXShift: 0,
            lastXShift: 0,
            yShift: 7,
            tieSpacing: 0,
        };
    }
    setDirection(direction) {
        this.direction = direction;
        return this;
    }
    setNotes(notes) {
        if (!notes.firstNote && !notes.lastNote) {
            throw new RuntimeError('BadArguments', 'Tie needs to have either firstNote or lastNote set.');
        }
        if (!notes.firstIndexes) {
            notes.firstIndexes = [0];
        }
        if (!notes.lastIndexes) {
            notes.lastIndexes = [0];
        }
        if (notes.firstIndexes.length !== notes.lastIndexes.length) {
            throw new RuntimeError('BadArguments', 'Tied notes must have same number of indexes.');
        }
        this.notes = notes;
        return this;
    }
    isPartial() {
        return !this.notes.firstNote || !this.notes.lastNote;
    }
    renderTie(params) {
        if (params.firstYs.length === 0 || params.lastYs.length === 0) {
            throw new RuntimeError('BadArguments', 'No Y-values to render');
        }
        const ctx = this.checkContext();
        let cp1 = this.renderOptions.cp1;
        let cp2 = this.renderOptions.cp2;
        if (Math.abs(params.lastX - params.firstX) < 10) {
            cp1 = 2;
            cp2 = 8;
        }
        const firstXShift = this.renderOptions.firstXShift;
        const lastXShift = this.renderOptions.lastXShift;
        const yShift = this.renderOptions.yShift * params.direction;
        const firstIndexes = this.notes.firstIndexes;
        const lastIndexes = this.notes.lastIndexes;
        this.applyStyle();
        ctx.openGroup('stavetie', this.getAttribute('id'));
        for (let i = 0; i < firstIndexes.length; ++i) {
            const cpX = (params.lastX + lastXShift + (params.firstX + firstXShift)) / 2;
            const firstY = params.firstYs[firstIndexes[i]] + yShift;
            const lastY = params.lastYs[lastIndexes[i]] + yShift;
            if (isNaN(firstY) || isNaN(lastY)) {
                throw new RuntimeError('BadArguments', 'Bad indexes for tie rendering.');
            }
            const topControlPointY = (firstY + lastY) / 2 + cp1 * params.direction;
            const bottomControlPointY = (firstY + lastY) / 2 + cp2 * params.direction;
            ctx.beginPath();
            ctx.moveTo(params.firstX + firstXShift, firstY);
            ctx.quadraticCurveTo(cpX, topControlPointY, params.lastX + lastXShift, lastY);
            ctx.quadraticCurveTo(cpX, bottomControlPointY, params.firstX + firstXShift, firstY);
            ctx.closePath();
            ctx.fill();
        }
        ctx.closeGroup();
        this.restoreStyle();
    }
    renderTieText(firstX, lastX) {
        var _a, _b, _c;
        const ctx = this.checkContext();
        let centerX = (firstX + lastX) / 2;
        centerX -= ctx.measureText(this.text).width / 2;
        const stave = (_b = (_a = this.notes.firstNote) === null || _a === void 0 ? void 0 : _a.checkStave()) !== null && _b !== void 0 ? _b : (_c = this.notes.lastNote) === null || _c === void 0 ? void 0 : _c.checkStave();
        if (stave) {
            ctx.save();
            ctx.setFont(this.textFont);
            ctx.fillText(this.text, centerX + this.renderOptions.textShiftX, stave.getYForTopText() - 1);
            ctx.restore();
        }
    }
    getNotes() {
        return this.notes;
    }
    draw() {
        this.checkContext();
        this.setRendered();
        const firstNote = this.notes.firstNote;
        const lastNote = this.notes.lastNote;
        let firstX = 0;
        let lastX = 0;
        let firstYs = [0];
        let lastYs = [0];
        let stemDirection = 0;
        if (firstNote) {
            firstX = firstNote.getTieRightX() + this.renderOptions.tieSpacing;
            stemDirection = firstNote.getStemDirection();
            firstYs = firstNote.getYs();
        }
        else if (lastNote) {
            const stave = lastNote.checkStave();
            firstX = stave.getTieStartX();
            firstYs = lastNote.getYs();
            this.notes.firstIndexes = this.notes.lastIndexes;
        }
        if (lastNote) {
            lastX = lastNote.getTieLeftX() + this.renderOptions.tieSpacing;
            stemDirection = lastNote.getStemDirection();
            lastYs = lastNote.getYs();
        }
        else if (firstNote) {
            const stave = firstNote.checkStave();
            lastX = stave.getTieEndX();
            lastYs = firstNote.getYs();
            this.notes.lastIndexes = this.notes.firstIndexes;
        }
        if (this.direction) {
            stemDirection = this.direction;
        }
        this.renderTie({
            firstX,
            lastX,
            firstYs,
            lastYs,
            direction: stemDirection,
        });
        this.renderTieText(firstX, lastX);
        return true;
    }
}
