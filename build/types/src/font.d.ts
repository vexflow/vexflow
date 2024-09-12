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
export declare enum FontWeight {
    NORMAL = "normal",
    BOLD = "bold"
}
export declare enum FontStyle {
    NORMAL = "normal",
    ITALIC = "italic"
}
export declare class Font {
    /** Given a length (for units: pt, px, em, %, in, mm, cm) what is the scale factor to convert it to px? */
    static scaleToPxFrom: Record<string, number>;
    /**
     * @param fontSize a font size to convert. Can be specified as a CSS length string (e.g., '16pt', '1em')
     * or as a number (the unit is assumed to be 'pt'). See `Font.scaleToPxFrom` for the supported
     * units (e.g., pt, em, %).
     * @returns the number of pixels that is equivalent to `fontSize`
     */
    static convertSizeToPixelValue(fontSize: string | number): number;
    /**
     * @param fontSize a font size to convert. Can be specified as a CSS length string (e.g., '16pt', '1em')
     * or as a number (the unit is assumed to be 'pt'). See `Font.scaleToPxFrom` for the supported
     * units (e.g., pt, em, %).
     * @returns the number of points that is equivalent to `fontSize`
     */
    static convertSizeToPointValue(fontSize: string | number): number;
    /**
     * @param f
     * @param size
     * @param weight
     * @param style
     * @returns the `size` field will include the units (e.g., '12pt', '16px').
     */
    static validate(f?: string | FontInfo, size?: string | number, weight?: string | number, style?: string): Required<FontInfo>;
    /**
     * @param cssFontShorthand a string formatted as CSS font shorthand (e.g., 'italic bold 15pt Arial').
     */
    static fromCSSString(cssFontShorthand: string): Required<FontInfo>;
    /**
     * @returns a CSS font shorthand string of the form `italic bold 16pt Arial`.
     */
    static toCSSString(fontInfo?: FontInfo): string;
    /**
     * @param fontSize a number representing a font size, or a string font size with units.
     * @param scaleFactor multiply the size by this factor.
     * @returns size * scaleFactor (e.g., 16pt * 3 = 48pt, 8px * 0.5 = 4px, 24 * 2 = 48).
     * If the fontSize argument was a number, the return value will be a number.
     * If the fontSize argument was a string, the return value will be a string.
     */
    static scaleSize<T extends number | string>(fontSize: T, scaleFactor: number): T;
    /**
     * @param weight a string (e.g., 'bold') or a number (e.g., 600 / semi-bold in the OpenType spec).
     * @returns true if the font weight indicates bold.
     */
    static isBold(weight?: string | number): boolean;
    /**
     * @param style
     * @returns true if the font style indicates 'italic'.
     */
    static isItalic(style?: string): boolean;
    /**
     * Customize this field to specify a different CDN for delivering web fonts.
     * Discussion on GDPR concerns:
     * https://www.jsdelivr.com/blog/how-the-german-courts-ruling-on-google-fonts-affects-jsdelivr-and-why-it-is-safe-to-use/
     *
     * You can also self host, and specify your own server URL here.
     */
    static HOST_URL: string;
    /**
     * These font files will be loaded from the CDN specified by `Font.HOST_URL`.
     * `await VexFlow.loadFonts()` loads all of the fonts below. Useful during debugging.
     * `await VexFlow.loadFonts(FontName1, FontName2)` loads only the specified fonts.
     */
    static FILES: Record<string, string>;
    /**
     * This method is asynchronous, so you should use await or .then() to wait for the fonts to load before proceeding.
     *
     * @param fontName
     * @param url The absolute or relative URL to the woff2/otf file. It can also be a data URI.
     * @param descriptors See: https://developer.mozilla.org/en-US/docs/Web/API/FontFace/FontFace#descriptors
     */
    static load(fontName: string, url?: string, descriptors?: Record<string, string>): Promise<FontFace>;
    static getURLForFont(fontName: string): string | undefined;
}
