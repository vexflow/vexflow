import { ElementStyle } from './element';
import { Modifier } from './modifier';
import { ModifierContextState } from './modifiercontext';
export interface BendPhrase {
    x?: number;
    type: number;
    text: string;
    width?: number;
    drawWidth?: number;
}
/** Bend implements tablature bends. */
export declare class Bend extends Modifier {
    static get CATEGORY(): string;
    static get UP(): number;
    static get DOWN(): number;
    static format(bends: Bend[], state: ModifierContextState): boolean;
    protected tap: string;
    protected phrase: BendPhrase[];
    protected styleLine: ElementStyle;
    /** Set the element style used for rendering the lines. */
    setStyleLine(style: ElementStyle): this;
    /** Get the element style used for rendering the lines. */
    getStyleLine(): ElementStyle;
    renderOptions: {
        releaseWidth: number;
        bendWidth: number;
    };
    /**
     * Example of a phrase:
     * ```
     *    [{
     *     type: UP,
     *     text: "whole"
     *     width: 8;
     *   },
     *   {
     *     type: DOWN,
     *     text: "whole"
     *     width: 8;
     *   },
     *   {
     *     type: UP,
     *     text: "half"
     *     width: 8;
     *   },
     *   {
     *     type: UP,
     *     text: "whole"
     *     width: 8;
     *   },
     *   {
     *     type: DOWN,
     *     text: "1 1/2"
     *     width: 8;
     *   }]
     * ```
     */
    constructor(phrase: BendPhrase[]);
    /** Set horizontal shift in pixels. */
    setXShift(value: number): this;
    setTap(value: string): this;
    getTextHeight(): number;
    /** Recalculate width. */
    protected updateWidth(): this;
    /** Draw the bend on the rendering context. */
    draw(): void;
}
