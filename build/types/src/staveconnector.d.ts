import { Element } from './element';
import { Stave } from './stave';
/**
 * see {@link StaveConnector.type} & {@link StaveConnector.typeString}
 */
export type StaveConnectorType = 'singleRight' | 'singleLeft' | 'single' | 'double' | 'brace' | 'bracket' | 'boldDoubleLeft' | 'boldDoubleRight' | 'thinDouble' | 'none' | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
/** StaveConnector implements the connector lines between staves of a system. */
export declare class StaveConnector extends Element {
    static get CATEGORY(): string;
    /**
     * SINGLE_LEFT and SINGLE are the same value for compatibility
     * with older versions of vexflow which didn't have right sided
     * stave connectors.
     */
    static readonly type: Record<string, Exclude<StaveConnectorType, string>>;
    /**
     * Connector type:
     * * "singleRight"
     * * "singleLeft"
     * * "single"
     * * "double"
     * * "brace"
     * * "bracket"
     * * "boldDoubleLeft"
     * * "boldDoubleRight"
     * * "thinDouble"
     * * "none"
     */
    static readonly typeString: Record<Exclude<StaveConnectorType, number>, Exclude<StaveConnectorType, string>>;
    protected width: number;
    protected texts: {
        content: string;
        options: {
            shiftX: number;
            shiftY: number;
        };
    }[];
    protected type: (typeof StaveConnector)['type'][keyof (typeof StaveConnector)['type']];
    readonly topStave: Stave;
    readonly bottomStave: Stave;
    readonly thickness: number;
    protected xShift: number;
    constructor(topStave: Stave, bottomStave: Stave);
    /**
     * Set type.
     * @param type see {@link StaveConnector.type} & {@link StaveConnector.typeString}
     */
    setType(type: StaveConnectorType): this;
    /**
     * Get type.
     * @returns number {@link StaveConnector.type}
     */
    getType(): number;
    /** Set optional associated Text. */
    setText(text: string, options?: {
        shiftX?: number;
        shiftY?: number;
    }): this;
    setXShift(xShift: number): this;
    getXShift(): number;
    /** Render connector and associated text. */
    draw(): void;
}
