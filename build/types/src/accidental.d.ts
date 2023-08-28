import { Glyph } from './glyph';
import { Modifier } from './modifier';
import { ModifierContextState } from './modifiercontext';
import { Note } from './note';
import { Voice } from './voice';
/**
 * An `Accidental` inherits from `Modifier`, and is formatted within a
 * `ModifierContext`. Accidentals are modifiers that can be attached to
 * notes. Support is included for both western and microtonal accidentals.
 *
 * See `tests/accidental_tests.ts` for usage examples.
 */
export declare class Accidental extends Modifier {
    #private;
    /** Accidental code provided to the constructor. */
    readonly type: string;
    /** To enable logging for this class. Set `Vex.Flow.Accidental.DEBUG` to `true`. */
    static DEBUG: boolean;
    protected accidental: {
        code: string;
        parenRightPaddingAdjustment: number;
    };
    renderOptions: {
        parenLeftPadding: number;
        fontScale: number;
        parenRightPadding: number;
    };
    protected cautionary: boolean;
    protected glyph: Glyph;
    protected parenRight?: Glyph;
    protected parenLeft?: Glyph;
    /** Accidentals category string. */
    static get CATEGORY(): string;
    /** Arrange accidentals inside a ModifierContext. */
    static format(accidentals: Accidental[], state: ModifierContextState): void;
    /**
     * Use this method to automatically apply accidentals to a set of `voices`.
     * The accidentals will be remembered between all the voices provided.
     * Optionally, you can also provide an initial `keySignature`.
     */
    static applyAccidentals(voices: Voice[], keySignature: string): void;
    /**
     * Create accidental.
     * @param type value from `Vex.Flow.accidentalCodes.accidentals` table in `tables.ts`.
     * For example: `#`, `##`, `b`, `n`, etc.
     */
    constructor(type: string);
    protected reset(): void;
    /** Get width in pixels. */
    getWidth(): number;
    /** Attach this accidental to `note`, which must be a `StaveNote`. */
    setNote(note: Note): this;
    /** If called, draws parenthesis around accidental. */
    setAsCautionary(): this;
    /** Render accidental onto canvas. */
    draw(): void;
}
