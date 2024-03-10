import { Glyphs } from './glyphs.js';
import { Modifier } from './modifier.js';
import { isStaveNote, isTabNote } from './typeguard.js';
import { RuntimeError } from './util.js';
export class Dot extends Modifier {
    static get CATEGORY() {
        return "Dot";
    }
    static getDots(note) {
        return note.getModifiersByType(Dot.CATEGORY);
    }
    static buildAndAttach(notes, options) {
        for (const note of notes) {
            if (options === null || options === void 0 ? void 0 : options.all) {
                for (let i = 0; i < note.keys.length; i++) {
                    const dot = new Dot();
                    note.addModifier(dot, i);
                }
            }
            else if ((options === null || options === void 0 ? void 0 : options.index) !== undefined) {
                const dot = new Dot();
                note.addModifier(dot, options === null || options === void 0 ? void 0 : options.index);
            }
            else {
                const dot = new Dot();
                note.addModifier(dot, 0);
            }
        }
    }
    static format(dots, state) {
        const rightShift = state.rightShift;
        const dotSpacing = 1;
        if (!dots || dots.length === 0)
            return false;
        const dotList = [];
        const maxShiftMap = {};
        for (let i = 0; i < dots.length; ++i) {
            const dot = dots[i];
            const note = dot.getNote();
            let props;
            let shift;
            if (isStaveNote(note)) {
                const index = dot.checkIndex();
                props = note.getKeyProps()[index];
                shift = note.getFirstDotPx();
            }
            else if (isTabNote(note)) {
                props = { line: 0.5 };
                shift = rightShift;
            }
            else {
                throw new RuntimeError('Internal', 'Unexpected instance.');
            }
            const noteId = note.getAttribute('id');
            dotList.push({ line: props.line, note, noteId, dot });
            maxShiftMap[noteId] = Math.max(maxShiftMap[noteId] || shift, shift);
        }
        dotList.sort((a, b) => b.line - a.line);
        let dotShift = rightShift;
        let xWidth = 0;
        let lastLine = null;
        let lastNote = null;
        let prevDottedSpace = null;
        let halfShiftY = 0;
        for (let i = 0; i < dotList.length; ++i) {
            const { dot, note, noteId, line } = dotList[i];
            if (line !== lastLine || note !== lastNote) {
                dotShift = maxShiftMap[noteId];
            }
            if (!note.isRest() && line !== lastLine) {
                if (Math.abs(line % 1) === 0.5) {
                    halfShiftY = 0;
                }
                else {
                    halfShiftY = 0.5;
                    if (lastNote !== null && !lastNote.isRest() && lastLine !== null && lastLine - line === 0.5) {
                        halfShiftY = -0.5;
                    }
                    else if (line + halfShiftY === prevDottedSpace) {
                        halfShiftY = -0.5;
                    }
                }
            }
            if (note.isRest()) {
                dot.dotShiftY += -halfShiftY;
            }
            else {
                dot.dotShiftY = -halfShiftY;
            }
            prevDottedSpace = line + halfShiftY;
            dot.setXShift(dotShift);
            dotShift += dot.getWidth() + dotSpacing;
            xWidth = dotShift > xWidth ? dotShift : xWidth;
            lastLine = line;
            lastNote = note;
        }
        state.rightShift += xWidth;
        return true;
    }
    constructor() {
        super();
        this.position = Modifier.Position.RIGHT;
        this.setText(Glyphs.augmentationDot);
        this.dotShiftY = 0;
    }
    setNote(note) {
        this.note = note;
        this.font = note.font;
        return this;
    }
    setDotShiftY(y) {
        this.dotShiftY = y;
        return this;
    }
    draw() {
        const ctx = this.checkContext();
        const note = this.checkAttachedNote();
        this.setRendered();
        const stave = note.checkStave();
        const lineSpace = stave.getSpacingBetweenLines();
        const start = note.getModifierStartXY(this.position, this.index, { forceFlagRight: true });
        if (isTabNote(note)) {
            start.y = note.getStemExtents().baseY;
        }
        this.x = start.x;
        this.y = start.y + this.dotShiftY * lineSpace;
        this.renderText(ctx, 0, 0);
    }
}
