import { Metrics } from './metrics.js';
import { Modifier, ModifierPosition } from './modifier.js';
import { Tables } from './tables.js';
import { RuntimeError } from './util.js';
export class FretHandFinger extends Modifier {
    static get CATEGORY() {
        return "FretHandFinger";
    }
    static format(nums, state) {
        const { leftShift, rightShift } = state;
        const numSpacing = 1;
        if (!nums || nums.length === 0)
            return false;
        const numsList = [];
        let prevNote = null;
        let shiftLeft = 0;
        let shiftRight = 0;
        for (let i = 0; i < nums.length; ++i) {
            const num = nums[i];
            const note = num.getNote();
            const pos = num.getPosition();
            const index = num.checkIndex();
            const props = note.getKeyProps()[index];
            const textHeight = Metrics.get('FretHandFinger.fontSize');
            if (num.position === ModifierPosition.ABOVE) {
                state.topTextLine += textHeight / Tables.STAVE_LINE_DISTANCE + 0.5;
            }
            if (num.position === ModifierPosition.BELOW) {
                state.textLine += textHeight / Tables.STAVE_LINE_DISTANCE + 0.5;
            }
            if (note !== prevNote) {
                for (let n = 0; n < note.keys.length; ++n) {
                    if (leftShift === 0) {
                        shiftLeft = Math.max(note.getLeftDisplacedHeadPx(), shiftLeft);
                    }
                    if (rightShift === 0) {
                        shiftRight = Math.max(note.getRightDisplacedHeadPx(), shiftRight);
                    }
                }
                prevNote = note;
            }
            numsList.push({
                note,
                num,
                pos,
                line: props.line,
                shiftL: shiftLeft,
                shiftR: shiftRight,
            });
        }
        numsList.sort((a, b) => b.line - a.line);
        let numShiftL = 0;
        let numShiftR = 0;
        let xWidthL = 0;
        let xWidthR = 0;
        let lastLine = null;
        let lastNote = null;
        for (let i = 0; i < numsList.length; ++i) {
            let numShift = 0;
            const { note, pos, num, line, shiftL, shiftR } = numsList[i];
            if (line !== lastLine || note !== lastNote) {
                numShiftL = leftShift + shiftL;
                numShiftR = rightShift + shiftR;
            }
            const numWidth = num.getWidth() + numSpacing;
            if (pos === Modifier.Position.LEFT) {
                num.setXShift(leftShift + numShiftL);
                numShift = leftShift + numWidth;
                xWidthL = numShift > xWidthL ? numShift : xWidthL;
            }
            else if (pos === Modifier.Position.RIGHT) {
                num.setXShift(numShiftR);
                numShift = shiftRight + numWidth;
                xWidthR = numShift > xWidthR ? numShift : xWidthR;
            }
            lastLine = line;
            lastNote = note;
        }
        state.leftShift += xWidthL;
        state.rightShift += xWidthR;
        return true;
    }
    static easyScoreHook({ fingerings } = {}, note, builder) {
        fingerings === null || fingerings === void 0 ? void 0 : fingerings.split(',').map((fingeringString) => {
            const split = fingeringString.trim().split('.');
            const params = { number: split[0] };
            if (split[1])
                params.position = split[1];
            return builder.getFactory().Fingering(params);
        }).map((fingering, index) => note.addModifier(fingering, index));
    }
    constructor(finger) {
        super();
        this.setFretHandFinger(finger);
        this.position = Modifier.Position.LEFT;
        this.xOffset = 0;
        this.yOffset = 0;
    }
    setFretHandFinger(finger) {
        this.text = finger;
        return this;
    }
    getFretHandFinger() {
        return this.text;
    }
    setOffsetX(x) {
        this.xOffset = x;
        return this;
    }
    setOffsetY(y) {
        this.yOffset = y;
        return this;
    }
    draw() {
        const ctx = this.checkContext();
        const note = this.checkAttachedNote();
        this.setRendered();
        const start = note.getModifierStartXY(this.position, this.index);
        let dotX = start.x + this.xOffset;
        let dotY = start.y + this.yOffset + 5;
        switch (this.position) {
            case Modifier.Position.ABOVE:
                dotX -= 4;
                dotY -= 12;
                break;
            case Modifier.Position.BELOW:
                dotX -= 2;
                dotY += 10;
                break;
            case Modifier.Position.LEFT:
                dotX -= this.width;
                break;
            case Modifier.Position.RIGHT:
                dotX += 1;
                break;
            default:
                throw new RuntimeError('InvalidPosition', `The position ${this.position} does not exist`);
        }
        this.renderText(ctx, dotX, dotY);
    }
}
