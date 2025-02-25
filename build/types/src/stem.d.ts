import { BoundingBox } from './boundingbox';
import { Element } from './element';
export interface StemOptions {
    stemDownYBaseOffset?: number;
    stemUpYBaseOffset?: number;
    stemDownYOffset?: number;
    stemUpYOffset?: number;
    stemletHeight?: number;
    isStemlet?: boolean;
    hide?: boolean;
    stemDirection?: number;
    stemExtension?: number;
    yBottom?: number;
    yTop?: number;
    xEnd?: number;
    xBegin?: number;
}
export declare class Stem extends Element {
    /** To enable logging for this class. Set `VexFlow.Stem.DEBUG` to `true`. */
    static DEBUG: boolean;
    static get CATEGORY(): string;
    static get UP(): number;
    static get DOWN(): number;
    static get WIDTH(): number;
    static get HEIGHT(): number;
    protected hide: boolean;
    protected isStemlet: boolean;
    protected stemletHeight: number;
    protected xBegin: number;
    protected xEnd: number;
    protected yTop: number;
    protected stemUpYOffset: number;
    protected yBottom: number;
    protected stemDownYOffset: number;
    protected stemUpYBaseOffset: number;
    protected stemDownYBaseOffset: number;
    protected stemDirection: number;
    protected stemExtension: number;
    protected renderHeightAdjustment: number;
    constructor(options?: StemOptions);
    setOptions(options?: StemOptions): void;
    setNoteHeadXBounds(xBegin: number, xEnd: number): this;
    setDirection(direction: number): void;
    setExtension(ext: number): void;
    getExtension(): number;
    setYBounds(yTop: number, yBottom: number): void;
    getHeight(): number;
    getBoundingBox(): BoundingBox;
    getExtents(): {
        topY: number;
        baseY: number;
    };
    setVisibility(isVisible: boolean): this;
    setStemlet(isStemlet: boolean, stemletHeight: number): this;
    adjustHeightForFlag(): void;
    adjustHeightForBeam(): void;
    draw(): void;
}
