import { StaveTie, TieNotes } from './stavetie';
export declare class TabTie extends StaveTie {
    static get CATEGORY(): string;
    static createHammeron(notes: TieNotes): TabTie;
    static createPulloff(notes: TieNotes): TabTie;
    /**
     * @param notes is a struct that has:
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
}
