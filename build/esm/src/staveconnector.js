import { Element } from './element.js';
import { Glyphs } from './glyphs.js';
import { Tables } from './tables.js';
import { RuntimeError } from './util.js';
function drawBoldDoubleLine(ctx, type, topX, topY, botY) {
    if (type !== StaveConnector.type.BOLD_DOUBLE_LEFT && type !== StaveConnector.type.BOLD_DOUBLE_RIGHT) {
        throw new RuntimeError('InvalidConnector', 'A REPEAT_BEGIN or REPEAT_END type must be provided.');
    }
    let xShift = 3;
    let variableWidth = 3.5;
    const thickLineOffset = 2;
    if (type === StaveConnector.type.BOLD_DOUBLE_RIGHT) {
        xShift = -5;
        variableWidth = 3;
    }
    ctx.fillRect(topX + xShift, topY, 1, botY - topY);
    ctx.fillRect(topX - thickLineOffset, topY, variableWidth, botY - topY);
}
export class StaveConnector extends Element {
    static get CATEGORY() {
        return "StaveConnector";
    }
    constructor(topStave, bottomStave) {
        super();
        this.thickness = Tables.STAVE_LINE_THICKNESS;
        this.topStave = topStave;
        this.bottomStave = bottomStave;
        this.type = StaveConnector.type.DOUBLE;
        this.xShift = 0;
        this.texts = [];
    }
    setType(type) {
        const newType = typeof type === 'string' ? StaveConnector.typeString[type] : type;
        if (Object.values(StaveConnector.type).includes(newType)) {
            this.type = newType;
        }
        return this;
    }
    getType() {
        return this.type;
    }
    setText(text, options = {}) {
        var _a, _b;
        const textElement = new Element('StaveConnector.text');
        textElement.setText(text);
        textElement.setXShift((_a = options.shiftX) !== null && _a !== void 0 ? _a : 0);
        textElement.setYShift((_b = options.shiftY) !== null && _b !== void 0 ? _b : 0);
        this.texts.push(textElement);
        return this;
    }
    draw() {
        const ctx = this.checkContext();
        this.setRendered();
        let topY = this.topStave.getYForLine(0);
        let botY = this.bottomStave.getYForLine(this.bottomStave.getNumLines() - 1) + this.thickness;
        let width = 3;
        let topX = this.topStave.getX();
        const isRightSidedConnector = this.type === StaveConnector.type.SINGLE_RIGHT ||
            this.type === StaveConnector.type.BOLD_DOUBLE_RIGHT ||
            this.type === StaveConnector.type.THIN_DOUBLE;
        if (isRightSidedConnector) {
            topX = this.topStave.getX() + this.topStave.getWidth();
        }
        let attachmentHeight = botY - topY;
        const element = new Element();
        switch (this.type) {
            case StaveConnector.type.SINGLE:
                width = 1;
                break;
            case StaveConnector.type.SINGLE_LEFT:
                width = 1;
                break;
            case StaveConnector.type.SINGLE_RIGHT:
                width = 1;
                break;
            case StaveConnector.type.DOUBLE:
                topX -= 5;
                topY -= this.thickness;
                attachmentHeight += 0.5;
                break;
            case StaveConnector.type.BRACE: {
                width = 12;
                const x1 = this.topStave.getX() - 2 + this.xShift;
                const y1 = topY;
                const x3 = x1;
                const y3 = botY;
                const x2 = x1 - width;
                const y2 = y1 + attachmentHeight / 2.0;
                const cpx1 = x2 - 0.9 * width;
                const cpy1 = y1 + 0.2 * attachmentHeight;
                const cpx2 = x1 + 1.1 * width;
                const cpy2 = y2 - 0.135 * attachmentHeight;
                const cpx3 = cpx2;
                const cpy3 = y2 + 0.135 * attachmentHeight;
                const cpx4 = cpx1;
                const cpy4 = y3 - 0.2 * attachmentHeight;
                const cpx5 = x2 - width;
                const cpy5 = cpy4;
                const cpx6 = x1 + 0.4 * width;
                const cpy6 = y2 + 0.135 * attachmentHeight;
                const cpx7 = cpx6;
                const cpy7 = y2 - 0.135 * attachmentHeight;
                const cpx8 = cpx5;
                const cpy8 = cpy1;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, x2, y2);
                ctx.bezierCurveTo(cpx3, cpy3, cpx4, cpy4, x3, y3);
                ctx.bezierCurveTo(cpx5, cpy5, cpx6, cpy6, x2, y2);
                ctx.bezierCurveTo(cpx7, cpy7, cpx8, cpy8, x1, y1);
                ctx.fill();
                ctx.stroke();
                break;
            }
            case StaveConnector.type.BRACKET:
                topY -= 6;
                botY += 6;
                attachmentHeight = botY - topY;
                element.setText(Glyphs.bracketTop);
                element.renderText(ctx, topX - 5, topY);
                element.setText(Glyphs.bracketBottom);
                element.renderText(ctx, topX - 5, botY);
                topX -= 5;
                break;
            case StaveConnector.type.BOLD_DOUBLE_LEFT:
                drawBoldDoubleLine(ctx, this.type, topX + this.xShift, topY, botY - this.thickness);
                break;
            case StaveConnector.type.BOLD_DOUBLE_RIGHT:
                drawBoldDoubleLine(ctx, this.type, topX, topY, botY - this.thickness);
                break;
            case StaveConnector.type.THIN_DOUBLE:
                width = 1;
                attachmentHeight -= this.thickness;
                break;
            case StaveConnector.type.NONE:
                break;
            default:
                throw new RuntimeError('InvalidType', `The provided StaveConnector.type (${this.type}) is invalid.`);
        }
        if (this.type !== StaveConnector.type.BRACE &&
            this.type !== StaveConnector.type.BOLD_DOUBLE_LEFT &&
            this.type !== StaveConnector.type.BOLD_DOUBLE_RIGHT &&
            this.type !== StaveConnector.type.NONE) {
            ctx.fillRect(topX, topY, width, attachmentHeight);
        }
        if (this.type === StaveConnector.type.THIN_DOUBLE) {
            ctx.fillRect(topX - 3, topY, width, attachmentHeight);
        }
        for (let i = 0; i < this.texts.length; i++) {
            const textElement = this.texts[i];
            const x = this.topStave.getX() - textElement.getWidth() - 24;
            const y = (this.topStave.getYForLine(0) + this.bottomStave.getBottomLineY()) / 2;
            textElement.renderText(ctx, x, y + 4);
        }
    }
}
StaveConnector.type = {
    SINGLE_RIGHT: 0,
    SINGLE_LEFT: 1,
    SINGLE: 1,
    DOUBLE: 2,
    BRACE: 3,
    BRACKET: 4,
    BOLD_DOUBLE_LEFT: 5,
    BOLD_DOUBLE_RIGHT: 6,
    THIN_DOUBLE: 7,
    NONE: 8,
};
StaveConnector.typeString = {
    singleRight: StaveConnector.type.SINGLE_RIGHT,
    singleLeft: StaveConnector.type.SINGLE_LEFT,
    single: StaveConnector.type.SINGLE,
    double: StaveConnector.type.DOUBLE,
    brace: StaveConnector.type.BRACE,
    bracket: StaveConnector.type.BRACKET,
    boldDoubleLeft: StaveConnector.type.BOLD_DOUBLE_LEFT,
    boldDoubleRight: StaveConnector.type.BOLD_DOUBLE_RIGHT,
    thinDouble: StaveConnector.type.THIN_DOUBLE,
    none: StaveConnector.type.NONE,
};
