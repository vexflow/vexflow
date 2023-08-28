import { BoundingBox } from './boundingbox';
import { ElementStyle } from './element';
import { Note, NoteStruct } from './note';
import { Stave } from './stave';
export interface NoteHeadMetrics {
    minPadding?: number;
    displacedShiftX?: number;
}
export interface NoteHeadStruct extends NoteStruct {
    line?: number;
    glyphFontScale?: number;
    slashed?: boolean;
    style?: ElementStyle;
    stemDownXOffset?: number;
    stemUpXOffset?: number;
    customGlyphCode?: string;
    xShift?: number;
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
    /** To enable logging for this class. Set `Vex.Flow.NoteHead.DEBUG` to `true`. */
    static DEBUG: boolean;
    static get CATEGORY(): string;
    glyphCode: string;
    protected customGlyph: boolean;
    protected stemUpXOffset: number;
    protected stemDownXOffset: number;
    protected displaced: boolean;
    protected stemDirection: number;
    protected line: number;
    protected index?: number;
    protected slashed: boolean;
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
    /** Get the `BoundingBox` for the `NoteHead`. */
    getBoundingBox(): BoundingBox;
    /** Set notehead to a provided `stave`. */
    setStave(stave: Stave): this;
    /** Pre-render formatting. */
    preFormat(): this;
    /** Draw the notehead. */
    draw(): void;
}
