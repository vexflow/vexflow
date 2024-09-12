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
    constructor(noteStruct) {
        super(Object.assign({ strokePx: GraceNote.LEDGER_LINE_OFFSET }, noteStruct));
        this.slash = noteStruct.slash || false;
        this.slur = true;
        this.buildNoteHeads();
        this.width = 3;
    }
    getStemExtension() {
        if (this.stemExtensionOverride) {
            return this.stemExtensionOverride;
        }
        let ret = super.getStemExtension();
        ret = Stem.HEIGHT * this.getFontScale() - Stem.HEIGHT + ret;
        return ret;
    }
    draw() {
        super.draw();
        this.setRendered();
        const stem = this.stem;
        if (this.slash && stem) {
            const scale = this.getFontScale();
            let slashBBox = undefined;
            const beam = this.beam;
            if (beam) {
                if (!beam.postFormatted) {
                    beam.postFormat();
                }
                slashBBox = this.calcBeamedNotesSlashBBox(8 * scale, 8 * scale, {
                    stem: 6 * scale,
                    beam: 5 * scale,
                });
            }
            else {
                const stemDirection = this.getStemDirection();
                const noteHeadBounds = this.getNoteHeadBounds();
                const noteHeadWidth = this.noteHeads[0].getWidth();
                const x = stemDirection === Stem.DOWN ? this.getAbsoluteX() : this.getAbsoluteX() + noteHeadWidth;
                const defaultOffsetY = (Tables.STEM_HEIGHT * scale) / 2;
                const y = stemDirection === Stem.DOWN ? noteHeadBounds.yBottom + defaultOffsetY : noteHeadBounds.yTop - defaultOffsetY;
                if (stemDirection === Stem.DOWN) {
                    slashBBox = {
                        x1: x - noteHeadWidth,
                        y1: y - noteHeadWidth,
                        x2: x + noteHeadWidth,
                        y2: y + noteHeadWidth,
                    };
                }
                else {
                    slashBBox = {
                        x1: x - noteHeadWidth,
                        y1: y + noteHeadWidth,
                        x2: x + noteHeadWidth,
                        y2: y - noteHeadWidth,
                    };
                }
            }
            const ctx = this.checkContext();
            ctx.setLineWidth(1 * scale);
            ctx.beginPath();
            ctx.moveTo(slashBBox.x1, slashBBox.y1);
            ctx.lineTo(slashBBox.x2, slashBBox.y2);
            ctx.closePath();
            ctx.stroke();
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
