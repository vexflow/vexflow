import { BoundingBox } from './boundingbox.js';
import { Glyphs } from './glyphs.js';
import { Metrics } from './metrics.js';
import { Modifier } from './modifier.js';
import { Note } from './note.js';
import { NoteHead } from './notehead.js';
import { Stem } from './stem.js';
import { StemmableNote } from './stemmablenote.js';
import { Tables } from './tables.js';
import { defined, log, midLine, RuntimeError } from './util.js';
function L(...args) {
    if (StaveNote.DEBUG)
        log('VexFlow.StaveNote', args);
}
const isInnerNoteIndex = (note, index) => index === (note.getStemDirection() === Stem.UP ? note.keyProps.length - 1 : 0);
function shiftRestVertical(rest, note, dir) {
    const delta = dir;
    rest.line += delta;
    rest.maxLine += delta;
    rest.minLine += delta;
    rest.note.setKeyLine(0, rest.note.getKeyLine(0) + delta);
}
function centerRest(rest, noteU, noteL) {
    const delta = rest.line - midLine(noteU.minLine, noteL.maxLine);
    rest.note.setKeyLine(0, rest.note.getKeyLine(0) - delta);
    rest.line -= delta;
    rest.maxLine -= delta;
    rest.minLine -= delta;
}
export class StaveNote extends StemmableNote {
    static get CATEGORY() {
        return "StaveNote";
    }
    static get LEDGER_LINE_OFFSET() {
        return 3;
    }
    static get minNoteheadPadding() {
        return Metrics.get('NoteHead.minPadding');
    }
    static format(notes, state) {
        if (!notes || notes.length < 2)
            return false;
        const notesList = [];
        for (let i = 0; i < notes.length; i++) {
            const props = notes[i].sortedKeyProps;
            const line = props[0].keyProps.line;
            let minL = props[props.length - 1].keyProps.line;
            const stemDirection = notes[i].getStemDirection();
            const stemMax = notes[i].getStemLength() / 10;
            const stemMin = notes[i].getStemMinimumLength() / 10;
            let maxL;
            if (notes[i].isRest()) {
                maxL =
                    line +
                        Math.ceil(notes[i]._noteHeads[0].getTextMetrics().actualBoundingBoxAscent / Tables.STAVE_LINE_DISTANCE);
                minL =
                    line -
                        Math.ceil(notes[i]._noteHeads[0].getTextMetrics().actualBoundingBoxDescent / Tables.STAVE_LINE_DISTANCE);
            }
            else {
                maxL =
                    stemDirection === 1 ? props[props.length - 1].keyProps.line + stemMax : props[props.length - 1].keyProps.line;
                minL = stemDirection === 1 ? props[0].keyProps.line : props[0].keyProps.line - stemMax;
            }
            notesList.push({
                line: props[0].keyProps.line,
                maxLine: maxL,
                minLine: minL,
                isrest: notes[i].isRest(),
                stemDirection,
                stemMax,
                stemMin,
                voiceShift: notes[i].getVoiceShiftWidth(),
                isDisplaced: notes[i].isDisplaced(),
                note: notes[i],
            });
        }
        let voices = 0;
        let noteU = undefined;
        let noteM = undefined;
        let noteL = undefined;
        const draw = [false, false, false];
        for (let i = 0; i < notesList.length; i++) {
            draw[i] = notesList[i].note.renderOptions.draw !== false;
        }
        if (draw[0] && draw[1] && draw[2]) {
            voices = 3;
            noteU = notesList[0];
            noteM = notesList[1];
            noteL = notesList[2];
        }
        else if (draw[0] && draw[1]) {
            voices = 2;
            noteU = notesList[0];
            noteL = notesList[1];
        }
        else if (draw[0] && draw[2]) {
            voices = 2;
            noteU = notesList[0];
            noteL = notesList[2];
        }
        else if (draw[1] && draw[2]) {
            voices = 2;
            noteU = notesList[1];
            noteL = notesList[2];
        }
        else {
            return true;
        }
        if (voices === 2 && noteU.stemDirection === -1 && noteL.stemDirection === 1) {
            noteU = notesList[1];
            noteL = notesList[0];
        }
        const voiceXShift = Math.max(noteU.voiceShift, noteL.voiceShift);
        let xShift = 0;
        if (voices === 2) {
            const lineSpacing = noteU.note.hasStem() && noteL.note.hasStem() && noteU.stemDirection === noteL.stemDirection ? 0.0 : 0.5;
            if (noteL.isrest && noteU.isrest && noteU.note.duration === noteL.note.duration) {
                noteL.note.renderOptions.draw = false;
            }
            else if (noteU.minLine <= noteL.maxLine + lineSpacing) {
                if (noteU.isrest) {
                    shiftRestVertical(noteU, noteL, 1);
                }
                else if (noteL.isrest) {
                    shiftRestVertical(noteL, noteU, -1);
                }
                else {
                    const lineDiff = Math.abs(noteU.line - noteL.line);
                    if (noteU.note.hasStem() && noteL.note.hasStem()) {
                        const noteUHead = noteU.note.sortedKeyProps[0].keyProps.code;
                        const noteLHead = noteL.note.sortedKeyProps[noteL.note.sortedKeyProps.length - 1].keyProps.code;
                        if (!Tables.UNISON ||
                            noteUHead !== noteLHead ||
                            noteU.note.getModifiers().filter((item) => item.getCategory() === "Dot" && item.getIndex() === 0)
                                .length !==
                                noteL.note.getModifiers().filter((item) => item.getCategory() === "Dot" && item.getIndex() === 0)
                                    .length ||
                            (lineDiff < 1 && lineDiff > 0) ||
                            JSON.stringify(noteU.note.getStyle()) !== JSON.stringify(noteL.note.getStyle())) {
                            xShift = voiceXShift + 2;
                            if (noteU.stemDirection === noteL.stemDirection) {
                                noteU.note.setXShift(xShift);
                            }
                            else {
                                noteL.note.setXShift(xShift);
                            }
                        }
                        else if (noteU.note.voice !== noteL.note.voice) {
                            if (noteU.stemDirection === noteL.stemDirection) {
                                if (noteU.line !== noteL.line) {
                                    xShift = voiceXShift + 2;
                                    noteU.note.setXShift(xShift);
                                }
                                else {
                                    if (noteL.stemDirection === 1) {
                                        noteL.stemDirection = -1;
                                        noteL.note.setStemDirection(-1);
                                    }
                                }
                            }
                        }
                    }
                    else if (lineDiff < 1) {
                        xShift = voiceXShift + 2;
                        if (noteU.note.duration < noteL.note.duration) {
                            noteU.note.setXShift(xShift);
                        }
                        else {
                            noteL.note.setXShift(xShift);
                        }
                    }
                    else if (noteU.note.hasStem()) {
                        noteU.stemDirection = -noteU.note.getStemDirection();
                        noteU.note.setStemDirection(noteU.stemDirection);
                    }
                    else if (noteL.note.hasStem()) {
                        noteL.stemDirection = -noteL.note.getStemDirection();
                        noteL.note.setStemDirection(noteL.stemDirection);
                    }
                }
            }
            state.rightShift += xShift;
            return true;
        }
        if (!noteM)
            throw new RuntimeError('InvalidState', 'noteM not defined.');
        if (noteM.isrest && !noteU.isrest && !noteL.isrest) {
            if (noteU.minLine <= noteM.maxLine || noteM.minLine <= noteL.maxLine) {
                const restHeight = noteM.maxLine - noteM.minLine;
                const space = noteU.minLine - noteL.maxLine;
                if (restHeight < space) {
                    centerRest(noteM, noteU, noteL);
                }
                else {
                    xShift = voiceXShift + 2;
                    noteM.note.setXShift(xShift);
                    if (noteL.note.hasBeam() === false) {
                        noteL.stemDirection = -1;
                        noteL.note.setStemDirection(-1);
                    }
                    if (noteU.minLine <= noteL.maxLine && noteU.note.hasBeam() === false) {
                        noteU.stemDirection = 1;
                        noteU.note.setStemDirection(1);
                    }
                }
                state.rightShift += xShift;
                return true;
            }
        }
        if (noteU.isrest && noteM.isrest && noteL.isrest) {
            noteU.note.renderOptions.draw = false;
            noteL.note.renderOptions.draw = false;
            state.rightShift += xShift;
            return true;
        }
        if (noteM.isrest && noteU.isrest && noteM.minLine <= noteL.maxLine) {
            noteM.note.renderOptions.draw = false;
        }
        if (noteM.isrest && noteL.isrest && noteU.minLine <= noteM.maxLine) {
            noteM.note.renderOptions.draw = false;
        }
        if (noteU.isrest && noteU.minLine <= noteM.maxLine) {
            shiftRestVertical(noteU, noteM, 1);
        }
        if (noteL.isrest && noteM.minLine <= noteL.maxLine) {
            shiftRestVertical(noteL, noteM, -1);
        }
        if (noteU.minLine <= noteM.maxLine + 0.5 || noteM.minLine <= noteL.maxLine) {
            xShift = voiceXShift + 2;
            noteM.note.setXShift(xShift);
            if (noteL.note.hasBeam() === false) {
                noteL.stemDirection = -1;
                noteL.note.setStemDirection(-1);
            }
            if (noteU.minLine <= noteL.maxLine && noteU.note.hasBeam() === false) {
                noteU.stemDirection = 1;
                noteU.note.setStemDirection(1);
            }
        }
        state.rightShift += xShift;
        return true;
    }
    static postFormat(notes) {
        if (!notes)
            return false;
        notes.forEach((note) => note.postFormat());
        return true;
    }
    constructor(noteStruct) {
        var _a, _b, _c;
        super(noteStruct);
        this.minLine = 0;
        this.maxLine = 0;
        this.sortedKeyProps = [];
        this.ledgerLineStyle = {};
        this.clef = (_a = noteStruct.clef) !== null && _a !== void 0 ? _a : 'treble';
        this.octaveShift = (_b = noteStruct.octaveShift) !== null && _b !== void 0 ? _b : 0;
        this.glyphProps = Note.getGlyphProps(this.duration, this.noteType);
        defined(this.glyphProps, 'BadArguments', `No glyph found for duration '${this.duration}' and type '${this.noteType}'`);
        this.displaced = false;
        this.dotShiftY = 0;
        this.useDefaultHeadX = false;
        this._noteHeads = [];
        this.modifiers = [];
        this.renderOptions = Object.assign(Object.assign({}, this.renderOptions), { strokePx: noteStruct.strokePx || StaveNote.LEDGER_LINE_OFFSET });
        this.calculateKeyProps();
        this.buildStem();
        if (noteStruct.autoStem) {
            this.autoStem();
        }
        else {
            this.setStemDirection((_c = noteStruct.stemDirection) !== null && _c !== void 0 ? _c : Stem.UP);
        }
        this.reset();
        this.buildFlag();
    }
    reset() {
        super.reset();
        const noteHeadStyles = this._noteHeads.map((noteHead) => noteHead.getStyle());
        this.buildNoteHeads();
        this._noteHeads.forEach((noteHead, index) => {
            const noteHeadStyle = noteHeadStyles[index];
            if (noteHeadStyle)
                noteHead.setStyle(noteHeadStyle);
        });
        const stave = this.stave;
        if (stave) {
            this.setStave(stave);
        }
        this.calcNoteDisplacements();
        return this;
    }
    setBeam(beam) {
        this.beam = beam;
        this.calcNoteDisplacements();
        if (this.stem) {
            this.stem.setExtension(this.getStemExtension());
        }
        return this;
    }
    buildStem() {
        this.setStem(new Stem({ hide: this.isRest() }));
        return this;
    }
    buildNoteHeads() {
        this._noteHeads = [];
        const stemDirection = this.getStemDirection();
        const keys = this.getKeys();
        let lastLine = undefined;
        let lineDiff = undefined;
        let displaced = false;
        let start;
        let end;
        let step;
        if (stemDirection === Stem.UP) {
            start = 0;
            end = keys.length;
            step = 1;
        }
        else {
            start = keys.length - 1;
            end = -1;
            step = -1;
        }
        for (let i = start; i !== end; i += step) {
            const noteProps = this.sortedKeyProps[i].keyProps;
            const line = noteProps.line;
            if (lastLine === undefined) {
                lastLine = line;
            }
            else {
                lineDiff = Math.abs(lastLine - line);
                if (lineDiff === 0 || lineDiff === 0.5) {
                    displaced = !displaced;
                }
                else {
                    displaced = false;
                    this.useDefaultHeadX = true;
                }
            }
            lastLine = line;
            const notehead = new NoteHead({
                duration: this.duration,
                noteType: this.noteType,
                displaced,
                stemDirection,
                customGlyphCode: noteProps.code,
                line: noteProps.line,
            });
            notehead.fontInfo = this.fontInfo;
            this.addChild(notehead);
            this._noteHeads[this.sortedKeyProps[i].index] = notehead;
        }
        return this._noteHeads;
    }
    autoStem() {
        this.setStemDirection(this.calculateOptimalStemDirection());
    }
    calculateOptimalStemDirection() {
        this.minLine = this.sortedKeyProps[0].keyProps.line;
        this.maxLine = this.sortedKeyProps[this.keyProps.length - 1].keyProps.line;
        const MIDDLE_LINE = 3;
        const decider = (this.minLine + this.maxLine) / 2;
        const stemDirection = decider < MIDDLE_LINE ? Stem.UP : Stem.DOWN;
        return stemDirection;
    }
    calculateKeyProps() {
        var _a;
        let lastLine;
        for (let i = 0; i < this.keys.length; ++i) {
            const key = this.keys[i];
            const options = { octaveShift: (_a = this.octaveShift) !== null && _a !== void 0 ? _a : 0, duration: this.duration };
            const props = Tables.keyProperties(key, this.clef, this.noteType, options);
            if (!props) {
                throw new RuntimeError('BadArguments', `Invalid key for note properties: ${key}`);
            }
            if (props.key === 'R') {
                if (this.duration === '1' || this.duration === 'w') {
                    props.line = 4;
                }
                else {
                    props.line = 3;
                }
            }
            const line = props.line;
            if (lastLine === undefined) {
                lastLine = line;
            }
            else {
                if (Math.abs(lastLine - line) < 1) {
                    this.displaced = true;
                    props.displaced = true;
                    if (this.keyProps.length > 0) {
                        this.keyProps[i - 1].displaced = true;
                    }
                }
            }
            lastLine = line;
            this.keyProps.push(props);
        }
        this.keyProps.forEach((keyProps, index) => {
            this.sortedKeyProps.push({ keyProps, index });
        });
        this.sortedKeyProps.sort((a, b) => a.keyProps.line - b.keyProps.line);
    }
    getBoundingBox() {
        const boundingBox = new BoundingBox(this.getAbsoluteX(), this.ys[0], 0, 0);
        this._noteHeads.forEach((notehead) => {
            boundingBox.mergeWith(notehead.getBoundingBox());
        });
        const { yTop, yBottom } = this.getNoteHeadBounds();
        if (!this.isRest() && this.hasStem()) {
            const noteStemHeight = this.stem.getHeight();
            const stemY = this.getStemDirection() === Stem.DOWN
                ? yTop - noteStemHeight - this.flag.getTextMetrics().actualBoundingBoxDescent
                : yBottom - noteStemHeight + this.flag.getTextMetrics().actualBoundingBoxAscent;
            boundingBox.mergeWith(new BoundingBox(this.getAbsoluteX(), stemY, 0, 0));
        }
        if (this.hasFlag()) {
            const bbFlag = this.flag.getBoundingBox();
            boundingBox.mergeWith(bbFlag);
        }
        for (let i = 0; i < this.modifiers.length; i++) {
            boundingBox.mergeWith(this.modifiers[i].getBoundingBox());
        }
        return boundingBox;
    }
    getLineNumber(isTopNote) {
        if (!this.keyProps.length) {
            throw new RuntimeError('NoKeyProps', "Can't get bottom note line, because note is not initialized properly.");
        }
        let resultLine = this.keyProps[0].line;
        for (let i = 0; i < this.keyProps.length; i++) {
            const thisLine = this.keyProps[i].line;
            if (isTopNote) {
                if (thisLine > resultLine)
                    resultLine = thisLine;
            }
            else {
                if (thisLine < resultLine)
                    resultLine = thisLine;
            }
        }
        return resultLine;
    }
    isRest() {
        const val = this.glyphProps.codeHead;
        return val >= '\ue4e0' && val <= '\ue4ff';
    }
    isChord() {
        return !this.isRest() && this.keys.length > 1;
    }
    hasStem() {
        return this.glyphProps.stem;
    }
    hasFlag() {
        return super.hasFlag() && !this.isRest();
    }
    getStemX() {
        if (this.noteType === 'r') {
            return this.getCenterGlyphX();
        }
        else {
            return super.getStemX() + (this.stemDirection ? Stem.WIDTH / (2 * -this.stemDirection) : 0);
        }
    }
    getYForTopText(textLine) {
        const extents = this.getStemExtents();
        return Math.min(this.checkStave().getYForTopText(textLine), extents.topY - this.renderOptions.annotationSpacing * (textLine + 1));
    }
    getYForBottomText(textLine) {
        const extents = this.getStemExtents();
        return Math.max(this.checkStave().getYForTopText(textLine), extents.baseY + this.renderOptions.annotationSpacing * textLine);
    }
    setStave(stave) {
        super.setStave(stave);
        const ys = this._noteHeads.map((notehead) => {
            notehead.setStave(stave);
            return notehead.getY();
        });
        this.setYs(ys);
        if (this.stem) {
            const { yTop, yBottom } = this.getNoteHeadBounds();
            this.stem.setYBounds(yTop, yBottom);
        }
        return this;
    }
    isDisplaced() {
        return this.displaced;
    }
    setNoteDisplaced(displaced) {
        this.displaced = displaced;
        return this;
    }
    getTieRightX() {
        let tieStartX = this.getAbsoluteX();
        tieStartX += this.getGlyphWidth() + this.xShift + this.rightDisplacedHeadPx;
        if (this.modifierContext)
            tieStartX += this.modifierContext.getRightShift();
        return tieStartX;
    }
    getTieLeftX() {
        let tieEndX = this.getAbsoluteX();
        tieEndX += this.xShift - this.leftDisplacedHeadPx;
        return tieEndX;
    }
    getLineForRest() {
        let restLine = this.keyProps[0].line;
        if (this.keyProps.length > 1) {
            const lastLine = this.keyProps[this.keyProps.length - 1].line;
            const top = Math.max(restLine, lastLine);
            const bot = Math.min(restLine, lastLine);
            restLine = midLine(top, bot);
        }
        return restLine;
    }
    getModifierStartXY(position, index, options = {}) {
        if (!this.preFormatted) {
            throw new RuntimeError('UnformattedNote', "Can't call GetModifierStartXY on an unformatted note");
        }
        if (this.ys.length === 0) {
            throw new RuntimeError('NoYValues', 'No Y-Values calculated for this note.');
        }
        const { ABOVE, BELOW, LEFT, RIGHT } = Modifier.Position;
        let x = 0;
        if (position === LEFT) {
            x = -1 * 2;
        }
        else if (position === RIGHT) {
            x = this.getGlyphWidth() + this.xShift + 2;
            if (this.stemDirection === Stem.UP &&
                this.hasFlag() &&
                (options.forceFlagRight || isInnerNoteIndex(this, index))) {
                x += this.flag.getWidth();
            }
        }
        else if (position === BELOW || position === ABOVE) {
            x = this.getGlyphWidth() / 2;
        }
        let restShift = 0;
        switch (this._noteHeads[index].getText()) {
            case Glyphs.restDoubleWhole:
            case Glyphs.restWhole:
                restShift += 0.5;
                break;
            case Glyphs.restHalf:
            case Glyphs.restQuarter:
            case Glyphs.rest8th:
            case Glyphs.rest16th:
                restShift -= 0.5;
                break;
            case Glyphs.rest32nd:
            case Glyphs.rest64th:
                restShift -= 1.5;
                break;
            case Glyphs.rest128th:
                restShift -= 2.5;
                break;
        }
        return {
            x: this.getAbsoluteX() + x,
            y: this.ys[index] + restShift * this.checkStave().getSpacingBetweenLines(),
        };
    }
    setStyle(style) {
        return super.setGroupStyle(style);
    }
    setStemStyle(style) {
        const stem = this.getStem();
        if (stem)
            stem.setStyle(style);
        return this;
    }
    getStemStyle() {
        var _a;
        return (_a = this.stem) === null || _a === void 0 ? void 0 : _a.getStyle();
    }
    setLedgerLineStyle(style) {
        this.ledgerLineStyle = style;
    }
    getLedgerLineStyle() {
        return this.ledgerLineStyle;
    }
    setFlagStyle(style) {
        this.flag.setStyle(style);
    }
    getFlagStyle() {
        return this.flag.getStyle();
    }
    getGlyphWidth() {
        return this.noteHeads[0].getWidth();
    }
    setKeyStyle(index, style) {
        this._noteHeads[index].setStyle(style);
        return this;
    }
    setKeyLine(index, line) {
        this.keyProps[index].line = line;
        this.reset();
        return this;
    }
    getKeyLine(index) {
        return this.keyProps[index].line;
    }
    getVoiceShiftWidth() {
        return this.getGlyphWidth() * (this.displaced ? 2 : 1);
    }
    calcNoteDisplacements() {
        this.setLeftDisplacedHeadPx(this.displaced && this.stemDirection === Stem.DOWN ? this.getGlyphWidth() : 0);
        this.setRightDisplacedHeadPx(!this.hasFlag() && this.displaced && this.stemDirection === Stem.UP ? this.getGlyphWidth() : 0);
    }
    preFormat() {
        if (this.preFormatted)
            return;
        let noteHeadPadding = 0;
        if (this.modifierContext) {
            this.modifierContext.preFormat();
            if (this.modifierContext.getWidth() === 0) {
                noteHeadPadding = StaveNote.minNoteheadPadding;
            }
        }
        let width = this.getGlyphWidth() + this.leftDisplacedHeadPx + this.rightDisplacedHeadPx + noteHeadPadding;
        if (this.shouldDrawFlag() && this.stemDirection === Stem.UP) {
            width += this.getGlyphWidth();
        }
        this.setWidth(width);
        this.preFormatted = true;
    }
    getNoteHeadBounds() {
        let yTop = +Infinity;
        let yBottom = -Infinity;
        let nonDisplacedX;
        let displacedX;
        let highestLine = this.checkStave().getNumLines();
        let lowestLine = 1;
        let highestDisplacedLine;
        let lowestDisplacedLine;
        let highestNonDisplacedLine = highestLine;
        let lowestNonDisplacedLine = lowestLine;
        this._noteHeads.forEach((notehead) => {
            const line = notehead.getLine();
            const y = notehead.getY();
            yTop = Math.min(y, yTop);
            yBottom = Math.max(y, yBottom);
            if (displacedX === undefined && notehead.isDisplaced()) {
                displacedX = notehead.getAbsoluteX();
            }
            if (nonDisplacedX === undefined && !notehead.isDisplaced()) {
                nonDisplacedX = notehead.getAbsoluteX();
            }
            highestLine = Math.max(line, highestLine);
            lowestLine = Math.min(line, lowestLine);
            if (notehead.isDisplaced()) {
                highestDisplacedLine = highestDisplacedLine === undefined ? line : Math.max(line, highestDisplacedLine);
                lowestDisplacedLine = lowestDisplacedLine === undefined ? line : Math.min(line, lowestDisplacedLine);
            }
            else {
                highestNonDisplacedLine = Math.max(line, highestNonDisplacedLine);
                lowestNonDisplacedLine = Math.min(line, lowestNonDisplacedLine);
            }
        }, this);
        return {
            yTop,
            yBottom,
            displacedX,
            nonDisplacedX,
            highestLine,
            lowestLine,
            highestDisplacedLine,
            lowestDisplacedLine,
            highestNonDisplacedLine,
            lowestNonDisplacedLine,
        };
    }
    getNoteHeadBeginX() {
        return this.getAbsoluteX() + this.xShift;
    }
    getNoteHeadEndX() {
        const xBegin = this.getNoteHeadBeginX();
        return xBegin + this.getGlyphWidth();
    }
    get noteHeads() {
        return this._noteHeads.slice();
    }
    drawLedgerLines() {
        const stave = this.checkStave();
        const { renderOptions: { strokePx }, } = this;
        const ctx = this.checkContext();
        const width = this.getGlyphWidth() + strokePx * 2;
        const doubleWidth = 2 * (this.getGlyphWidth() + strokePx) - Stem.WIDTH / 2;
        if (this.isRest())
            return;
        if (!ctx) {
            throw new RuntimeError('NoCanvasContext', "Can't draw without a canvas context.");
        }
        const { highestLine, lowestLine, highestDisplacedLine, highestNonDisplacedLine, lowestDisplacedLine, lowestNonDisplacedLine, displacedX, nonDisplacedX, } = this.getNoteHeadBounds();
        if (highestLine < 6 && lowestLine > 0)
            return;
        const minX = Math.min(displacedX !== null && displacedX !== void 0 ? displacedX : 0, nonDisplacedX !== null && nonDisplacedX !== void 0 ? nonDisplacedX : 0);
        const drawLedgerLine = (y, normal, displaced) => {
            let x;
            if (displaced && normal)
                x = minX - strokePx;
            else if (normal)
                x = (nonDisplacedX !== null && nonDisplacedX !== void 0 ? nonDisplacedX : 0) - strokePx;
            else
                x = (displacedX !== null && displacedX !== void 0 ? displacedX : 0) - strokePx;
            const ledgerWidth = normal && displaced ? doubleWidth : width;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + ledgerWidth, y);
            ctx.stroke();
        };
        const style = Object.assign(Object.assign({}, stave.getDefaultLedgerLineStyle()), this.getLedgerLineStyle());
        ctx.save();
        this.applyStyle(ctx, style);
        for (let line = 6; line <= highestLine; ++line) {
            const normal = nonDisplacedX !== undefined && line <= highestNonDisplacedLine;
            const displaced = highestDisplacedLine !== undefined && line <= highestDisplacedLine;
            drawLedgerLine(stave.getYForNote(line), normal, displaced);
        }
        for (let line = 0; line >= lowestLine; --line) {
            const normal = nonDisplacedX !== undefined && line >= lowestNonDisplacedLine;
            const displaced = lowestDisplacedLine !== undefined && line >= lowestDisplacedLine;
            drawLedgerLine(stave.getYForNote(line), normal, displaced);
        }
        ctx.restore();
    }
    drawModifiers(noteheadParam) {
        const ctx = this.checkContext();
        for (let i = 0; i < this.modifiers.length; i++) {
            const modifier = this.modifiers[i];
            const index = modifier.checkIndex();
            const notehead = this._noteHeads[index];
            if (notehead === noteheadParam) {
                modifier.setContext(ctx);
                modifier.drawWithStyle();
            }
        }
    }
    shouldDrawFlag() {
        const hasStem = this.stem !== undefined;
        const hasFlag = this.glyphProps.codeFlagUp !== undefined;
        const hasNoBeam = this.beam === undefined;
        return hasStem && hasFlag && hasNoBeam && !this.isRest();
    }
    drawFlag() {
        const ctx = this.checkContext();
        if (!ctx) {
            throw new RuntimeError('NoCanvasContext', "Can't draw without a canvas context.");
        }
        if (this.shouldDrawFlag()) {
            const { yTop, yBottom } = this.getNoteHeadBounds();
            const noteStemHeight = this.stem.getHeight();
            const flagX = this.getStemX() - Tables.STEM_WIDTH / 2;
            const flagY = this.getStemDirection() === Stem.DOWN
                ?
                    yTop - noteStemHeight - this.flag.getTextMetrics().actualBoundingBoxDescent
                :
                    yBottom - noteStemHeight + this.flag.getTextMetrics().actualBoundingBoxAscent;
            this.flag.setContext(ctx).setX(flagX).setY(flagY).drawWithStyle();
        }
    }
    drawNoteHeads() {
        const ctx = this.checkContext();
        this._noteHeads.forEach((notehead) => {
            notehead.setContext(ctx).drawWithStyle();
        });
    }
    drawStem(stemOptions) {
        const ctx = this.checkContext();
        if (stemOptions) {
            this.setStem(new Stem(stemOptions));
        }
        if (this.shouldDrawFlag() && this.stem) {
            this.stem.adjustHeightForFlag();
        }
        if (this.stem) {
            this.stem.setContext(ctx).drawWithStyle();
        }
    }
    getStemExtension() {
        const superStemExtension = super.getStemExtension();
        if (!this.glyphProps.stem) {
            return superStemExtension;
        }
        const stemDirection = this.getStemDirection();
        if (stemDirection !== this.calculateOptimalStemDirection()) {
            return superStemExtension;
        }
        let midLineDistance;
        const MIDDLE_LINE = 3;
        if (stemDirection === Stem.UP) {
            midLineDistance = MIDDLE_LINE - this.maxLine;
        }
        else {
            midLineDistance = this.minLine - MIDDLE_LINE;
        }
        const linesOverOctaveFromMidLine = midLineDistance - 3.5;
        if (linesOverOctaveFromMidLine <= 0) {
            return superStemExtension;
        }
        const stave = this.getStave();
        let spacingBetweenLines = 10;
        if (stave !== undefined) {
            spacingBetweenLines = stave.getSpacingBetweenLines();
        }
        return superStemExtension + linesOverOctaveFromMidLine * spacingBetweenLines;
    }
    draw() {
        if (this.renderOptions.draw === false)
            return;
        if (this.ys.length === 0) {
            throw new RuntimeError('NoYValues', "Can't draw note without Y values.");
        }
        const ctx = this.checkContext();
        const xBegin = this.getNoteHeadBeginX();
        const shouldRenderStem = this.hasStem() && !this.beam;
        this._noteHeads.forEach((notehead) => notehead.setX(xBegin));
        if (this.stem) {
            const stemX = this.getStemX();
            this.stem.setNoteHeadXBounds(stemX, stemX);
        }
        L('Rendering ', this.isChord() ? 'chord :' : 'note :', this.keys);
        ctx.openGroup('stavenote', this.getAttribute('id'));
        this.drawLedgerLines();
        if (shouldRenderStem)
            this.drawStem();
        this.drawNoteHeads();
        this.drawFlag();
        const bb = this.getBoundingBox();
        ctx.pointerRect(bb.getX(), bb.getY(), bb.getW(), bb.getH());
        ctx.closeGroup();
        this.setRendered();
    }
}
StaveNote.DEBUG = false;
