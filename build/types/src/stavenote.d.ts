import { Beam } from './beam';
import { BoundingBox } from './boundingbox';
import { ElementStyle } from './element';
import { ModifierContextState } from './modifiercontext';
import { Note, NoteStruct } from './note';
import { NoteHead } from './notehead';
import { Stave } from './stave';
import { StemOptions } from './stem';
import { StemmableNote } from './stemmablenote';
export interface StaveNoteHeadBounds {
    yTop: number;
    yBottom: number;
    displacedX?: number;
    nonDisplacedX?: number;
    highestLine: number;
    lowestLine: number;
    highestDisplacedLine?: number;
    lowestDisplacedLine?: number;
    highestNonDisplacedLine: number;
    lowestNonDisplacedLine: number;
}
export interface StaveNoteFormatSettings {
    line: number;
    maxLine: number;
    minLine: number;
    isrest: boolean;
    stemDirection?: number;
    stemMax: number;
    stemMin: number;
    voiceShift: number;
    isDisplaced: boolean;
    note: StaveNote;
}
export interface StaveNoteStruct extends NoteStruct {
    /** `Stem.UP` or `Stem.DOWN`. */
    stemDirection?: number;
    autoStem?: boolean;
    strokePx?: number;
    octaveShift?: number;
    clef?: string;
}
export declare class StaveNote extends StemmableNote {
    static DEBUG: boolean;
    static get CATEGORY(): string;
    static get LEDGER_LINE_OFFSET(): number;
    static get minNoteheadPadding(): number;
    /** Format notes inside a ModifierContext. */
    static format(notes: StaveNote[], state: ModifierContextState): boolean;
    static postFormat(notes: Note[]): boolean;
    minLine: number;
    maxLine: number;
    protected readonly clef: string;
    protected readonly octaveShift?: number;
    protected displaced: boolean;
    protected dotShiftY: number;
    protected useDefaultHeadX: boolean;
    protected ledgerLineStyle: ElementStyle;
    private _noteHeads;
    private sortedKeyProps;
    constructor(noteStruct: StaveNoteStruct);
    reset(): this;
    setBeam(beam: Beam): this;
    buildStem(): this;
    buildNoteHeads(): NoteHead[];
    autoStem(): void;
    calculateOptimalStemDirection(): number;
    calculateKeyProps(): void;
    getBoundingBox(): BoundingBox;
    getLineNumber(isTopNote?: boolean): number;
    /**
     * @returns true if this note is a type of rest. Rests don't have pitches, but take up space in the score.
     */
    isRest(): boolean;
    isChord(): boolean;
    hasStem(): boolean;
    hasFlag(): boolean;
    getStemX(): number;
    getYForTopText(textLine: number): number;
    getYForBottomText(textLine: number): number;
    setStave(stave: Stave): this;
    isDisplaced(): boolean;
    setNoteDisplaced(displaced: boolean): this;
    getTieRightX(): number;
    getTieLeftX(): number;
    getLineForRest(): number;
    getModifierStartXY(position: number, index: number, options?: {
        forceFlagRight?: boolean;
    }): {
        x: number;
        y: number;
    };
    setStyle(style: ElementStyle): this;
    setStemStyle(style: ElementStyle): this;
    getStemStyle(): ElementStyle | undefined;
    setLedgerLineStyle(style: ElementStyle): void;
    getLedgerLineStyle(): ElementStyle;
    setFlagStyle(style: ElementStyle): void;
    getFlagStyle(): ElementStyle | undefined;
    /** Get the glyph width. */
    getGlyphWidth(): number;
    setKeyStyle(index: number, style: ElementStyle): this;
    setKeyLine(index: number, line: number): this;
    getKeyLine(index: number): number;
    getVoiceShiftWidth(): number;
    calcNoteDisplacements(): void;
    preFormat(): void;
    /**
     * @typedef {Object} noteHeadBounds
     * @property {number} yTop the highest notehead bound
     * @property {number} yBottom the lowest notehead bound
     * @property {number|Null} displacedX the starting x for displaced noteheads
     * @property {number|Null} nonDisplacedX the starting x for non-displaced noteheads
     * @property {number} highestLine the highest notehead line in traditional music line
     *  numbering (bottom line = 1, top line = 5)
     * @property {number} lowestLine the lowest notehead line
     * @property {number|false} highestDisplacedLine the highest staff line number
     *   for a displaced notehead
     * @property {number|false} lowestDisplacedLine
     * @property {number} highestNonDisplacedLine
     * @property {number} lowestNonDisplacedLine
     */
    /**
     * Get the staff line and y value for the highest & lowest noteheads
     * @returns {noteHeadBounds}
     */
    getNoteHeadBounds(): StaveNoteHeadBounds;
    getNoteHeadBeginX(): number;
    getNoteHeadEndX(): number;
    get noteHeads(): NoteHead[];
    drawLedgerLines(): void;
    drawModifiers(noteheadParam: NoteHead): void;
    shouldDrawFlag(): boolean;
    drawFlag(): void;
    drawNoteHeads(): void;
    drawStem(stemOptions?: StemOptions): void;
    /**
     * Override stemmablenote stem extension to adjust for distance from middle line.
     */
    getStemExtension(): number;
    draw(): void;
}
