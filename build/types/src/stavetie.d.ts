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
        cp1: number;
        cp2: number;
        shortTieCutoff: number;
        cp1Short: number;
        cp2Short: number;
        firstXShift: number;
        lastXShift: number;
        tieSpacing: number;
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
    /**
     * Returns either the direction explicitly set with setDirection, or
     * a logical direction based on lastNote or firstNote.
     */
    getDirection(): number;
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
    /**
     * Returns the X position in pixels that the tie will be drawn starting from;
     * ideally from the firstNote, alternatively from the lastNote, or 0 if all else fails.
     */
    getFirstX(): number;
    /**
     * Returns the X position in pixels that the tie will be drawn ending at;
     * ideally from the firstNote, alternatively from the lastNote, or 0 if all else fails.
     */
    getLastX(): number;
    /**
     * Get the Y positions of the places where a tie needs to be drawn starting from.
     */
    getFirstYs(): number[];
    /**
     * Get the Y positions of the places where a tie needs to be drawn ending at.
     */
    getLastYs(): number[];
    /**
     * If a tie has firstNote and not lastNote, or vice-versa, then their
     * firstIndexes and lastIndexes need to be equal to each other.
     *
     * Does nothing if both notes.firstNote and notes.lastNote are defined (or
     * if neither are)
     *
     * (Note that after doing so they share a common Array object, so any change
     * to one will affect the other; this behavior may change in a future release)
     */
    synchronizeIndexes(): void;
    draw(): boolean;
}
