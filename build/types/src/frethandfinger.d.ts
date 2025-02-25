import { Builder } from './easyscore';
import { Modifier } from './modifier';
import { ModifierContextState } from './modifiercontext';
import { StemmableNote } from './stemmablenote';
export declare class FretHandFinger extends Modifier {
    static get CATEGORY(): string;
    static format(nums: FretHandFinger[], state: ModifierContextState): boolean;
    static easyScoreHook({ fingerings }: {
        fingerings?: string;
    } | undefined, note: StemmableNote, builder: Builder): void;
    protected xOffset: number;
    protected yOffset: number;
    constructor(finger: string);
    setFretHandFinger(finger: string): this;
    getFretHandFinger(): string;
    setOffsetX(x: number): this;
    setOffsetY(y: number): this;
    draw(): void;
}
