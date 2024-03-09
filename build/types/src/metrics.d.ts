import { FontInfo } from './font';
export declare class Metrics {
    /** Use the provided key to look up a FontInfo in CommonMetrics. **/
    static getFontInfo(key: string): Required<FontInfo>;
    /**
     * Use the provided key to look up a value in CommonMetrics.
     *
     * @param key is a string separated by periods (e.g., `Stroke.text.fontFamily`).
     * @param defaultValue is returned if the lookup fails.
     * @returns the retrieved value (or `defaultValue` if the lookup fails).
     *
     * For the key `Stroke.text.fontFamily`, check all of the following in order:
     *   1) CommonMetrics.fontFamily
     *   2) CommonMetrics.Stroke.fontFamily
     *   3) CommonMetrics.Stroke.text.fontFamily
     * Retrieve the value from the most specific key (i.e., prefer #3 over #2 over #1 in the above example).
     */
    static get(key: string, defaultValue?: any): any;
}
export declare const MetricsDefaults: Record<string, any>;
