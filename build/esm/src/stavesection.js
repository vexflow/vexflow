import { StaveModifier } from './stavemodifier.js';
export class StaveSection extends StaveModifier {
    static get CATEGORY() {
        return "StaveSection";
    }
    constructor(section, x, yShift, drawRect = true) {
        super();
        this.setStaveSection(section);
        this.x = x;
        this.yShift = yShift;
        this.drawRect = drawRect;
    }
    setStaveSection(section) {
        this.text = section;
        return this;
    }
    draw(stave, xShift) {
        const borderWidth = 2;
        const padding = 2;
        const ctx = stave.checkContext();
        this.setRendered();
        ctx.save();
        ctx.setLineWidth(borderWidth);
        const headroom = -1 * this.textMetrics.actualBoundingBoxDescent;
        const width = this.width + 2 * padding;
        const height = this.height + 2 * padding;
        const y = stave.getYForTopText(1.5) + this.yShift;
        const x = this.x + xShift;
        if (this.drawRect) {
            ctx.beginPath();
            ctx.rect(x, y - height + headroom, width, height);
            ctx.stroke();
        }
        this.renderText(ctx, xShift + padding, y - padding);
        ctx.restore();
        return this;
    }
}
