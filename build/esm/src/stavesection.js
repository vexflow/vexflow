import { Metrics } from './metrics.js';
import { StaveModifier } from './stavemodifier.js';
export class StaveSection extends StaveModifier {
    static get CATEGORY() {
        return "StaveSection";
    }
    constructor(section, x = 0, yShift = 0, drawRect = true) {
        super();
        this.setText(section);
        this.x = x;
        this.yShift = yShift;
        this.drawRect = drawRect;
        this.padding = Metrics.get('StaveSection.padding');
    }
    setDrawRect(drawRect) {
        this.drawRect = drawRect;
        return this;
    }
    draw() {
        const stave = this.checkStave();
        const ctx = stave.checkContext();
        this.setRendered();
        this.x = stave.getX() + stave.getModifierXShift(this.getPosition());
        const headroom = -1 * this.textMetrics.actualBoundingBoxDescent;
        const width = this.width + 2 * this.padding;
        const height = this.height + 2 * this.padding;
        const y = stave.getYForTopText(1.5) + this.yShift;
        const x = this.x + this.xShift;
        if (this.drawRect) {
            ctx.beginPath();
            ctx.rect(x, y - height + headroom, width, height);
            ctx.stroke();
        }
        this.renderText(ctx, this.xShift + this.padding, y - this.padding);
    }
}
