import { Stave } from './stave';
import { StaveModifier } from './stavemodifier';
export declare class Repetition extends StaveModifier {
    static get CATEGORY(): string;
    static readonly type: {
        NONE: number;
        CODA_LEFT: number;
        CODA_RIGHT: number;
        SEGNO_LEFT: number;
        SEGNO_RIGHT: number;
        DC: number;
        DC_AL_CODA: number;
        DC_AL_FINE: number;
        DS: number;
        DS_AL_CODA: number;
        DS_AL_FINE: number;
        FINE: number;
        TO_CODA: number;
    };
    protected symbolType: number;
    protected xShift: number;
    protected yShift: number;
    constructor(type: number, x: number, yShift: number);
    setShiftX(x: number): this;
    setShiftY(y: number): this;
    draw(): void;
    drawCodaFixed(stave: Stave, x: number): this;
    drawSegnoFixed(stave: Stave, x: number): this;
    drawSymbolText(stave: Stave, x: number, text: string, drawCoda: boolean): this;
}
