import { getBottomY, getInitialOffset, getTopY } from './articulation.js';
import { Element } from './element.js';
import { Metrics } from './metrics.js';
import { Modifier, ModifierPosition } from './modifier.js';
import { Stem } from './stem.js';
import { Tables } from './tables.js';
import { log } from './util.js';
function L(...args) {
    if (Ornament.DEBUG)
        log('VexFlow.Ornament', args);
}
export class Ornament extends Modifier {
    static get CATEGORY() {
        return "Ornament";
    }
    static get minPadding() {
        return Metrics.get('NoteHead.minPadding');
    }
    static format(ornaments, state) {
        var _a, _b;
        if (!ornaments || ornaments.length === 0)
            return false;
        let width = 0;
        let rightShift = state.rightShift;
        let leftShift = state.leftShift;
        for (let i = 0; i < ornaments.length; ++i) {
            const ornament = ornaments[i];
            const increment = 2;
            if (ornament.position === ModifierPosition.RIGHT) {
                ornament.xShift += rightShift + 2;
                rightShift += ornament.width + Ornament.minPadding;
            }
            else if (ornament.position === ModifierPosition.LEFT) {
                ornament.xShift -= leftShift + ornament.width + 2;
                leftShift += ornament.width + Ornament.minPadding;
            }
            else if (ornament.position === ModifierPosition.ABOVE) {
                width = Math.max(ornament.getWidth(), width);
                const note = ornament.getNote();
                let curTop = note.getLineNumber(true) + state.topTextLine;
                const stem = note.getStem();
                if (stem && note.getStemDirection() === Stem.UP) {
                    curTop += Math.abs(stem.getHeight()) / Tables.STAVE_LINE_DISTANCE;
                }
                const numLines = (_b = (_a = note.getStave()) === null || _a === void 0 ? void 0 : _a.getNumLines()) !== null && _b !== void 0 ? _b : 0;
                if (curTop < numLines)
                    state.topTextLine += numLines - curTop;
                ornament.setTextLine(state.topTextLine);
                state.topTextLine += increment;
            }
            else {
                width = Math.max(ornament.getWidth(), width);
                ornament.setTextLine(state.textLine);
                state.textLine += increment;
            }
        }
        state.leftShift = leftShift + width / 2;
        state.rightShift = rightShift + width / 2;
        return true;
    }
    static get ornamentNoteTransition() {
        return ['flip', 'jazzTurn', 'smear'];
    }
    static get ornamentAttack() {
        return ['scoop'];
    }
    static get ornamentAlignWithNoteHead() {
        return ['doit', 'fall', 'fallLong', 'doitLong', 'scoop'];
    }
    static get ornamentRelease() {
        return ['doit', 'fall', 'fallLong', 'doitLong', 'jazzTurn', 'smear', 'flip'];
    }
    static get ornamentLeft() {
        return ['scoop'];
    }
    static get ornamentRight() {
        return ['doit', 'fall', 'fallLong', 'doitLong'];
    }
    static get ornamentYShift() {
        return ['fallLong'];
    }
    static get ornamentArticulation() {
        return ['bend', 'plungerClosed', 'plungerOpen'];
    }
    constructor(type) {
        super();
        this.position = ModifierPosition.ABOVE;
        if (Ornament.ornamentRight.indexOf(type) >= 0) {
            this.position = ModifierPosition.RIGHT;
        }
        if (Ornament.ornamentLeft.indexOf(type) >= 0) {
            this.position = ModifierPosition.LEFT;
        }
        this.type = type;
        this.delayed = false;
        this.renderOptions = {
            accidentalLowerPadding: 3,
            accidentalUpperPadding: 3,
        };
        this.adjustForStemDirection = false;
        this.ornamentAlignWithNoteHead = Ornament.ornamentAlignWithNoteHead.indexOf(this.type) >= 0;
        if (Ornament.ornamentNoteTransition.indexOf(this.type) >= 0) {
            this.delayed = true;
        }
        this.text = Tables.ornamentCodes(this.type);
    }
    setNote(note) {
        super.setNote(note);
        if (Ornament.ornamentArticulation.indexOf(this.type) >= 0) {
            if (note.getLineNumber() >= 3) {
                this.position = Modifier.Position.ABOVE;
            }
            else {
                this.position = Modifier.Position.BELOW;
            }
        }
        return this;
    }
    setDelayed(delayed) {
        this.delayed = delayed;
        return this;
    }
    setUpperAccidental(accid) {
        this.accidentalUpper = new Element();
        this.accidentalUpper.setText(Tables.accidentalCodes(accid));
        return this;
    }
    setLowerAccidental(accid) {
        this.accidentalLower = new Element();
        this.accidentalLower.setText(Tables.accidentalCodes(accid));
        return this;
    }
    draw() {
        const ctx = this.checkContext();
        const note = this.checkAttachedNote();
        this.setRendered();
        const stave = note.checkStave();
        ctx.openGroup('ornament', this.getAttribute('id'));
        const start = note.getModifierStartXY(this.position, this.index);
        let glyphX = start.x;
        const staffSpace = stave.getSpacingBetweenLines();
        const initialOffset = getInitialOffset(note, this.position);
        let glyphY = this.ornamentAlignWithNoteHead ? start.y : 0;
        if (this.position === ModifierPosition.ABOVE) {
            glyphY = getTopY(note, this.textLine) - (this.textLine + initialOffset) * staffSpace;
        }
        if (this.position === ModifierPosition.BELOW) {
            glyphY = getBottomY(note, this.textLine) + (this.textLine + initialOffset + 1.5) * staffSpace;
        }
        if (this.delayed) {
            let delayXShift = 0;
            const startX = note.getTickContext().getX();
            if (this.delayXShift !== undefined) {
                delayXShift = this.delayXShift;
            }
            else {
                const tickables = note.getVoice().getTickables();
                const index = tickables.indexOf(note);
                const nextContext = index + 1 < tickables.length ? tickables[index + 1].checkTickContext() : undefined;
                if (nextContext) {
                    delayXShift += (nextContext.getX() - startX) * 0.5;
                }
                else {
                    delayXShift += (stave.getX() + stave.getWidth() - glyphX) * 0.5;
                }
                this.delayXShift = delayXShift;
            }
            glyphX += delayXShift;
        }
        L('Rendering ornament: ', this.text.charCodeAt(0), glyphX, glyphY);
        if (this.accidentalLower) {
            this.accidentalLower.renderText(ctx, glyphX + this.xShift - this.accidentalLower.getWidth() * 0.5, glyphY + this.yShift - this.accidentalLower.getTextMetrics().actualBoundingBoxDescent);
            glyphY -= this.accidentalLower.getHeight() + this.renderOptions.accidentalLowerPadding;
        }
        if (Ornament.ornamentYShift.indexOf(this.type) >= 0) {
            this.yShift += this.getHeight();
        }
        this.x =
            glyphX -
                (this.position === ModifierPosition.ABOVE || this.position === ModifierPosition.BELOW ? this.width * 0.5 : 0);
        this.y = glyphY;
        this.renderText(ctx, 0, 0);
        if (this.accidentalUpper) {
            glyphY -= this.getHeight() + this.renderOptions.accidentalUpperPadding;
            this.accidentalUpper.renderText(ctx, glyphX + this.xShift - this.accidentalUpper.getWidth() * 0.5, glyphY + this.yShift - this.accidentalUpper.getTextMetrics().actualBoundingBoxDescent);
        }
        ctx.closeGroup();
    }
}
Ornament.DEBUG = false;
