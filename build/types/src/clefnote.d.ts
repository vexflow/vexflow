import { BoundingBox } from './boundingbox';
import { Clef } from './clef';
import { Note } from './note';
/** ClefNote implements clef annotations in measures. */
export declare class ClefNote extends Note {
    static get CATEGORY(): string;
    protected clef: Clef;
    constructor(type: string, size?: string, annotation?: string);
    /** Set clef type, size and annotation. */
    setType(type: string, size: string, annotation?: string): this;
    /** Get associated clef. */
    getClef(): Clef;
    preFormat(): this;
    /** Render clef note. */
    draw(): void;
    getBoundingBox(): BoundingBox;
}
