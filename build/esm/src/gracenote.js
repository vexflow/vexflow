import { StaveNote } from './stavenote.js';
import { Stem } from './stem.js';
import { Tables } from './tables.js';
import { RuntimeError } from './util.js';
export class GraceNote extends StaveNote {
    static get CATEGORY() {
        return "GraceNote";
    }
    static get LEDGER_LINE_OFFSET() {
        return 2;
    }
    static get SCALE() {
        return 0.66;
    }
    constructor(noteStruct) {
        super(Object.assign({ glyphFontScale: Tables.NOTATION_FONT_SCALE * GraceNote.SCALE, strokePx: GraceNote.LEDGER_LINE_OFFSET }, noteStruct));
        this.slash = noteStruct.slash || false;
        this.slur = true;
        this.buildNoteHeads();
        this.width = 3;
    }
    getStemExtension() {
        if (this.stemExtensionOverride) {
            return this.stemExtensionOverride;
        }
        const glyphProps = this.getGlyphProps();
        if (glyphProps) {
            let ret = super.getStemExtension();
            if (glyphProps.stem) {
                const staveNoteScale = this.getStaveNoteScale();
                ret = (Stem.HEIGHT + ret) * staveNoteScale - Stem.HEIGHT;
            }
            return ret;
        }
        return 0;
    }
    getStaveNoteScale() {
        return this.renderOptions.glyphFontScale / Tables.NOTATION_FONT_SCALE;
    }
    draw() {
        super.draw();
        this.setRendered();
        const stem = this.stem;
        if (this.slash && stem) {
            const staveNoteScale = this.getStaveNoteScale();
            const offsetScale = staveNoteScale / 0.66;
            let slashBBox = undefined;
            const beam = this.beam;
            if (beam) {
                if (!beam.postFormatted) {
                    beam.postFormat();
                }
                slashBBox = this.calcBeamedNotesSlashBBox(8 * offsetScale, 8 * offsetScale, {
                    stem: 6 * offsetScale,
                    beam: 5 * offsetScale,
                });
            }
            else {
                const stemDirection = this.getStemDirection();
                const noteHeadBounds = this.getNoteHeadBounds();
                const noteStemHeight = stem.getHeight();
                let x = this.getAbsoluteX();
                let y = stemDirection === Stem.DOWN ? noteHeadBounds.yTop - noteStemHeight : noteHeadBounds.yBottom - noteStemHeight;
                const defaultStemExtention = stemDirection === Stem.DOWN ? this.glyphProps.stemDownExtension : this.glyphProps.stemUpExtension;
                let defaultOffsetY = Tables.STEM_HEIGHT;
                defaultOffsetY -= defaultOffsetY / 2.8;
                defaultOffsetY += defaultStemExtention;
                y += defaultOffsetY * staveNoteScale * stemDirection;
                const offsets = stemDirection === Stem.UP
                    ? {
                        x1: 1,
                        y1: 0,
                        x2: 13,
                        y2: -9,
                    }
                    : {
                        x1: -4,
                        y1: 1,
                        x2: 13,
                        y2: 9,
                    };
                x += offsets.x1 * offsetScale;
                y += offsets.y1 * offsetScale;
                slashBBox = {
                    x1: x,
                    y1: y,
                    x2: x + offsets.x2 * offsetScale,
                    y2: y + offsets.y2 * offsetScale,
                };
            }
            const ctx = this.checkContext();
            ctx.save();
            ctx.setLineWidth(1 * offsetScale);
            ctx.beginPath();
            ctx.moveTo(slashBBox.x1, slashBBox.y1);
            ctx.lineTo(slashBBox.x2, slashBBox.y2);
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
        }
    }
    calcBeamedNotesSlashBBox(slashStemOffset, slashBeamOffset, protrusions) {
        const beam = this.beam;
        if (!beam)
            throw new RuntimeError('NoBeam', "Can't calculate without a beam.");
        const beamSlope = beam.slope;
        const isBeamEndNote = beam.notes[beam.notes.length - 1] === this;
        const scaleX = isBeamEndNote ? -1 : 1;
        const beamAngle = Math.atan(beamSlope * scaleX);
        const iPointOnBeam = {
            dx: Math.cos(beamAngle) * slashBeamOffset,
            dy: Math.sin(beamAngle) * slashBeamOffset,
        };
        slashStemOffset *= this.getStemDirection();
        const slashAngle = Math.atan((iPointOnBeam.dy - slashStemOffset) / iPointOnBeam.dx);
        const protrusionStemDeltaX = Math.cos(slashAngle) * protrusions.stem * scaleX;
        const protrusionStemDeltaY = Math.sin(slashAngle) * protrusions.stem;
        const protrusionBeamDeltaX = Math.cos(slashAngle) * protrusions.beam * scaleX;
        const protrusionBeamDeltaY = Math.sin(slashAngle) * protrusions.beam;
        const stemX = this.getStemX();
        const stem0X = beam.notes[0].getStemX();
        const stemY = beam.getBeamYToDraw() + (stemX - stem0X) * beamSlope;
        const ret = {
            x1: stemX - protrusionStemDeltaX,
            y1: stemY + slashStemOffset - protrusionStemDeltaY,
            x2: stemX + iPointOnBeam.dx * scaleX + protrusionBeamDeltaX,
            y2: stemY + iPointOnBeam.dy + protrusionBeamDeltaY,
        };
        return ret;
    }
}
