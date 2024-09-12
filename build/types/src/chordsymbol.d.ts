import { BoundingBox } from './boundingbox';
import { Element } from './element';
import { Modifier } from './modifier';
import { ModifierContextState } from './modifiercontext';
export declare class ChordSymbolBlock extends Element {
    symbolModifier: SymbolModifiers;
    vAlign: boolean;
    constructor(text: string, symbolModifier: SymbolModifiers, xShift: number, yShift: number, vAlign: boolean);
    isSuperscript(): boolean;
    isSubscript(): boolean;
}
export declare enum ChordSymbolHorizontalJustify {
    LEFT = 1,
    CENTER = 2,
    RIGHT = 3,
    CENTER_STEM = 4
}
export declare enum ChordSymbolVerticalJustify {
    TOP = 1,
    BOTTOM = 2
}
export declare enum SymbolModifiers {
    NONE = 1,
    SUBSCRIPT = 2,
    SUPERSCRIPT = 3
}
/**
 * ChordSymbol is a modifier that creates a chord symbol above/below a chord.
 * As a modifier, it is attached to an existing note.
 */
export declare class ChordSymbol extends Modifier {
    static DEBUG: boolean;
    static get CATEGORY(): string;
    static readonly HorizontalJustify: typeof ChordSymbolHorizontalJustify;
    static readonly HorizontalJustifyString: Record<string, ChordSymbolHorizontalJustify>;
    static readonly VerticalJustify: typeof ChordSymbolVerticalJustify;
    static readonly VerticalJustifyString: Record<string, ChordSymbolVerticalJustify>;
    static get superSubRatio(): number;
    static get spacingBetweenBlocks(): number;
    static get superscriptOffset(): number;
    static get subscriptOffset(): number;
    static readonly glyphs: Record<string, string>;
    static readonly symbolModifiers: typeof SymbolModifiers;
    static get minPadding(): number;
    /**
     * Estimate the width of the whole chord symbol, based on the sum of the widths of the individual blocks.
     * Estimate how many lines above/below the staff we need.
     */
    static format(symbols: ChordSymbol[], state: ModifierContextState): boolean;
    protected symbolBlocks: ChordSymbolBlock[];
    protected horizontal: number;
    protected vertical: number;
    protected reportWidth: boolean;
    constructor();
    /**
     * The offset is specified in `em`. Scale this value by the font size in pixels.
     */
    get superscriptOffset(): number;
    get subscriptOffset(): number;
    setReportWidth(value: boolean): this;
    getReportWidth(): boolean;
    /**
     * ChordSymbol allows multiple blocks so we can mix glyphs and font text.
     * Each block can have its own vertical orientation.
     */
    getSymbolBlock(params?: Partial<{
        text: string;
        symbolModifier: SymbolModifiers;
    }>): ChordSymbolBlock;
    /** Add a symbol to this chord, could be text, glyph or line. */
    addSymbolBlock(parameters: Partial<{
        text: string;
        symbolModifier: SymbolModifiers;
    }>): this;
    /** Add a text block. */
    addText(text: string, parameters?: Partial<{
        symbolModifier: SymbolModifiers;
    }>): this;
    /** Add a text block with superscript modifier. */
    addTextSuperscript(text: string): this;
    /** Add a text block with subscript modifier. */
    addTextSubscript(text: string): this;
    /** Add a glyph block with superscript modifier. */
    addGlyphSuperscript(glyph: string): this;
    /** Add a glyph block. */
    addGlyph(glyph: string, params?: Partial<{
        symbolModifier: SymbolModifiers;
    }>): this;
    /**
     * Add a glyph for each character in 'text'. If the glyph is not available, use text from the font.
     * e.g. `addGlyphOrText('(+5#11)')` will use text for the '5' and '11', and glyphs for everything else.
     */
    addGlyphOrText(text: string, params?: Partial<{
        symbolModifier: SymbolModifiers;
    }>): this;
    /** Add a line of the given width, used as a continuation of the previous symbol in analysis, or lyrics, etc. */
    addLine(params?: Partial<{
        symbolModifier: SymbolModifiers;
    }>): this;
    /** Set vertical position of text (above or below stave). */
    setVertical(vj: ChordSymbolVerticalJustify | string | number): this;
    getVertical(): number;
    /** Set horizontal justification. */
    setHorizontal(hj: ChordSymbolHorizontalJustify | string | number): this;
    getHorizontal(): number;
    /** Render text and glyphs above/below the note. */
    draw(): void;
    getBoundingBox(): BoundingBox;
}
