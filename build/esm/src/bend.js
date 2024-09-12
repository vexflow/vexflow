import { Element } from './element.js';
import { Metrics } from './metrics.js';
import { Modifier } from './modifier.js';
import { isTabNote } from './typeguard.js';
import { RuntimeError } from './util.js';
export class Bend extends Modifier {
    static get CATEGORY() {
        return "Bend";
    }
    static get UP() {
        return 0;
    }
    static get DOWN() {
        return 1;
    }
    static format(bends, state) {
        if (!bends || bends.length === 0)
            return false;
        let lastWidth = 0;
        for (let i = 0; i < bends.length; ++i) {
            const bend = bends[i];
            const note = bend.checkAttachedNote();
            if (isTabNote(note)) {
                const stringPos = note.leastString() - 1;
                if (state.topTextLine < stringPos) {
                    state.topTextLine = stringPos;
                }
            }
            bend.setXShift(lastWidth);
            lastWidth = bend.getWidth();
            bend.setTextLine(state.topTextLine);
        }
        state.rightShift += lastWidth;
        state.topTextLine += 1;
        return true;
    }
    setStyleLine(style) {
        this.styleLine = style;
        return this;
    }
    getStyleLine() {
        return this.styleLine;
    }
    constructor(phrase) {
        super();
        this.styleLine = Metrics.getStyle('Bend.line');
        this.xShift = 0;
        this.tap = '';
        this.renderOptions = {
            bendWidth: 8,
            releaseWidth: 8,
        };
        this.phrase = phrase;
        this.updateWidth();
    }
    setXShift(value) {
        this.xShift = value;
        this.updateWidth();
        return this;
    }
    setTap(value) {
        this.tap = value;
        return this;
    }
    getTextHeight() {
        const element = new Element("Bend");
        element.setText(this.phrase[0].text);
        return element.getHeight();
    }
    updateWidth() {
        const measureText = (text) => {
            const element = new Element("Bend");
            element.setText(text);
            return element.getWidth();
        };
        let totalWidth = 0;
        for (let i = 0; i < this.phrase.length; ++i) {
            const bend = this.phrase[i];
            if (bend.width !== undefined) {
                totalWidth += bend.width;
            }
            else {
                const additionalWidth = bend.type === Bend.UP ? this.renderOptions.bendWidth : this.renderOptions.releaseWidth;
                bend.width = Math.max(additionalWidth, measureText(bend.text)) + 3;
                bend.drawWidth = bend.width / 2;
                totalWidth += bend.width;
            }
        }
        this.setWidth(totalWidth + this.xShift);
        return this;
    }
    draw() {
        var _a;
        const ctx = this.checkContext();
        const note = this.checkAttachedNote();
        this.setRendered();
        const start = note.getModifierStartXY(Modifier.Position.RIGHT, this.index);
        start.x += 3;
        start.y += 0.5;
        const xShift = this.xShift;
        const stave = note.checkStave();
        const spacing = stave.getSpacingBetweenLines();
        const lowestY = note.getYs().reduce((a, b) => (a < b ? a : b));
        const bendHeight = start.y - ((this.textLine + 1) * spacing + start.y - lowestY) + 3;
        const annotationY = start.y - ((this.textLine + 1) * spacing + start.y - lowestY) - 1;
        const renderBend = (x, y, width, height) => {
            const cpX = x + width;
            const cpY = y;
            this.applyStyle(ctx, this.styleLine);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(cpX, cpY, x + width, height);
            ctx.stroke();
        };
        const renderRelease = (x, y, width, height) => {
            this.applyStyle(ctx, this.styleLine);
            ctx.beginPath();
            ctx.moveTo(x, height);
            ctx.quadraticCurveTo(x + width, height, x + width, y);
            ctx.stroke();
        };
        const renderArrowHead = (x, y, direction) => {
            const width = 4;
            const yBase = y + width * direction;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - width, yBase);
            ctx.lineTo(x + width, yBase);
            ctx.closePath();
            ctx.fill();
        };
        const renderText = (x, text) => {
            ctx.setFont(this.fontInfo);
            const renderX = x - ctx.measureText(text).width / 2;
            ctx.fillText(text, renderX, annotationY);
        };
        let lastBend = undefined;
        let lastBendDrawWidth = 0;
        let lastDrawnWidth = 0;
        if ((_a = this.tap) === null || _a === void 0 ? void 0 : _a.length) {
            const tapStart = note.getModifierStartXY(Modifier.Position.CENTER, this.index);
            renderText(tapStart.x, this.tap);
        }
        for (let i = 0; i < this.phrase.length; ++i) {
            const bend = this.phrase[i];
            if (!bend.drawWidth)
                bend.drawWidth = 0;
            if (i === 0)
                bend.drawWidth += xShift;
            lastDrawnWidth = bend.drawWidth + lastBendDrawWidth - (i === 1 ? xShift : 0);
            if (bend.type === Bend.UP) {
                if (lastBend && lastBend.type === Bend.UP) {
                    renderArrowHead(start.x, bendHeight, +1);
                }
                renderBend(start.x, start.y, lastDrawnWidth, bendHeight);
            }
            if (bend.type === Bend.DOWN) {
                if (lastBend && lastBend.type === Bend.UP) {
                    renderRelease(start.x, start.y, lastDrawnWidth, bendHeight);
                }
                if (lastBend && lastBend.type === Bend.DOWN) {
                    renderArrowHead(start.x, start.y, -1);
                    renderRelease(start.x, start.y, lastDrawnWidth, bendHeight);
                }
                if (!lastBend) {
                    lastDrawnWidth = bend.drawWidth;
                    renderRelease(start.x, start.y, lastDrawnWidth, bendHeight);
                }
            }
            renderText(start.x + lastDrawnWidth, bend.text);
            lastBend = bend;
            lastBendDrawWidth = bend.drawWidth;
            lastBend.x = start.x;
            start.x += lastDrawnWidth;
        }
        if (!lastBend || lastBend.x === undefined) {
            throw new RuntimeError('NoLastBendForBend', 'Internal error.');
        }
        if (lastBend.type === Bend.UP) {
            renderArrowHead(lastBend.x + lastDrawnWidth, bendHeight, +1);
        }
        else if (lastBend.type === Bend.DOWN) {
            renderArrowHead(lastBend.x + lastDrawnWidth, start.y, -1);
        }
    }
}
