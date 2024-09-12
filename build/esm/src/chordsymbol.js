import { Element } from './element.js';
import { Font } from './font.js';
import { Glyphs } from './glyphs.js';
import { Metrics } from './metrics.js';
import { Modifier } from './modifier.js';
import { Tables } from './tables.js';
import { isStemmableNote } from './typeguard.js';
import { log } from './util.js';
function L(...args) {
    if (ChordSymbol.DEBUG)
        log('VexFlow.ChordSymbol', args);
}
export class ChordSymbolBlock extends Element {
    constructor(text, symbolModifier, xShift, yShift, vAlign) {
        super();
        this.text = text;
        this.symbolModifier = symbolModifier;
        this.xShift = xShift;
        this.yShift = yShift;
        this.vAlign = vAlign;
    }
    isSuperscript() {
        return this.symbolModifier === SymbolModifiers.SUPERSCRIPT;
    }
    isSubscript() {
        return this.symbolModifier === SymbolModifiers.SUBSCRIPT;
    }
}
export var ChordSymbolHorizontalJustify;
(function (ChordSymbolHorizontalJustify) {
    ChordSymbolHorizontalJustify[ChordSymbolHorizontalJustify["LEFT"] = 1] = "LEFT";
    ChordSymbolHorizontalJustify[ChordSymbolHorizontalJustify["CENTER"] = 2] = "CENTER";
    ChordSymbolHorizontalJustify[ChordSymbolHorizontalJustify["RIGHT"] = 3] = "RIGHT";
    ChordSymbolHorizontalJustify[ChordSymbolHorizontalJustify["CENTER_STEM"] = 4] = "CENTER_STEM";
})(ChordSymbolHorizontalJustify || (ChordSymbolHorizontalJustify = {}));
export var ChordSymbolVerticalJustify;
(function (ChordSymbolVerticalJustify) {
    ChordSymbolVerticalJustify[ChordSymbolVerticalJustify["TOP"] = 1] = "TOP";
    ChordSymbolVerticalJustify[ChordSymbolVerticalJustify["BOTTOM"] = 2] = "BOTTOM";
})(ChordSymbolVerticalJustify || (ChordSymbolVerticalJustify = {}));
export var SymbolModifiers;
(function (SymbolModifiers) {
    SymbolModifiers[SymbolModifiers["NONE"] = 1] = "NONE";
    SymbolModifiers[SymbolModifiers["SUBSCRIPT"] = 2] = "SUBSCRIPT";
    SymbolModifiers[SymbolModifiers["SUPERSCRIPT"] = 3] = "SUPERSCRIPT";
})(SymbolModifiers || (SymbolModifiers = {}));
export class ChordSymbol extends Modifier {
    static get CATEGORY() {
        return "ChordSymbol";
    }
    static get superSubRatio() {
        return Metrics.get('ChordSymbol.superSubRatio');
    }
    static get spacingBetweenBlocks() {
        return Metrics.get('ChordSymbol.spacing');
    }
    static get superscriptOffset() {
        return Metrics.get('ChordSymbol.superscriptOffset');
    }
    static get subscriptOffset() {
        return Metrics.get('ChordSymbol.subscriptOffset');
    }
    static get minPadding() {
        return Metrics.get('NoteHead.minPadding');
    }
    static format(symbols, state) {
        if (!symbols || symbols.length === 0)
            return false;
        let width = 0;
        let leftWidth = 0;
        let rightWidth = 0;
        let maxLeftGlyphWidth = 0;
        let maxRightGlyphWidth = 0;
        for (const symbol of symbols) {
            const note = symbol.checkAttachedNote();
            let lineSpaces = 1;
            for (let j = 0; j < symbol.symbolBlocks.length; ++j) {
                const block = symbol.symbolBlocks[j];
                const sup = block.isSuperscript();
                const sub = block.isSubscript();
                block.setXShift(width);
                if (sup || sub) {
                    lineSpaces = 2;
                }
                if (sub && j > 0) {
                    const prev = symbol.symbolBlocks[j - 1];
                    if (prev.isSuperscript()) {
                        block.setXShift(width - prev.getWidth() - ChordSymbol.minPadding);
                        block.vAlign = true;
                        width +=
                            -prev.getWidth() -
                                ChordSymbol.minPadding +
                                (prev.getWidth() > block.getWidth() ? prev.getWidth() - block.getWidth() : 0);
                    }
                }
                width += block.getWidth() + ChordSymbol.minPadding;
            }
            if (symbol.getVertical() === ChordSymbolVerticalJustify.TOP) {
                symbol.setTextLine(state.topTextLine);
                state.topTextLine += lineSpaces;
            }
            else {
                symbol.setTextLine(state.textLine + 1);
                state.textLine += lineSpaces + 1;
            }
            if (symbol.getReportWidth()) {
                if (isStemmableNote(note)) {
                    const glyphWidth = note.getGlyphWidth();
                    if (symbol.getHorizontal() === ChordSymbolHorizontalJustify.RIGHT) {
                        maxLeftGlyphWidth = Math.max(glyphWidth, maxLeftGlyphWidth);
                        leftWidth = Math.max(leftWidth, width) + ChordSymbol.minPadding;
                    }
                    else if (symbol.getHorizontal() === ChordSymbolHorizontalJustify.LEFT) {
                        maxRightGlyphWidth = Math.max(glyphWidth, maxRightGlyphWidth);
                        rightWidth = Math.max(rightWidth, width);
                    }
                    else {
                        leftWidth = Math.max(leftWidth, width / 2) + ChordSymbol.minPadding;
                        rightWidth = Math.max(rightWidth, width / 2);
                        maxLeftGlyphWidth = Math.max(glyphWidth / 2, maxLeftGlyphWidth);
                        maxRightGlyphWidth = Math.max(glyphWidth / 2, maxRightGlyphWidth);
                    }
                }
                symbol.width = width;
            }
            width = 0;
        }
        const rightOverlap = Math.min(Math.max(rightWidth - maxRightGlyphWidth, 0), Math.max(rightWidth - state.rightShift, 0));
        const leftOverlap = Math.min(Math.max(leftWidth - maxLeftGlyphWidth, 0), Math.max(leftWidth - state.leftShift, 0));
        state.leftShift += leftOverlap;
        state.rightShift += rightOverlap;
        return true;
    }
    constructor() {
        super();
        this.symbolBlocks = [];
        this.horizontal = ChordSymbolHorizontalJustify.LEFT;
        this.vertical = ChordSymbolVerticalJustify.TOP;
        this.reportWidth = true;
    }
    get superscriptOffset() {
        return ChordSymbol.superscriptOffset * Font.convertSizeToPixelValue(this.fontInfo.size);
    }
    get subscriptOffset() {
        return ChordSymbol.subscriptOffset * Font.convertSizeToPixelValue(this.fontInfo.size);
    }
    setReportWidth(value) {
        this.reportWidth = value;
        return this;
    }
    getReportWidth() {
        return this.reportWidth;
    }
    getSymbolBlock(params = {}) {
        var _a, _b;
        const symbolBlock = new ChordSymbolBlock((_a = params.text) !== null && _a !== void 0 ? _a : '', (_b = params.symbolModifier) !== null && _b !== void 0 ? _b : SymbolModifiers.NONE, 0, 0, false);
        if (symbolBlock.isSubscript()) {
            symbolBlock.setYShift(this.subscriptOffset);
        }
        if (symbolBlock.isSuperscript()) {
            symbolBlock.setYShift(this.superscriptOffset);
        }
        if (symbolBlock.isSubscript() || symbolBlock.isSuperscript()) {
            const { family, size, weight, style } = this.fontInfo;
            const smallerFontSize = Font.scaleSize(size, ChordSymbol.superSubRatio);
            symbolBlock.setFont(family, smallerFontSize, weight, style);
        }
        else {
            symbolBlock.setFont(this.fontInfo);
        }
        return symbolBlock;
    }
    addSymbolBlock(parameters) {
        this.symbolBlocks.push(this.getSymbolBlock(parameters));
        return this;
    }
    addText(text, parameters = {}) {
        return this.addSymbolBlock(Object.assign(Object.assign({}, parameters), { text }));
    }
    addTextSuperscript(text) {
        const symbolModifier = SymbolModifiers.SUPERSCRIPT;
        return this.addSymbolBlock({ text, symbolModifier });
    }
    addTextSubscript(text) {
        const symbolModifier = SymbolModifiers.SUBSCRIPT;
        return this.addSymbolBlock({ text, symbolModifier });
    }
    addGlyphSuperscript(glyph) {
        return this.addTextSuperscript(ChordSymbol.glyphs[glyph]);
    }
    addGlyph(glyph, params = {}) {
        return this.addText(ChordSymbol.glyphs[glyph], params);
    }
    addGlyphOrText(text, params = {}) {
        let str = '';
        for (let i = 0; i < text.length; ++i) {
            const char = text[i];
            const glyph = ChordSymbol.glyphs[char];
            if (glyph) {
                str += glyph;
            }
            else {
                str += char;
            }
        }
        if (str.length > 0) {
            this.addText(str, params);
        }
        return this;
    }
    addLine(params = {}) {
        return this.addText('\ue874\ue874', params);
    }
    setVertical(vj) {
        this.vertical = typeof vj === 'string' ? ChordSymbol.VerticalJustifyString[vj] : vj;
        return this;
    }
    getVertical() {
        return this.vertical;
    }
    setHorizontal(hj) {
        this.horizontal = typeof hj === 'string' ? ChordSymbol.HorizontalJustifyString[hj] : hj;
        return this;
    }
    getHorizontal() {
        return this.horizontal;
    }
    draw() {
        const ctx = this.checkContext();
        const note = this.checkAttachedNote();
        this.setRendered();
        ctx.openGroup('chordsymbol', this.getAttribute('id'));
        const start = note.getModifierStartXY(Modifier.Position.ABOVE, this.index);
        ctx.setFont(this.fontInfo);
        let y;
        const hasStem = note.hasStem();
        const stave = note.checkStave();
        if (this.vertical === ChordSymbolVerticalJustify.BOTTOM) {
            y = stave.getYForBottomText(this.textLine + Tables.TEXT_HEIGHT_OFFSET_HACK);
            if (hasStem) {
                const stemExt = note.checkStem().getExtents();
                const spacing = stave.getSpacingBetweenLines();
                const stemBase = note.getStemDirection() === 1 ? stemExt.baseY : stemExt.topY;
                y = Math.max(y, stemBase + spacing * (this.textLine + 2));
            }
        }
        else {
            const topY = Math.min(...note.getYs());
            y = Math.min(stave.getYForTopText(this.textLine), topY - 10);
            if (hasStem) {
                const stemExt = note.checkStem().getExtents();
                const spacing = stave.getSpacingBetweenLines();
                y = Math.min(y, stemExt.topY - 5 - spacing * this.textLine);
            }
        }
        let x = start.x;
        if (this.horizontal === ChordSymbolHorizontalJustify.LEFT) {
            x = start.x;
        }
        else if (this.horizontal === ChordSymbolHorizontalJustify.RIGHT) {
            x = start.x + this.getWidth();
        }
        else if (this.horizontal === ChordSymbolHorizontalJustify.CENTER) {
            x = start.x - this.getWidth() / 2;
        }
        else {
            x = note.getStemX() - this.getWidth() / 2;
        }
        L('Rendering ChordSymbol: ', x, y);
        this.symbolBlocks.forEach((symbol) => {
            L('Rendering Text: ', symbol.getText(), x + symbol.getXShift(), y + symbol.getYShift());
            symbol.setX(x);
            symbol.setY(y);
            symbol.renderText(ctx, 0, 0);
        });
        ctx.closeGroup();
    }
    getBoundingBox() {
        const boundingBox = this.symbolBlocks[0].getBoundingBox();
        for (let i = 1; i < this.symbolBlocks.length; i++) {
            boundingBox.mergeWith(this.symbolBlocks[i].getBoundingBox());
        }
        return boundingBox;
    }
}
ChordSymbol.DEBUG = false;
ChordSymbol.HorizontalJustify = ChordSymbolHorizontalJustify;
ChordSymbol.HorizontalJustifyString = {
    left: ChordSymbolHorizontalJustify.LEFT,
    right: ChordSymbolHorizontalJustify.RIGHT,
    center: ChordSymbolHorizontalJustify.CENTER,
    centerStem: ChordSymbolHorizontalJustify.CENTER_STEM,
};
ChordSymbol.VerticalJustify = ChordSymbolVerticalJustify;
ChordSymbol.VerticalJustifyString = {
    top: ChordSymbolVerticalJustify.TOP,
    above: ChordSymbolVerticalJustify.TOP,
    below: ChordSymbolVerticalJustify.BOTTOM,
    bottom: ChordSymbolVerticalJustify.BOTTOM,
};
ChordSymbol.glyphs = {
    diminished: Glyphs.csymDiminished,
    dim: Glyphs.csymDiminished,
    halfDiminished: Glyphs.csymHalfDiminished,
    '+': Glyphs.csymAugmented,
    augmented: Glyphs.csymAugmented,
    majorSeventh: Glyphs.csymMajorSeventh,
    minor: Glyphs.csymMinor,
    '-': Glyphs.csymMinor,
    '(': '(',
    leftParen: '(',
    ')': ')',
    rightParen: ')',
    leftBracket: Glyphs.csymBracketLeftTall,
    rightBracket: Glyphs.csymBracketRightTall,
    leftParenTall: '(',
    rightParenTall: ')',
    '/': Glyphs.csymDiagonalArrangementSlash,
    over: Glyphs.csymDiagonalArrangementSlash,
    '#': Glyphs.csymAccidentalSharp,
    b: Glyphs.csymAccidentalFlat,
};
ChordSymbol.symbolModifiers = SymbolModifiers;
