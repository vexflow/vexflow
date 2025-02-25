import { Element } from './element.js';
import { Tables } from './tables.js';
import { TextJustification } from './textnote.js';
import { RuntimeError } from './util.js';
function drawArrowHead(ctx, x0, y0, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x0, y0);
    ctx.closePath();
    ctx.fill();
}
export class StaveLine extends Element {
    static get CATEGORY() {
        return "StaveLine";
    }
    constructor(notes) {
        super();
        this.setNotes(notes);
        this.text = '';
        this.renderOptions = {
            paddingLeft: 4,
            paddingRight: 3,
            lineWidth: 1,
            lineDash: undefined,
            roundedEnd: true,
            color: undefined,
            drawStartArrow: false,
            drawEndArrow: false,
            arrowheadLength: 10,
            arrowheadAngle: Math.PI / 8,
            textPositionVertical: StaveLine.TextVerticalPosition.TOP,
            textJustification: StaveLine.TextJustification.CENTER,
        };
    }
    setText(text) {
        this.text = text;
        return this;
    }
    setNotes(notes) {
        if (!notes.firstNote && !notes.lastNote) {
            throw new RuntimeError('BadArguments', 'Notes needs to have either firstNote or lastNote set.');
        }
        if (!notes.firstIndexes)
            notes.firstIndexes = [0];
        if (!notes.lastIndexes)
            notes.lastIndexes = [0];
        if (notes.firstIndexes.length !== notes.lastIndexes.length) {
            throw new RuntimeError('BadArguments', 'Connected notes must have same number of indexes.');
        }
        this.notes = notes;
        this.firstNote = notes.firstNote;
        this.firstIndexes = notes.firstIndexes;
        this.lastNote = notes.lastNote;
        this.lastIndexes = notes.lastIndexes;
        return this;
    }
    applyLineStyle() {
        const ctx = this.checkContext();
        const renderOptions = this.renderOptions;
        if (renderOptions.lineDash) {
            ctx.setLineDash(renderOptions.lineDash);
        }
        if (renderOptions.lineWidth) {
            ctx.setLineWidth(renderOptions.lineWidth);
        }
        if (renderOptions.roundedEnd) {
            ctx.setLineCap('round');
        }
        else {
            ctx.setLineCap('square');
        }
    }
    drawArrowLine(ctx, pt1, pt2) {
        const bothArrows = this.renderOptions.drawStartArrow && this.renderOptions.drawEndArrow;
        const x1 = pt1.x;
        const y1 = pt1.y;
        const x2 = pt2.x;
        const y2 = pt2.y;
        const distance = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
        const ratio = (distance - this.renderOptions.arrowheadLength / 3) / distance;
        let endX;
        let endY;
        let startX;
        let startY;
        if (this.renderOptions.drawEndArrow || bothArrows) {
            endX = Math.round(x1 + (x2 - x1) * ratio);
            endY = Math.round(y1 + (y2 - y1) * ratio);
        }
        else {
            endX = x2;
            endY = y2;
        }
        if (this.renderOptions.drawStartArrow || bothArrows) {
            startX = x1 + (x2 - x1) * (1 - ratio);
            startY = y1 + (y2 - y1) * (1 - ratio);
        }
        else {
            startX = x1;
            startY = y1;
        }
        if (this.renderOptions.color) {
            ctx.setStrokeStyle(this.renderOptions.color);
            ctx.setFillStyle(this.renderOptions.color);
        }
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.closePath();
        const lineAngle = Math.atan2(y2 - y1, x2 - x1);
        const h = Math.abs(this.renderOptions.arrowheadLength / Math.cos(this.renderOptions.arrowheadAngle));
        let angle1;
        let angle2;
        let topX;
        let topY;
        let bottomX;
        let bottomY;
        if (this.renderOptions.drawEndArrow || bothArrows) {
            angle1 = lineAngle + Math.PI + this.renderOptions.arrowheadAngle;
            topX = x2 + Math.cos(angle1) * h;
            topY = y2 + Math.sin(angle1) * h;
            angle2 = lineAngle + Math.PI - this.renderOptions.arrowheadAngle;
            bottomX = x2 + Math.cos(angle2) * h;
            bottomY = y2 + Math.sin(angle2) * h;
            drawArrowHead(ctx, topX, topY, x2, y2, bottomX, bottomY);
        }
        if (this.renderOptions.drawStartArrow || bothArrows) {
            angle1 = lineAngle + this.renderOptions.arrowheadAngle;
            topX = x1 + Math.cos(angle1) * h;
            topY = y1 + Math.sin(angle1) * h;
            angle2 = lineAngle - this.renderOptions.arrowheadAngle;
            bottomX = x1 + Math.cos(angle2) * h;
            bottomY = y1 + Math.sin(angle2) * h;
            drawArrowHead(ctx, topX, topY, x1, y1, bottomX, bottomY);
        }
    }
    draw() {
        const ctx = this.checkContext();
        this.setRendered();
        const firstNote = this.firstNote;
        const lastNote = this.lastNote;
        const renderOptions = this.renderOptions;
        this.applyLineStyle();
        let startPosition = { x: 0, y: 0 };
        let endPosition = { x: 0, y: 0 };
        this.firstIndexes.forEach((firstIndex, i) => {
            const lastIndex = this.lastIndexes[i];
            startPosition = firstNote.getModifierStartXY(2, firstIndex);
            endPosition = lastNote.getModifierStartXY(1, lastIndex);
            const upwardsSlope = startPosition.y > endPosition.y;
            startPosition.x += firstNote.getMetrics().modRightPx + renderOptions.paddingLeft;
            endPosition.x -= lastNote.getMetrics().modLeftPx + renderOptions.paddingRight;
            const noteheadWidth = firstNote.getGlyphWidth();
            const firstDisplaced = firstNote.getKeyProps()[firstIndex].displaced;
            if (firstDisplaced && firstNote.getStemDirection() === 1) {
                startPosition.x += noteheadWidth + renderOptions.paddingLeft;
            }
            const lastDisplaced = lastNote.getKeyProps()[lastIndex].displaced;
            if (lastDisplaced && lastNote.getStemDirection() === -1) {
                endPosition.x -= noteheadWidth + renderOptions.paddingRight;
            }
            startPosition.y += upwardsSlope ? -3 : 1;
            endPosition.y += upwardsSlope ? 2 : 0;
            this.drawArrowLine(ctx, startPosition, endPosition);
        });
        const textWidth = this.width;
        const justification = renderOptions.textJustification;
        let x = 0;
        if (justification === StaveLine.TextJustification.LEFT) {
            x = startPosition.x;
        }
        else if (justification === StaveLine.TextJustification.CENTER) {
            const deltaX = endPosition.x - startPosition.x;
            const centerX = deltaX / 2 + startPosition.x;
            x = centerX - textWidth / 2;
        }
        else if (justification === StaveLine.TextJustification.RIGHT) {
            x = endPosition.x - textWidth;
        }
        let y = 0;
        const verticalPosition = renderOptions.textPositionVertical;
        if (verticalPosition === StaveLine.TextVerticalPosition.TOP) {
            y = firstNote.checkStave().getYForTopText();
        }
        else if (verticalPosition === StaveLine.TextVerticalPosition.BOTTOM) {
            y = firstNote.checkStave().getYForBottomText(Tables.TEXT_HEIGHT_OFFSET_HACK);
        }
        const color = renderOptions.color;
        this.applyStyle(ctx, { fillStyle: color, strokeStyle: color });
        this.renderText(ctx, x, y);
    }
}
StaveLine.TextVerticalPosition = {
    TOP: 1,
    BOTTOM: 2,
};
StaveLine.TextJustification = TextJustification;
