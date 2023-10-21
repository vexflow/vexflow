import { Element } from './element';
import { Note } from './note';
export interface TieNotes {
    firstNote?: Note | null;
    lastNote?: Note | null;
    firstIndexes?: number[];
    lastIndexes?: number[];
}
export declare class StaveTie extends Element {
    static get CATEGORY(): string;
    renderOptions: {
        cp2: number;
        lastXShift: number;
        tieSpacing: number;
        cp1: number;
        firstXShift: number;
        textShiftX: number;
        yShift: number;
    };
    protected notes: TieNotes;
    protected direction?: number;
    /**
     * @param notes is a struct that has:
     *
     *  {
     *    firstNote: Note,
     *    lastNote: Note,
     *    firstIndexes: [n1, n2, n3],
     *    lastIndexes: [n1, n2, n3]
     *  }
     *
     * @param text
     */
    constructor(notes: TieNotes, text?: string);
    setDirection(direction: number): this;
    /**
     * Set the notes to attach this tie to.
     *
     * @param {!Object} notes The notes to tie up.
     */
    setNotes(notes: TieNotes): this;
    /**
     * @return {boolean} Returns true if this is a partial bar.
     */
    isPartial(): boolean;
    /**
     * @param params.firstX is specified in pixels.
     * @param params.lastX is specified in pixels.
     */
    renderTie(params: {
        direction: number;
        firstX: number;
        lastX: number;
        lastYs: number[];
        firstYs: number[];
    }): void;
    /**
     * @param firstX specified in pixels
     * @param lastX specified in pixels
     */
    renderTieText(firstX: number, lastX: number): void;
    /**
     * Returns the TieNotes structure of the first and last note this tie connects.
     */
    getNotes(): TieNotes;
    draw(): boolean;
}
