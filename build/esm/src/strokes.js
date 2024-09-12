import { Element } from './element.js';
import { Glyphs } from './glyphs.js';
import { Metrics } from './metrics.js';
import { Modifier } from './modifier.js';
import { isNote, isStaveNote, isTabNote } from './typeguard.js';
import { RuntimeError } from './util.js';
export class Stroke extends Modifier {
    static get CATEGORY() {
        return "Stroke";
    }
    static format(strokes, state) {
        const leftShift = state.leftShift;
        const strokeSpacing = 5;
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
            fontScale: Metrics.get('Stroke.fontSize'),
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
        let arrowY = 0;
        let textY = 0;
        switch (this.type) {
            case Stroke.Type.BRUSH_DOWN:
            case Stroke.Type.ROLL_DOWN:
            case Stroke.Type.RASGUEADO_DOWN:
                arrow = Glyphs.arrowheadBlackUp;
                arrowY = topY;
                topY -= lineSpace / 2;
                botY += lineSpace / 2;
                break;
            case Stroke.Type.BRUSH_UP:
            case Stroke.Type.ROLL_UP:
            case Stroke.Type.RASGUEADO_UP:
                arrow = Glyphs.arrowheadBlackDown;
                arrowY = botY + lineSpace;
                topY -= lineSpace / 2;
                break;
            case Stroke.Type.ARPEGGIO_DIRECTIONLESS:
                topY -= lineSpace / 2;
                botY += lineSpace / 2;
                break;
            default:
                throw new RuntimeError('InvalidType', `The stroke type ${this.type} does not exist`);
        }
        if (this.type === Stroke.Type.BRUSH_DOWN || this.type === Stroke.Type.BRUSH_UP) {
            ctx.fillRect(x + this.xShift, topY, 1, botY - topY);
        }
        else {
            const lineGlyph = arrow === Glyphs.arrowheadBlackDown ? Glyphs.wiggleArpeggiatoDown : Glyphs.wiggleArpeggiatoUp;
            let txt = '';
            const el = new Element();
            while (el.getWidth() < botY - topY) {
                txt += lineGlyph;
                el.setText(txt);
            }
            if (this.type === Stroke.Type.RASGUEADO_DOWN ||
                this.type === Stroke.Type.ROLL_DOWN ||
                this.type === Stroke.Type.ARPEGGIO_DIRECTIONLESS) {
                ctx.openRotation(90, x + this.xShift, topY);
                el.renderText(ctx, x + this.xShift, topY - el.getTextMetrics().actualBoundingBoxDescent + el.getHeight() / 2);
                ctx.closeRotation();
                textY = topY + el.getWidth() + 5;
            }
            else {
                ctx.openRotation(-90, x + this.xShift, botY);
                el.renderText(ctx, x + this.xShift, botY - el.getTextMetrics().actualBoundingBoxDescent + el.getHeight() / 2);
                ctx.closeRotation();
                textY = botY - el.getWidth() - 5;
            }
        }
        if (arrowY !== 0) {
            const el = new Element();
            el.setText(arrow);
            el.renderText(ctx, x + this.xShift - el.getWidth() / 2, arrowY);
        }
        if (this.type === Stroke.Type.RASGUEADO_DOWN || this.type === Stroke.Type.RASGUEADO_UP) {
            const el = new Element('Stroke.text');
            el.setText('R');
            el.renderText(ctx, x + this.xShift - el.getWidth() / 2, textY + (this.type === Stroke.Type.RASGUEADO_DOWN ? el.getHeight() : 0));
        }
    }
}
Stroke.Type = {
    BRUSH_DOWN: 1,
    BRUSH_UP: 2,
    ROLL_DOWN: 3,
    ROLL_UP: 4,
    RASGUEADO_DOWN: 5,
    RASGUEADO_UP: 6,
    ARPEGGIO_DIRECTIONLESS: 7,
};
