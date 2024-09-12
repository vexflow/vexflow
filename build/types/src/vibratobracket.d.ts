import { Element } from './element';
import { Note } from './note';
import { Vibrato } from './vibrato';
/** `VibratoBracket` renders vibrato effect between two notes. */
export declare class VibratoBracket extends Element {
    /** To enable logging for this class. Set `VexFlow.VibratoBracket.DEBUG` to `true`. */
    static DEBUG: boolean;
    static get CATEGORY(): string;
    protected line: number;
    protected vibrato: Vibrato;
    protected start?: Note;
    protected stop?: Note;
    /**
     * Either the stop or start note must be set, or both of them.
     * An undefined value for the start or stop note indicates that the vibrato
     * is drawn from the beginning or until the end of the stave accordingly.
     */
    constructor(bracketData: {
        stop?: Note | null;
        start?: Note | null;
    });
    /** Set line position of the vibrato bracket. */
    setLine(line: number): this;
    /** Set vibrato code. */
    setVibratoCode(code: number): this;
    /** Draw the vibrato bracket on the rendering context. */
    draw(): void;
}
