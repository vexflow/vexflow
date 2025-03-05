import { Builder } from './easyscore';
import { Modifier } from './modifier';
import { ModifierContextState } from './modifiercontext';
import { Note } from './note';
import { StemmableNote } from './stemmablenote';
export interface ArticulationStruct {
    code?: string;
    aboveCode?: string;
    belowCode?: string;
    betweenLines: boolean;
}
export declare function getTopY(note: Note, textLine: number): number;
export declare function getBottomY(note: Note, textLine: number): number;
/**
 * Get the initial offset of the articulation from the y value of the starting position.
 * This is required because the top/bottom text positions already have spacing applied to
 * provide a "visually pleasant" default position. However the y values provided from
 * the stavenote's top/bottom do *not* have any pre-applied spacing. This function
 * normalizes this asymmetry.
 * @param note
 * @param position
 * @returns
 */
export declare function getInitialOffset(note: Note, position: number): number;
/**
 * Articulations and Accents are modifiers that can be
 * attached to notes. The complete list of articulations is available in
 * `tables.ts` under `VexFlow.articulationCodes`.
 *
 * See `tests/articulation_tests.ts` for usage examples.
 */
export declare class Articulation extends Modifier {
    /** To enable logging for this class. Set `VexFlow.Articulation.DEBUG` to `true`. */
    static DEBUG: boolean;
    /** Articulations category string. */
    static get CATEGORY(): string;
    protected static readonly INITIAL_OFFSET: number;
    /** Articulation code provided to the constructor. */
    readonly type: string;
    protected articulation: ArticulationStruct;
    protected heightShift: number;
    /**
     * FIXME:
     * Most of the complex formatting logic (ie: snapping to space) is
     * actually done in .render(). But that logic belongs in this method.
     *
     * Unfortunately, this isn't possible because, by this point, stem lengths
     * have not yet been finalized. Finalized stem lengths are required to determine the
     * initial position of any stem-side articulation.
     *
     * This indicates that all objects should have their stave set before being
     * formatted. It can't be an optional if you want accurate vertical positioning.
     * Consistently positioned articulations that play nice with other modifiers
     * won't be possible until we stop relying on render-time formatting.
     *
     * Ideally, when this function has completed, the vertical articulation positions
     * should be ready to render without further adjustment. But the current state
     * is far from this ideal.
     */
    static format(articulations: Articulation[], state: ModifierContextState): boolean;
    static easyScoreHook({ articulations }: {
        articulations: string;
    }, note: StemmableNote, builder: Builder): void;
    /**
     * Create a new articulation.
     * @param type entry in `VexFlow.articulationCodes` in `tables.ts` or Glyph code.
     *
     * Notes default positions (see https://w3c.github.io/smufl/latest/tables/articulation.html):
     * - Even codes will be positioned ABOVE
     * - Odd codes will be positioned BELOW
     */
    constructor(type: string);
    protected reset(): void;
    /** Set if articulation should be rendered between lines. */
    setBetweenLines(betweenLines?: boolean): this;
    /** Render articulation in position next to note. */
    draw(): void;
}
