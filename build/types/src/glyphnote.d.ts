import { Note, NoteStruct } from './note';
export interface GlyphNoteOptions {
    ignoreTicks?: boolean;
    line?: number;
}
export declare class GlyphNote extends Note {
    static get CATEGORY(): string;
    protected options: Required<GlyphNoteOptions>;
    constructor(glyph: string, noteStruct: NoteStruct, options?: GlyphNoteOptions);
    setGlyph(glyph: string): this;
    preFormat(): this;
    drawModifiers(): void;
    draw(): void;
}
