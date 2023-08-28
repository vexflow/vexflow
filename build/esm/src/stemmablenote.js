import { Glyph } from './glyph.js';
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
        this.addChildElement(stem);
        return this;
    }
    buildStem() {
        const stem = new Stem();
        this.setStem(stem);
        return this;
    }
    buildFlag(category = 'flag') {
        const { glyphProps } = this;
        if (this.hasFlag()) {
            const flagCode = this.getStemDirection() === Stem.DOWN ? glyphProps.codeFlagDownstem : glyphProps.codeFlagUpstem;
            if (flagCode)
                this.flag = new Glyph(flagCode, this.renderOptions.glyphFontScale, { category });
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
        let length = frac.value() <= 1 ? 0 : 20;
        switch (this.duration) {
            case '8':
                if (this.beam == undefined)
                    length = 35;
                break;
            case '16':
                length = this.beam == undefined ? 35 : 25;
                break;
            case '32':
                length = this.beam == undefined ? 45 : 35;
                break;
            case '64':
                length = this.beam == undefined ? 50 : 40;
                break;
            case '128':
                length = this.beam == undefined ? 55 : 45;
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
            const glyphProps = this.getBaseCustomNoteHeadGlyphProps() || this.getGlyphProps();
            const offsets = Tables.currentMusicFont().lookupMetric(`stem.noteHead.${glyphProps.codeHead}`, {
                offsetYBaseStemUp: 0,
                offsetYTopStemUp: 0,
                offsetYBaseStemDown: 0,
                offsetYTopStemDown: 0,
            });
            this.stem.setOptions({
                stemUpYOffset: offsets.offsetYTopStemUp,
                stemDownYOffset: offsets.offsetYTopStemDown,
                stemUpYBaseOffset: offsets.offsetYBaseStemUp,
                stemDownYBaseOffset: offsets.offsetYBaseStemDown,
            });
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
        if (this.stemExtensionOverride != undefined) {
            return this.stemExtensionOverride;
        }
        if (this.beam) {
            return glyphProps.stemBeamExtension;
        }
        if (glyphProps) {
            return this.getStemDirection() === Stem.UP ? glyphProps.stemUpExtension : glyphProps.stemDownExtension;
        }
        return 0;
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
        return Tables.getGlyphProps(this.duration).flag == true && !this.beam;
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
        (_a = this.stem) === null || _a === void 0 ? void 0 : _a.setContext(this.getContext()).draw();
    }
}
