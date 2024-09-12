import { StaveModifier } from './stavemodifier.js';
export var VoltaType;
(function (VoltaType) {
    VoltaType[VoltaType["NONE"] = 1] = "NONE";
    VoltaType[VoltaType["BEGIN"] = 2] = "BEGIN";
    VoltaType[VoltaType["MID"] = 3] = "MID";
    VoltaType[VoltaType["END"] = 4] = "END";
    VoltaType[VoltaType["BEGIN_END"] = 5] = "BEGIN_END";
})(VoltaType || (VoltaType = {}));
export class Volta extends StaveModifier {
    static get CATEGORY() {
        return "Volta";
    }
    static get type() {
        return VoltaType;
    }
    constructor(type, label, x, yShift) {
        super();
        this.type = type;
        this.x = x;
        this.yShift = yShift;
        this.text = label;
    }
    draw() {
        const stave = this.checkStave();
        const x = stave.getModifierXShift(this.getPosition());
        const ctx = stave.checkContext();
        this.setRendered();
        let width = stave.getWidth() - x;
        const topY = stave.getYForTopText(stave.getNumLines()) + this.yShift;
        const vertHeight = 1.5 * stave.getSpacingBetweenLines();
        switch (this.type) {
            case VoltaType.BEGIN:
                ctx.fillRect(this.x + x, topY, 1, vertHeight);
                break;
            case VoltaType.END:
                width -= 5;
                ctx.fillRect(this.x + x + width, topY, 1, vertHeight);
                break;
            case VoltaType.BEGIN_END:
                width -= 3;
                ctx.fillRect(this.x + x, topY, 1, vertHeight);
                ctx.fillRect(this.x + x + width, topY, 1, vertHeight);
                break;
            default:
                break;
        }
        if (this.type === VoltaType.BEGIN || this.type === VoltaType.BEGIN_END) {
            this.renderText(ctx, x + 5, topY - this.yShift + 15);
        }
        ctx.fillRect(this.x + x, topY, width, 1);
    }
}
