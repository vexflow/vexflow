import { Modifier } from './modifier';
import { ModifierContextState } from './modifiercontext';
import { Note } from './note';
export declare class Stroke extends Modifier {
    static get CATEGORY(): string;
    static readonly Type: {
        BRUSH_DOWN: number;
        BRUSH_UP: number;
        ROLL_DOWN: number;
        ROLL_UP: number;
        RASGUEADO_DOWN: number;
        RASGUEADO_UP: number;
        ARPEGGIO_DIRECTIONLESS: number;
    };
    static format(strokes: Stroke[], state: ModifierContextState): boolean;
    protected options: {
        allVoices: boolean;
    };
    protected allVoices: boolean;
    protected type: number;
    protected noteEnd?: Note;
    renderOptions: {
        fontScale: number;
    };
    constructor(type: number, options?: {
        allVoices: boolean;
    });
    getPosition(): number;
    addEndNote(note: Note): this;
    draw(): void;
}
