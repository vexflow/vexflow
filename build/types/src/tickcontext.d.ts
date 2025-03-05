import { Fraction } from './fraction';
import { NoteMetrics } from './note';
import { Tickable } from './tickable';
export interface TickContextMetrics extends NoteMetrics {
    totalLeftPx: number;
    totalRightPx: number;
}
export interface TickContextOptions {
    tickID: number;
}
/**
 * TickContext formats abstract tickable objects, such as notes, chords, tabs, etc.
 *
 * It has a public attribute of `tContexts` which is a parent array of the TickContexts
 * in which this TickContext belongs.
 */
export declare class TickContext {
    protected readonly tickID: number;
    protected readonly tickables: Tickable[];
    protected readonly tickablesByVoice: Record<string, Tickable>;
    protected currentTick: Fraction;
    protected maxTicks: Fraction;
    protected padding: number;
    protected xBase: number;
    protected x: number;
    protected xOffset: number;
    protected notePx: number;
    protected glyphPx: number;
    protected leftDisplacedHeadPx: number;
    protected rightDisplacedHeadPx: number;
    protected modLeftPx: number;
    protected modRightPx: number;
    protected totalLeftPx: number;
    protected totalRightPx: number;
    protected maxTickable?: Tickable;
    protected minTicks?: Fraction;
    protected minTickable?: Tickable;
    tContexts: TickContext[];
    protected preFormatted: boolean;
    protected postFormatted: boolean;
    protected width: number;
    protected formatterMetrics: {
        freedom: {
            left: number;
            right: number;
        };
    };
    /**
     * Get the next TickContext from another TickContext, from the `.tContexts` array.
     */
    static getNextContext(tContext: TickContext): TickContext | undefined;
    constructor(options?: TickContextOptions);
    getTickID(): number;
    getX(): number;
    setX(x: number): this;
    getXBase(): number;
    setXBase(xBase: number): void;
    getXOffset(): number;
    setXOffset(xOffset: number): void;
    getWidth(): number;
    setPadding(padding: number): this;
    getMaxTicks(): Fraction;
    getMinTicks(): Fraction | undefined;
    getMaxTickable(): Tickable | undefined;
    getMinTickable(): Tickable | undefined;
    getTickables(): Tickable[];
    /**
     * Introduced on 2020-04-17 as getTickablesForVoice(voiceIndex).
     *   https://github.com/0xfe/vexflow/blame/dc97b0cc5bb93171c0038638c34362dc958222ca/src/tickcontext.js#L63
     * Renamed on 2021-08-05 to getTickableForVoice(voiceIndex). Method renamed to singular, since it returns one Tickable.
     */
    getTickableForVoice(voiceIndex: number): Tickable;
    getTickablesByVoice(): Record<string, Tickable>;
    getCenterAlignedTickables(): Tickable[];
    /** Gets widths context, note and left/right modifiers for formatting. */
    getMetrics(): TickContextMetrics;
    getCurrentTick(): Fraction;
    setCurrentTick(tick: Fraction): void;
    addTickable(tickable: Tickable, voiceIndex?: number): this;
    preFormat(): this;
    postFormat(): this;
    getFormatterMetrics(): {
        freedom: {
            left: number;
            right: number;
        };
    };
    /**
     * Move this tick context by `shift` pixels rightward, and adjust the
     * freedom on adjacent tickcontexts.
     * @param shift pixels to shift rightward.
     * @param prev the previous TickContext, whose right freedom will be increased by `shift`.
     * @param next the next TickContext, whose left freedom will be decreased by `shift`.
     */
    move(shift: number, prev?: TickContext, next?: TickContext): void;
    /**
     * Return the total cost of space deviations from formatter metrics for
     * each tickable in the context.  Used by formatters.
     *
     * Since FormatterMetrics.space.deviation is the amount each tickable is smaller
     * (negative) or wider (positive) than the mean amount of space allocated to that
     * duration, a negative return value means the tickables at this position are on average
     * getting less space than they should, while a positive number means they are getting
     * more space than they should.
     */
    getDeviationCost(): number;
    /**
     * Like getDeviationCost, but averages the cost of space deviations so that TickContexts
     * with more Tickables are not weighted more heavily.
     */
    getAverageDeviationCost(): number;
}
