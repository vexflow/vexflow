import { GlyphNote } from './glyphnote.js';
import { Glyphs } from './glyphs.js';
const CODES = {
    '1': Glyphs.repeat1Bar,
    '2': Glyphs.repeat2Bars,
    '4': Glyphs.repeat4Bars,
    slash: Glyphs.repeatBarSlash,
};
export class RepeatNote extends GlyphNote {
    static get CATEGORY() {
        return "RepeatNote";
    }
    constructor(type, noteStruct, options) {
        const glyphCode = CODES[type] || '\uE500';
        super(glyphCode, Object.assign({ duration: 'q', alignCenter: type !== 'slash' }, noteStruct), options);
    }
}
