var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _StaveTempo_durationToCode;
import { Element } from './element.js';
import { StaveModifier, StaveModifierPosition } from './stavemodifier.js';
import { Tables } from './tables.js';
export class StaveTempo extends StaveModifier {
    static get CATEGORY() {
        return "StaveTempo";
    }
    constructor(tempo, x, shiftY) {
        super();
        _StaveTempo_durationToCode.set(this, {
            '1/2': '\ue1d0',
            1: '\ueca2',
            2: '\ueca3',
            4: '\ueca5',
            8: '\ueca7',
            16: '\ueca9',
            32: '\uecab',
            64: '\uecad',
            128: '\uecaf',
            256: '\uecb1',
            512: '\uecb3',
            1024: '\uecb5',
        });
        this.tempo = tempo;
        this.position = StaveModifierPosition.ABOVE;
        this.x = x;
        this.setXShift(10);
        this.setYShift(shiftY);
    }
    setTempo(tempo) {
        this.tempo = tempo;
        return this;
    }
    draw(stave, shiftX) {
        var _a;
        const ctx = stave.checkContext();
        this.setRendered();
        const name = this.tempo.name;
        const duration = this.tempo.duration;
        const dots = (_a = this.tempo.dots) !== null && _a !== void 0 ? _a : 0;
        const bpm = this.tempo.bpm;
        let x = this.x + shiftX;
        const y = stave.getYForTopText(1);
        ctx.save();
        if (name) {
            this.text = name;
            this.textFont = Tables.lookupMetricFontInfo('StaveTempo.name');
            this.measureText();
            this.renderText(ctx, shiftX, y);
            x += this.getWidth();
        }
        if (duration && bpm) {
            if (name) {
                x += 2;
                ctx.setFont(Tables.lookupMetricFontInfo('StaveTempo'));
                ctx.fillText('(', x + this.xShift, y + this.yShift);
                x += 5;
            }
            x += 3;
            const el = new Element('StaveTempo.glyph');
            el.setText(__classPrivateFieldGet(this, _StaveTempo_durationToCode, "f")[Tables.sanitizeDuration(duration)]);
            el.measureText();
            el.renderText(ctx, x + this.xShift, y + this.yShift);
            x += el.getWidth();
            ctx.setFont(Tables.lookupMetricFontInfo('StaveTempo.glyph'));
            for (let i = 0; i < dots; i++) {
                x += 6;
                ctx.fillText('\uecb7', x + this.xShift, y + 2 + this.yShift);
            }
            ctx.setFont(Tables.lookupMetricFontInfo('StaveTempo'));
            ctx.fillText(' = ' + bpm + (name ? ')' : ''), x + 3 + this.xShift, y + this.yShift);
        }
        ctx.restore();
        return this;
    }
}
_StaveTempo_durationToCode = new WeakMap();
