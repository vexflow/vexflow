import { Font } from '../font.js';
import { BravuraFont } from './bravura_glyphs.js';
import { CommonMetrics } from './common_metrics.js';
export function loadMuseJazz() {
    Font.load('MuseJazz', BravuraFont, CommonMetrics);
}
