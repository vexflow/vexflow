import { Note, NoteStruct } from './note';
export interface CrescendoParams {
    reverse: boolean;
    height: number;
    y: number;
    beginX: number;
    endX: number;
}
export declare class Crescendo extends Note {
    static DEBUG: boolean;
    /** Crescendo category string. */
    static get CATEGORY(): string;
    protected decrescendo: boolean;
    protected line: number;
    protected options: {
        extendLeft: number;
        extendRight: number;
        yShift: number;
    };
    constructor(noteStruct: NoteStruct);
    setLine(line: number): this;
    setHeight(height: number): this;
    setDecrescendo(decresc: boolean): this;
    preFormat(): this;
    draw(): void;
}
