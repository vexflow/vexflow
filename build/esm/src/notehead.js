import { BoundingBox } from './boundingbox.js';
import { Glyph } from './glyph.js';
import { Note } from './note.js';
import { Stem } from './stem.js';
import { Tables } from './tables.js';
import { defined, log } from './util.js';
function L(...args) {
    if (NoteHead.DEBUG)
        log('Vex.Flow.NoteHead', args);
}
function drawSlashNoteHead(ctx, duration, x, y, stemDirection, staveSpace) {
    const width = Tables.SLASH_NOTEHEAD_WIDTH;
    ctx.save();
    ctx.setLineWidth(Tables.STEM_WIDTH);
    let fill = false;
    if (Tables.durationToNumber(duration) > 2) {
        fill = true;
    }
    if (!fill)
        x -= (Tables.STEM_WIDTH / 2) * stemDirection;
    ctx.beginPath();
    ctx.moveTo(x, y + staveSpace);
    ctx.lineTo(x, y + 1);
    ctx.lineTo(x + width, y - staveSpace);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x, y + staveSpace);
    ctx.closePath();
    if (fill) {
        ctx.fill();
    }
    else {
        ctx.stroke();
    }
    if (Tables.durationToFraction(duration).equals(0.5)) {
        const breveLines = [-3, -1, width + 1, width + 3];
        for (let i = 0; i < breveLines.length; i++) {
            ctx.beginPath();
            ctx.moveTo(x + breveLines[i], y - 10);
            ctx.lineTo(x + breveLines[i], y + 11);
            ctx.stroke();
        }
    }
    ctx.restore();
}
export class NoteHead extends Note {
    static get CATEGORY() {
        return "NoteHead";
    }
    constructor(noteStruct) {
        super(noteStruct);
        this.customGlyph = false;
        this.stemUpXOffset = 0;
        this.stemDownXOffset = 0;
        this.index = noteStruct.index;
        this.x = noteStruct.x || 0;
        this.y = noteStruct.y || 0;
        if (noteStruct.noteType)
            this.noteType = noteStruct.noteType;
        this.displaced = noteStruct.displaced || false;
        this.stemDirection = noteStruct.stemDirection || Stem.UP;
        this.line = noteStruct.line || 0;
        this.glyphProps = Tables.getGlyphProps(this.duration, this.noteType);
        defined(this.glyphProps, 'BadArguments', `No glyph found for duration '${this.duration}' and type '${this.noteType}'`);
        if ((this.line > 5 || this.line < 0) && this.glyphProps.ledgerCodeHead) {
            this.glyphProps.codeHead = this.glyphProps.ledgerCodeHead;
        }
        this.glyphCode = this.glyphProps.codeHead;
        this.xShift = noteStruct.xShift || 0;
        if (noteStruct.customGlyphCode) {
            this.customGlyph = true;
            this.glyphCode = noteStruct.customGlyphCode;
            this.stemUpXOffset = noteStruct.stemUpXOffset || 0;
            this.stemDownXOffset = noteStruct.stemDownXOffset || 0;
        }
        this.setStyle(noteStruct.style);
        this.slashed = noteStruct.slashed || false;
        this.renderOptions = Object.assign(Object.assign({}, this.renderOptions), { glyphFontScale: noteStruct.glyphFontScale || Tables.NOTATION_FONT_SCALE });
        this.setWidth(this.customGlyph && !this.glyphCode.startsWith('noteheadSlashed') && !this.glyphCode.startsWith('noteheadCircled')
            ? Glyph.getWidth(this.glyphCode, this.renderOptions.glyphFontScale)
            : this.glyphProps.getWidth(this.renderOptions.glyphFontScale));
    }
    getWidth() {
        return this.width;
    }
    isDisplaced() {
        return this.displaced === true;
    }
    getLine() {
        return this.line;
    }
    setLine(line) {
        this.line = line;
        return this;
    }
    getAbsoluteX() {
        const x = !this.preFormatted ? this.x : super.getAbsoluteX();
        const displacementStemAdjustment = Stem.WIDTH / 2;
        const musicFont = Tables.currentMusicFont();
        const fontShift = musicFont.lookupMetric('notehead.shiftX', 0) * this.stemDirection;
        const displacedFontShift = musicFont.lookupMetric('noteHead.displacedShiftX', 0) * this.stemDirection;
        return (x +
            fontShift +
            (this.displaced ? (this.width - displacementStemAdjustment) * this.stemDirection + displacedFontShift : 0));
    }
    getBoundingBox() {
        const spacing = this.checkStave().getSpacingBetweenLines();
        const halfSpacing = spacing / 2;
        const minY = this.y - halfSpacing;
        return new BoundingBox(this.getAbsoluteX(), minY, this.width, spacing);
    }
    setStave(stave) {
        const line = this.getLine();
        this.stave = stave;
        if (this.stave) {
            this.setY(this.stave.getYForNote(line));
            this.setContext(this.stave.getContext());
        }
        return this;
    }
    preFormat() {
        if (this.preFormatted)
            return this;
        const width = this.getWidth() + this.leftDisplacedHeadPx + this.rightDisplacedHeadPx;
        this.setWidth(width);
        this.preFormatted = true;
        return this;
    }
    draw() {
        const ctx = this.checkContext();
        this.setRendered();
        let headX = this.getAbsoluteX();
        if (this.customGlyph) {
            headX +=
                this.stemDirection === Stem.UP
                    ? this.stemUpXOffset +
                        (this.glyphProps.stem ? this.glyphProps.getWidth(this.renderOptions.glyphFontScale) - this.width : 0)
                    : this.stemDownXOffset;
        }
        const y = this.y;
        L("Drawing note head '", this.noteType, this.duration, "' at", headX, y);
        const stemDirection = this.stemDirection;
        const glyphFontScale = this.renderOptions.glyphFontScale;
        const categorySuffix = `${this.glyphCode}Stem${stemDirection === Stem.UP ? 'Up' : 'Down'}`;
        if (this.noteType === 's') {
            const staveSpace = this.checkStave().getSpacingBetweenLines();
            drawSlashNoteHead(ctx, this.duration, headX, y, stemDirection, staveSpace);
        }
        else {
            Glyph.renderGlyph(ctx, headX, y, glyphFontScale, this.glyphCode, {
                category: `noteHead.${categorySuffix}`,
            });
        }
    }
}
NoteHead.DEBUG = false;
