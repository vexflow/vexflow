import { Element } from './element';
import { RenderContext } from './rendercontext';
import { StaveNote } from './stavenote';
import { TextJustification } from './textnote';
export interface StaveLineNotes {
    firstNote: StaveNote;
    firstIndexes: number[];
    lastNote: StaveNote;
    lastIndexes: number[];
}
export declare class StaveLine extends Element {
    static get CATEGORY(): string;
    static readonly TextVerticalPosition: {
        TOP: number;
        BOTTOM: number;
    };
    static readonly TextJustification: typeof TextJustification;
    renderOptions: {
        paddingLeft: number;
        paddingRight: number;
        lineWidth: number;
        lineDash?: number[];
        roundedEnd: boolean;
        color?: string;
        drawStartArrow: boolean;
        drawEndArrow: boolean;
        arrowheadLength: number;
        arrowheadAngle: number;
        textPositionVertical: number;
        textJustification: number;
    };
    protected notes: StaveLineNotes;
    protected firstNote: StaveNote;
    protected firstIndexes: number[];
    protected lastNote: StaveNote;
    protected lastIndexes: number[];
    constructor(notes: StaveLineNotes);
    setText(text: string): this;
    setNotes(notes: StaveLineNotes): this;
    applyLineStyle(): void;
    protected drawArrowLine(ctx: RenderContext, pt1: {
        x: number;
        y: number;
    }, pt2: {
        x: number;
        y: number;
    }): void;
    draw(): void;
}
