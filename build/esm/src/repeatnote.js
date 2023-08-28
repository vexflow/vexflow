import { GlyphNote } from './glyphnote.js';
const CODES = {
    '1': '\uE500',
    '2': '\uE501',
    '4': '\uE502',
    slash: '\uE504',
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
