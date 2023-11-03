import { Element } from './element.js';
import { Formatter } from './formatter.js';
import { Glyphs } from './glyphs.js';
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
        this.options = options;
        this.notes = notes;
        this.numNotes = this.options.numNotes !== undefined ? this.options.numNotes : notes.length;
        this.notesOccupied = this.options.notesOccupied || 2;
        if (this.options.bracketed !== undefined) {
            this.bracketed = this.options.bracketed;
        }
        else {
            this.bracketed = notes.some((note) => !note.hasBeam());
        }
        this.ratioed =
            this.options.ratioed !== undefined ? this.options.ratioed : Math.abs(this.notesOccupied - this.numNotes) > 1;
        this.textElement = new Element('Tuplet');
        this.setTupletLocation(this.options.location || Tuplet.LOCATION_TOP);
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
        this.bracketed = !!bracketed;
        return this;
    }
    setRatioed(ratioed) {
        this.ratioed = !!ratioed;
        return this;
    }
    setTupletLocation(location) {
        if (location !== Tuplet.LOCATION_TOP && location !== Tuplet.LOCATION_BOTTOM) {
            console.warn(`Invalid tuplet location [${location}]. Using Tuplet.LOCATION_TOP.`);
            location = Tuplet.LOCATION_TOP;
        }
        this.location = location;
        return this;
    }
    getNotes() {
        return this.notes;
    }
    getNoteCount() {
        return this.numNotes;
    }
    getNotesOccupied() {
        return this.notesOccupied;
    }
    setNotesOccupied(notes) {
        this.detach();
        this.notesOccupied = notes;
        this.resolveGlyphs();
        this.attach();
    }
    resolveGlyphs() {
        let numerator = '';
        let denominator = '';
        let n = this.numNotes;
        while (n >= 1) {
            numerator = String.fromCharCode(0xe880 + (n % 10)) + numerator;
            n = Math.floor(n / 10);
        }
        if (this.ratioed) {
            n = this.notesOccupied;
            while (n >= 1) {
                denominator = String.fromCharCode(0xe880 + (n % 10)) + denominator;
                n = Math.floor(n / 10);
            }
            denominator = Glyphs.tupletColon + denominator;
        }
        this.textElement.setText(numerator + denominator);
    }
    getNestedTupletCount() {
        const location = this.location;
        const firstNote = this.notes[0];
        let maxTupletCount = countTuplets(firstNote, location);
        let minTupletCount = countTuplets(firstNote, location);
        function countTuplets(note, location) {
            return note.getTupletStack().filter((tuplet) => tuplet.location === location).length;
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
        const nestedTupletYOffset = this.getNestedTupletCount() * Tuplet.NESTING_OFFSET * -this.location;
        const yOffset = (_a = this.options.yOffset) !== null && _a !== void 0 ? _a : 0;
        const firstNote = this.notes[0];
        let yPosition;
        if (this.location === Tuplet.LOCATION_TOP) {
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
        const ctx = this.checkContext();
        let xPos = 0;
        let yPos = 0;
        this.setRendered();
        const firstNote = this.notes[0];
        const lastNote = this.notes[this.notes.length - 1];
        if (!this.bracketed) {
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
        if (this.bracketed) {
            const lineWidth = this.width / 2 - this.textElement.getWidth() / 2 - 5;
            if (lineWidth > 0) {
                ctx.fillRect(xPos, yPos, lineWidth, 1);
                ctx.fillRect(xPos + this.width / 2 + this.textElement.getWidth() / 2 + 5, yPos, lineWidth, 1);
                ctx.fillRect(xPos, yPos + (this.location === Tuplet.LOCATION_BOTTOM ? 1 : 0), 1, this.location * 10);
                ctx.fillRect(xPos + this.width, yPos + (this.location === Tuplet.LOCATION_BOTTOM ? 1 : 0), 1, this.location * 10);
            }
        }
        this.textElement.renderText(ctx, notationStartX, yPos + this.textElement.getHeight() / 2);
    }
}
