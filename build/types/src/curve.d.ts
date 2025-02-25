import { Element } from './element';
import { Note } from './note';
export interface CurveOptions {
    /** Two control points for the bezier curves. */
    cps?: {
        x: number;
        y: number;
    }[];
    thickness?: number;
    xShift?: number;
    yShift?: number;
    position?: string | number;
    positionEnd?: string | number;
    invert?: boolean;
    openingDirection?: 'up' | 'down' | 'auto';
}
export declare enum CurvePosition {
    NEAR_HEAD = 1,
    NEAR_TOP = 2
}
export declare class Curve extends Element {
    static get CATEGORY(): string;
    renderOptions: Required<CurveOptions>;
    protected from?: Note;
    protected to?: Note;
    static get Position(): typeof CurvePosition;
    static get PositionString(): Record<string, number>;
    constructor(from: Note | undefined, to: Note | undefined, options: CurveOptions);
    setNotes(from: Note | undefined, to: Note | undefined): this;
    /**
     * @return {boolean} Returns true if this is a partial bar.
     */
    isPartial(): boolean;
    renderCurve(params: {
        lastY: number;
        lastX: number;
        firstY: number;
        firstX: number;
        direction: number;
    }): void;
    draw(): boolean;
}
