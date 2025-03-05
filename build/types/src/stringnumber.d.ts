import { Modifier } from './modifier';
import { ModifierContextState } from './modifiercontext';
import { Note } from './note';
export declare class StringNumber extends Modifier {
    static get CATEGORY(): string;
    static format(nums: StringNumber[], state: ModifierContextState): boolean;
    protected radius: number;
    protected drawCircle: boolean;
    protected lastNote?: Note;
    protected stringNumber: string;
    protected xOffset: number;
    protected yOffset: number;
    protected textLine: number;
    protected stemOffset: number;
    protected dashed: boolean;
    protected leg: number;
    constructor(number: string);
    setLineEndType(leg: number): this;
    setStringNumber(number: string): this;
    setOffsetX(x: number): this;
    setOffsetY(y: number): this;
    setLastNote(note: Note): this;
    setDashed(dashed: boolean): this;
    setDrawCircle(drawCircle: boolean): this;
    draw(): void;
}
