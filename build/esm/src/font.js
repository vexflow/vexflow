var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Metrics } from './metrics.js';
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
export class Font {
    static convertSizeToPixelValue(fontSize) {
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
    static convertSizeToPointValue(fontSize) {
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
        family = family !== null && family !== void 0 ? family : Metrics.get('fontFamily');
        size = size !== null && size !== void 0 ? size : Metrics.get('fontSize') + 'pt';
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
            size = Metrics.get('fontSize') + 'pt';
        }
        else if (typeof sz === 'number') {
            size = sz + 'pt ';
        }
        else {
            size = sz.trim() + ' ';
        }
        const family = (_a = fontInfo.family) !== null && _a !== void 0 ? _a : Metrics.get('fontFamily');
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
    static load(fontName, url, descriptors) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof FontFace === 'undefined') {
                return Promise.reject(new Error('FontFace API is not available in this environment. Cannot load fonts.'));
            }
            if (url === undefined) {
                const files = Font.FILES;
                if (!(fontName in files)) {
                    return Promise.reject(new Error(`Font ${fontName} not found in Font.FILES`));
                }
                url = Font.HOST_URL + files[fontName];
            }
            const fontFace = new FontFace(fontName, `url(${url})`, descriptors);
            const fontFaceLoadPromise = fontFace.load();
            let fontFaceSet;
            if (typeof document !== 'undefined') {
                fontFaceSet = document.fonts;
            }
            else if (typeof self !== 'undefined' && 'fonts' in self) {
                fontFaceSet = self.fonts;
            }
            fontFaceSet === null || fontFaceSet === void 0 ? void 0 : fontFaceSet.add(fontFace);
            return fontFaceLoadPromise;
        });
    }
    static getURLForFont(fontName) {
        const files = Font.FILES;
        if (!(fontName in files)) {
            return undefined;
        }
        return Font.HOST_URL + files[fontName];
    }
}
Font.scaleToPxFrom = {
    pt: 4 / 3,
    px: 1,
    em: 16,
    '%': 4 / 25,
    in: 96,
    mm: 96 / 25.4,
    cm: 96 / 2.54,
};
Font.HOST_URL = 'https://cdn.jsdelivr.net/npm/@vexflow-fonts/';
Font.FILES = {
    Academico: 'academico/academico.woff2',
    Bravura: 'bravura/bravura.woff2',
    'Bravura Text': 'bravuratext/bravuratext.woff2',
    Edwin: 'edwin/edwin-roman.woff2',
    'Finale Ash': 'finaleash/finaleash.woff2',
    'Finale Ash Text': 'finaleashtext/finaleashtext.woff2',
    'Finale Broadway': 'finalebroadway/finalebroadway.woff2',
    'Finale Broadway Text': 'finalebroadwaytext/finalebroadwaytext.woff2',
    'Finale Jazz': 'finalejazz/finalejazz.woff2',
    'Finale Jazz Text': 'finalejazztext/finalejazztext.woff2',
    'Finale Maestro': 'finalemaestro/finalemaestro.woff2',
    'Finale Maestro Text': 'finalemaestrotext/finalemaestrotext-regular.woff2',
    Gonville: 'gonville/gonville.woff2',
    Gootville: 'gootville/gootville.woff2',
    'Gootville Text': 'gootvilletext/gootvilletext.woff2',
    Leipzig: 'leipzig/leipzig.woff2',
    Leland: 'leland/leland.woff2',
    'Leland Text': 'lelandtext/lelandtext.woff2',
    MuseJazz: 'musejazz/musejazz.woff2',
    'MuseJazz Text': 'musejazztext/musejazztext.woff2',
    Nepomuk: 'nepomuk/nepomuk.woff2',
    Petaluma: 'petaluma/petaluma.woff2',
    'Petaluma Script': 'petalumascript/petalumascript.woff2',
    'Petaluma Text': 'petalumatext/petalumatext.woff2',
    'Roboto Slab': 'robotoslab/robotoslab-regular-400.woff2',
    Sebastian: 'sebastian/sebastian.woff2',
    'Sebastian Text': 'sebastiantext/sebastiantext.woff2',
};
