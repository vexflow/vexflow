import { ElementStyle } from './element';
import { Note, NoteStruct } from './note';
import { Stave } from './stave';
export interface NoteHeadStruct extends NoteStruct {
    line?: number;
    slashed?: boolean;
    style?: ElementStyle;
    customGlyphCode?: string;
    stemDirection?: number;
    displaced?: boolean;
    noteType?: string;
    x?: number;
    y?: number;
    index?: number;
}
/**
 * `NoteHeads` are typically not manipulated
 * directly, but used internally in `StaveNote`.
 *
 * See `tests/notehead_tests.ts` for usage examples.
 */
export declare class NoteHead extends Note {
    /** To enable logging for this class. Set `VexFlow.NoteHead.DEBUG` to `true`. */
    static DEBUG: boolean;
    static get CATEGORY(): string;
    protected customGlyph: boolean;
    protected displaced: boolean;
    protected stemDirection: number;
    protected line: number;
    protected index?: number;
    protected slashed: boolean;
    protected ledger: Record<string, string>;
    constructor(noteStruct: NoteHeadStruct);
    /** Get the width of the notehead. */
    getWidth(): number;
    /** Determine if the notehead is displaced. */
    isDisplaced(): boolean;
    /** Get the stave line the notehead is placed on. */
    getLine(): number;
    /** Set the stave line the notehead is placed on. */
    setLine(line: number): this;
    /** Get the canvas `x` coordinate position of the notehead. */
    getAbsoluteX(): number;
    /** Set notehead to a provided `stave`. */
    setStave(stave: Stave): this;
    /** Pre-render formatting. */
    preFormat(): this;
    /** Draw the notehead. */
    draw(): void;
}
