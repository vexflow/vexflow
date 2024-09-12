import { StaveTie } from './stavetie.js';
export class TabTie extends StaveTie {
    static get CATEGORY() {
        return "TabTie";
    }
    static createHammeron(notes) {
        return new TabTie(notes, 'H');
    }
    static createPulloff(notes) {
        return new TabTie(notes, 'P');
    }
    constructor(notes, text) {
        super(notes, text);
        this.renderOptions.cp1 = 9;
        this.renderOptions.cp2 = 11;
        this.renderOptions.yShift = 3;
        this.direction = -1;
    }
}
