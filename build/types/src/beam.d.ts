import { Element } from './element';
import { Fraction } from './fraction';
import { RenderContext } from './rendercontext';
import { StemmableNote } from './stemmablenote';
import { Voice } from './voice';
export declare const BEAM_LEFT = "L";
export declare const BEAM_RIGHT = "R";
export declare const BEAM_BOTH = "B";
export type PartialBeamDirection = typeof BEAM_LEFT | typeof BEAM_RIGHT | typeof BEAM_BOTH;
/** `Beams` span over a set of `StemmableNotes`. */
export declare class Beam extends Element {
    static get CATEGORY(): string;
    renderOptions: {
        flatBeamOffset?: number;
        flatBeams: boolean;
        secondaryBreakTicks?: number;
        showStemlets: boolean;
        beamWidth: number;
        maxSlope: number;
        minSlope: number;
        slopeIterations: number;
        slopeCost: number;
        stemletExtension: number;
        partialBeamLength: number;
        minFlatBeamOffset: number;
    };
    notes: StemmableNote[];
    postFormatted: boolean;
    slope: number;
    private readonly _stemDirection;
    private readonly _ticks;
    protected yShift: number;
    private breakOnIndexes;
    private _beamCount;
    private unbeamable?;
    /**
     * Overrides to default beam directions for secondary-level beams that do not
     * connect to any other note. See further explanation at
     * `setPartialBeamSideAt`
     */
    private forcedPartialDirections;
    /** Get the direction of the beam */
    getStemDirection(): number;
    /**
     * Get the default beam groups for a provided time signature.
     * Attempt to guess if the time signature is not found in table.
     * Currently this is fairly naive.
     */
    static getDefaultBeamGroups(timeSig: string): Fraction[];
    /**
     * A helper function to automatically build basic beams for a voice. For more
     * complex auto-beaming use `Beam.generateBeams()`.
     * @param voice the voice to generate the beams for
     * @param stemDirection a stem direction to apply to the entire voice
     * @param groups an array of `Fraction` representing beat groupings for the beam
     */
    static applyAndGetBeams(voice: Voice, stemDirection?: number, groups?: Fraction[]): Beam[];
    /**
     * A helper function to autimatically build beams for a voice with
     * configuration options.
     *
     * Example configuration object:
     *
     * ```
     * config = {
     *   groups: [new VexFlow.Fraction(2, 8)],
     *   stemDirection: -1,
     *   beamRests: true,
     *   beamMiddleOnly: true,
     *   showStemlets: false
     * };
     * ```
     * @param notes an array of notes to create the beams for
     * @param config the configuration object
     * @param config.stemDirection set to apply the same direction to all notes
     * @param config.beamRests set to `true` to include rests in the beams
     * @param config.beamMiddleOnly set to `true` to only beam rests in the middle of the beat
     * @param config.showStemlets set to `true` to draw stemlets for rests
     * @param config.maintainStemDirections set to `true` to not apply new stem directions
     * @param config.groups array of `Fractions` that represent the beat structure to beam the notes
     *
     */
    static generateBeams(notes: StemmableNote[], config?: {
        flatBeamOffset?: number;
        flatBeams?: boolean;
        secondaryBreaks?: string;
        showStemlets?: boolean;
        maintainStemDirections?: boolean;
        beamMiddleOnly?: boolean;
        beamRests?: boolean;
        groups?: Fraction[];
        stemDirection?: number;
    }): Beam[];
    constructor(notes: StemmableNote[], autoStem?: boolean);
    /** Get the notes in this beam. */
    getNotes(): StemmableNote[];
    /** Get the max number of beams in the set of notes. */
    getBeamCount(): number;
    /** Set which note `indexes` to break the secondary beam at. */
    breakSecondaryAt(indexes: number[]): this;
    /**
     * Forces the direction of a partial beam (a secondary-level beam that exists
     * on one note only of the beam group). This is useful in rhythms such as 6/8
     * eighth-sixteenth-eighth-sixteenth, where the direction of the beam on the
     * first sixteenth note can help imply whether the rhythm is to be felt as
     * three groups of eighth notes (typical) or as two groups of three-sixteenths
     * (less common):
     * ```
     *  ┌───┬──┬──┐      ┌──┬──┬──┐
     *  │   ├─ │ ─┤  vs  │ ─┤  │ ─┤
     *  │   │  │  │      │  │  │  │
     * ```
     */
    setPartialBeamSideAt(noteIndex: number, side: PartialBeamDirection): this;
    /**
     * Restore the default direction of a partial beam (a secondary-level beam
     * that does not connect to any other notes).
     */
    unsetPartialBeamSideAt(noteIndex: number): this;
    /**
     * @param firstX specified in pixels.
     * @param firstY specified in pixels.
     *
     * @return the y coordinate for linear function.
     */
    getSlopeY(x: number, firstX: number, firstY: number, slope: number): number;
    /** Calculate the best possible slope for the provided notes. */
    calculateSlope(): void;
    /** Calculate a slope and y-shift for flat beams. */
    calculateFlatSlope(): void;
    /** Return the Beam y offset. */
    getBeamYToDraw(): number;
    /**
     * Create new stems for the notes in the beam, so that each stem
     * extends into the beams.
     */
    applyStemExtensions(): void;
    /** Return upper level beam direction. */
    lookupBeamDirection(duration: string, prevTick: number, tick: number, nextTick: number, noteIndex: number): PartialBeamDirection;
    /** Get the x coordinates for the beam lines of specific `duration`. */
    getBeamLines(duration: string): {
        start: number;
        end?: number;
    }[];
    /** Render the stems for each note. */
    protected drawStems(ctx: RenderContext): void;
    protected drawBeamLines(ctx: RenderContext): void;
    /** Pre-format the beam. */
    preFormat(): this;
    /**
     * Post-format the beam. This can only be called after
     * the notes in the beam have both `x` and `y` values. ie: they've
     * been formatted and have staves.
     */
    postFormat(): void;
    /** Render the beam to the canvas context */
    draw(): void;
}
