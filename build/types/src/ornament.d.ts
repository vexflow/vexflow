import { Element } from './element';
import { Modifier } from './modifier';
import { ModifierContextState } from './modifiercontext';
import { Note } from './note';
/**
 * Ornament implements ornaments as modifiers that can be
 * attached to notes. The complete list of ornaments is available in
 * `tables.ts` under `VexFlow.ornamentCodes`.
 *
 * See `tests/ornament_tests.ts` for usage examples.
 */
export declare class Ornament extends Modifier {
    /** To enable logging for this class. Set `VexFlow.Ornament.DEBUG` to `true`. */
    static DEBUG: boolean;
    /** Ornaments category string. */
    static get CATEGORY(): string;
    static get minPadding(): number;
    protected ornamentAlignWithNoteHead: string[] | boolean;
    protected type: string;
    protected delayed: boolean;
    protected adjustForStemDirection: boolean;
    renderOptions: {
        accidentalUpperPadding: number;
        accidentalLowerPadding: number;
    };
    protected accidentalUpper?: Element;
    protected accidentalLower?: Element;
    protected delayXShift?: number;
    /** Arrange ornaments inside `ModifierContext` */
    static format(ornaments: Ornament[], state: ModifierContextState): boolean;
    /**
     * ornamentNoteTransition means the jazz ornament represents an effect from one note to another,
     * these are generally on the top of the staff.
     */
    static get ornamentNoteTransition(): string[];
    /**
     * ornamentAttack indicates something that happens in the attach, placed before the note and
     * any accidentals
     */
    static get ornamentAttack(): string[];
    /**
     * The ornament is aligned based on the note head, but without regard to whether the
     * stem goes up or down.
     */
    static get ornamentAlignWithNoteHead(): string[];
    /**
     * An ornament that happens on the release of the note, generally placed after the
     * note and overlapping the next beat/measure..
     */
    static get ornamentRelease(): string[];
    static get ornamentLeft(): string[];
    static get ornamentRight(): string[];
    static get ornamentYShift(): string[];
    /** ornamentArticulation goes above/below the note based on space availablity */
    static get ornamentArticulation(): string[];
    /**
     * Create a new ornament of type `type`, which is an entry in
     * `VexFlow.ornamentCodes` in `tables.ts`.
     */
    constructor(type: string);
    /** Set note attached to ornament. */
    setNote(note: Note): this;
    /** Set whether the ornament is to be delayed. */
    setDelayed(delayed: boolean): this;
    /** Set the upper accidental for the ornament. */
    setUpperAccidental(accid: string): this;
    /** Set the lower accidental for the ornament. */
    setLowerAccidental(accid: string): this;
    /** Render ornament in position next to note. */
    draw(): void;
}
