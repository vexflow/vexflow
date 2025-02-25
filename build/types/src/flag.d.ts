import { Element } from './element';
/**
 * `Flags` are typically not manipulated
 * directly, but used internally in `StaveNote`.
 */
export declare class Flag extends Element {
    /** To enable logging for this class. Set `VexFlow.NoteHead.DEBUG` to `true`. */
    static DEBUG: boolean;
    static get CATEGORY(): string;
    /** Draw the notehead. */
    draw(): void;
}
