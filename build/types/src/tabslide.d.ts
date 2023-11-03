import { TieNotes } from './stavetie';
import { TabTie } from './tabtie';
export declare class TabSlide extends TabTie {
    static get CATEGORY(): string;
    static get SLIDE_UP(): number;
    static get SLIDE_DOWN(): number;
    static createSlideUp(notes: TieNotes): TabSlide;
    static createSlideDown(notes: TieNotes): TabSlide;
    /**
     * @param notes is a struct of the form:
     *  {
     *    firstNote: Note,
     *    lastNote: Note,
     *    firstIndexes: [n1, n2, n3],
     *    lastIndexes: [n1, n2, n3]
     *  }
     * @param notes.firstNote the starting note of the slide
     * @param notes.lastNote the ending note of the slide
     * @param notes.firstIndexes specifies which string + fret positions of the TabNote are used in this slide. zero indexed.
     * @param notes.lastIndexes currently unused. we assume it's the same as firstIndexes.
     *
     * @param direction TabSlide.SLIDE_UP or TabSlide.SLIDE_DOWN
     */
    constructor(notes: TieNotes, direction?: number);
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
}
