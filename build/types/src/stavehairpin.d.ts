import { Element } from './element';
import { Note } from './note';
import { RenderContext } from './rendercontext';
export interface StaveHairpinRenderOptions {
    rightShiftTicks?: number;
    leftShiftTicks?: number;
    leftShiftPx: number;
    rightShiftPx: number;
    height: number;
    yShift: number;
}
export declare class StaveHairpin extends Element {
    static get CATEGORY(): string;
    protected hairpin: number;
    protected position: number;
    renderOptions: StaveHairpinRenderOptions;
    protected notes: Record<string, Note>;
    protected firstNote?: Note;
    protected lastNote?: Note;
    static readonly type: {
        CRESC: number;
        DECRESC: number;
    };
    static FormatByTicksAndDraw(ctx: RenderContext, formatter: {
        pixelsPerTick: number;
    }, notes: Record<string, Note>, type: number, position: number, options: StaveHairpinRenderOptions): void;
    /**
     * Create a new hairpin from the specified notes.
     *
     * @param {!Object} notes The notes to tie up.
     * Notes is a struct that has:
     *
     *  {
     *    firstNote: Note,
     *    lastNote: Note,
     *  }
     * @param {!Object} type The type of hairpin
     */
    constructor(notes: Record<string, Note>, type: number);
    setPosition(position: number): this;
    setRenderOptions(options: StaveHairpinRenderOptions): this;
    /**
     * Set the notes to attach this hairpin to.
     *
     * @param {!Object} notes The start and end notes.
     */
    setNotes(notes: Record<string, Note>): this;
    renderHairpin(params: {
        firstX: number;
        lastX: number;
        firstY: number;
        lastY: number;
        staffHeight: number;
    }): void;
    draw(): void;
}
