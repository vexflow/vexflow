import { Element } from './element';
import { Note } from './note';
import { RenderContext } from './rendercontext';
export interface TextBracketParams {
    start: Note;
    stop: Note;
    text?: string;
    superscript?: string;
    position?: number | string;
}
export declare enum TextBracketPosition {
    TOP = 1,
    BOTTOM = -1
}
export declare class TextBracket extends Element {
    static DEBUG: boolean;
    static get CATEGORY(): string;
    renderOptions: {
        dashed: boolean;
        color: string;
        lineWidth: number;
        underlineSuperscript: boolean;
        showBracket: boolean;
        dash: number[];
        bracketHeight: number;
    };
    protected readonly text: string;
    protected readonly superscript: string;
    protected line: number;
    readonly position: TextBracketPosition;
    readonly start: Note;
    readonly stop: Note;
    static get Position(): typeof TextBracketPosition;
    static get PositionString(): Record<string, number>;
    /**
     * @deprecated Use `TextBracket.Position` instead.
     */
    static get Positions(): typeof TextBracketPosition;
    /**
     * @deprecated Use `TextBracket.PositionString` instead.
     */
    static get PositionsString(): Record<string, number>;
    constructor({ start, stop, text, superscript, position }: TextBracketParams);
    /**
     * Apply the text backet styling to the provided context.
     * @param ctx
     * @returns this
     */
    applyStyle(ctx: RenderContext): this;
    setDashed(dashed: boolean, dash?: number[]): this;
    setLine(line: number): this;
    draw(): void;
}
