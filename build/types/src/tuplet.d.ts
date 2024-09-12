/**
 * ## Description
 *
 * Create a new tuplet from the specified notes. The notes must
 * be part of the same voice. If they are of different rhythmic
 * values, then options.numNotes must be set.
 *
 * @constructor
 * @param {Array.<VexFlow.StaveNote>} A set of notes: staveNotes,
 *   notes, etc... any class that inherits stemmableNote at some
 *   point in its prototype chain.
 * @param options: object {
 *
 *   numNotes: fit this many notes into...
 *   notesOccupied: ...the space of this many notes
 *
 *       Together, these two properties make up the tuplet ratio
 *     in the form of numNotes : notesOccupied.
 *       numNotes defaults to the number of notes passed in, so
 *     it is important that if you omit this property, all of
 *     the notes passed should be of the same note value.
 *       notesOccupied defaults to 2 -- so you should almost
 *     certainly pass this parameter for anything other than
 *     a basic triplet.
 *
 *   location:
 *     default 1, which is above the notes: ┌─── 3 ───┐
 *      -1 is below the notes └─── 3 ───┘
 *
 *   bracketed: boolean, draw a bracket around the tuplet number
 *     when true: ┌─── 3 ───┐   when false: 3
 *     defaults to true if notes are not beamed, false otherwise
 *
 *   ratioed: boolean
 *     when true: ┌─── 7:8 ───┐, when false: ┌─── 7 ───┐
 *     defaults to true if the difference between numNotes and
 *     notesOccupied is greater than 1.
 *
 *   yOffset: int, default 0
 *     manually offset a tuplet, for instance to avoid collisions
 *     with articulations, etc...
 * }
 */
import { Element } from './element';
import { Note } from './note';
export interface TupletOptions {
    bracketed?: boolean;
    location?: number;
    notesOccupied?: number;
    numNotes?: number;
    ratioed?: boolean;
    yOffset?: number;
    textYOffset?: number;
}
export declare const enum TupletLocation {
    BOTTOM = -1,
    TOP = 1
}
export declare class Tuplet extends Element {
    static get CATEGORY(): string;
    notes: Note[];
    protected options: Required<TupletOptions>;
    protected textElement: Element;
    static get LOCATION_TOP(): number;
    static get LOCATION_BOTTOM(): number;
    static get NESTING_OFFSET(): number;
    constructor(notes: Note[], options?: TupletOptions);
    attach(): void;
    detach(): void;
    /**
     * Set whether or not the bracket is drawn.
     */
    setBracketed(bracketed: boolean): this;
    /**
     * Set whether or not the ratio is shown.
     */
    setRatioed(ratioed: boolean): this;
    /**
     * Set the tuplet indicator to be displayed either on the top or bottom of the stave.
     */
    setTupletLocation(location: number): this;
    getNotes(): Note[];
    getNoteCount(): number;
    getNotesOccupied(): number;
    setNotesOccupied(notes: number): void;
    resolveGlyphs(): void;
    getNestedTupletCount(): number;
    getYPosition(): number;
    draw(): void;
}
