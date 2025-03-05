import { Element } from './element.js';
import { Formatter } from './formatter.js';
import { Glyphs } from './glyphs.js';
import { Metrics } from './metrics.js';
import { Stem } from './stem.js';
import { Tables } from './tables.js';
import { RuntimeError } from './util.js';
export class Tuplet extends Element {
    static get CATEGORY() {
        return "Tuplet";
    }
    static get LOCATION_TOP() {
        return 1;
    }
    static get LOCATION_BOTTOM() {
        return -1;
    }
    static get NESTING_OFFSET() {
        return 15;
    }
    constructor(notes, options = {}) {
        super();
        if (!notes || !notes.length) {
            throw new RuntimeError('BadArguments', 'No notes provided for tuplet.');
        }
        this.notes = notes;
        const numNotes = options.numNotes !== undefined ? options.numNotes : notes.length;
        const notesOccupied = options.notesOccupied || 2;
        const bracketed = options.bracketed !== undefined ? options.bracketed : notes.some((note) => !note.hasBeam());
        const ratioed = options.ratioed !== undefined ? options.ratioed : Math.abs(notesOccupied - numNotes) > 1;
        const location = options.location || Tuplet.LOCATION_TOP;
        const yOffset = options.yOffset || Metrics.get('Tuplet.yOffset');
        const textYOffset = options.textYOffset || Metrics.get('Tuplet.textYOffset');
        this.options = {
            bracketed,
            location,
            notesOccupied,
            numNotes,
            ratioed,
            yOffset,
            textYOffset,
        };
        this.textElement = new Element('Tuplet');
        this.setTupletLocation(location || Tuplet.LOCATION_TOP);
        Formatter.AlignRestsToNotes(notes, true, true);
        this.resolveGlyphs();
        this.attach();
    }
    attach() {
        for (let i = 0; i < this.notes.length; i++) {
            const note = this.notes[i];
            note.setTuplet(this);
        }
    }
    detach() {
        for (let i = 0; i < this.notes.length; i++) {
            const note = this.notes[i];
            note.resetTuplet(this);
        }
    }
    setBracketed(bracketed) {
        this.options.bracketed = bracketed;
        return this;
    }
    setRatioed(ratioed) {
        this.options.ratioed = ratioed;
        return this;
    }
    setTupletLocation(location) {
        if (location !== Tuplet.LOCATION_TOP && location !== Tuplet.LOCATION_BOTTOM) {
            console.warn(`Invalid tuplet location [${location}]. Using Tuplet.LOCATION_TOP.`);
            location = Tuplet.LOCATION_TOP;
        }
        this.options.location = location;
        return this;
    }
    getNotes() {
        return this.notes;
    }
    getNoteCount() {
        return this.options.numNotes;
    }
    getNotesOccupied() {
        return this.options.notesOccupied;
    }
    setNotesOccupied(notes) {
        this.detach();
        this.options.notesOccupied = notes;
        this.resolveGlyphs();
        this.attach();
    }
    resolveGlyphs() {
        let numerator = '';
        let denominator = '';
        let n = this.options.numNotes;
        while (n >= 1) {
            numerator = String.fromCharCode(0xe880 + (n % 10)) + numerator;
            n = Math.floor(n / 10);
        }
        if (this.options.ratioed) {
            n = this.options.notesOccupied;
            while (n >= 1) {
                denominator = String.fromCharCode(0xe880 + (n % 10)) + denominator;
                n = Math.floor(n / 10);
            }
            denominator = Glyphs.tupletColon + denominator;
        }
        this.textElement.setText(numerator + denominator);
    }
    getNestedTupletCount() {
        const { location } = this.options;
        const firstNote = this.notes[0];
        let maxTupletCount = countTuplets(firstNote, location);
        let minTupletCount = countTuplets(firstNote, location);
        function countTuplets(note, location) {
            return note.getTupletStack().filter((tuplet) => tuplet.options.location === location).length;
        }
        this.notes.forEach((note) => {
            const tupletCount = countTuplets(note, location);
            maxTupletCount = tupletCount > maxTupletCount ? tupletCount : maxTupletCount;
            minTupletCount = tupletCount < minTupletCount ? tupletCount : minTupletCount;
        });
        return maxTupletCount - minTupletCount;
    }
    getYPosition() {
        var _a;
        const nestedTupletYOffset = this.getNestedTupletCount() * Tuplet.NESTING_OFFSET * -this.options.location;
        const yOffset = (_a = this.options.yOffset) !== null && _a !== void 0 ? _a : 0;
        const firstNote = this.notes[0];
        let yPosition;
        if (this.options.location === Tuplet.LOCATION_TOP) {
            yPosition = firstNote.checkStave().getYForLine(0) - 1.5 * Tables.STAVE_LINE_DISTANCE;
            for (let i = 0; i < this.notes.length; ++i) {
                const note = this.notes[i];
                let modLines = 0;
                const mc = note.getModifierContext();
                if (mc) {
                    modLines = Math.max(modLines, mc.getState().topTextLine);
                }
                const modY = note.getYForTopText(modLines) - 2 * Tables.STAVE_LINE_DISTANCE;
                if (note.hasStem() || note.isRest()) {
                    const topY = note.getStemDirection() === Stem.UP
                        ? note.getStemExtents().topY - Tables.STAVE_LINE_DISTANCE
                        : note.getStemExtents().baseY - 2 * Tables.STAVE_LINE_DISTANCE;
                    yPosition = Math.min(topY, yPosition);
                    if (modLines > 0) {
                        yPosition = Math.min(modY, yPosition);
                    }
                }
            }
        }
        else {
            let lineCheck = 4;
            this.notes.forEach((nn) => {
                const mc = nn.getModifierContext();
                if (mc) {
                    lineCheck = Math.max(lineCheck, mc.getState().textLine + 1);
                }
            });
            yPosition = firstNote.checkStave().getYForLine(lineCheck) + 2 * Tables.STAVE_LINE_DISTANCE;
            for (let i = 0; i < this.notes.length; ++i) {
                if (this.notes[i].hasStem() || this.notes[i].isRest()) {
                    const bottomY = this.notes[i].getStemDirection() === Stem.UP
                        ? this.notes[i].getStemExtents().baseY + 2 * Tables.STAVE_LINE_DISTANCE
                        : this.notes[i].getStemExtents().topY + Tables.STAVE_LINE_DISTANCE;
                    if (bottomY > yPosition) {
                        yPosition = bottomY;
                    }
                }
            }
        }
        return yPosition + nestedTupletYOffset + yOffset;
    }
    draw() {
        const { location, bracketed, textYOffset } = this.options;
        const ctx = this.checkContext();
        let xPos = 0;
        let yPos = 0;
        const firstNote = this.notes[0];
        const lastNote = this.notes[this.notes.length - 1];
        if (!bracketed) {
            xPos = firstNote.getStemX();
            this.width = lastNote.getStemX() - xPos;
        }
        else {
            xPos = firstNote.getTieLeftX() - 5;
            this.width = lastNote.getTieRightX() - xPos + 5;
        }
        yPos = this.getYPosition();
        const notationCenterX = xPos + this.width / 2;
        const notationStartX = notationCenterX - this.textElement.getWidth() / 2;
        ctx.openGroup('tuplet', this.getAttribute('id'));
        if (bracketed) {
            const lineWidth = this.width / 2 - this.textElement.getWidth() / 2 - 5;
            if (lineWidth > 0) {
                ctx.fillRect(xPos, yPos, lineWidth, 1);
                ctx.fillRect(xPos + this.width / 2 + this.textElement.getWidth() / 2 + 5, yPos, lineWidth, 1);
                ctx.fillRect(xPos, yPos + (location === Tuplet.LOCATION_BOTTOM ? 1 : 0), 1, location * 10);
                ctx.fillRect(xPos + this.width, yPos + (location === Tuplet.LOCATION_BOTTOM ? 1 : 0), 1, location * 10);
            }
        }
        this.textElement.renderText(ctx, notationStartX, yPos + this.textElement.getHeight() / 2 + (location === Tuplet.LOCATION_TOP ? -1 : 1) * textYOffset);
        const bb = this.getBoundingBox();
        ctx.pointerRect(bb.getX(), bb.getY(), bb.getW(), bb.getH());
        ctx.closeGroup();
        this.setRendered();
    }
}
