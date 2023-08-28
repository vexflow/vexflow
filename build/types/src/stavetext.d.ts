import { Stave } from './stave';
import { StaveModifier } from './stavemodifier';
export declare class StaveText extends StaveModifier {
    static get CATEGORY(): string;
    protected options: {
        shiftX: number;
        shiftY: number;
        justification: number;
    };
    protected text: string;
    protected shiftX?: number;
    protected shiftY?: number;
    constructor(text: string, position: number, options?: {
        shiftX?: number;
        shiftY?: number;
        justification?: number;
    });
    setStaveText(text: string): this;
    setShiftX(x: number): this;
    setShiftY(y: number): this;
    setText(text: string): this;
    draw(stave: Stave): this;
}
