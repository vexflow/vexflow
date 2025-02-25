import { BoundingBox, Bounds } from './boundingbox';
import { Element, ElementStyle } from './element';
import { BarlineType } from './stavebarline';
import { StaveModifier } from './stavemodifier';
import { StaveTempoOptions } from './stavetempo';
export interface StaveLineConfig {
    visible?: boolean;
}
export interface StaveOptions {
    bottomTextPosition?: number;
    lineConfig?: StaveLineConfig[];
    spaceBelowStaffLn?: number;
    spaceAboveStaffLn?: number;
    verticalBarWidth?: number;
    leftBar?: boolean;
    rightBar?: boolean;
    spacingBetweenLinesPx?: number;
    topTextPosition?: number;
    numLines?: number;
}
export declare class Stave extends Element {
    static get CATEGORY(): string;
    readonly options: Required<StaveOptions>;
    protected startX: number;
    protected endX: number;
    protected clef: string;
    protected endClef?: string;
    protected formatted: boolean;
    protected measure: number;
    protected bounds: Bounds;
    protected readonly modifiers: StaveModifier[];
    protected defaultLedgerLineStyle: ElementStyle;
    static get defaultPadding(): number;
    static get rightPadding(): number;
    constructor(x: number, y: number, width: number, options?: StaveOptions);
    /** Set default style for ledger lines. */
    setDefaultLedgerLineStyle(style: ElementStyle): void;
    /** Get default style for ledger lines. */
    getDefaultLedgerLineStyle(): ElementStyle;
    space(spacing: number): number;
    resetLines(): void;
    setNoteStartX(x: number): this;
    getNoteStartX(): number;
    getNoteEndX(): number;
    getTieStartX(): number;
    getTieEndX(): number;
    getNumLines(): number;
    setNumLines(n: number): this;
    getTopLineTopY(): number;
    getBottomLineBottomY(): number;
    setX(x: number): this;
    setWidth(width: number): this;
    /**
     * Set the measure number of this Stave.
     */
    setMeasure(measure: number): this;
    /**
     * Return the measure number of this Stave.
     */
    getMeasure(): number;
    /**
     * Gets the pixels to shift from the beginning of the stave
     * following the modifier at the provided index
     * @param  {Number} index The index from which to determine the shift
     * @return {Number}       The amount of pixels shifted
     */
    getModifierXShift(index?: number): number;
    /** Coda & Segno Symbol functions */
    setRepetitionType(type: number, yShift?: number): this;
    setVoltaType(type: number, label: string, y: number): this;
    setSection(section: string, y: number, xOffset?: number, fontSize?: number, drawRect?: boolean): this;
    setTempo(tempo: StaveTempoOptions, y: number): this;
    setStaveText(text: string, position: number, options?: {
        shiftX?: number;
        shiftY?: number;
        justification?: number;
    }): this;
    getSpacingBetweenLines(): number;
    getBoundingBox(): BoundingBox;
    getBottomY(): number;
    getBottomLineY(): number;
    /** @returns the y for the *center* of a staff line */
    getYForLine(line: number): number;
    getLineForY(y: number): number;
    getYForTopText(line?: number): number;
    getYForBottomText(line?: number): number;
    getYForNote(line: number): number;
    getYForGlyphs(): number;
    addModifier(modifier: StaveModifier, position?: number): this;
    addEndModifier(modifier: StaveModifier): this;
    setBegBarType(type: number | BarlineType): this;
    setEndBarType(type: number | BarlineType): this;
    setClef(clefSpec: string, size?: string, annotation?: string, position?: number): this;
    getClef(): string;
    setEndClef(clefSpec: string, size?: string, annotation?: string): this;
    getEndClef(): string | undefined;
    setKeySignature(keySpec: string, cancelKeySpec?: string, position?: number): this;
    setEndKeySignature(keySpec: string, cancelKeySpec?: string): this;
    setTimeSignature(timeSpec: string, customPadding?: number, position?: number): this;
    setEndTimeSignature(timeSpec: string, customPadding?: number): this;
    /**
     * Add a key signature to the stave.
     *
     * Example:
     * `stave.addKeySignature('Db');`
     * @param keySpec new key specification `[A-G][b|#]?`
     * @param cancelKeySpec
     * @param position
     * @returns
     */
    addKeySignature(keySpec: string, cancelKeySpec?: string, position?: number): this;
    /**
     * Add a clef to the stave.
     *
     * Example:
     *
     * stave.addClef('treble')
     * @param clef clef (treble|bass|...) see {@link Clef.types}
     * @param size
     * @param annotation
     * @param position
     * @returns
     */
    addClef(clef: string, size?: string, annotation?: string, position?: number): this;
    addEndClef(clef: string, size?: string, annotation?: string): this;
    /**
     * Add a time signature to the stave
     *
     * Example:
     *
     * `stave.addTimeSignature('4/4');`
     * @param timeSpec time signature specification `(C\||C|\d\/\d)`
     * @param customPadding
     * @param position
     * @returns
     */
    addTimeSignature(timeSpec: string, customPadding?: number, position?: number): this;
    addEndTimeSignature(timeSpec: string, customPadding?: number): this;
    addTrebleGlyph(): this;
    /**
     * @param position
     * @param category
     * @returns array of StaveModifiers that match the provided position and category.
     */
    getModifiers(position?: number, category?: string): StaveModifier[];
    /**
     * Use the modifier's `getCategory()` as a key for the `order` array.
     * The retrieved value is used to sort modifiers from left to right (0 to to 3).
     */
    sortByCategory(items: StaveModifier[], order: Record<string, number>): void;
    format(): void;
    /**
     * All drawing functions below need the context to be set.
     */
    draw(): void;
    getVerticalBarWidth(): number;
    /**
     * Get the current configuration for the Stave.
     * @return {Array} An array of configuration objects.
     */
    getConfigForLines(): StaveLineConfig[];
    /**
     * Configure properties of the lines in the Stave
     * @param lineNumber The index of the line to configure.
     * @param lineConfig An configuration object for the specified line.
     * @throws RuntimeError "StaveConfigError" When the specified line number is out of
     *   range of the number of lines specified in the constructor.
     */
    setConfigForLine(lineNumber: number, lineConfig: StaveLineConfig): this;
    /**
     * Set the staff line configuration array for all of the lines at once.
     * @param linesConfiguration An array of line configuration objects.  These objects
     *   are of the same format as the single one passed in to setLineConfiguration().
     *   The caller can set null for any line config entry if it is desired that the default be used
     * @throws RuntimeError "StaveConfigError" When the lines_configuration array does not have
     *   exactly the same number of elements as the numLines configuration object set in
     *   the constructor.
     */
    setConfigForLines(linesConfiguration: StaveLineConfig[]): this;
    static formatBegModifiers(staves: Stave[]): void;
}
