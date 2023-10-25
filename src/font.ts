import { Metrics } from './metrics';

export interface FontInfo {
  /** CSS font-family, e.g., 'Arial', 'Helvetica Neue, Arial, sans-serif', 'Times, serif' */
  family?: string;

  /**
   * CSS font-size (e.g., '10pt', '12px').
   * For backwards compatibility with 3.0.9, plain numbers are assumed to be specified in 'pt'.
   */
  size?: number | string;

  /** `bold` or a number (e.g., 900) as inspired by CSS font-weight. */
  weight?: string | number;

  /** `italic` as inspired by CSS font-style. */
  style?: string;
}

export enum FontWeight {
  NORMAL = 'normal',
  BOLD = 'bold',
}

export enum FontStyle {
  NORMAL = 'normal',
  ITALIC = 'italic',
}

// Internal <span></span> element for parsing CSS font shorthand strings.
let fontParser: HTMLSpanElement;

export class Font {
  //////////////////////////////////////////////////////////////////////////////////////////////////
  // STATIC MEMBERS

  // CSS Font Sizes: 36pt == 48px == 3em == 300% == 0.5in
  /** Given a length (for units: pt, px, em, %, in, mm, cm) what is the scale factor to convert it to px? */
  static scaleToPxFrom: Record<string, number> = {
    pt: 4 / 3,
    px: 1,
    em: 16,
    '%': 4 / 25,
    in: 96,
    mm: 96 / 25.4,
    cm: 96 / 2.54,
  };

  /**
   * @param fontSize a font size to convert. Can be specified as a CSS length string (e.g., '16pt', '1em')
   * or as a number (the unit is assumed to be 'pt'). See `Font.scaleToPxFrom` for the supported
   * units (e.g., pt, em, %).
   * @returns the number of pixels that is equivalent to `fontSize`
   */
  static convertSizeToPixelValue(fontSize: string | number): number {
    if (typeof fontSize === 'number') {
      // Assume the numeric fontSize is specified in pt.
      return fontSize * Font.scaleToPxFrom.pt;
    } else {
      const value = parseFloat(fontSize);
      if (isNaN(value)) {
        return 0;
      }
      const unit = fontSize.replace(/[\d.\s]/g, '').toLowerCase(); // Extract the unit by removing all numbers, dots, spaces.
      const conversionFactor = Font.scaleToPxFrom[unit] ?? 1;
      return value * conversionFactor;
    }
  }

  /**
   * @param fontSize a font size to convert. Can be specified as a CSS length string (e.g., '16pt', '1em')
   * or as a number (the unit is assumed to be 'pt'). See `Font.scaleToPxFrom` for the supported
   * units (e.g., pt, em, %).
   * @returns the number of points that is equivalent to `fontSize`
   */
  static convertSizeToPointValue(fontSize: string | number): number {
    if (typeof fontSize === 'number') {
      // Assume the numeric fontSize is specified in pt.
      return fontSize;
    } else {
      const value = parseFloat(fontSize);
      if (isNaN(value)) {
        return 0;
      }
      const unit = fontSize.replace(/[\d.\s]/g, '').toLowerCase(); // Extract the unit by removing all numbers, dots, spaces.
      const conversionFactor = (Font.scaleToPxFrom[unit] ?? 1) / Font.scaleToPxFrom.pt;
      return value * conversionFactor;
    }
  }

  /**
   * @param f
   * @param size
   * @param weight
   * @param style
   * @returns the `size` field will include the units (e.g., '12pt', '16px').
   */
  static validate(
    f?: string | FontInfo,
    size?: string | number,
    weight?: string | number,
    style?: string
  ): Required<FontInfo> {
    // If f is a string but all other arguments are undefined, we assume that
    // f is CSS font shorthand (e.g., 'italic bold 10pt Arial').
    if (typeof f === 'string' && size === undefined && weight === undefined && style === undefined) {
      return Font.fromCSSString(f);
    }

    let family: string | undefined;
    if (typeof f === 'object') {
      // f is a FontInfo object, so we extract its fields.
      family = f.family;
      size = f.size;
      weight = f.weight;
      style = f.style;
    } else {
      // f is a string representing the font family name or undefined.
      family = f;
    }

    family = family ?? (Metrics.get('fontFamily') as string);
    size = size ?? Metrics.get('fontSize') + 'pt';
    weight = weight ?? FontWeight.NORMAL;
    style = style ?? FontStyle.NORMAL;

    if (weight === '') {
      weight = FontWeight.NORMAL;
    }
    if (style === '') {
      style = FontStyle.NORMAL;
    }

    // If size is a number, we assume the unit is `pt`.
    if (typeof size === 'number') {
      size = `${size}pt`;
    }

    // If weight is a number (e.g., 900), turn it into a string representation of that number.
    if (typeof weight === 'number') {
      weight = weight.toString();
    }

    // At this point, `family`, `size`, `weight`, and `style` are all strings.
    return { family, size, weight, style };
  }

  /**
   * @param cssFontShorthand a string formatted as CSS font shorthand (e.g., 'italic bold 15pt Arial').
   */
  static fromCSSString(cssFontShorthand: string): Required<FontInfo> {
    // Let the browser parse this string for us.
    // First, create a span element.
    // Then, set its style.font and extract it back out.
    if (!fontParser) {
      fontParser = document.createElement('span');
    }
    fontParser.style.font = cssFontShorthand;
    const { fontFamily, fontSize, fontWeight, fontStyle } = fontParser.style;
    return { family: fontFamily, size: fontSize, weight: fontWeight, style: fontStyle };
  }

