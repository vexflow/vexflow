import { StaveModifier } from './stavemodifier';
export interface StaveTempoOptions {
    /** free text i.e.: 'Adagio', 'Andate grazioso', ... */
    name?: string;
    /**
     * Indicates whether or not to put the metronome mark in parentheses.
     * It is no if not specified.
     * */
    parenthesis?: boolean;
    /**
     * Indicates the graphical note type to use in a metronome mark.
     * see: `StaveTempo.durationToCode`.
     */
    duration?: string;
    /**
     * Specifies the number of augmentation dots for a metronome mark note.
     */
    dots?: number;
    /**
     * Specifies the beats per minute associated with the metronome mark.
     * i.e.: 120, "c. 108", "132-144"
     */
    bpm?: number | string;
    /**
     * Indicates the graphical note type to use at the right of the equation
     *  in a metronome mark.
     * see: `StaveTempo.durationToCode`.
     */
    duration2?: string;
    /**
     * Specifies the number of augmentation dots for a metronome mark note
     * at the right of the equation.
     */
    dots2?: number;
}
export declare class StaveTempo extends StaveModifier {
    static get CATEGORY(): string;
    protected tempo: StaveTempoOptions;
    constructor(tempo: StaveTempoOptions, x: number, shiftY: number);
    protected durationToCode: Record<string, string>;
    setTempo(tempo: StaveTempoOptions): this;
    draw(): void;
}
