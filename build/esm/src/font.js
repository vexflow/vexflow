var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { defined } from './util.js';
export var FontWeight;
(function (FontWeight) {
    FontWeight["NORMAL"] = "normal";
    FontWeight["BOLD"] = "bold";
})(FontWeight || (FontWeight = {}));
export var FontStyle;
(function (FontStyle) {
    FontStyle["NORMAL"] = "normal";
    FontStyle["ITALIC"] = "italic";
})(FontStyle || (FontStyle = {}));
let fontParser;
const Fonts = {};
export class Font {
    static convertSizeToPixelValue(fontSize = Font.SIZE) {
        var _a;
        if (typeof fontSize === 'number') {
            return fontSize * Font.scaleToPxFrom.pt;
        }
        else {
            const value = parseFloat(fontSize);
            if (isNaN(value)) {
                return 0;
            }
            const unit = fontSize.replace(/[\d.\s]/g, '').toLowerCase();
            const conversionFactor = (_a = Font.scaleToPxFrom[unit]) !== null && _a !== void 0 ? _a : 1;
            return value * conversionFactor;
        }
    }
    static convertSizeToPointValue(fontSize = Font.SIZE) {
        var _a;
        if (typeof fontSize === 'number') {
            return fontSize;
        }
        else {
            const value = parseFloat(fontSize);
            if (isNaN(value)) {
                return 0;
            }
            const unit = fontSize.replace(/[\d.\s]/g, '').toLowerCase();
            const conversionFactor = ((_a = Font.scaleToPxFrom[unit]) !== null && _a !== void 0 ? _a : 1) / Font.scaleToPxFrom.pt;
            return value * conversionFactor;
        }
    }
    static validate(f, size, weight, style) {
        if (typeof f === 'string' && size === undefined && weight === undefined && style === undefined) {
            return Font.fromCSSString(f);
        }
        let family;
        if (typeof f === 'object') {
            family = f.family;
            size = f.size;
            weight = f.weight;
            style = f.style;
        }
        else {
            family = f;
        }
        family = family !== null && family !== void 0 ? family : Font.SANS_SERIF;
        size = size !== null && size !== void 0 ? size : Font.SIZE + 'pt';
        weight = weight !== null && weight !== void 0 ? weight : FontWeight.NORMAL;
        style = style !== null && style !== void 0 ? style : FontStyle.NORMAL;
        if (weight === '') {
            weight = FontWeight.NORMAL;
        }
        if (style === '') {
            style = FontStyle.NORMAL;
        }
        if (typeof size === 'number') {
            size = `${size}pt`;
        }
        if (typeof weight === 'number') {
            weight = weight.toString();
        }
        return { family, size, weight, style };
    }
    static fromCSSString(cssFontShorthand) {
        if (!fontParser) {
            fontParser = document.createElement('span');
        }
        fontParser.style.font = cssFontShorthand;
        const { fontFamily, fontSize, fontWeight, fontStyle } = fontParser.style;
        return { family: fontFamily, size: fontSize, weight: fontWeight, style: fontStyle };
    }
    static toCSSString(fontInfo) {
        var _a;
        if (!fontInfo) {
            return '';
        }
        let style;
        const st = fontInfo.style;
        if (st === FontStyle.NORMAL || st === '' || st === undefined) {
            style = '';
        }
        else {
            style = st.trim() + ' ';
        }
        let weight;
        const wt = fontInfo.weight;
        if (wt === FontWeight.NORMAL || wt === '' || wt === undefined) {
            weight = '';
        }
        else if (typeof wt === 'number') {
            weight = wt + ' ';
        }
        else {
            weight = wt.trim() + ' ';
        }
        let size;
        const sz = fontInfo.size;
        if (sz === undefined) {
            size = Font.SIZE + 'pt ';
        }
        else if (typeof sz === 'number') {
            size = sz + 'pt ';
        }
        else {
            size = sz.trim() + ' ';
        }
        const family = (_a = fontInfo.family) !== null && _a !== void 0 ? _a : Font.SANS_SERIF;
        return `${style}${weight}${size}${family}`;
    }
    static scaleSize(fontSize, scaleFactor) {
        if (typeof fontSize === 'number') {
            return (fontSize * scaleFactor);
        }
        else {
            const value = parseFloat(fontSize);
            const unit = fontSize.replace(/[\d.\s]/g, '');
            return `${value * scaleFactor}${unit}`;
        }
    }
    static isBold(weight) {
        if (!weight) {
            return false;
        }
        else if (typeof weight === 'number') {
            return weight >= 600;
        }
        else {
            const parsedWeight = parseInt(weight, 10);
            if (isNaN(parsedWeight)) {
                return weight.toLowerCase() === 'bold';
            }
            else {
                return parsedWeight >= 600;
            }
        }
    }
    static isItalic(style) {
        if (!style) {
            return false;
        }
        else {
            return style.toLowerCase() === FontStyle.ITALIC;
        }
    }
    static loadWebFont(fontName, woffURL) {
        return __awaiter(this, void 0, void 0, function* () {
            const fontFace = new FontFace(fontName, `url(${woffURL})`);
            yield fontFace.load();
            document.fonts.add(fontFace);
            return fontFace;
        });
    }
    static loadWebFonts(fontNames) {
        return __awaiter(this, void 0, void 0, function* () {
            const allFiles = Font.WEB_FONT_FILES;
            if (!fontNames) {
                fontNames = Object.keys(allFiles);
            }
            const host = Font.WEB_FONT_HOST;
            for (const fontName of fontNames) {
                const fontPath = allFiles[fontName];
                if (fontPath) {
                    Font.loadWebFont(fontName, host + fontPath);
                }
            }
        });
    }
    static load(fontName, data, metrics) {
        let font = Fonts[fontName];
        if (!font) {
            font = new Font(fontName);
            Fonts[fontName] = font;
        }
        if (data) {
            font.setData(data);
        }
        if (metrics) {
            font.setMetrics(metrics);
        }
        return font;
    }
    constructor(fontName) {
        this.name = fontName;
    }
    getName() {
        return this.name;
    }
    getData() {
        return defined(this.data, 'FontError', 'Missing font data');
    }
    getMetrics() {
        return defined(this.metrics, 'FontError', 'Missing metrics');
    }
    setData(data) {
        this.data = data;
    }
    setMetrics(metrics) {
        this.metrics = metrics;
    }
    hasData() {
        return this.data !== undefined;
    }
    getResolution() {
        return this.getData().resolution;
    }
    getGlyphs() {
        return this.getData().glyphs;
    }
    lookupMetric(key, defaultValue) {
        const keyParts = key.split('.');
        let currObj = this.getMetrics();
        for (let i = 0; i < keyParts.length; i++) {
            const keyPart = keyParts[i];
            const value = currObj[keyPart];
            if (value === undefined) {
                return defaultValue;
            }
            currObj = value;
        }
        return currObj;
    }
    toString() {
        return '[' + this.name + ' Font]';
    }
}
Font.SANS_SERIF = 'Arial, sans-serif';
Font.SERIF = 'Times New Roman, serif';
Font.SIZE = 10;
Font.scaleToPxFrom = {
    pt: 4 / 3,
    px: 1,
    em: 16,
    '%': 4 / 25,
    in: 96,
    mm: 96 / 25.4,
    cm: 96 / 2.54,
};
Font.WEB_FONT_HOST = 'https://cdn.jsdelivr.net/npm/vexflow-fonts@1.0.6/';
Font.WEB_FONT_FILES = {
    Academico: 'academico/Academico_0.902.woff2',
    Bravura: 'bravura/Bravura_1.392.woff2',
    BravuraText: 'bravura/BravuraText_1.393.woff2',
    GonvilleSmufl: 'gonvillesmufl/GonvilleSmufl_1.100.woff2',
    Gootville: 'gootville/Gootville_1.3.woff2',
    GootvilleText: 'gootville/GootvilleText_1.2.woff2',
    Leland: 'leland/Leland_0.75.woff2',
    LelandText: 'leland/LelandText_0.75.woff2',
    Petaluma: 'petaluma/Petaluma_1.065.woff2',
    'Petaluma Script': 'petaluma/PetalumaScript_1.10_FS.woff2',
    MuseJazz: 'musejazz/MuseJazz_1.0.woff2',
    MuseJazzText: 'musejazz/MuseJazzText_1.0.woff2',
    'Roboto Slab': 'robotoslab/RobotoSlab-Medium_2.001.woff2',
    FinaleAsh: 'finale/FinaleAsh_1.7.woff2',
    FinaleAshText: 'finale/FinaleAshText_1.3.woff2',
    FinaleJazz: 'finale/FinaleJazz_1.9.woff2',
    FinaleJazzText: 'finale/FinaleJazzText_1.3.woff2',
    FinaleBroadway: 'finale/FinaleBroadway_1.4.woff2',
    FinaleBroadwayText: 'finale/FinaleBroadwayText_1.1.woff2',
    FinaleMaestro: 'finale/FinaleMaestro_2.7.woff2',
    FinaleMaestroText: 'finale/FinaleMaestroText-Regular_1.6.woff2',
};
