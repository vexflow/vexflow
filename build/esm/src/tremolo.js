import { Glyphs } from './glyphs.js';
import { Metrics } from './metrics.js';
import { Modifier } from './modifier.js';
import { Stem } from './stem.js';
export class Tremolo extends Modifier {
    static get CATEGORY() {
        return "Tremolo";
    }
    constructor(num) {
        super();
        this.num = num;
        this.position = Modifier.Position.CENTER;
        this.text = Glyphs.tremolo1;
    }
    draw() {
        const ctx = this.checkContext();
        const note = this.checkAttachedNote();
        this.setRendered();
        const stemDirection = note.getStemDirection();
        const scale = note.getFontScale();
        const ySpacing = Metrics.get(`Tremolo.spacing`) * stemDirection * scale;
        const x = note.getAbsoluteX() + (stemDirection === Stem.UP ? note.getGlyphWidth() - Stem.WIDTH / 2 : Stem.WIDTH / 2);
        let y = note.getStemExtents().topY + (this.num <= 3 ? ySpacing : 0);
        this.fontInfo.size = Metrics.get(`Tremolo.fontSize`) * scale;
        for (let i = 0; i < this.num; ++i) {
            this.renderText(ctx, x, y);
            y += ySpacing;
        }
    }
}
