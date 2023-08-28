import { Element } from './element.js';
import { Font } from './font.js';
import { Renderer } from './renderer.js';
import { Tables } from './tables.js';
import { log, RuntimeError } from './util.js';
function L(...args) {
    if (TextBracket.DEBUG)
        log('Vex.Flow.TextBracket', args);
}
export var TextBracketPosition;
(function (TextBracketPosition) {
    TextBracketPosition[TextBracketPosition["TOP"] = 1] = "TOP";
    TextBracketPosition[TextBracketPosition["BOTTOM"] = -1] = "BOTTOM";
})(TextBracketPosition || (TextBracketPosition = {}));
export class TextBracket extends Element {
    static get CATEGORY() {
        return "TextBracket";
    }
    static get Position() {
        return TextBracketPosition;
    }
    static get PositionString() {
        return {
            top: TextBracketPosition.TOP,
            bottom: TextBracketPosition.BOTTOM,
        };
    }
    static get Positions() {
        L('Positions is deprecated, use TextBracketPosition instead.');
        return TextBracketPosition;
    }
    static get PositionsString() {
        L('PositionsString is deprecated, use PositionString instead.');
        return TextBracket.PositionString;
    }
    constructor({ start, stop, text = '', superscript = '', position = TextBracketPosition.TOP }) {
        super();
        this.start = start;
        this.stop = stop;
        this.text = text;
        this.superscript = superscript;
        this.position = typeof position === 'string' ? TextBracket.PositionString[position] : position;
        this.line = 1;
        this.renderOptions = {
            dashed: true,
            dash: [5],
            color: 'black',
            lineWidth: 1,
            showBracket: true,
            bracketHeight: 8,
            underlineSuperscript: true,
        };
    }
    applyStyle(ctx) {
        ctx.setFont(this.font);
        const options = this.renderOptions;
        ctx.setStrokeStyle(options.color);
        ctx.setFillStyle(options.color);
        ctx.setLineWidth(options.lineWidth);
        return this;
    }
    setDashed(dashed, dash) {
        this.renderOptions.dashed = dashed;
        if (dash)
            this.renderOptions.dash = dash;
        return this;
    }
    setLine(line) {
        this.line = line;
        return this;
    }
    draw() {
        const ctx = this.checkContext();
        this.setRendered();
        let y = 0;
        switch (this.position) {
            case TextBracketPosition.TOP:
                y = this.start.checkStave().getYForTopText(this.line);
                break;
            case TextBracketPosition.BOTTOM:
                y = this.start.checkStave().getYForBottomText(this.line + Tables.TEXT_HEIGHT_OFFSET_HACK);
                break;
            default:
                throw new RuntimeError('InvalidPosition', `The position ${this.position} is invalid.`);
        }
        const start = { x: this.start.getAbsoluteX(), y };
        const stop = { x: this.stop.getAbsoluteX(), y };
        L('Rendering TextBracket: start:', start, 'stop:', stop, 'y:', y);
        const bracketHeight = this.renderOptions.bracketHeight * this.position;
        ctx.save();
        this.applyStyle(ctx);
        ctx.fillText(this.text, start.x, start.y);
        const mainMeasure = ctx.measureText(this.text);
        const mainWidth = mainMeasure.width;
        const mainHeight = mainMeasure.height;
        const superY = start.y - mainHeight / 2.5;
        const { family, size, weight, style } = this.textFont;
        const smallerFontSize = Font.scaleSize(size, 0.714286);
        ctx.setFont(family, smallerFontSize, weight, style);
        ctx.fillText(this.superscript, start.x + mainWidth + 1, superY);
        const superMeasure = ctx.measureText(this.superscript);
        const superWidth = superMeasure.width;
        const superHeight = superMeasure.height;
        let startX = start.x;
        let lineY = superY;
        const endX = stop.x + this.stop.getGlyphWidth();
        if (this.position === TextBracketPosition.TOP) {
            startX += mainWidth + superWidth + 5;
            lineY -= superHeight / 2.7;
        }
        else if (this.position === TextBracketPosition.BOTTOM) {
            lineY += superHeight / 2.7;
            startX += mainWidth + 2;
            if (!this.renderOptions.underlineSuperscript) {
                startX += superWidth;
            }
        }
        if (this.renderOptions.dashed) {
            Renderer.drawDashedLine(ctx, startX, lineY, endX, lineY, this.renderOptions.dash);
            if (this.renderOptions.showBracket) {
                Renderer.drawDashedLine(ctx, endX, lineY + 1 * this.position, endX, lineY + bracketHeight, this.renderOptions.dash);
            }
        }
        else {
            ctx.beginPath();
            ctx.moveTo(startX, lineY);
            ctx.lineTo(endX, lineY);
            if (this.renderOptions.showBracket) {
                ctx.lineTo(endX, lineY + bracketHeight);
            }
            ctx.stroke();
            ctx.closePath();
        }
        ctx.restore();
    }
}
TextBracket.DEBUG = false;
