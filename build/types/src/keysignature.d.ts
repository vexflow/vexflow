import { BoundingBox } from './boundingbox';
import { Stave } from './stave';
import { StaveModifier } from './stavemodifier';
export declare class KeySignature extends StaveModifier {
    static get CATEGORY(): string;
    protected paddingForced: boolean;
    protected formatted?: boolean;
    protected cancelKeySpec?: string;
    protected accList: {
        type: string;
        line: number;
    }[];
    protected keySpec?: string;
    protected alterKeySpec?: string[];
    constructor(keySpec: string, cancelKeySpec?: string, alterKeySpec?: string[]);
    protected convertToGlyph(acc: {
        type: string;
        line: number;
    }, nextAcc: {
        type: string;
        line: number;
    }, stave: Stave): void;
    cancelKey(spec: string): this;
    protected convertToCancelAccList(spec: string): {
        type: string;
        accList: {
            type: string;
            line: number;
        }[];
    } | undefined;
    addToStave(stave: Stave): this;
    setStave(stave: Stave): this;
    getBoundingBox(): BoundingBox;
    protected calculateDimensions(): void;
    protected convertAccLines(clef: string, type?: string, accList?: {
        type: string;
        line: number;
    }[]): void;
    getPadding(index: number): number;
    getWidth(): number;
    setKeySig(keySpec: string, cancelKeySpec?: string, alterKeySpec?: string[]): this;
    alterKey(alterKeySpec: string[]): this;
    protected convertToAlterAccList(alterKeySpec: string[]): void;
    /**
     * Format and position the modifier.
     * If no stave is set, a dummy stave is created.
     */
    format(): void;
    draw(): void;
}
