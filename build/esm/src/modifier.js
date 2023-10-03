var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Modifier_spacingFromNextModifier, _Modifier_modifierContext;
import { Element } from './element.js';
import { defined, RuntimeError } from './util.js';
export var ModifierPosition;
(function (ModifierPosition) {
    ModifierPosition[ModifierPosition["CENTER"] = 0] = "CENTER";
    ModifierPosition[ModifierPosition["LEFT"] = 1] = "LEFT";
    ModifierPosition[ModifierPosition["RIGHT"] = 2] = "RIGHT";
    ModifierPosition[ModifierPosition["ABOVE"] = 3] = "ABOVE";
    ModifierPosition[ModifierPosition["BELOW"] = 4] = "BELOW";
})(ModifierPosition || (ModifierPosition = {}));
export class Modifier extends Element {
    static get CATEGORY() {
        return "Modifier";
    }
    static get Position() {
        return ModifierPosition;
    }
    static get PositionString() {
        return {
            center: ModifierPosition.CENTER,
            above: ModifierPosition.ABOVE,
            below: ModifierPosition.BELOW,
            left: ModifierPosition.LEFT,
            right: ModifierPosition.RIGHT,
        };
    }
    constructor() {
        super();
        _Modifier_spacingFromNextModifier.set(this, void 0);
        _Modifier_modifierContext.set(this, void 0);
        this.width = 0;
        this.textLine = 0;
        this.position = Modifier.Position.LEFT;
        __classPrivateFieldSet(this, _Modifier_spacingFromNextModifier, 0, "f");
    }
    reset() {
    }
    getNote() {
        return defined(this.note, 'NoNote', 'Modifier has no note.');
    }
    checkAttachedNote() {
        const category = this.getCategory();
        defined(this.index, 'NoIndex', `Can't draw ${category} without an index.`);
        return defined(this.note, 'NoNote', `Can't draw ${category} without a note.`);
    }
    setNote(note) {
        this.note = note;
        return this;
    }
    getIndex() {
        return this.index;
    }
    checkIndex() {
        return defined(this.index, 'NoIndex', 'Modifier has an invalid index.');
    }
    setIndex(index) {
        this.index = index;
        return this;
    }
    getModifierContext() {
        return __classPrivateFieldGet(this, _Modifier_modifierContext, "f");
    }
    checkModifierContext() {
        return defined(__classPrivateFieldGet(this, _Modifier_modifierContext, "f"), 'NoModifierContext', 'Modifier Context Required');
    }
    setModifierContext(c) {
        __classPrivateFieldSet(this, _Modifier_modifierContext, c, "f");
        return this;
    }
    getPosition() {
        return this.position;
    }
    setPosition(position) {
        this.position = typeof position === 'string' ? Modifier.PositionString[position] : position;
        this.reset();
        return this;
    }
    setTextLine(line) {
        this.textLine = line;
        return this;
    }
    setYShift(y) {
        this.yShift = y;
        return this;
    }
    setSpacingFromNextModifier(x) {
        __classPrivateFieldSet(this, _Modifier_spacingFromNextModifier, x, "f");
    }
    getSpacingFromNextModifier() {
        return __classPrivateFieldGet(this, _Modifier_spacingFromNextModifier, "f");
    }
    setXShift(x) {
        this.xShift = 0;
        if (this.position === Modifier.Position.LEFT) {
            this.xShift -= x;
        }
        else {
            this.xShift += x;
        }
        return this;
    }
    getXShift() {
        return this.xShift;
    }
    draw() {
        this.checkContext();
        throw new RuntimeError('NotImplemented', 'draw() not implemented for this modifier.');
    }
    alignSubNotesWithNote(subNotes, note) {
        const tickContext = note.getTickContext();
        const metrics = tickContext.getMetrics();
        const stave = note.getStave();
        const subNoteXOffset = tickContext.getX() - metrics.modLeftPx - metrics.modRightPx + this.getSpacingFromNextModifier();
        subNotes.forEach((subNote) => {
            const subTickContext = subNote.getTickContext();
            if (stave)
                subNote.setStave(stave);
            subTickContext.setXOffset(subNoteXOffset);
        });
    }
}
_Modifier_spacingFromNextModifier = new WeakMap(), _Modifier_modifierContext = new WeakMap();
