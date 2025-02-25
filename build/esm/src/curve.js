import { Element } from './element.js';
import { RuntimeError } from './util.js';
export var CurvePosition;
(function (CurvePosition) {
    CurvePosition[CurvePosition["NEAR_HEAD"] = 1] = "NEAR_HEAD";
    CurvePosition[CurvePosition["NEAR_TOP"] = 2] = "NEAR_TOP";
})(CurvePosition || (CurvePosition = {}));
export class Curve extends Element {
    static get CATEGORY() {
        return "Curve";
    }
    static get Position() {
        return CurvePosition;
    }
    static get PositionString() {
        return {
            nearHead: CurvePosition.NEAR_HEAD,
            nearTop: CurvePosition.NEAR_TOP,
        };
    }
    constructor(from, to, options) {
        super();
        this.renderOptions = Object.assign({ thickness: 2, xShift: 0, yShift: 10, position: CurvePosition.NEAR_HEAD, positionEnd: CurvePosition.NEAR_HEAD, invert: false, cps: [
                { x: 0, y: 10 },
                { x: 0, y: 10 },
            ], openingDirection: 'auto' }, options);
        this.setNotes(from, to);
    }
    setNotes(from, to) {
        if (!from && !to) {
            throw new RuntimeError('BadArguments', 'Curve needs to have either `from` or `to` set.');
        }
        this.from = from;
        this.to = to;
        return this;
    }
    isPartial() {
        return !this.from || !this.to;
    }
    renderCurve(params) {
        var _a, _b;
        const ctx = this.checkContext();
        const xShift = this.renderOptions.xShift;
        const yShift = this.renderOptions.yShift * params.direction;
        const firstX = params.firstX + xShift;
        const firstY = params.firstY + yShift;
        const lastX = params.lastX - xShift;
        const lastY = params.lastY + yShift;
        const thickness = this.renderOptions.thickness;
        const cps = this.renderOptions.cps;
        const { x: cp0x, y: cp0y } = cps[0];
        const { x: cp1x, y: cp1y } = cps[1];
        const controlPointSpacing = (lastX - firstX) / (cps.length + 2);
        ctx.beginPath();
        ctx.moveTo(firstX, firstY);
        ctx.bezierCurveTo(firstX + controlPointSpacing + cp0x, firstY + cp0y * params.direction, lastX - controlPointSpacing + cp1x, lastY + cp1y * params.direction, lastX, lastY);
        if (!((_a = this.style) === null || _a === void 0 ? void 0 : _a.lineDash))
            ctx.bezierCurveTo(lastX - controlPointSpacing + cp1x, lastY + (cp1y + thickness) * params.direction, firstX + controlPointSpacing + cp0x, firstY + (cp0y + thickness) * params.direction, firstX, firstY);
        ctx.stroke();
        ctx.closePath();
        if (!((_b = this.style) === null || _b === void 0 ? void 0 : _b.lineDash))
            ctx.fill();
    }
    draw() {
        this.checkContext();
        this.setRendered();
        const firstNote = this.from;
        const lastNote = this.to;
        let firstX;
        let lastX;
        let firstY;
        let lastY;
        let stemDirection = 0;
        let metric = 'baseY';
        let endMetric = 'baseY';
        function getPosition(position) {
            return typeof position === 'string' ? Curve.PositionString[position] : position;
        }
        const position = getPosition(this.renderOptions.position);
        const positionEnd = getPosition(this.renderOptions.positionEnd);
        if (position === CurvePosition.NEAR_TOP) {
            metric = 'topY';
            endMetric = 'topY';
        }
        if (positionEnd === CurvePosition.NEAR_HEAD) {
            endMetric = 'baseY';
        }
        else if (positionEnd === CurvePosition.NEAR_TOP) {
            endMetric = 'topY';
        }
        if (firstNote) {
            firstX = firstNote.getTieRightX();
            stemDirection = firstNote.getStemDirection();
            firstY = firstNote.getStemExtents()[metric];
        }
        else {
            const stave = lastNote.checkStave();
            firstX = stave.getTieStartX();
            firstY = lastNote.getStemExtents()[metric];
        }
        if (lastNote) {
            lastX = lastNote.getTieLeftX();
            stemDirection = lastNote.getStemDirection();
            lastY = lastNote.getStemExtents()[endMetric];
        }
        else {
            const stave = firstNote.checkStave();
            lastX = stave.getTieEndX();
            lastY = firstNote.getStemExtents()[endMetric];
        }
        if (this.renderOptions.openingDirection === 'up') {
            stemDirection = 1;
        }
        if (this.renderOptions.openingDirection === 'down') {
            stemDirection = -1;
        }
        this.renderCurve({
            firstX,
            lastX,
            firstY,
            lastY,
            direction: stemDirection * (this.renderOptions.invert === true ? -1 : 1),
        });
        return true;
    }
}
