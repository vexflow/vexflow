import { StaveModifier, StaveModifierPosition } from './stavemodifier.js';
import { TextJustification, TextNote } from './textnote.js';
import { RuntimeError } from './util.js';
export class StaveText extends StaveModifier {
    static get CATEGORY() {
        return "StaveText";
    }
    constructor(text, position, options = {}) {
        var _a, _b, _c;
        super();
        this.setText(text);
        this.setXShift((_a = options.shiftX) !== null && _a !== void 0 ? _a : 0);
        this.setYShift((_b = options.shiftY) !== null && _b !== void 0 ? _b : 0);
        this.position = position;
        this.justification = (_c = options.justification) !== null && _c !== void 0 ? _c : TextNote.Justification.CENTER;
    }
    draw() {
        const stave = this.checkStave();
        const ctx = stave.checkContext();
        this.setRendered();
        let x;
        let y;
        switch (this.position) {
            case StaveModifierPosition.LEFT:
            case StaveModifierPosition.RIGHT:
                y = (stave.getYForLine(0) + stave.getBottomLineY()) / 2;
                if (this.position === StaveModifierPosition.LEFT) {
                    x = stave.getX() - this.width - 24;
                }
                else {
                    x = stave.getX() + stave.getWidth() + 24;
                }
                break;
            case StaveModifierPosition.ABOVE:
            case StaveModifierPosition.BELOW:
                x = stave.getX();
                if (this.justification === TextJustification.CENTER) {
                    x += stave.getWidth() / 2 - this.width / 2;
                }
                else if (this.justification === TextJustification.RIGHT) {
                    x += stave.getWidth() - this.width;
                }
                if (this.position === StaveModifierPosition.ABOVE) {
                    y = stave.getYForTopText(2);
                }
                else {
                    y = stave.getYForBottomText(2);
                }
                break;
            default:
                throw new RuntimeError('InvalidPosition', 'Value Must be in Modifier.Position.');
        }
        this.renderText(ctx, x, y + 4);
    }
}
