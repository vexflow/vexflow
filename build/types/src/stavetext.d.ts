import { StaveModifier } from './stavemodifier';
export declare class StaveText extends StaveModifier {
    static get CATEGORY(): string;
    protected justification: number;
    constructor(text: string, position: number, options?: {
        shiftX?: number;
        shiftY?: number;
        justification?: number;
    });
    draw(): void;
}
