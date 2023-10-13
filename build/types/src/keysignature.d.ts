import { Element } from './element';
import { Stave } from './stave';
import { StaveModifier } from './stavemodifier';
export declare class KeySignature extends StaveModifier {
    static get CATEGORY(): string;
    protected glyphs: Element[];
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
    convertToGlyph(acc: {
        type: string;
        line: number;
    }, nextAcc: {
        type: string;
        line: number;
    }, stave: Stave): void;
    cancelKey(spec: string): this;
    convertToCancelAccList(spec: string): {
        type: string;
        accList: {
            type: string;
            line: number;
        }[];
    } | undefined;
    addToStave(stave: Stave): this;
    convertAccLines(clef: string, type?: string, accList?: {
        type: string;
        line: number;
    }[]): void;
    getPadding(index: number): number;
    getWidth(): number;
    setKeySig(keySpec: string, cancelKeySpec?: string, alterKeySpec?: string[]): this;
    alterKey(alterKeySpec: string[]): this;
    convertToAlterAccList(alterKeySpec: string[]): void;
    format(): void;
    protected calculateWidth(): void;
    draw(): void;
}
