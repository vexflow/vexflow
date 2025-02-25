import { Modifier } from './modifier';
/** Tremolo implements tremolo notation. */
export declare class Tremolo extends Modifier {
    static get CATEGORY(): string;
    protected readonly num: number;
    /**
     * @param num number of bars
     */
    constructor(num: number);
    /** Draw the tremolo on the rendering context. */
    draw(): void;
}
