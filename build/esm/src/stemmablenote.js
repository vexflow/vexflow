import { Flag } from './flag.js';
import { Glyphs } from './glyphs.js';
import { Note } from './note.js';
import { Stem } from './stem.js';
import { Tables } from './tables.js';
import { RuntimeError } from './util.js';
export class StemmableNote extends Note {
    static get CATEGORY() {
        return "StemmableNote";
    }
    constructor(noteStruct) {
        super(noteStruct);
        this.flag = new Flag();
    }
    getStem() {
        return this.stem;
    }
    checkStem() {
        if (!this.stem) {
            throw new RuntimeError('NoStem', 'No stem attached to instance');
        }
        return this.stem;
    }
    setStem(stem) {
        this.stem = stem;
        this.addChild(stem);
        return this;
    }
    buildStem() {
        const stem = new Stem();
        this.setStem(stem);
        return this;
    }
    buildFlag() {
        var _a, _b, _c;
        const { glyphProps } = this;
        if (this.hasFlag()) {
            const flagCode = this.getStemDirection() === Stem.DOWN
                ? String.fromCodePoint(((_b = (_a = glyphProps.codeFlagUp) === null || _a === void 0 ? void 0 : _a.codePointAt(0)) !== null && _b !== void 0 ? _b : -1) + 1)
                : ((_c = glyphProps.codeFlagUp) !== null && _c !== void 0 ? _c : Glyphs.null);
            this.flag.setText(flagCode);
            this.flag.fontInfo = this.fontInfo;
        }
    }
    getBaseCustomNoteHeadGlyphProps() {
        if (this.getStemDirection() === Stem.DOWN) {
            return this.customGlyphs[this.customGlyphs.length - 1];
        }
        else {
            return this.customGlyphs[0];
        }
    }
    getStemLength() {
        return Stem.HEIGHT + this.getStemExtension();
    }
    getBeamCount() {
        const glyphProps = this.getGlyphProps();
        if (glyphProps) {
            return glyphProps.beamCount;
        }
        else {
            return 0;
        }
    }
    getStemMinimumLength() {
        const frac = Tables.durationToFraction(this.duration);
        const beamIsUndefined = this.beam === undefined;
        let length = frac.value() <= 1 ? 0 : 20;
        switch (this.duration) {
            case '8':
            case '16':
                length = beamIsUndefined ? 35 : 25;
                break;
            case '32':
                length = beamIsUndefined ? 45 : 35;
                break;
            case '64':
                length = beamIsUndefined ? 50 : 40;
                break;
            case '128':
                length = beamIsUndefined ? 55 : 45;
                break;
            default:
                break;
        }
        return length;
    }
    getStemDirection() {
        if (!this.stemDirection)
            throw new RuntimeError('NoStem', 'No stem attached to this note.');
        return this.stemDirection;
    }
    setStemDirection(direction) {
        if (!direction)
            direction = Stem.UP;
        if (direction !== Stem.UP && direction !== Stem.DOWN) {
            throw new RuntimeError('BadArgument', `Invalid stem direction: ${direction}`);
        }
        this.stemDirection = direction;
        this.reset();
        if (this.hasFlag()) {
            this.buildFlag();
        }
        this.beam = undefined;
        if (this.stem) {
            this.stem.setDirection(direction);
            this.stem.setExtension(this.getStemExtension());
        }
        if (this.preFormatted) {
            this.preFormat();
        }
        return this;
    }
    getStemX() {
        const xBegin = this.getAbsoluteX() + this.xShift;
        const xEnd = this.getAbsoluteX() + this.xShift + this.getGlyphWidth();
        const stemX = this.stemDirection === Stem.DOWN ? xBegin : xEnd;
        return stemX;
    }
    getCenterGlyphX() {
        return this.getAbsoluteX() + this.xShift + this.getGlyphWidth() / 2;
    }
    getStemExtension() {
        const glyphProps = this.getGlyphProps();
        const flagHeight = this.flag.getHeight();
        const scale = this.getFontScale();
        if (this.stemExtensionOverride !== undefined) {
            return this.stemExtensionOverride;
        }
        if (this.beam) {
            return glyphProps.stemBeamExtension * scale;
        }
        return flagHeight > Stem.HEIGHT * scale ? flagHeight - Stem.HEIGHT * scale : 0;
    }
    setStemLength(height) {
        this.stemExtensionOverride = height - Stem.HEIGHT;
        return this;
    }
    getStemExtents() {
        if (!this.stem)
            throw new RuntimeError('NoStem', 'No stem attached to this note.');
        return this.stem.getExtents();
    }
    getYForTopText(textLine) {
        const stave = this.checkStave();
        if (this.hasStem()) {
            const extents = this.getStemExtents();
            if (!extents)
                throw new RuntimeError('InvalidState', 'Stem does not have extents.');
            return Math.min(stave.getYForTopText(textLine), extents.topY - this.renderOptions.annotationSpacing * (textLine + 1));
        }
        else {
            return stave.getYForTopText(textLine);
        }
    }
    getYForBottomText(textLine) {
        const stave = this.checkStave();
        if (this.hasStem()) {
            const extents = this.getStemExtents();
            if (!extents)
                throw new RuntimeError('InvalidState', 'Stem does not have extents.');
            return Math.max(stave.getYForTopText(textLine), extents.baseY + this.renderOptions.annotationSpacing * textLine);
        }
        else {
            return stave.getYForBottomText(textLine);
        }
    }
    hasFlag() {
        return this.glyphProps.codeFlagUp !== undefined && !this.beam && !this.isRest();
    }
    postFormat() {
        var _a;
        (_a = this.beam) === null || _a === void 0 ? void 0 : _a.postFormat();
        this.postFormatted = true;
        return this;
    }
    drawStem(stemOptions) {
        var _a;
        this.checkContext();
        this.setRendered();
        this.setStem(new Stem(stemOptions));
        (_a = this.stem) === null || _a === void 0 ? void 0 : _a.setContext(this.getContext()).drawWithStyle();
    }
}
