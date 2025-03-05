import { StaveModifier } from './stavemodifier';
export declare enum VoltaType {
    NONE = 1,
    BEGIN = 2,
    MID = 3,
    END = 4,
    BEGIN_END = 5
}
export declare class Volta extends StaveModifier {
    static get CATEGORY(): string;
    static get type(): typeof VoltaType;
    protected type: number;
    constructor(type: number, label: string, x: number, yShift: number);
    draw(): void;
}
