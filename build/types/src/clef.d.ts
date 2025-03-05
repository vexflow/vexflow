import { Stave } from './stave';
import { StaveModifier } from './stavemodifier';
/**
 * Clef implements various types of clefs that can be rendered on a stave.
 *
 * See `tests/clef_tests.ts` for usage examples.
 */
export declare class Clef extends StaveModifier {
    /** To enable logging for this class, set `VexFlow.Clef.DEBUG` to `true`. */
    static DEBUG: boolean;
    static get CATEGORY(): string;
    /**
     * The attribute `clef` must be a key from
     * `Clef.types`
     */
    code: string;
    line: number;
    protected size: string;
    protected type: string;
    /**
     * Every clef name is associated with a glyph code from the font file
     * and a default stave line number.
     */
    static get types(): Record<string, {
        code: string;
        line: number;
    }>;
    /** Create a new clef. */
    constructor(type: string, size?: string, annotation?: string);
    /** Set clef type, size and annotation. */
    setType(type: string, size?: string, annotation?: string): this;
    /** Get point for clefs. */
    static getPoint(size?: string): number;
    /** Set associated stave. */
    setStave(stave: Stave): this;
    /** Render clef. */
    draw(): void;
}