  /**
   * @returns a CSS font shorthand string of the form `italic bold 16pt Arial`.
   */
  static toCSSString(fontInfo?: FontInfo): string {
    if (!fontInfo) {
      return '';
    }

    let style: string;
    const st = fontInfo.style;
    if (st === FontStyle.NORMAL || st === '' || st === undefined) {
      style = ''; // no space! Omit the style section.
    } else {
      style = st.trim() + ' ';
    }

    let weight: string;
    const wt = fontInfo.weight;
    if (wt === FontWeight.NORMAL || wt === '' || wt === undefined) {
      weight = ''; // no space! Omit the weight section.
    } else if (typeof wt === 'number') {
      weight = wt + ' ';
    } else {
      weight = wt.trim() + ' ';
    }

    let size: string;
    const sz = fontInfo.size;
    if (sz === undefined) {
      size = Metrics.get('fontSize') + 'pt';
    } else if (typeof sz === 'number') {
      size = sz + 'pt ';
    } else {
      // size is already a string.
      size = sz.trim() + ' ';
    }

    const family: string = fontInfo.family ?? Metrics.get('fontFamily');

    return `${style}${weight}${size}${family}`;
  }

  /**
   * @param fontSize a number representing a font size, or a string font size with units.
   * @param scaleFactor multiply the size by this factor.
   * @returns size * scaleFactor (e.g., 16pt * 3 = 48pt, 8px * 0.5 = 4px, 24 * 2 = 48).
   * If the fontSize argument was a number, the return value will be a number.
   * If the fontSize argument was a string, the return value will be a string.
   */
  static scaleSize<T extends number | string>(fontSize: T, scaleFactor: number): T {
    if (typeof fontSize === 'number') {
      return (fontSize * scaleFactor) as T;
    } else {
      const value = parseFloat(fontSize);
      const unit = fontSize.replace(/[\d.\s]/g, ''); // Remove all numbers, dots, spaces.
      return `${value * scaleFactor}${unit}` as T;
    }
  }

  /**
   * @param weight a string (e.g., 'bold') or a number (e.g., 600 / semi-bold in the OpenType spec).
   * @returns true if the font weight indicates bold.
   */
  static isBold(weight?: string | number): boolean {
    if (!weight) {
      return false;
    } else if (typeof weight === 'number') {
      return weight >= 600;
    } else {
      // a string can be 'bold' or '700'
      const parsedWeight = parseInt(weight, 10);
      if (isNaN(parsedWeight)) {
        return weight.toLowerCase() === 'bold';
      } else {
        return parsedWeight >= 600;
      }
    }
  }

  /**
   * @param style
   * @returns true if the font style indicates 'italic'.
   */
  static isItalic(style?: string): boolean {
    if (!style) {
      return false;
    } else {
      return style.toLowerCase() === FontStyle.ITALIC;
    }
  }

  /**
   * Customize this field to specify a different CDN for delivering web fonts.
   * Discussion on GDPR concerns:
   * https://www.jsdelivr.com/blog/how-the-german-courts-ruling-on-google-fonts-affects-jsdelivr-and-why-it-is-safe-to-use/
   *
   * You can also self host, and specify your own server URL here.
   */
  static HOST_URL = 'https://cdn.jsdelivr.net/npm/@vexflow-fonts/';

  /**
   * These font files will be loaded from the CDN specified by `Font.HOST_URL`.
   * `await VexFlow.loadFonts()` loads all of the fonts below. Useful during debugging.
   * `await VexFlow.loadFonts(FontName1, FontName2)` loads only the specified fonts.
   */
  static FILES: Record<string /* fontName */, string /* fontPath */> = {
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
    GonvilleSmufl: 'gonvillesmufl/gonvillesmufl.woff2',
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

  /**
   * This method is asynchronous, so you should use await or .then() to wait for the fonts to load before proceeding.
   *
   * @param fontName
   * @param url The absolute or relative URL to the woff2/otf file. It can also be a data URI.
   */
  static async load(fontName: string, url?: string, descriptors?: Record<string, string>): Promise<FontFace> {
    if (typeof FontFace === 'undefined') {
      return Promise.reject(new Error('FontFace API is not available in this environment. Cannot load fonts.'));
    }

    // If url is not specified, we load the font from the jsDelivr CDN.
    if (url === undefined) {
      const allFiles = Font.FILES;
      if (!(fontName in allFiles)) {
        return Promise.reject(new Error(`Font ${fontName} not found in Font.FILES`));
      }
      url = Font.HOST_URL + allFiles[fontName];
    }

    const fontFace = new FontFace(fontName, `url(${url})`, descriptors);
    const fontFaceLoadPromise = fontFace.load();

    // https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet
    let fontFaceSet;
    if (typeof document !== 'undefined') {
      fontFaceSet = document.fonts;
    } else if (typeof self !== 'undefined' && 'fonts' in self) {
      // Workers do not have a document object.
      // https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/fonts
      // eslint-disable-next-line
      fontFaceSet = self.fonts as any;
    }
    fontFaceSet?.add(fontFace);
    return fontFaceLoadPromise;
  }
}
