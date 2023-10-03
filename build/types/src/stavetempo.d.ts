import { Stave } from './stave';
import { StaveModifier } from './stavemodifier';
export interface StaveTempoOptions {
    bpm?: number;
    duration?: string;
    dots?: number;
    name?: string;
}
export declare class StaveTempo extends StaveModifier {
    #private;
    static get CATEGORY(): string;
    protected tempo: StaveTempoOptions;
    constructor(tempo: StaveTempoOptions, x: number, shiftY: number);
    setTempo(tempo: StaveTempoOptions): this;
    draw(stave: Stave, shiftX: number): this;
}
