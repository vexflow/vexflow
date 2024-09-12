import { Element } from './element';
import { RenderContext } from './rendercontext';
import { Stave } from './stave';
export interface MultimeasureRestRenderOptions {
    /** Extracted by Factory.MultiMeasureRest() and passed to the MultiMeasureRest constructor. */
    numberOfMeasures: number;
    /** Use rest symbols. Defaults to `false`, which renders a thick horizontal line with serifs at both ends. */
    useSymbols?: boolean;
    /** Horizontal spacing between rest symbol glyphs (if `useSymbols` is `true`).*/
    symbolSpacing?: number;
    /** Show the number of measures at the top. Defaults to `true`. */
    showNumber?: boolean;
    /** Vertical position of the "number of measures" text (measured in stave lines). Defaults to -0.5, which is above the stave. 6.5 is below the stave. */
    numberLine?: number;
    /** Font size of the "number of measures" text. */
    numberGlyphPoint?: number;
    /** Left padding from `stave.getX()`. */
    paddingLeft?: number;
    /** Right padding from `stave.getX() + stave.getWidth()` */
    paddingRight?: number;
    /** Vertical position of the rest line or symbols, expressed as stave lines. Default: 2. The top stave line is 1, and the bottom stave line is 5. */
    line?: number;
    /** Defaults to the number of vertical pixels between stave lines. Used for serif height or 2-bar / 4-bar symbol height. */
    spacingBetweenLinesPx?: number;
    /** Size of the semibreve (1-bar) rest symbol. Other symbols are scaled accordingly. */
    semibreveRestGlyphScale?: number;
    /** Thickness of the rest line. Used when `useSymbols` is false. Defaults to half the space between stave lines. */
    lineThickness?: number;
    /** Thickness of the rest line's serif. Used when `useSymbols` is false. */
    serifThickness?: number;
}
export declare class MultiMeasureRest extends Element {
    static get CATEGORY(): string;
    renderOptions: Required<MultimeasureRestRenderOptions>;
    protected xs: {
        left: number;
        right: number;
    };
    protected numberOfMeasures: number;
    protected stave?: Stave;
    protected hasPaddingLeft: boolean;
    protected hasPaddingRight: boolean;
    protected hasLineThickness: boolean;
    protected hasSymbolSpacing: boolean;
    /**
     *
     * @param numberOfMeasures Number of measures.
     * @param options The options object.
     */
    constructor(numberOfMeasures: number, options: MultimeasureRestRenderOptions);
    getXs(): {
        left: number;
        right: number;
    };
    setStave(stave: Stave): this;
    getStave(): Stave | undefined;
    checkStave(): Stave;
    drawLine(stave: Stave, ctx: RenderContext, left: number, right: number): void;
    drawSymbols(stave: Stave, ctx: RenderContext, left: number, right: number): void;
    draw(): void;
}
