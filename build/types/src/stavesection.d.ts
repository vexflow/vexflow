import { Stave } from './stave';
import { StaveModifier } from './stavemodifier';
export declare class StaveSection extends StaveModifier {
    static get CATEGORY(): string;
    protected drawRect: boolean;
    constructor(section: string, x: number, yShift: number, drawRect?: boolean);
    setStaveSection(section: string): this;
    draw(stave: Stave, xShift: number): this;
}
