import { Glyphs } from './glyphs.js';
import { Modifier } from './modifier.js';
import { Stem } from './stem.js';
import { Tables } from './tables.js';
import { isGraceNote, isStaveNote, isStemmableNote, isTabNote } from './typeguard.js';
import { log, RuntimeError } from './util.js';
function L(...args) {
    if (Articulation.DEBUG)
        log('VexFlow.Articulation', args);
}
const { ABOVE, BELOW } = Modifier.Position;
function roundToNearestHalf(mathFn, value) {
    return mathFn(value / 0.5) * 0.5;
}
function isWithinLines(line, position) {
    return position === ABOVE ? line <= 5 : line >= 1;
}
function getRoundingFunction(line, position) {
    if (isWithinLines(line, position)) {
        if (position === ABOVE) {
            return Math.ceil;
        }
        else {
            return Math.floor;
        }
    }
    else {
        return Math.round;
    }
}
function snapLineToStaff(canSitBetweenLines, line, position, offsetDirection) {
    const snappedLine = roundToNearestHalf(getRoundingFunction(line, position), line);
    const canSnapToStaffSpace = canSitBetweenLines && isWithinLines(snappedLine, position);
    const onStaffLine = snappedLine % 1 === 0;
    if (canSnapToStaffSpace && onStaffLine) {
        const HALF_STAFF_SPACE = 0.5;
        return snappedLine + HALF_STAFF_SPACE * -offsetDirection;
    }
    else {
        return snappedLine;
    }
}
const isStaveOrGraceNote = (note) => isStaveNote(note) || isGraceNote(note);
export function getTopY(note, textLine) {
    const stemDirection = note.getStemDirection();
    const { topY: stemTipY, baseY: stemBaseY } = note.getStemExtents();
    if (isStaveOrGraceNote(note)) {
        if (note.hasStem()) {
            if (stemDirection === Stem.UP) {
                return stemTipY;
            }
            else {
                return stemBaseY;
            }
        }
        else {
            return Math.min(...note.getYs());
        }
    }
    else if (isTabNote(note)) {
        if (note.hasStem()) {
            if (stemDirection === Stem.UP) {
                return stemTipY;
            }
            else {
                return note.checkStave().getYForTopText(textLine);
            }
        }
        else {
            return note.checkStave().getYForTopText(textLine);
        }
    }
    else {
        throw new RuntimeError('UnknownCategory', 'Only can get the top and bottom ys of stavenotes and tabnotes');
    }
}
export function getBottomY(note, textLine) {
    const stemDirection = note.getStemDirection();
    const { topY: stemTipY, baseY: stemBaseY } = note.getStemExtents();
    if (isStaveOrGraceNote(note)) {
        if (note.hasStem()) {
            if (stemDirection === Stem.UP) {
                return stemBaseY;
            }
            else {
                return stemTipY;
            }
        }
        else {
            return Math.max(...note.getYs());
        }
    }
    else if (isTabNote(note)) {
        if (note.hasStem()) {
            if (stemDirection === Stem.UP) {
                return note.checkStave().getYForBottomText(textLine);
            }
            else {
                return stemTipY;
            }
        }
        else {
            return note.checkStave().getYForBottomText(textLine);
        }
    }
    else {
        throw new RuntimeError('UnknownCategory', 'Only can get the top and bottom ys of stavenotes and tabnotes');
    }
}
export function getInitialOffset(note, position) {
    const isOnStemTip = (position === ABOVE && note.getStemDirection() === Stem.UP) ||
        (position === BELOW && note.getStemDirection() === Stem.DOWN);
    if (isStaveOrGraceNote(note)) {
        if (note.hasStem() && isOnStemTip) {
            return 0.5;
        }
        else {
            return 1;
        }
    }
    else {
        if (note.hasStem() && isOnStemTip) {
            return 1;
        }
        else {
            return 0;
        }
    }
}
export class Articulation extends Modifier {
    static get CATEGORY() {
        return "Articulation";
    }
    static format(articulations, state) {
        if (!articulations || articulations.length === 0)
            return false;
        const margin = 0.5;
        let maxGlyphWidth = 0;
        const getIncrement = (articulation, line, position) => roundToNearestHalf(getRoundingFunction(line, position), articulation.height / 10 + margin);
        articulations.forEach((articulation) => {
            const note = articulation.checkAttachedNote();
            maxGlyphWidth = Math.max(note.getGlyphWidth(), maxGlyphWidth);
            let lines = 5;
            const stemDirection = note.hasStem() ? note.getStemDirection() : Stem.UP;
            let stemHeight = 0;
            if (isStemmableNote(note)) {
                const stem = note.getStem();
                if (stem) {
                    stemHeight = Math.abs(stem.getHeight()) / Tables.STAVE_LINE_DISTANCE;
                }
            }
            const stave = note.getStave();
            if (stave) {
                lines = stave.getNumLines();
            }
            if (articulation.getPosition() === ABOVE) {
                let noteLine = note.getLineNumber(true);
                if (stemDirection === Stem.UP) {
                    noteLine += stemHeight;
                }
                let increment = getIncrement(articulation, state.topTextLine, ABOVE);
                const curTop = noteLine + state.topTextLine + 0.5;
                if (!articulation.articulation.betweenLines && curTop < lines) {
                    increment += lines - curTop;
                }
                articulation.setTextLine(state.topTextLine);
                state.topTextLine += increment;
                articulation.setOrigin(0.5, 1);
            }
            else if (articulation.getPosition() === BELOW) {
                let noteLine = Math.max(lines - note.getLineNumber(), 0);
                if (stemDirection === Stem.DOWN) {
                    noteLine += stemHeight;
                }
                let increment = getIncrement(articulation, state.textLine, BELOW);
                const curBottom = noteLine + state.textLine + 0.5;
                if (!articulation.articulation.betweenLines && curBottom < lines) {
                    increment += lines - curBottom;
                }
                articulation.setTextLine(state.textLine);
                state.textLine += increment;
                articulation.setOrigin(0.5, 0);
            }
        });
        const width = articulations
            .map((articulation) => articulation.getWidth())
            .reduce((maxWidth, articWidth) => Math.max(articWidth, maxWidth));
        const overlap = Math.min(Math.max(width - maxGlyphWidth, 0), Math.max(width - (state.leftShift + state.rightShift), 0));
        state.leftShift += overlap / 2;
        state.rightShift += overlap / 2;
        return true;
    }
    static easyScoreHook({ articulations }, note, builder) {
        if (!articulations)
            return;
        const articNameToCode = {
            staccato: 'a.',
            tenuto: 'a-',
            accent: 'a>',
        };
        articulations
            .split(',')
            .map((articString) => articString.trim().split('.'))
            .map(([name, position]) => {
            const artic = { type: articNameToCode[name] };
            if (position)
                artic.position = Modifier.PositionString[position];
            return builder.getFactory().Articulation(artic);
        })
            .map((artic) => note.addModifier(artic, 0));
    }
    constructor(type) {
        var _a;
        super();
        this.heightShift = 0;
        this.type = type;
        this.position = ABOVE;
        if (!Tables.articulationCodes(this.type)) {
            if (((_a = this.type.codePointAt(0)) !== null && _a !== void 0 ? _a : 0) % 2 === 0)
                this.position = ABOVE;
            else
                this.position = BELOW;
        }
        this.articulation = { betweenLines: false };
        this.reset();
    }
    reset() {
        this.articulation = Tables.articulationCodes(this.type);
        if (!this.articulation) {
            this.articulation = { code: this.type, betweenLines: false };
        }
        const code = (this.position === ABOVE ? this.articulation.aboveCode : this.articulation.belowCode) ||
            this.articulation.code ||
            Glyphs.null;
        this.text = code;
    }
    setBetweenLines(betweenLines = true) {
        this.articulation.betweenLines = betweenLines;
        return this;
    }
    draw() {
        const ctx = this.checkContext();
        const note = this.checkAttachedNote();
        this.setRendered();
        const index = this.checkIndex();
        const { position, textLine } = this;
        const canSitBetweenLines = this.articulation.betweenLines;
        const stave = note.checkStave();
        const staffSpace = stave.getSpacingBetweenLines();
        const isTab = isTabNote(note);
        const { x } = note.getModifierStartXY(position, index);
        const shouldSitOutsideStaff = !canSitBetweenLines || isTab;
        const initialOffset = getInitialOffset(note, position);
        let y = {
            [ABOVE]: () => {
                const y = getTopY(note, textLine) - (textLine + initialOffset) * staffSpace;
                return shouldSitOutsideStaff ? Math.min(stave.getYForTopText(Articulation.INITIAL_OFFSET), y) : y;
            },
            [BELOW]: () => {
                const y = getBottomY(note, textLine) + (textLine + initialOffset) * staffSpace;
                return shouldSitOutsideStaff ? Math.max(stave.getYForBottomText(Articulation.INITIAL_OFFSET), y) : y;
            },
        }[position]();
        if (!isTab) {
            const offsetDirection = position === ABOVE ? -1 : +1;
            const noteLine = note.getKeyProps()[index].line;
            const distanceFromNote = (note.getYs()[index] - y) / staffSpace;
            const articLine = distanceFromNote + Number(noteLine);
            const snappedLine = snapLineToStaff(canSitBetweenLines, articLine, position, offsetDirection);
            if (isWithinLines(snappedLine, position))
                this.setOrigin(0.5, 0.5);
            y += Math.abs(snappedLine - articLine) * staffSpace * offsetDirection;
        }
        L(`Rendering articulation at (x: ${x}, y: ${y})`);
        this.x = x;
        this.y = y;
        this.renderText(ctx, 0, 0);
    }
}
Articulation.DEBUG = false;
Articulation.INITIAL_OFFSET = -0.5;
