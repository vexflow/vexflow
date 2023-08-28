import { StaveModifier, StaveModifierPosition } from './stavemodifier.js';
import { Tables } from './tables.js';
import { log } from './util.js';
function L(...args) {
    if (Clef.DEBUG)
        log('Vex.Flow.Clef', args);
}
export class Clef extends StaveModifier {
    static get CATEGORY() {
        return "Clef";
    }
    static get types() {
        return {
            treble: {
                code: '\uE050',
                line: 3,
            },
            bass: {
                code: '\uE062',
                line: 1,
            },
            alto: {
                code: '\uE05C',
                line: 2,
            },
            tenor: {
                code: '\uE05C',
                line: 1,
            },
            percussion: {
                code: '\uE069',
                line: 2,
            },
            soprano: {
                code: '\uE05C',
                line: 4,
            },
            'mezzo-soprano': {
                code: '\uE05C',
                line: 3,
            },
            'baritone-c': {
                code: '\uE05C',
                line: 0,
            },
            'baritone-f': {
                code: '\uE062',
                line: 2,
            },
            subbass: {
                code: '\uE062',
                line: 0,
            },
            french: {
                code: '\uE050',
                line: 4,
            },
            tab: {
                code: '\uE06D',
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
        if (annotation == '8va') {
            if (this.code == '\uE050')
                this.code = '\uE053';
            if (this.code == '\uE062')
                this.code = '\uE065';
        }
        if (annotation == '8vb') {
            if (this.code == '\uE050')
                this.code = '\uE052';
            if (this.code == '\uE062')
                this.code = '\uE064';
        }
        this.text = this.code;
        this.textFont.size = Math.floor(Clef.getPoint(this.size));
        this.measureText();
        return this;
    }
    static getPoint(size) {
        return size == 'default' ? Tables.lookupMetric('fontSize') : (Tables.lookupMetric('fontSize') / 3) * 2;
    }
    setStave(stave) {
        this.stave = stave;
        return this;
    }
    draw() {
        const stave = this.checkStave();
        const ctx = stave.checkContext();
        this.setRendered();
        this.applyStyle(ctx);
        ctx.openGroup('clef', this.getAttribute('id'));
        this.renderText(ctx, 0, stave.getYForLine(this.line));
        ctx.closeGroup();
        this.restoreStyle(ctx);
    }
}
Clef.DEBUG = false;
