import { Modifier, ModifierPosition } from './modifier.js';
export class Parenthesis extends Modifier {
    static get CATEGORY() {
        return "Parenthesis";
    }
    static buildAndAttach(notes) {
        for (const note of notes) {
            for (let i = 0; i < note.keys.length; i++) {
                note.addModifier(new Parenthesis(ModifierPosition.LEFT), i);
                note.addModifier(new Parenthesis(ModifierPosition.RIGHT), i);
            }
        }
    }
    static format(parentheses, state) {
        if (!parentheses || parentheses.length === 0)
            return false;
        let xWidthL = 0;
        let xWidthR = 0;
        for (let i = 0; i < parentheses.length; ++i) {
            const parenthesis = parentheses[i];
            const note = parenthesis.getNote();
            const pos = parenthesis.getPosition();
            const index = parenthesis.checkIndex();
            let shift = 0;
            if (pos === ModifierPosition.RIGHT) {
                shift = note.getRightParenthesisPx(index);
                xWidthR = xWidthR > shift + parenthesis.width ? xWidthR : shift + parenthesis.width;
            }
            if (pos === ModifierPosition.LEFT) {
                shift = note.getLeftParenthesisPx(index) + parenthesis.width;
                xWidthL = xWidthL > shift + parenthesis.width ? xWidthL : shift + parenthesis.width;
            }
            parenthesis.setXShift(shift);
        }
        state.leftShift += xWidthL;
        state.rightShift += xWidthR;
        return true;
    }
    constructor(position) {
        super();
        this.position = position !== null && position !== void 0 ? position : Modifier.Position.LEFT;
        if (this.position === Modifier.Position.RIGHT) {
            this.text = '\uE0F6';
        }
        else if (this.position === Modifier.Position.LEFT) {
            this.text = '\uE0F5';
        }
    }
    setNote(note) {
        this.note = note;
        this.setFont(note.getFont());
        return this;
    }
    draw() {
        const ctx = this.checkContext();
        const note = this.checkAttachedNote();
        this.setRendered();
        const start = note.getModifierStartXY(this.position, this.index, { forceFlagRight: true });
        this.renderText(ctx, start.x, start.y);
    }
}
