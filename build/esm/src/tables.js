import { Fraction } from './fraction.js';
import { Glyphs } from './glyphs.js';
import { RuntimeError } from './util.js';
const RESOLUTION = 16384;
const durations = {
    '1/2': RESOLUTION * 2,
    1: RESOLUTION / 1,
    2: RESOLUTION / 2,
    4: RESOLUTION / 4,
    8: RESOLUTION / 8,
    16: RESOLUTION / 16,
    32: RESOLUTION / 32,
    64: RESOLUTION / 64,
    128: RESOLUTION / 128,
    256: RESOLUTION / 256,
};
const durationAliases = {
    w: '1',
    h: '2',
    q: '4',
    b: '256',
};
const keySignatures = {
    C: { num: 0 },
    Am: { num: 0 },
    F: { accidental: 'b', num: 1 },
    Dm: { accidental: 'b', num: 1 },
    Bb: { accidental: 'b', num: 2 },
    Gm: { accidental: 'b', num: 2 },
    Eb: { accidental: 'b', num: 3 },
    Cm: { accidental: 'b', num: 3 },
    Ab: { accidental: 'b', num: 4 },
    Fm: { accidental: 'b', num: 4 },
    Db: { accidental: 'b', num: 5 },
    Bbm: { accidental: 'b', num: 5 },
    Gb: { accidental: 'b', num: 6 },
    Ebm: { accidental: 'b', num: 6 },
    Cb: { accidental: 'b', num: 7 },
    Abm: { accidental: 'b', num: 7 },
    G: { accidental: '#', num: 1 },
    Em: { accidental: '#', num: 1 },
    D: { accidental: '#', num: 2 },
    Bm: { accidental: '#', num: 2 },
    A: { accidental: '#', num: 3 },
    'F#m': { accidental: '#', num: 3 },
    E: { accidental: '#', num: 4 },
    'C#m': { accidental: '#', num: 4 },
    B: { accidental: '#', num: 5 },
    'G#m': { accidental: '#', num: 5 },
    'F#': { accidental: '#', num: 6 },
    'D#m': { accidental: '#', num: 6 },
    'C#': { accidental: '#', num: 7 },
    'A#m': { accidental: '#', num: 7 },
};
const clefs = {
    treble: { lineShift: 0 },
    bass: { lineShift: 6 },
    tenor: { lineShift: 4 },
    alto: { lineShift: 3 },
    soprano: { lineShift: 1 },
    percussion: { lineShift: 0 },
    'mezzo-soprano': { lineShift: 2 },
    'baritone-c': { lineShift: 5 },
    'baritone-f': { lineShift: 5 },
    subbass: { lineShift: 7 },
    french: { lineShift: -1 },
};
const notesInfo = {
    C: { index: 0, intVal: 0 },
    CN: { index: 0, intVal: 0 },
    'C#': { index: 0, intVal: 1 },
    'C##': { index: 0, intVal: 2 },
    CB: { index: 0, intVal: 11 },
    CBB: { index: 0, intVal: 10 },
    D: { index: 1, intVal: 2 },
    DN: { index: 1, intVal: 2 },
    'D#': { index: 1, intVal: 3 },
    'D##': { index: 1, intVal: 4 },
    DB: { index: 1, intVal: 1 },
    DBB: { index: 1, intVal: 0 },
    E: { index: 2, intVal: 4 },
    EN: { index: 2, intVal: 4 },
    'E#': { index: 2, intVal: 5 },
    'E##': { index: 2, intVal: 6 },
    EB: { index: 2, intVal: 3 },
    EBB: { index: 2, intVal: 2 },
    F: { index: 3, intVal: 5 },
    FN: { index: 3, intVal: 5 },
    'F#': { index: 3, intVal: 6 },
    'F##': { index: 3, intVal: 7 },
    FB: { index: 3, intVal: 4 },
    FBB: { index: 3, intVal: 3 },
    G: { index: 4, intVal: 7 },
    GN: { index: 4, intVal: 7 },
    'G#': { index: 4, intVal: 8 },
    'G##': { index: 4, intVal: 9 },
    GB: { index: 4, intVal: 6 },
    GBB: { index: 4, intVal: 5 },
    A: { index: 5, intVal: 9 },
    AN: { index: 5, intVal: 9 },
    'A#': { index: 5, intVal: 10 },
    'A##': { index: 5, intVal: 11 },
    AB: { index: 5, intVal: 8 },
    ABB: { index: 5, intVal: 7 },
    B: { index: 6, intVal: 11 },
    BN: { index: 6, intVal: 11 },
    'B#': { index: 6, intVal: 12 },
    'B##': { index: 6, intVal: 13 },
    BB: { index: 6, intVal: 10 },
    BBB: { index: 6, intVal: 9 },
    R: { index: 6 },
    X: { index: 6 },
};
const validNoteTypes = {
    n: { name: 'note' },
    r: { name: 'rest' },
    h: { name: 'harmonic' },
    m: { name: 'muted' },
    s: { name: 'slash' },
    g: { name: 'ghost' },
    d: { name: 'diamond' },
    x: { name: 'x' },
    ci: { name: 'circled' },
    cx: { name: 'circle x' },
    sf: { name: 'slashed' },
    sb: { name: 'slashed backward' },
    sq: { name: 'square' },
    tu: { name: 'triangle up' },
    td: { name: 'triangle down' },
};
const accidentals = {
    '#': '\ue262',
    '##': '\ue263',
    b: '\ue260',
    bb: '\ue264',
    n: '\ue261',
    '{': '\ue26a',
    '}': '\ue26b',
    db: '\ue281',
    d: '\ue280',
    '++': '\ue283',
    '+': '\ue282',
    '+-': '\ue446',
    bs: '\ue442',
    bss: '\ue440',
    o: '\ue461',
    k: '\ue460',
    bbs: '\ue447',
    '++-': '\ue447',
    ashs: '\ue447',
    afhf: '\ue447',
};
const accidentalColumns = {
    1: {
        a: [1],
        b: [1],
    },
    2: {
        a: [1, 2],
    },
    3: {
        a: [1, 3, 2],
        b: [1, 2, 1],
        secondOnBottom: [1, 2, 3],
    },
    4: {
        a: [1, 3, 4, 2],
        b: [1, 2, 3, 1],
        spacedOutTetrachord: [1, 2, 1, 2],
    },
    5: {
        a: [1, 3, 5, 4, 2],
        b: [1, 2, 4, 3, 1],
        spacedOutPentachord: [1, 2, 3, 2, 1],
        verySpacedOutPentachord: [1, 2, 1, 2, 1],
    },
    6: {
        a: [1, 3, 5, 6, 4, 2],
        b: [1, 2, 4, 5, 3, 1],
        spacedOutHexachord: [1, 3, 2, 1, 3, 2],
        verySpacedOutHexachord: [1, 2, 1, 2, 1, 2],
    },
};
const articulations = {
    'a.': { code: '\ue1e7', betweenLines: true },
    av: {
        aboveCode: '\ue4a6',
        belowCode: '\ue4a7',
        betweenLines: true,
    },
    'a>': {
        aboveCode: '\ue4a0',
        belowCode: '\ue4a1',
        betweenLines: true,
    },
    'a-': {
        aboveCode: '\ue4a4',
        belowCode: '\ue4a5',
        betweenLines: true,
    },
    'a^': {
        aboveCode: '\ue4ac',
        belowCode: '\ue4ad',
        betweenLines: false,
    },
    'a+': { code: '\ue633', betweenLines: false },
    ao: {
        aboveCode: '\ue631',
        belowCode: '\ue630',
        betweenLines: false,
    },
    ah: { code: '\ue614', betweenLines: false },
    'a@': { aboveCode: '\ue4c0', belowCode: '\ue4c1', betweenLines: false },
    'a@a': { code: '\ue4c0', betweenLines: false },
    'a@u': { code: '\ue4c1', betweenLines: false },
    'a@s': { aboveCode: '\ue4c4', belowCode: '\ue4c5', betweenLines: false },
    'a@as': { code: '\ue4c4', betweenLines: false },
    'a@us': { code: '\ue4c5', betweenLines: false },
    'a@l': { aboveCode: '\ue4c6', belowCode: '\ue4c7', betweenLines: false },
    'a@al': { code: '\ue4c6', betweenLines: false },
    'a@ul': { code: '\ue4c7', betweenLines: false },
    'a@vl': {
        aboveCode: '\ue4c8',
        belowCode: '\ue4c9',
        betweenLines: false,
    },
    'a@avl': { code: '\ue4c8', betweenLines: false },
    'a@uvl': { code: '\ue4c9', betweenLines: false },
    'a|': { code: '\ue612', betweenLines: false },
    am: { code: '\ue610', betweenLines: false },
    'a,': { code: '\ue805', betweenLines: false },
};
const ornaments = {
    mordent: '\ue56c',
    mordentInverted: '\ue56d',
    turn: '\ue567',
    turnInverted: '\ue569',
    tr: '\ue566',
    upprall: '\ue5b5',
    downprall: '\ue5c3',
    prallup: '\ue5bb',
    pralldown: '\ue5c8',
    upmordent: '\ue5b8',
    downmordent: '\ue5c4',
    lineprall: '\ue5b2',
    prallprall: '\ue56e',
    scoop: '\ue5d0',
    doit: '\ue5d5',
    fall: '\ue5d7',
    doitLong: '\ue5d2',
    fallLong: '\ue5de',
    bend: '\ue5e3',
    plungerClosed: '\ue5e5',
    plungerOpen: '\ue5e7',
    flip: '\ue5e1',
    jazzTurn: '\ue5e4',
    smear: '\ue5e2',
};
export class Tables {
    static clefProperties(clef) {
        if (!clef || !(clef in clefs))
            throw new RuntimeError('BadArgument', 'Invalid clef: ' + clef);
        return clefs[clef];
    }
    static keyProperties(keyOctaveGlyph, clef = 'treble', type = 'N', params) {
        let options = { octaveShift: 0, duration: '4' };
        if (typeof params === 'object') {
            options = Object.assign(Object.assign({}, options), params);
        }
        const duration = Tables.sanitizeDuration(options.duration);
        const pieces = keyOctaveGlyph.split('/');
        if (pieces.length < 2) {
            throw new RuntimeError('BadArguments', `First argument must be note/octave or note/octave/glyph-code: ${keyOctaveGlyph}`);
        }
        const key = pieces[0].toUpperCase();
        type = type.toUpperCase();
        const value = notesInfo[key];
        if (!value)
            throw new RuntimeError('BadArguments', 'Invalid key name: ' + key);
        let octave = parseInt(pieces[1], 10);
        octave -= options.octaveShift;
        const baseIndex = octave * 7 - 4 * 7;
        let line = (baseIndex + value.index) / 2;
        line += Tables.clefProperties(clef).lineShift;
        const intValue = typeof value.intVal !== 'undefined' ? octave * 12 + value.intVal : undefined;
        let code = '';
        let glyphName = 'N';
        if (pieces.length > 2 && pieces[2]) {
            glyphName = pieces[2].toUpperCase();
        }
        else if (type !== 'N') {
            glyphName = type;
        }
        else
            glyphName = key;
        code = this.codeNoteHead(glyphName, duration);
        return {
            key,
            octave,
            line,
            intValue,
            code,
            displaced: false,
        };
    }
    static integerToNote(integer) {
        if (typeof integer === 'undefined' || integer < 0 || integer > 11) {
            throw new RuntimeError('BadArguments', `integerToNote() requires an integer in the range [0, 11]: ${integer}`);
        }
        const table = {
            0: 'C',
            1: 'C#',
            2: 'D',
            3: 'D#',
            4: 'E',
            5: 'F',
            6: 'F#',
            7: 'G',
            8: 'G#',
            9: 'A',
            10: 'A#',
            11: 'B',
        };
        const noteValue = table[integer];
        if (!noteValue) {
            throw new RuntimeError('BadArguments', `Unknown note value for integer: ${integer}`);
        }
        return noteValue;
    }
    static textWidth(text) {
        return 7 * text.toString().length;
    }
    static articulationCodes(artic) {
        return articulations[artic];
    }
    static accidentalCodes(accidental) {
        var _a;
        return (_a = accidentals[accidental]) !== null && _a !== void 0 ? _a : accidental;
    }
    static ornamentCodes(ornament) {
        var _a;
        return (_a = ornaments[ornament]) !== null && _a !== void 0 ? _a : ornament;
    }
    static keySignature(spec) {
        const keySpec = keySignatures[spec];
        if (!keySpec) {
            throw new RuntimeError('BadKeySignature', `Bad key signature spec: '${spec}'`);
        }
        if (!keySpec.accidental) {
            return [];
        }
        const accidentalList = {
            b: [2, 0.5, 2.5, 1, 3, 1.5, 3.5],
            '#': [0, 1.5, -0.5, 1, 2.5, 0.5, 2],
        };
        const notes = accidentalList[keySpec.accidental];
        const accList = [];
        for (let i = 0; i < keySpec.num; ++i) {
            const line = notes[i];
            accList.push({ type: keySpec.accidental, line });
        }
        return accList;
    }
    static getKeySignatures() {
        return keySignatures;
    }
    static hasKeySignature(spec) {
        return spec in keySignatures;
    }
    static sanitizeDuration(duration) {
        const durationNumber = durationAliases[duration];
        if (durationNumber !== undefined) {
            duration = durationNumber;
        }
        if (durations[duration] === undefined) {
            throw new RuntimeError('BadArguments', `The provided duration is not valid: ${duration}`);
        }
        return duration;
    }
    static durationToFraction(duration) {
        return new Fraction().parse(Tables.sanitizeDuration(duration));
    }
    static durationToNumber(duration) {
        return Tables.durationToFraction(duration).value();
    }
    static durationToTicks(duration) {
        duration = Tables.sanitizeDuration(duration);
        const ticks = durations[duration];
        if (ticks === undefined) {
            throw new RuntimeError('InvalidDuration');
        }
        return ticks;
    }
    static codeNoteHead(type, duration) {
        switch (type) {
            case 'D0':
                return '\ue0d8';
            case 'D1':
                return '\ue0d9';
            case 'D2':
                return '\ue0db';
            case 'D3':
                return '\ue0db';
            case 'T0':
                return '\ue0bb';
            case 'T1':
                return '\ue0bc';
            case 'T2':
                return '\ue0be';
            case 'T3':
                return '\ue0be';
            case 'X0':
                return '\ue0a7';
            case 'X1':
                return '\ue0a8';
            case 'X2':
                return '\ue0a9';
            case 'X3':
                return '\ue0b3';
            case 'S1':
                return '\ue0b8';
            case 'S2':
                return '\ue0b9';
            case 'R1':
                return '\ue0b8';
            case 'R2':
                return '\ue0b8';
            case 'DO':
                return '\ue0be';
            case 'RE':
                return '\ue0cb';
            case 'MI':
                return '\ue0db';
            case 'FA':
                return '\ue0c0';
            case 'FAUP':
                return '\ue0c2';
            case 'SO':
                return '\ue0a4';
            case 'LA':
                return '\ue0b9';
            case 'TI':
                return '\ue0cd';
            case 'DI':
            case 'H':
                switch (duration) {
                    case '1/2':
                        return '\ue0d7';
                    case '1':
                        return '\ue0d8';
                    case '2':
                        return '\ue0d9';
                    default:
                        return '\ue0db';
                }
            case 'X':
            case 'M':
                switch (duration) {
                    case '1/2':
                        return '\ue0a6';
                    case '1':
                        return '\ue0a7';
                    case '2':
                        return '\ue0a8';
                    default:
                        return '\ue0a9';
                }
            case 'CX':
                switch (duration) {
                    case '1/2':
                        return '\ue0b0';
                    case '1':
                        return '\ue0b1';
                    case '2':
                        return '\ue0b2';
                    default:
                        return '\ue0b3';
                }
            case 'CI':
                switch (duration) {
                    case '1/2':
                        return '\ue0e7';
                    case '1':
                        return '\ue0e6';
                    case '2':
                        return '\ue0e5';
                    default:
                        return '\ue0e4';
                }
            case 'SQ':
                switch (duration) {
                    case '1/2':
                        return '\ue0a1';
                    case '1':
                        return '\ue0b8';
                    case '2':
                        return '\ue0b8';
                    default:
                        return '\ue0b9';
                }
            case 'TU':
                switch (duration) {
                    case '1/2':
                        return '\ue0ba';
                    case '1':
                        return '\ue0bb';
                    case '2':
                        return '\ue0bc';
                    default:
                        return '\ue0be';
                }
            case 'TD':
                switch (duration) {
                    case '1/2':
                        return '\ue0c3';
                    case '1':
                        return '\ue0c4';
                    case '2':
                        return '\ue0c5';
                    default:
                        return '\ue0c7';
                }
            case 'SF':
                switch (duration) {
                    case '1/2':
                        return '\ue0d5';
                    case '1':
                        return '\ue0d3';
                    case '2':
                        return '\ue0d1';
                    default:
                        return '\ue0cf';
                }
            case 'SB':
                switch (duration) {
                    case '1/2':
                        return '\ue0d6';
                    case '1':
                        return '\ue0d4';
                    case '2':
                        return '\ue0d2';
                    default:
                        return '\ue0d0';
                }
            case 'R':
                switch (duration) {
                    case '1/2':
                        return '\ue4e2';
                    case '1':
                        return '\ue4e3';
                    case '2':
                        return '\ue4e4';
                    case '4':
                        return '\ue4e5';
                    case '8':
                        return '\ue4e6';
                    case '16':
                        return '\ue4e7';
                    case '32':
                        return '\ue4e8';
                    case '64':
                        return '\ue4e9';
                    case '128':
                        return '\ue4ea';
                }
                break;
            case 'S':
                switch (duration) {
                    case '1/2':
                        return '\ue10a';
                    case '1':
                        return '\ue102';
                    case '2':
                        return '\ue103';
                    default:
                        return '\ue100';
                }
            default:
                switch (duration) {
                    case '1/2':
                        return '\ue0a0';
                    case '1':
                        return '\ue0a2';
                    case '2':
                        return '\ue0a3';
                    default:
                        return '\ue0a4';
                }
        }
        return Glyphs.null;
    }
}
Tables.UNISON = true;
Tables.SOFTMAX_FACTOR = 10;
Tables.STEM_WIDTH = 1.5;
Tables.STEM_HEIGHT = 35;
Tables.STAVE_LINE_THICKNESS = 1;
Tables.RENDER_PRECISION_PLACES = 3;
Tables.RESOLUTION = RESOLUTION;
Tables.durationCodes = {
    '1/2': {
        stem: false,
    },
    1: {
        stem: false,
    },
    2: {
        stem: true,
    },
    4: {
        stem: true,
    },
    8: {
        stem: true,
        beamCount: 1,
        stemBeamExtension: 0,
        codeFlagUp: '\ue240',
    },
    16: {
        beamCount: 2,
        stemBeamExtension: 0,
        stem: true,
        codeFlagUp: '\ue242',
    },
    32: {
        beamCount: 3,
        stemBeamExtension: 7.5,
        stem: true,
        codeFlagUp: '\ue244',
    },
    64: {
        beamCount: 4,
        stemBeamExtension: 15,
        stem: true,
        codeFlagUp: '\ue246',
    },
    128: {
        beamCount: 5,
        stemBeamExtension: 22.5,
        stem: true,
        codeFlagUp: '\ue248',
    },
};
Tables.NOTATION_FONT_SCALE = 39;
Tables.TABLATURE_FONT_SCALE = 39;
Tables.SLASH_NOTEHEAD_WIDTH = 15;
Tables.STAVE_LINE_DISTANCE = 10;
Tables.TEXT_HEIGHT_OFFSET_HACK = 1;
Tables.accidentalColumnsTable = accidentalColumns;
Tables.unicode = {
    sharp: '\u266f',
    flat: '\u266d',
    natural: '\u266e',
    triangle: '\u25b3',
    'o-with-slash': '\u00f8',
    degrees: '\u00b0',
    circle: '\u25cb',
};
Tables.validTypes = validNoteTypes;
Tables.TIME4_4 = {
    numBeats: 4,
    beatValue: 4,
    resolution: RESOLUTION,
};
