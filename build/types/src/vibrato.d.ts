import { Modifier } from './modifier';
import { ModifierContext, ModifierContextState } from './modifiercontext';
export interface VibratoRenderOptions {
    code: number;
    width: number;
}
/** `Vibrato` implements diverse vibratos. */
export declare class Vibrato extends Modifier {
    static get CATEGORY(): string;
    protected renderOptions: VibratoRenderOptions;
    /** Arrange vibratos inside a `ModifierContext`. */
    static format(vibratos: Vibrato[], state: ModifierContextState, context: ModifierContext): boolean;
    constructor();
    /** Set vibrato width in pixels. */
    setVibratoWidth(width: number): this;
    /** Set vibrato code. */
    setVibratoCode(code: number): this;
    /** Draw the vibrato on the rendering context. */
    draw(): void;
}
