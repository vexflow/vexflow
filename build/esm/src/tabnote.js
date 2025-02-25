import { Element } from './element.js';
import { Glyphs } from './glyphs.js';
import { Modifier } from './modifier.js';
import { Note } from './note.js';
import { Stem } from './stem.js';
import { StemmableNote } from './stemmablenote.js';
import { isDot } from './typeguard.js';
import { defined, RuntimeError } from './util.js';
function getUnusedStringGroups(numLines, stringsUsed) {
    const stemThrough = [];
    let group = [];
    for (let string = 1; string <= numLines; string++) {
        const isUsed = stringsUsed.indexOf(string) > -1;
        if (!isUsed) {
            group.push(string);
        }
        else {
            stemThrough.push(group);
            group = [];
        }
    }
    if (group.length > 0)
        stemThrough.push(group);
    return stemThrough;
}
function getPartialStemLines(stemY, unusedStrings, stave, stemDirection) {
    const upStem = stemDirection !== 1;
    const downStem = stemDirection !== -1;
    const lineSpacing = stave.getSpacingBetweenLines();
    const totalLines = stave.getNumLines();
    const stemLines = [];
    unusedStrings.forEach((strings) => {
        const containsLastString = strings.indexOf(totalLines) > -1;
        const containsFirstString = strings.indexOf(1) > -1;
        if ((upStem && containsFirstString) || (downStem && containsLastString)) {
            return;
        }
        if (strings.length === 1) {
            strings.push(strings[0]);
        }
        const lineYs = [];
        strings.forEach((string, index, strings) => {
            const isTopBound = string === 1;
            const isBottomBound = string === totalLines;
            let y = stave.getYForLine(string - 1);
            if (index === 0 && !isTopBound) {
                y -= lineSpacing / 2 - 1;
            }
            else if (index === strings.length - 1 && !isBottomBound) {
                y += lineSpacing / 2 - 1;
            }
            lineYs.push(y);
            if (stemDirection === 1 && isTopBound) {
                lineYs.push(stemY - 2);
            }
            else if (stemDirection === -1 && isBottomBound) {
                lineYs.push(stemY + 2);
            }
        });
        stemLines.push(lineYs.sort((a, b) => a - b));
    });
    return stemLines;
}
export class TabNote extends StemmableNote {
    static get CATEGORY() {
        return "TabNote";
    }
    constructor(noteStruct, drawStem = false) {
        super(noteStruct);
        this.fretElement = [];
        this.greatestString = () => {
            return this.positions.map((x) => x.str).reduce((a, b) => (a > b ? a : b));
        };
        this.leastString = () => {
            return this.positions.map((x) => x.str).reduce((a, b) => (a < b ? a : b));
        };
        this.ghost = false;
        this.positions = noteStruct.positions || [];
        this.renderOptions = Object.assign(Object.assign({}, this.renderOptions), { drawStem, drawDots: drawStem, drawStemThroughStave: false, yShift: 0 });
        this.glyphProps = Note.getGlyphProps(this.duration, this.noteType);
        defined(this.glyphProps, 'BadArguments', `No glyph found for duration '${this.duration}' and type '${this.noteType}'`);
        this.buildStem();
        if (noteStruct.stemDirection) {
            this.setStemDirection(noteStruct.stemDirection);
        }
        else {
            this.setStemDirection(Stem.UP);
        }
        this.ghost = false;
        this.updateWidth();
    }
    reset() {
        super.reset();
        if (this.stave)
            this.setStave(this.stave);
        return this;
    }
    setGhost(ghost) {
        this.ghost = ghost;
        this.updateWidth();
        return this;
    }
    hasStem() {
        if (this.renderOptions.drawStem)
            return true;
        return false;
    }
    getStemExtension() {
        if (this.stemExtensionOverride !== undefined) {
            return this.stemExtensionOverride;
        }
        return this.flag.getHeight() > Stem.HEIGHT ? this.flag.getHeight() - Stem.HEIGHT : 0;
    }
    static tabToElement(fret) {
        let el;
        if (fret.toUpperCase() === 'X') {
            el = new Element('TabNote');
            el.setText(Glyphs.accidentalDoubleSharp);
        }
        else {
            el = new Element('TabNote.text');
            el.setText(fret);
            el.setYShift(el.getHeight() / 2);
        }
        return el;
    }
    updateWidth() {
        this.fretElement = [];
        this.width = 0;
        for (let i = 0; i < this.positions.length; ++i) {
            let fret = this.positions[i].fret;
            if (this.ghost)
                fret = '(' + fret + ')';
            const el = TabNote.tabToElement(fret.toString());
            this.fretElement.push(el);
            this.width = Math.max(el.getWidth(), this.width);
        }
    }
    setStave(stave) {
        super.setStave(stave);
        const ctx = stave.getContext();
        this.setContext(ctx);
        const ys = this.positions.map(({ str: line }) => stave.getYForLine(Number(line) - 1));
        this.setYs(ys);
        if (this.stem) {
            this.stem.setYBounds(this.getStemY(), this.getStemY());
        }
        return this;
    }
    getPositions() {
        return this.positions;
    }
    getModifierStartXY(position, index) {
        if (!this.preFormatted) {
            throw new RuntimeError('UnformattedNote', "Can't call GetModifierStartXY on an unformatted note");
        }
        if (this.ys.length === 0) {
            throw new RuntimeError('NoYValues', 'No Y-Values calculated for this note.');
        }
        let x = 0;
        if (position === Modifier.Position.LEFT) {
            x = -1 * 2;
        }
        else if (position === Modifier.Position.RIGHT) {
            x = this.width + 2;
        }
        else if (position === Modifier.Position.BELOW || position === Modifier.Position.ABOVE) {
            const noteGlyphWidth = this.width;
            x = noteGlyphWidth / 2;
        }
        return {
            x: this.getAbsoluteX() + x,
            y: this.ys[index],
        };
    }
    getLineForRest() {
        return Number(this.positions[0].str);
    }
    preFormat() {
        if (this.preFormatted)
            return;
        if (this.modifierContext)
            this.modifierContext.preFormat();
        this.preFormatted = true;
    }
    getStemX() {
        return this.getCenterGlyphX();
    }
    getStemY() {
        const numLines = this.checkStave().getNumLines();
        const stemUpLine = -0.5;
        const stemDownLine = numLines - 0.5;
        const stemStartLine = Stem.UP === this.stemDirection ? stemUpLine : stemDownLine;
        return this.checkStave().getYForLine(stemStartLine);
    }
    getStemExtents() {
        return this.checkStem().getExtents();
    }
    drawFlag() {
        const { beam, glyphProps, renderOptions: { drawStem }, } = this;
        const context = this.checkContext();
        const shouldDrawFlag = beam === undefined && drawStem;
        if (glyphProps.codeFlagUp && shouldDrawFlag) {
            const flagX = this.getStemX();
            const flagY = this.getStemDirection() === Stem.DOWN
                ?
                    this.getStemY() - this.checkStem().getHeight() - this.getStemExtension()
                :
                    this.getStemY() - this.checkStem().getHeight() + this.getStemExtension();
            this.flag.setContext(context).setX(flagX).setY(flagY).drawWithStyle();
        }
    }
    drawModifiers() {
        this.modifiers.forEach((modifier) => {
            if (isDot(modifier) && !this.renderOptions.drawDots) {
                return;
            }
            modifier.setContext(this.getContext());
            modifier.drawWithStyle();
        });
    }
    drawStemThrough() {
        const stemX = this.getStemX();
        const stemY = this.getStemY();
        const ctx = this.checkContext();
        const drawStem = this.renderOptions.drawStem;
        const stemThrough = this.renderOptions.drawStemThroughStave;
        if (drawStem && stemThrough) {
            const numLines = this.checkStave().getNumLines();
            const stringsUsed = this.positions.map((position) => Number(position.str));
            const unusedStrings = getUnusedStringGroups(numLines, stringsUsed);
            const stemLines = getPartialStemLines(stemY, unusedStrings, this.checkStave(), this.getStemDirection());
            ctx.setLineWidth(Stem.WIDTH);
            stemLines.forEach((bounds) => {
                if (bounds.length === 0)
                    return;
                ctx.beginPath();
                ctx.moveTo(stemX, bounds[0]);
                ctx.lineTo(stemX, bounds[bounds.length - 1]);
                ctx.stroke();
                ctx.closePath();
            });
        }
    }
    drawPositions() {
        const ctx = this.checkContext();
        const x = this.getAbsoluteX();
        const ys = this.ys;
        for (let i = 0; i < this.positions.length; ++i) {
            const y = ys[i] + this.renderOptions.yShift;
            const el = this.fretElement[i];
            const tabX = x - el.getWidth() / 2;
            ctx.clearRect(tabX - 2, y - 3, el.getWidth() + 4, 6);
            el.renderText(ctx, tabX, y);
        }
    }
    draw() {
        const ctx = this.checkContext();
        if (this.ys.length === 0) {
            throw new RuntimeError('NoYValues', "Can't draw note without Y values.");
        }
        this.setRendered();
        const renderStem = this.beam === undefined && this.renderOptions.drawStem;
        ctx.openGroup('tabnote', this.getAttribute('id'));
        this.drawPositions();
        this.drawStemThrough();
        if (this.stem && renderStem) {
            const stemX = this.getStemX();
            this.stem.setNoteHeadXBounds(stemX, stemX);
            this.stem.setContext(ctx).drawWithStyle();
        }
        this.drawFlag();
        this.drawModifiers();
        ctx.closeGroup();
    }
}
