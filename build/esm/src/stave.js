import { BoundingBox } from './boundingbox.js';
import { Clef } from './clef.js';
import { Element } from './element.js';
import { KeySignature } from './keysignature.js';
import { Metrics } from './metrics.js';
import { Barline, BarlineType } from './stavebarline.js';
import { StaveModifierPosition } from './stavemodifier.js';
import { Repetition } from './staverepetition.js';
import { StaveSection } from './stavesection.js';
import { StaveTempo } from './stavetempo.js';
import { StaveText } from './stavetext.js';
import { Volta } from './stavevolta.js';
import { Tables } from './tables.js';
import { TimeSignature } from './timesignature.js';
import { isBarline } from './typeguard.js';
import { RuntimeError } from './util.js';
const SORT_ORDER_BEG_MODIFIERS = {
    [Barline.CATEGORY]: 0,
    [Clef.CATEGORY]: 1,
    [KeySignature.CATEGORY]: 2,
    [TimeSignature.CATEGORY]: 3,
};
const SORT_ORDER_END_MODIFIERS = {
    [TimeSignature.CATEGORY]: 0,
    [KeySignature.CATEGORY]: 1,
    [Barline.CATEGORY]: 2,
    [Clef.CATEGORY]: 3,
};
export class Stave extends Element {
    static get CATEGORY() {
        return "Stave";
    }
    static get defaultPadding() {
        return Metrics.get('Stave.padding') + Metrics.get('Stave.endPaddingMax');
    }
    static get rightPadding() {
        return Metrics.get('Stave.endPaddingMax');
    }
    constructor(x, y, width, options) {
        super();
        this.x = x;
        this.y = y;
        this.width = width;
        this.formatted = false;
        this.startX = x + 5;
        this.endX = x + width;
        this.modifiers = [];
        this.measure = 0;
        this.clef = 'treble';
        this.endClef = undefined;
        this.options = Object.assign({ verticalBarWidth: 10, numLines: 5, leftBar: true, rightBar: true, spacingBetweenLinesPx: Tables.STAVE_LINE_DISTANCE, spaceAboveStaffLn: 4, spaceBelowStaffLn: 4, topTextPosition: 1, bottomTextPosition: 4, lineConfig: [] }, options);
        this.bounds = { x: this.x, y: this.y, w: this.width, h: 0 };
        this.defaultLedgerLineStyle = { strokeStyle: '#444', lineWidth: 2 };
        this.resetLines();
        this.addModifier(new Barline(this.options.leftBar ? BarlineType.SINGLE : BarlineType.NONE));
        this.addEndModifier(new Barline(this.options.rightBar ? BarlineType.SINGLE : BarlineType.NONE));
    }
    setDefaultLedgerLineStyle(style) {
        this.defaultLedgerLineStyle = style;
    }
    getDefaultLedgerLineStyle() {
        return Object.assign(Object.assign({}, this.getStyle()), this.defaultLedgerLineStyle);
    }
    space(spacing) {
        return this.options.spacingBetweenLinesPx * spacing;
    }
    resetLines() {
        this.options.lineConfig = [];
        for (let i = 0; i < this.options.numLines; i++) {
            this.options.lineConfig.push({ visible: true });
        }
        this.height = (this.options.numLines + this.options.spaceAboveStaffLn) * this.options.spacingBetweenLinesPx;
        this.options.bottomTextPosition = this.options.numLines;
    }
    setNoteStartX(x) {
        if (!this.formatted)
            this.format();
        this.startX = x;
        return this;
    }
    getNoteStartX() {
        if (!this.formatted)
            this.format();
        return this.startX;
    }
    getNoteEndX() {
        if (!this.formatted)
            this.format();
        return this.endX;
    }
    getTieStartX() {
        return this.startX;
    }
    getTieEndX() {
        return this.endX;
    }
    getNumLines() {
        return this.options.numLines;
    }
    setNumLines(n) {
        this.options.numLines = n;
        this.resetLines();
        return this;
    }
    getTopLineTopY() {
        return this.getYForLine(0);
    }
    getBottomLineBottomY() {
        var _a;
        return this.getYForLine(this.getNumLines() - 1) + ((_a = this.getStyle().lineWidth) !== null && _a !== void 0 ? _a : 1);
    }
    setX(x) {
        const shift = x - this.x;
        this.formatted = false;
        this.x = x;
        this.startX += shift;
        this.endX += shift;
        for (let i = 0; i < this.modifiers.length; i++) {
            const mod = this.modifiers[i];
            mod.setX(mod.getX() + shift);
        }
        return this;
    }
    setWidth(width) {
        this.formatted = false;
        this.width = width;
        this.endX = this.x + width;
        return this;
    }
    setMeasure(measure) {
        this.measure = measure;
        return this;
    }
    getMeasure() {
        return this.measure;
    }
    getModifierXShift(index = 0) {
        if (typeof index !== 'number') {
            throw new RuntimeError('InvalidIndex', 'Must be of number type');
        }
        if (!this.formatted)
            this.format();
        if (this.getModifiers(StaveModifierPosition.BEGIN).length === 1) {
            return 0;
        }
        if (this.modifiers[index].getPosition() === StaveModifierPosition.RIGHT) {
            return 0;
        }
        let startX = this.startX - this.x;
        const begBarline = this.modifiers[0];
        if (begBarline.getType() === BarlineType.REPEAT_BEGIN && startX > begBarline.getWidth()) {
            startX -= begBarline.getWidth();
        }
        return startX;
    }
    setRepetitionType(type, yShift = 0) {
        this.modifiers.push(new Repetition(type, this.x, yShift));
        return this;
    }
    setVoltaType(type, label, y) {
        this.modifiers.push(new Volta(type, label, this.x, y));
        return this;
    }
    setSection(section, y, xOffset = 0, fontSize, drawRect = true) {
        const staveSection = new StaveSection(section).setYShift(y).setXShift(xOffset).setDrawRect(drawRect);
        if (fontSize) {
            staveSection.setFontSize(fontSize);
        }
        this.addModifier(staveSection);
        return this;
    }
    setTempo(tempo, y) {
        this.modifiers.push(new StaveTempo(tempo, this.x, y));
        return this;
    }
    setStaveText(text, position, options = {}) {
        this.modifiers.push(new StaveText(text, position, options));
        return this;
    }
    getSpacingBetweenLines() {
        return this.options.spacingBetweenLinesPx;
    }
    getBoundingBox() {
        return new BoundingBox(this.x, this.y, this.width, this.getBottomY() - this.y);
    }
    getBottomY() {
        const options = this.options;
        const spacing = options.spacingBetweenLinesPx;
        const scoreBottom = this.getYForLine(options.numLines) + options.spaceBelowStaffLn * spacing;
        return scoreBottom;
    }
    getBottomLineY() {
        return this.getYForLine(this.options.numLines);
    }
    getYForLine(line) {
        const options = this.options;
        const spacing = options.spacingBetweenLinesPx;
        const headroom = options.spaceAboveStaffLn;
        const y = this.y + line * spacing + headroom * spacing;
        return y;
    }
    getLineForY(y) {
        const options = this.options;
        const spacing = options.spacingBetweenLinesPx;
        const headroom = options.spaceAboveStaffLn;
        return (y - this.y) / spacing - headroom;
    }
    getYForTopText(line = 0) {
        return this.getYForLine(-line - this.options.topTextPosition);
    }
    getYForBottomText(line = 0) {
        return this.getYForLine(this.options.bottomTextPosition + line);
    }
    getYForNote(line) {
        const options = this.options;
        const spacing = options.spacingBetweenLinesPx;
        const headroom = options.spaceAboveStaffLn;
        return this.y + headroom * spacing + 5 * spacing - line * spacing;
    }
    getYForGlyphs() {
        return this.getYForLine(3);
    }
    addModifier(modifier, position) {
        if (position !== undefined) {
            modifier.setPosition(position);
        }
        modifier.setStave(this);
        this.formatted = false;
        this.modifiers.push(modifier);
        return this;
    }
    addEndModifier(modifier) {
        this.addModifier(modifier, StaveModifierPosition.END);
        return this;
    }
    setBegBarType(type) {
        const { SINGLE, REPEAT_BEGIN, NONE } = BarlineType;
        if (type === SINGLE || type === REPEAT_BEGIN || type === NONE) {
            this.modifiers[0].setType(type);
            this.formatted = false;
        }
        return this;
    }
    setEndBarType(type) {
        if (type !== BarlineType.REPEAT_BEGIN) {
            this.modifiers[1].setType(type);
            this.formatted = false;
        }
        return this;
    }
    setClef(clefSpec, size, annotation, position) {
        if (position === undefined) {
            position = StaveModifierPosition.BEGIN;
        }
        if (position === StaveModifierPosition.END) {
            this.endClef = clefSpec;
        }
        else {
            this.clef = clefSpec;
        }
        const clefs = this.getModifiers(position, Clef.CATEGORY);
        if (clefs.length === 0) {
            this.addClef(clefSpec, size, annotation, position);
        }
        else {
            clefs[0].setType(clefSpec, size, annotation);
        }
        return this;
    }
    getClef() {
        return this.clef;
    }
    setEndClef(clefSpec, size, annotation) {
        this.setClef(clefSpec, size, annotation, StaveModifierPosition.END);
        return this;
    }
    getEndClef() {
        return this.endClef;
    }
    setKeySignature(keySpec, cancelKeySpec, position) {
        if (position === undefined) {
            position = StaveModifierPosition.BEGIN;
        }
        const keySignatures = this.getModifiers(position, KeySignature.CATEGORY);
        if (keySignatures.length === 0) {
            this.addKeySignature(keySpec, cancelKeySpec, position);
        }
        else {
            keySignatures[0].setKeySig(keySpec, cancelKeySpec);
        }
        return this;
    }
    setEndKeySignature(keySpec, cancelKeySpec) {
        this.setKeySignature(keySpec, cancelKeySpec, StaveModifierPosition.END);
        return this;
    }
    setTimeSignature(timeSpec, customPadding, position) {
        if (position === undefined) {
            position = StaveModifierPosition.BEGIN;
        }
        const timeSignatures = this.getModifiers(position, TimeSignature.CATEGORY);
        if (timeSignatures.length === 0) {
            this.addTimeSignature(timeSpec, customPadding, position);
        }
        else {
            timeSignatures[0].setTimeSig(timeSpec);
        }
        return this;
    }
    setEndTimeSignature(timeSpec, customPadding) {
        this.setTimeSignature(timeSpec, customPadding, StaveModifierPosition.END);
        return this;
    }
    addKeySignature(keySpec, cancelKeySpec, position) {
        if (position === undefined) {
            position = StaveModifierPosition.BEGIN;
        }
        this.addModifier(new KeySignature(keySpec, cancelKeySpec).setPosition(position), position);
        return this;
    }
    addClef(clef, size, annotation, position) {
        if (position === undefined || position === StaveModifierPosition.BEGIN) {
            this.clef = clef;
        }
        else if (position === StaveModifierPosition.END) {
            this.endClef = clef;
        }
        this.addModifier(new Clef(clef, size, annotation), position);
        return this;
    }
    addEndClef(clef, size, annotation) {
        this.addClef(clef, size, annotation, StaveModifierPosition.END);
        return this;
    }
    addTimeSignature(timeSpec, customPadding, position) {
        this.addModifier(new TimeSignature(timeSpec, customPadding), position);
        return this;
    }
    addEndTimeSignature(timeSpec, customPadding) {
        this.addTimeSignature(timeSpec, customPadding, StaveModifierPosition.END);
        return this;
    }
    addTrebleGlyph() {
        this.addClef('treble');
        return this;
    }
    getModifiers(position, category) {
        const noPosition = position === undefined;
        const noCategory = category === undefined;
        if (noPosition && noCategory) {
            return this.modifiers;
        }
        else if (noPosition) {
            return this.modifiers.filter((m) => category === m.getCategory());
        }
        else if (noCategory) {
            return this.modifiers.filter((m) => position === m.getPosition());
        }
        else {
            return this.modifiers.filter((m) => position === m.getPosition() && category === m.getCategory());
        }
    }
    sortByCategory(items, order) {
        for (let i = items.length - 1; i >= 0; i--) {
            for (let j = 0; j < i; j++) {
                if (order[items[j].getCategory()] > order[items[j + 1].getCategory()]) {
                    const temp = items[j];
                    items[j] = items[j + 1];
                    items[j + 1] = temp;
                }
            }
        }
    }
    format() {
        var _a, _b, _c, _d;
        const begBarline = this.modifiers[0];
        const endBarline = this.modifiers[1];
        const begModifiers = this.getModifiers(StaveModifierPosition.BEGIN);
        const endModifiers = this.getModifiers(StaveModifierPosition.END);
        this.sortByCategory(begModifiers, SORT_ORDER_BEG_MODIFIERS);
        this.sortByCategory(endModifiers, SORT_ORDER_END_MODIFIERS);
        if (begModifiers.length > 1 && begBarline.getType() === BarlineType.REPEAT_BEGIN) {
            begModifiers.push(begModifiers.splice(0, 1)[0]);
            begModifiers.splice(0, 0, new Barline(BarlineType.SINGLE));
        }
        if (endModifiers.indexOf(endBarline) > 0) {
            endModifiers.splice(0, 0, new Barline(BarlineType.NONE));
        }
        let width;
        let padding;
        let modifier;
        let offset = 0;
        let x = this.x;
        for (let i = 0; i < begModifiers.length; i++) {
            modifier = begModifiers[i];
            padding = modifier.getPadding(i + offset);
            width = modifier.getWidth();
            x += padding;
            modifier.setX(x);
            x += width;
            if (padding + width === 0)
                offset--;
        }
        this.startX = x;
        x = this.x + this.width;
        const widths = {
            left: 0,
            right: 0,
            paddingRight: 0,
            paddingLeft: 0,
        };
        let lastBarlineIdx = 0;
        for (let i = 0; i < endModifiers.length; i++) {
            modifier = endModifiers[i];
            lastBarlineIdx = isBarline(modifier) ? i : lastBarlineIdx;
            widths.right = 0;
            widths.left = 0;
            widths.paddingRight = 0;
            widths.paddingLeft = 0;
            const layoutMetrics = modifier.getLayoutMetrics();
            if (layoutMetrics) {
                if (i !== 0) {
                    widths.right = (_a = layoutMetrics.xMax) !== null && _a !== void 0 ? _a : 0;
                    widths.paddingRight = (_b = layoutMetrics.paddingRight) !== null && _b !== void 0 ? _b : 0;
                }
                widths.left = -((_c = layoutMetrics.xMin) !== null && _c !== void 0 ? _c : 0);
                widths.paddingLeft = (_d = layoutMetrics.paddingLeft) !== null && _d !== void 0 ? _d : 0;
                if (i === endModifiers.length - 1) {
                    widths.paddingLeft = 0;
                }
            }
            else {
                widths.paddingRight = modifier.getPadding(i - lastBarlineIdx);
                if (i !== 0) {
                    widths.right = modifier.getWidth();
                }
                if (i === 0) {
                    widths.left = modifier.getWidth();
                }
            }
            x -= widths.paddingRight;
            x -= widths.right;
            modifier.setX(x);
            x -= widths.left;
            x -= widths.paddingLeft;
        }
        this.endX = endModifiers.length === 1 ? this.x + this.width : x;
        this.formatted = true;
    }
    draw() {
        var _a;
        const ctx = this.checkContext();
        this.setRendered();
        ctx.openGroup('stave', this.getAttribute('id'));
        if (!this.formatted)
            this.format();
        const numLines = this.options.numLines;
        const width = this.width;
        const x = this.x;
        let y;
        const lineWidth = (_a = this.getStyle().lineWidth) !== null && _a !== void 0 ? _a : 1;
        const lineWidthCorrection = lineWidth % 2 === 0 ? 0 : 0.5;
        for (let line = 0; line < numLines; line++) {
            y = this.getYForLine(line);
            if (this.options.lineConfig[line].visible) {
                ctx.beginPath();
                ctx.moveTo(x, y + lineWidthCorrection);
                ctx.lineTo(x + width, y + lineWidthCorrection);
                ctx.stroke();
            }
        }
        ctx.closeGroup();
        for (let i = 0; i < this.modifiers.length; i++) {
            const modifier = this.modifiers[i];
            modifier.setContext(ctx);
            modifier.setStave(this);
            modifier.drawWithStyle();
        }
        if (this.measure > 0) {
            ctx.setFont(this.fontInfo);
            const textWidth = ctx.measureText('' + this.measure).width;
            y = this.getYForTopText(0) + 3;
            ctx.fillText('' + this.measure, this.x - textWidth / 2, y);
        }
    }
    getVerticalBarWidth() {
        return this.options.verticalBarWidth;
    }
    getConfigForLines() {
        return this.options.lineConfig;
    }
    setConfigForLine(lineNumber, lineConfig) {
        if (lineNumber >= this.options.numLines || lineNumber < 0) {
            throw new RuntimeError('StaveConfigError', 'The line number must be within the range of the number of lines in the Stave.');
        }
        if (lineConfig.visible === undefined) {
            throw new RuntimeError('StaveConfigError', "The line configuration object is missing the 'visible' property.");
        }
        if (typeof lineConfig.visible !== 'boolean') {
            throw new RuntimeError('StaveConfigError', "The line configuration objects 'visible' property must be true or false.");
        }
        this.options.lineConfig[lineNumber] = lineConfig;
        return this;
    }
    setConfigForLines(linesConfiguration) {
        if (linesConfiguration.length !== this.options.numLines) {
            throw new RuntimeError('StaveConfigError', 'The length of the lines configuration array must match the number of lines in the Stave');
        }
        for (const lineConfig in linesConfiguration) {
            if (linesConfiguration[lineConfig].visible === undefined) {
                linesConfiguration[lineConfig] = this.options.lineConfig[lineConfig];
            }
            this.options.lineConfig[lineConfig] = Object.assign(Object.assign({}, this.options.lineConfig[lineConfig]), linesConfiguration[lineConfig]);
        }
        this.options.lineConfig = linesConfiguration;
        return this;
    }
    static formatBegModifiers(staves) {
        const adjustCategoryStartX = (category) => {
            let minStartX = 0;
            staves.forEach((stave) => {
                const modifiers = stave.getModifiers(StaveModifierPosition.BEGIN, category);
                if (modifiers.length > 0 && modifiers[0].getX() > minStartX)
                    minStartX = modifiers[0].getX();
            });
            let adjustX = 0;
            staves.forEach((stave) => {
                adjustX = 0;
                const modifiers = stave.getModifiers(StaveModifierPosition.BEGIN, category);
                modifiers.forEach((modifier) => {
                    if (minStartX - modifier.getX() > adjustX)
                        adjustX = minStartX - modifier.getX();
                });
                const allModifiers = stave.getModifiers(StaveModifierPosition.BEGIN);
                let bAdjust = false;
                allModifiers.forEach((modifier) => {
                    if (modifier.getCategory() === category)
                        bAdjust = true;
                    if (bAdjust && adjustX > 0)
                        modifier.setX(modifier.getX() + adjustX);
                });
                stave.setNoteStartX(stave.getNoteStartX() + adjustX);
            });
        };
        staves.forEach((stave) => {
            if (!stave.formatted)
                stave.format();
        });
        adjustCategoryStartX("Clef");
        adjustCategoryStartX("KeySignature");
        adjustCategoryStartX("TimeSignature");
        let maxX = 0;
        staves.forEach((stave) => {
            if (stave.getNoteStartX() > maxX)
                maxX = stave.getNoteStartX();
        });
        staves.forEach((stave) => {
            stave.setNoteStartX(maxX);
        });
        maxX = 0;
        staves.forEach((stave) => {
            const modifiers = stave.getModifiers(StaveModifierPosition.BEGIN, "Barline");
            modifiers.forEach((modifier) => {
                if (modifier.getType() === BarlineType.REPEAT_BEGIN)
                    if (modifier.getX() > maxX)
                        maxX = modifier.getX();
            });
        });
        staves.forEach((stave) => {
            const modifiers = stave.getModifiers(StaveModifierPosition.BEGIN, "Barline");
            modifiers.forEach((modifier) => {
                if (modifier.getType() === BarlineType.REPEAT_BEGIN)
                    modifier.setX(maxX);
            });
        });
    }
}
