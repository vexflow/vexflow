import { Element } from './element.js';
import { Font } from './font.js';
import { Renderer } from './renderer.js';
import { Tables } from './tables.js';
import { log, RuntimeError } from './util.js';
function L(...args) {
    if (TextBracket.DEBUG)
        log('VexFlow.TextBracket', args);
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
    constructor({ start, stop, text = '', superscript = '', position = TextBracketPosition.TOP }) {
        super();
        this.start = start;
        this.stop = stop;
        this.textElement = new Element('TextBracket');
        this.textElement.setText(text);
        this.superscriptElement = new Element('TextBracket');
        this.superscriptElement.setText(superscript);
        const smallerFontSize = Font.scaleSize(this.fontInfo.size, 0.714286);
        this.superscriptElement.setFontSize(smallerFontSize);
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
        this.textElement.setFont(this.fontInfo);
        const { family, size, weight, style } = this.fontInfo;
        const smallerFontSize = Font.scaleSize(size, 0.714286);
        this.superscriptElement.setFont(family, smallerFontSize, weight, style);
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
        this.textElement.renderText(ctx, start.x, start.y);
        const mainWidth = this.textElement.getWidth();
        const mainHeight = this.textElement.getHeight();
        const superY = start.y - mainHeight / 2.5;
        this.superscriptElement.renderText(ctx, start.x + mainWidth + 1, superY);
        const superWidth = this.superscriptElement.getWidth();
        const superHeight = this.superscriptElement.getHeight();
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
    }
}
TextBracket.DEBUG = false;
