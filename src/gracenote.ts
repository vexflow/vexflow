// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors

import { StaveNote, StaveNoteStruct } from './stavenote';
import { Stem } from './stem';
import { Tables } from './tables';
import { Category } from './typeguard';
import { RuntimeError } from './util';

export interface GraceNoteStruct extends StaveNoteStruct {
  slash?: boolean;
}

export class GraceNote extends StaveNote {
  static get CATEGORY(): string {
    return Category.GraceNote;
  }

  static get LEDGER_LINE_OFFSET(): number {
    return 2;
  }

  protected slash: boolean;
  protected slur: boolean;

  constructor(noteStruct: GraceNoteStruct) {
    super({
      strokePx: GraceNote.LEDGER_LINE_OFFSET,
      ...noteStruct,
    });

    this.slash = noteStruct.slash || false;
    this.slur = true;

    this.buildNoteHeads();

    this.width = 3;
  }

  getStemExtension(): number {
    if (this.stemExtensionOverride) {
      return this.stemExtensionOverride;
    }

    let ret = super.getStemExtension();
    ret = Stem.HEIGHT * this.getFontScale() - Stem.HEIGHT + ret;
    return ret;
  }

  draw(): void {
    super.draw();
    this.setRendered();
    const stem = this.stem;
    if (this.slash && stem) {
      const scale = this.getFontScale();

      let slashBBox = undefined;
      const beam = this.beam;
      if (beam) {
        // FIXME: should render slash after beam?
        if (!beam.postFormatted) {
          beam.postFormat();
        }

        slashBBox = this.calcBeamedNotesSlashBBox(8 * scale, 8 * scale, {
          stem: 6 * scale,
          beam: 5 * scale,
        });
      } else {
        const stemDirection = this.getStemDirection();
        const noteHeadBounds = this.getNoteHeadBounds();
        const noteHeadWidth = this.noteHeads[0].getWidth();
        const x = stemDirection === Stem.DOWN ? this.getAbsoluteX() : this.getAbsoluteX() + noteHeadWidth;
        const defaultOffsetY = (Tables.STEM_HEIGHT * scale) / 2;
        const y =
          stemDirection === Stem.DOWN ? noteHeadBounds.yBottom + defaultOffsetY : noteHeadBounds.yTop - defaultOffsetY;

        if (stemDirection === Stem.DOWN) {
          slashBBox = {
            x1: x - noteHeadWidth,
            y1: y - noteHeadWidth,
            x2: x + noteHeadWidth,
            y2: y + noteHeadWidth,
          };
        } else {
          slashBBox = {
            x1: x - noteHeadWidth,
            y1: y + noteHeadWidth,
            x2: x + noteHeadWidth,
            y2: y - noteHeadWidth,
          };
        }
      }

      // FIXME: avoid staff lines, ledger lines or others.

      const ctx = this.checkContext();
      ctx.setLineWidth(1 * scale); // FIXME: use more appropriate value.
      ctx.beginPath();
      ctx.moveTo(slashBBox.x1, slashBBox.y1);
      ctx.lineTo(slashBBox.x2, slashBBox.y2);
      ctx.closePath();
      ctx.stroke();
    }
  }

  calcBeamedNotesSlashBBox(
    slashStemOffset: number,
    slashBeamOffset: number,
    protrusions: { beam: number; stem: number }
  ): Record<string, number> {
    const beam = this.beam;
    if (!beam) throw new RuntimeError('NoBeam', "Can't calculate without a beam.");

    const beamSlope = beam.slope;
    const isBeamEndNote = beam.notes[beam.notes.length - 1] === this;
    const scaleX = isBeamEndNote ? -1 : 1;
    const beamAngle = Math.atan(beamSlope * scaleX);

    // slash line intersecting point on beam.
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
