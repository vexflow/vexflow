import { Font } from './font.js';
import { Metrics } from './metrics.js';
import { Modifier, ModifierPosition } from './modifier.js';
import { Stem } from './stem.js';
import { Tables } from './tables.js';
import { isStemmableNote, isTabNote } from './typeguard.js';
import { log } from './util.js';
function L(...args) {
    if (Annotation.DEBUG)
        log('VexFlow.Annotation', args);
}
export var AnnotationHorizontalJustify;
(function (AnnotationHorizontalJustify) {
    AnnotationHorizontalJustify[AnnotationHorizontalJustify["LEFT"] = 1] = "LEFT";
    AnnotationHorizontalJustify[AnnotationHorizontalJustify["CENTER"] = 2] = "CENTER";
    AnnotationHorizontalJustify[AnnotationHorizontalJustify["RIGHT"] = 3] = "RIGHT";
    AnnotationHorizontalJustify[AnnotationHorizontalJustify["CENTER_STEM"] = 4] = "CENTER_STEM";
})(AnnotationHorizontalJustify || (AnnotationHorizontalJustify = {}));
export var AnnotationVerticalJustify;
(function (AnnotationVerticalJustify) {
    AnnotationVerticalJustify[AnnotationVerticalJustify["TOP"] = 1] = "TOP";
    AnnotationVerticalJustify[AnnotationVerticalJustify["CENTER"] = 2] = "CENTER";
    AnnotationVerticalJustify[AnnotationVerticalJustify["BOTTOM"] = 3] = "BOTTOM";
    AnnotationVerticalJustify[AnnotationVerticalJustify["CENTER_STEM"] = 4] = "CENTER_STEM";
})(AnnotationVerticalJustify || (AnnotationVerticalJustify = {}));
export class Annotation extends Modifier {
    static get CATEGORY() {
        return "Annotation";
    }
    static get minAnnotationPadding() {
        return Metrics.get('NoteHead.minPadding');
    }
    static format(annotations, state) {
        if (!annotations || annotations.length === 0)
            return false;
        let leftWidth = 0;
        let rightWidth = 0;
        let maxLeftGlyphWidth = 0;
        let maxRightGlyphWidth = 0;
        for (let i = 0; i < annotations.length; ++i) {
            const annotation = annotations[i];
            const textLines = (2 + Font.convertSizeToPixelValue(annotation.fontInfo.size)) / Tables.STAVE_LINE_DISTANCE;
            let verticalSpaceNeeded = textLines;
            const note = annotation.checkAttachedNote();
            const glyphWidth = note.getGlyphWidth();
            const textWidth = annotation.getWidth();
            if (annotation.horizontalJustification === AnnotationHorizontalJustify.RIGHT) {
                maxLeftGlyphWidth = Math.max(glyphWidth, maxLeftGlyphWidth);
                leftWidth = Math.max(leftWidth, textWidth) + Annotation.minAnnotationPadding;
            }
            else if (annotation.horizontalJustification === AnnotationHorizontalJustify.LEFT) {
                maxRightGlyphWidth = Math.max(glyphWidth, maxRightGlyphWidth);
                rightWidth = Math.max(rightWidth, textWidth);
            }
            else {
                leftWidth = Math.max(leftWidth, textWidth / 2) + Annotation.minAnnotationPadding;
                rightWidth = Math.max(rightWidth, textWidth / 2);
                maxLeftGlyphWidth = Math.max(glyphWidth / 2, maxLeftGlyphWidth);
                maxRightGlyphWidth = Math.max(glyphWidth / 2, maxRightGlyphWidth);
            }
            const stave = note.getStave();
            const stemDirection = note.hasStem() ? note.getStemDirection() : Stem.UP;
            let stemHeight = 0;
            let lines = 5;
            if (isTabNote(note)) {
                if (note.renderOptions.drawStem) {
                    const stem = note.getStem();
                    if (stem) {
                        stemHeight = Math.abs(stem.getHeight()) / Tables.STAVE_LINE_DISTANCE;
                    }
                }
                else {
                    stemHeight = 0;
                }
            }
            else if (isStemmableNote(note)) {
                const stem = note.getStem();
                if (stem && note.getNoteType() === 'n') {
                    stemHeight = Math.abs(stem.getHeight()) / Tables.STAVE_LINE_DISTANCE;
                }
            }
            if (stave) {
                lines = stave.getNumLines();
            }
            if (annotation.verticalJustification === this.VerticalJustify.TOP) {
                let noteLine = note.getLineNumber(true);
                if (isTabNote(note)) {
                    noteLine = lines - (note.leastString() - 0.5);
                }
                if (stemDirection === Stem.UP) {
                    noteLine += stemHeight;
                }
                const curTop = noteLine + state.topTextLine + 0.5;
                if (curTop < lines) {
                    annotation.setTextLine(lines - noteLine);
                    verticalSpaceNeeded += lines - noteLine;
                    state.topTextLine = verticalSpaceNeeded;
                }
                else {
                    annotation.setTextLine(state.topTextLine);
                    state.topTextLine += verticalSpaceNeeded;
                }
            }
            else if (annotation.verticalJustification === this.VerticalJustify.BOTTOM) {
                let noteLine = lines - note.getLineNumber();
                if (isTabNote(note)) {
                    noteLine = note.greatestString() - 1;
                }
                if (stemDirection === Stem.DOWN) {
                    noteLine += stemHeight;
                }
                const curBottom = noteLine + state.textLine + 1;
                if (curBottom < lines) {
                    annotation.setTextLine(lines - curBottom);
                    verticalSpaceNeeded += lines - curBottom;
                    state.textLine = verticalSpaceNeeded;
                }
                else {
                    annotation.setTextLine(state.textLine);
                    state.textLine += verticalSpaceNeeded;
                }
            }
            else {
                annotation.setTextLine(state.textLine);
            }
        }
        const rightOverlap = Math.min(Math.max(rightWidth - maxRightGlyphWidth, 0), Math.max(rightWidth - state.rightShift, 0));
        const leftOverlap = Math.min(Math.max(leftWidth - maxLeftGlyphWidth, 0), Math.max(leftWidth - state.leftShift, 0));
        state.leftShift += leftOverlap;
        state.rightShift += rightOverlap;
        return true;
    }
    constructor(text) {
        super();
        this.text = text;
        this.horizontalJustification = AnnotationHorizontalJustify.CENTER;
        this.verticalJustification = AnnotationVerticalJustify.TOP;
    }
    setVerticalJustification(just) {
        this.verticalJustification = typeof just === 'string' ? Annotation.VerticalJustifyString[just] : just;
        return this;
    }
    getJustification() {
        return this.horizontalJustification;
    }
    setJustification(just) {
        this.horizontalJustification = typeof just === 'string' ? Annotation.HorizontalJustifyString[just] : just;
        return this;
    }
    draw() {
        const ctx = this.checkContext();
        const note = this.checkAttachedNote();
        const stemDirection = note.hasStem() ? note.getStemDirection() : Stem.UP;
        const start = note.getModifierStartXY(ModifierPosition.ABOVE, this.index);
        this.setRendered();
        ctx.openGroup('annotation', this.getAttribute('id'));
        const textWidth = this.getWidth();
        const textHeight = Font.convertSizeToPixelValue(this.fontInfo.size);
        let x;
        let y;
        if (this.horizontalJustification === AnnotationHorizontalJustify.LEFT) {
            x = start.x;
        }
        else if (this.horizontalJustification === AnnotationHorizontalJustify.RIGHT) {
            x = start.x - textWidth;
        }
        else if (this.horizontalJustification === AnnotationHorizontalJustify.CENTER) {
            x = start.x - textWidth / 2;
        }
        else {
            x = note.getStemX() - textWidth / 2;
        }
        let stemExt = {};
        let spacing = 0;
        const hasStem = note.hasStem();
        const stave = note.checkStave();
        if (hasStem) {
            stemExt = note.checkStem().getExtents();
            spacing = stave.getSpacingBetweenLines();
        }
        if (this.verticalJustification === AnnotationVerticalJustify.BOTTOM) {
            const ys = note.getYs();
            y = ys.reduce((a, b) => (a > b ? a : b));
            y += (this.textLine + 1) * Tables.STAVE_LINE_DISTANCE + textHeight;
            if (hasStem && stemDirection === Stem.DOWN) {
                y = Math.max(y, stemExt.topY + textHeight + spacing * this.textLine);
            }
        }
        else if (this.verticalJustification === AnnotationVerticalJustify.CENTER) {
            const yt = note.getYForTopText(this.textLine) - 1;
            const yb = stave.getYForBottomText(this.textLine);
            y = yt + (yb - yt) / 2 + textHeight / 2;
        }
        else if (this.verticalJustification === AnnotationVerticalJustify.TOP) {
            const topY = Math.min(...note.getYs());
            y = topY - (this.textLine + 1) * Tables.STAVE_LINE_DISTANCE;
            if (hasStem && stemDirection === Stem.UP) {
                spacing = stemExt.topY < stave.getTopLineTopY() ? Tables.STAVE_LINE_DISTANCE : spacing;
                y = Math.min(y, stemExt.topY - spacing * (this.textLine + 1));
            }
        }
        else {
            const extents = note.getStemExtents();
            y = extents.topY + (extents.baseY - extents.topY) / 2 + textHeight / 2;
        }
        L('Rendering annotation: ', this.text, x, y);
        this.x = x;
        this.y = y;
        this.renderText(ctx, 0, 0);
        ctx.closeGroup();
    }
}
Annotation.DEBUG = false;
Annotation.HorizontalJustify = AnnotationHorizontalJustify;
Annotation.HorizontalJustifyString = {
    left: AnnotationHorizontalJustify.LEFT,
    right: AnnotationHorizontalJustify.RIGHT,
    center: AnnotationHorizontalJustify.CENTER,
    centerStem: AnnotationHorizontalJustify.CENTER_STEM,
};
Annotation.VerticalJustify = AnnotationVerticalJustify;
Annotation.VerticalJustifyString = {
    above: AnnotationVerticalJustify.TOP,
    top: AnnotationVerticalJustify.TOP,
    below: AnnotationVerticalJustify.BOTTOM,
    bottom: AnnotationVerticalJustify.BOTTOM,
    center: AnnotationVerticalJustify.CENTER,
    centerStem: AnnotationVerticalJustify.CENTER_STEM,
};
