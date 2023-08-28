import { Glyph } from './glyph.js';
import { Modifier } from './modifier.js';
import { Tables } from './tables.js';
import { isNote, isStaveNote, isTabNote } from './typeguard.js';
import { RuntimeError } from './util.js';
export class Stroke extends Modifier {
    static get CATEGORY() {
        return "Stroke";
    }
    static format(strokes, state) {
        const leftShift = state.leftShift;
        const strokeSpacing = 0;
        if (!strokes || strokes.length === 0)
            return false;
        const strokeList = strokes.map((stroke) => {
            const note = stroke.getNote();
            const index = stroke.checkIndex();
            if (isStaveNote(note)) {
                const { line } = note.getKeyProps()[index];
                const shift = note.getLeftDisplacedHeadPx();
                return { line, shift, stroke };
            }
            else if (isTabNote(note)) {
                const { str: string } = note.getPositions()[index];
                return { line: string, shift: 0, stroke };
            }
            else {
                throw new RuntimeError('Internal', 'Unexpected instance.');
            }
        });
        const strokeShift = leftShift;
        const xShift = strokeList.reduce((xShift, { stroke, shift }) => {
            stroke.setXShift(strokeShift + shift);
            return Math.max(stroke.getWidth() + strokeSpacing, xShift);
        }, 0);
        state.leftShift += xShift;
        return true;
    }
    constructor(type, options) {
        super();
        this.options = Object.assign({ allVoices: true }, options);
        this.allVoices = this.options.allVoices;
        this.type = type;
        this.position = Modifier.Position.LEFT;
        this.renderOptions = {
            fontScale: Tables.NOTATION_FONT_SCALE,
        };
        this.setXShift(0);
        this.setWidth(10);
    }
    getPosition() {
        return this.position;
    }
    addEndNote(note) {
        this.noteEnd = note;
        return this;
    }
    draw() {
        const ctx = this.checkContext();
        const note = this.checkAttachedNote();
        this.setRendered();
        const start = note.getModifierStartXY(this.position, this.index);
        let yPositions = note.getYs();
        let topY = start.y;
        let botY = start.y;
        const x = start.x - 5;
        const lineSpace = note.checkStave().getSpacingBetweenLines();
        const notes = this.checkModifierContext().getMembers(note.getCategory());
        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            if (isNote(note)) {
                yPositions = note.getYs();
                for (let n = 0; n < yPositions.length; n++) {
                    if (this.note === notes[i] || this.allVoices) {
                        topY = Math.min(topY, yPositions[n]);
                        botY = Math.max(botY, yPositions[n]);
                    }
                }
            }
        }
        let arrow = '';
        let arrowShiftX = 0;
        let arrowY = 0;
        let textShiftX = 0;
        let textY = 0;
        switch (this.type) {
            case Stroke.Type.BRUSH_DOWN:
                arrow = 'arrowheadBlackUp';
                arrowShiftX = -3;
                arrowY = topY - lineSpace / 2 + 10;
                botY += lineSpace / 2;
                break;
            case Stroke.Type.BRUSH_UP:
                arrow = 'arrowheadBlackDown';
                arrowShiftX = 0.5;
                arrowY = botY + lineSpace / 2;
                topY -= lineSpace / 2;
                break;
            case Stroke.Type.ROLL_DOWN:
            case Stroke.Type.RASQUEDO_DOWN:
                arrow = 'arrowheadBlackUp';
                arrowShiftX = -3;
                textShiftX = this.xShift + arrowShiftX - 2;
                if (isStaveNote(note)) {
                    topY += 1.5 * lineSpace;
                    if ((botY - topY) % 2 !== 0) {
                        botY += 0.5 * lineSpace;
                    }
                    else {
                        botY += lineSpace;
                    }
                    arrowY = topY - lineSpace;
                    textY = botY + lineSpace + 2;
                }
                else {
                    topY += 1.5 * lineSpace;
                    botY += lineSpace;
                    arrowY = topY - 0.75 * lineSpace;
                    textY = botY + 0.25 * lineSpace;
                }
                break;
            case Stroke.Type.ROLL_UP:
            case Stroke.Type.RASQUEDO_UP:
                arrow = 'arrowheadBlackDown';
                arrowShiftX = -4;
                textShiftX = this.xShift + arrowShiftX - 1;
                if (isStaveNote(note)) {
                    arrowY = lineSpace / 2;
                    topY += 0.5 * lineSpace;
                    if ((botY - topY) % 2 === 0) {
                        botY += lineSpace / 2;
                    }
                    arrowY = botY + 0.5 * lineSpace;
                    textY = topY - 1.25 * lineSpace;
                }
                else {
                    topY += 0.25 * lineSpace;
                    botY += 0.5 * lineSpace;
                    arrowY = botY + 0.25 * lineSpace;
                    textY = topY - lineSpace;
                }
                break;
            case Stroke.Type.ARPEGGIO_DIRECTIONLESS:
                topY += 0.5 * lineSpace;
                botY += lineSpace;
                break;
            default:
                throw new RuntimeError('InvalidType', `The stroke type ${this.type} does not exist`);
        }
        let type = 'Straight';
        if (this.type === Stroke.Type.BRUSH_DOWN || this.type === Stroke.Type.BRUSH_UP) {
            ctx.fillRect(x + this.xShift, topY, 1, botY - topY);
        }
        else {
            type = 'Wiggly';
            if (isStaveNote(note)) {
                for (let i = topY; i <= botY; i += lineSpace) {
                    Glyph.renderGlyph(ctx, x + this.xShift - 4, i, this.renderOptions.fontScale, 'vexWiggleArpeggioUp');
                }
            }
            else {
                let i;
                for (i = topY; i <= botY; i += 10) {
                    Glyph.renderGlyph(ctx, x + this.xShift - 4, i, this.renderOptions.fontScale, 'vexWiggleArpeggioUp');
                }
                if (this.type === Stroke.Type.RASQUEDO_DOWN) {
                    textY = i + 0.25 * lineSpace;
                }
            }
        }
        if (this.type === Stroke.Type.ARPEGGIO_DIRECTIONLESS) {
            return;
        }
        Glyph.renderGlyph(ctx, x + this.xShift + arrowShiftX, arrowY, this.renderOptions.fontScale, arrow, {
            category: `stroke${type}.${arrow}`,
        });
        if (this.type === Stroke.Type.RASQUEDO_DOWN || this.type === Stroke.Type.RASQUEDO_UP) {
            const textFont = Tables.lookupMetricFontInfo(`Strokes.text`);
            ctx.save();
            ctx.setFont(textFont);
            ctx.fillText('R', x + textShiftX, textY);
            ctx.restore();
        }
    }
}
Stroke.Type = {
    BRUSH_DOWN: 1,
    BRUSH_UP: 2,
    ROLL_DOWN: 3,
    ROLL_UP: 4,
    RASQUEDO_DOWN: 5,
    RASQUEDO_UP: 6,
    ARPEGGIO_DIRECTIONLESS: 7,
};
