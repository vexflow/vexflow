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
            shortTieCutoff: 10,
            cp1Short: 2,
            cp2Short: 8,
            textShiftX: 0,
            firstXShift: 0,
            lastXShift: 0,
            yShift: 7,
            tieSpacing: 0,
        };
    }
    getDirection() {
        if (this.direction !== undefined && this.direction !== null) {
            return this.direction;
        }
        else if (this.notes.lastNote) {
            return this.notes.lastNote.getStemDirection();
        }
        else if (this.notes.firstNote) {
            return this.notes.firstNote.getStemDirection();
        }
        else {
            return 0;
        }
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
        if (Math.abs(params.lastX - params.firstX) < this.renderOptions.shortTieCutoff) {
            cp1 = this.renderOptions.cp1Short;
            cp2 = this.renderOptions.cp2Short;
        }
        const firstXShift = this.renderOptions.firstXShift;
        const lastXShift = this.renderOptions.lastXShift;
        const yShift = this.renderOptions.yShift * params.direction;
        const firstIndexes = this.notes.firstIndexes;
        const lastIndexes = this.notes.lastIndexes;
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
    }
    renderTieText(firstX, lastX) {
        var _a, _b, _c;
        const ctx = this.checkContext();
        let centerX = (firstX + lastX) / 2;
        centerX -= ctx.measureText(this.text).width / 2;
        const stave = (_b = (_a = this.notes.firstNote) === null || _a === void 0 ? void 0 : _a.checkStave()) !== null && _b !== void 0 ? _b : (_c = this.notes.lastNote) === null || _c === void 0 ? void 0 : _c.checkStave();
        if (stave) {
            ctx.setFont(this.fontInfo);
            ctx.fillText(this.text, centerX + this.renderOptions.textShiftX, stave.getYForTopText() - 1);
        }
    }
    getNotes() {
        return this.notes;
    }
    getFirstX() {
        if (this.notes.firstNote) {
            return this.notes.firstNote.getTieRightX() + this.renderOptions.tieSpacing;
        }
        else if (this.notes.lastNote) {
            return this.notes.lastNote.checkStave().getTieStartX();
        }
        else {
            return 0;
        }
    }
    getLastX() {
        if (this.notes.lastNote) {
            return this.notes.lastNote.getTieLeftX() + this.renderOptions.tieSpacing;
        }
        else if (this.notes.firstNote) {
            return this.notes.firstNote.checkStave().getTieEndX();
        }
        else {
            return 0;
        }
    }
    getFirstYs() {
        if (this.notes.firstNote) {
            return this.notes.firstNote.getYs();
        }
        else if (this.notes.lastNote) {
            return this.notes.lastNote.getYs();
        }
        else {
            return [0];
        }
    }
    getLastYs() {
        if (this.notes.lastNote) {
            return this.notes.lastNote.getYs();
        }
        else if (this.notes.firstNote) {
            return this.notes.firstNote.getYs();
        }
        else {
            return [0];
        }
    }
    synchronizeIndexes() {
        if (this.notes.firstNote && this.notes.lastNote) {
            return;
        }
        else if (!this.notes.firstNote && !this.notes.lastNote) {
            return;
        }
        else if (this.notes.firstNote) {
            this.notes.lastIndexes = this.notes.firstIndexes;
        }
        else {
            this.notes.firstIndexes = this.notes.lastIndexes;
        }
    }
    draw() {
        this.checkContext();
        this.setRendered();
        this.synchronizeIndexes();
        const firstX = this.getFirstX();
        const lastX = this.getLastX();
        this.renderTie({
            firstX,
            lastX,
            firstYs: this.getFirstYs(),
            lastYs: this.getLastYs(),
            direction: this.getDirection(),
        });
        this.renderTieText(firstX, lastX);
        return true;
    }
}
