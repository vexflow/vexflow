import { Glyphs } from './glyphs.js';
import { Metrics } from './metrics.js';
import { StaveModifier, StaveModifierPosition } from './stavemodifier.js';
import { log } from './util.js';
function L(...args) {
    if (Clef.DEBUG)
        log('VexFlow.Clef', args);
}
export class Clef extends StaveModifier {
    static get CATEGORY() {
        return "Clef";
    }
    static get types() {
        const { gClef, fClef, cClef, unpitchedPercussionClef1, sixStringTabClef } = Glyphs;
        return {
            treble: {
                code: gClef,
                line: 3,
            },
            bass: {
                code: fClef,
                line: 1,
            },
            alto: {
                code: cClef,
                line: 2,
            },
            tenor: {
                code: cClef,
                line: 1,
            },
            percussion: {
                code: unpitchedPercussionClef1,
                line: 2,
            },
            soprano: {
                code: cClef,
                line: 4,
            },
            'mezzo-soprano': {
                code: cClef,
                line: 3,
            },
            'baritone-c': {
                code: cClef,
                line: 0,
            },
            'baritone-f': {
                code: fClef,
                line: 2,
            },
            subbass: {
                code: fClef,
                line: 0,
            },
            french: {
                code: gClef,
                line: 4,
            },
            tab: {
                code: sixStringTabClef,
                line: 2.5,
            },
        };
    }
    constructor(type, size, annotation) {
        super();
        this.code = Clef.types['treble'].code;
        this.line = Clef.types['treble'].line;
        this.size = 'default';
        this.type = 'treble';
        this.setPosition(StaveModifierPosition.BEGIN);
        this.setType(type, size, annotation);
        L('Creating clef:', type);
    }
    setType(type, size = 'default', annotation) {
        this.type = type;
        this.code = Clef.types[type].code;
        this.line = Clef.types[type].line;
        this.size = size !== null && size !== void 0 ? size : 'default';
        if (annotation === '8va') {
            if (this.code === Glyphs.gClef) {
                this.code = Glyphs.gClef8va;
            }
            if (this.code === Glyphs.fClef) {
                this.code = Glyphs.fClef8va;
            }
        }
        if (annotation === '8vb') {
            if (this.code === Glyphs.gClef) {
                this.code = Glyphs.gClef8vb;
            }
            if (this.code === Glyphs.fClef) {
                this.code = Glyphs.fClef8vb;
            }
        }
        this.text = this.code;
        this.fontInfo.size = Math.floor(Clef.getPoint(this.size));
        return this;
    }
    static getPoint(size) {
        return size === 'default' ? Metrics.get('fontSize') : (Metrics.get('fontSize') * 2) / 3;
    }
    setStave(stave) {
        this.stave = stave;
        return this;
    }
    draw() {
        const stave = this.checkStave();
        const ctx = stave.checkContext();
        this.setRendered();
        ctx.openGroup('clef', this.getAttribute('id'));
        this.y = stave.getYForLine(this.line);
        this.renderText(ctx, 0, 0);
        ctx.closeGroup();
    }
}
Clef.DEBUG = false;
