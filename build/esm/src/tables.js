import { Fraction } from './fraction.js';
import { Glyph } from './glyph.js';
import { RuntimeError } from './util.js';
const RESOLUTION = 16384;
export const CommonMetrics = {
    fontFamily: 'Bravura',
    fontSize: 30,
    fontWeight: 'normal',
    fontStyle: 'normal',
    Accidental: {
        cautionary: {
            fontSize: 28,
        },
    },
    Annotation: {
        fontSize: 10,
    },
    Bend: {
        fontSize: 10,
    },
    ChordSymbol: {
        fontSize: 12,
        spacing: 0.05,
        subscriptOffset: 0.2,
        superscriptOffset: -0.4,
        superSubRatio: 0.6,
    },
    FretHandFinger: {
        fontSize: 9,
        fontWeight: 'bold',
    },
    NoteHead: {
        minPadding: 2,
    },
    PedalMarking: {
        text: {
            fontSize: 12,
            fontStyle: 'italic',
        },
    },
    Repetition: {
        fontFamily: 'Times New Roman, serif',
        fontSize: 13,
        fontWeight: 'bold',
    },
    Stave: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 8,
        padding: 12,
        endPaddingMax: 10,
        endPaddingMin: 5,
        unalignedNotePadding: 10,
    },
    StaveConnector: {
        fontFamily: 'Times New Roman, serif',
        fontSize: 16,
    },
    StaveLine: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 10,
    },
    StaveSection: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 10,
        fontWeight: 'bold',
    },
    StaveTempo: {
        fontSize: 14,
        glyph: {
            fontSize: 25,
        },
        name: {
            fontWeight: 'bold',
        },
    },
    StaveText: {
        fontFamily: 'Times New Roman, serif',
        fontSize: 16,
    },
    StaveTie: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 10,
    },
    StringNumber: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 10,
        fontWeight: 'bold',
    },
    Strokes: {
        text: {
            fontFamily: 'Times New Roman, serif',
            fontSize: 10,
            fontStyle: 'italic',
            fontWeight: 'bold',
        },
    },
    TabNote: {
        fontSize: 9,
    },
    TabSlide: {
        fontFamily: 'Times New Roman, serif',
        fontSize: 10,
        fontStyle: 'italic',
        fontWeight: 'bold',
    },
    TabTie: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 10,
    },
    TextBracket: {
        fontFamily: 'Times New Roman, serif',
        fontSize: 15,
        fontStyle: 'italic',
    },
    TextNote: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 12,
    },
    Tremolo: {
        spacing: 7,
    },
    Volta: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 9,
        fontWeight: 'bold',
    },
};
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
    F: { acc: 'b', num: 1 },
    Dm: { acc: 'b', num: 1 },
    Bb: { acc: 'b', num: 2 },
    Gm: { acc: 'b', num: 2 },
    Eb: { acc: 'b', num: 3 },
    Cm: { acc: 'b', num: 3 },
    Ab: { acc: 'b', num: 4 },
    Fm: { acc: 'b', num: 4 },
    Db: { acc: 'b', num: 5 },
    Bbm: { acc: 'b', num: 5 },
    Gb: { acc: 'b', num: 6 },
    Ebm: { acc: 'b', num: 6 },
    Cb: { acc: 'b', num: 7 },
    Abm: { acc: 'b', num: 7 },
    G: { acc: '#', num: 1 },
    Em: { acc: '#', num: 1 },
    D: { acc: '#', num: 2 },
    Bm: { acc: '#', num: 2 },
    A: { acc: '#', num: 3 },
    'F#m': { acc: '#', num: 3 },
    E: { acc: '#', num: 4 },
    'C#m': { acc: '#', num: 4 },
    B: { acc: '#', num: 5 },
    'G#m': { acc: '#', num: 5 },
    'F#': { acc: '#', num: 6 },
    'D#m': { acc: '#', num: 6 },
    'C#': { acc: '#', num: 7 },
    'A#m': { acc: '#', num: 7 },
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
    CN: { index: 0, intVal: 0, accidental: 'n' },
    'C#': { index: 0, intVal: 1, accidental: '#' },
    'C##': { index: 0, intVal: 2, accidental: '##' },
    CB: { index: 0, intVal: 11, accidental: 'b' },
    CBB: { index: 0, intVal: 10, accidental: 'bb' },
    D: { index: 1, intVal: 2 },
    DN: { index: 1, intVal: 2, accidental: 'n' },
    'D#': { index: 1, intVal: 3, accidental: '#' },
    'D##': { index: 1, intVal: 4, accidental: '##' },
    DB: { index: 1, intVal: 1, accidental: 'b' },
    DBB: { index: 1, intVal: 0, accidental: 'bb' },
    E: { index: 2, intVal: 4 },
    EN: { index: 2, intVal: 4, accidental: 'n' },
    'E#': { index: 2, intVal: 5, accidental: '#' },
    'E##': { index: 2, intVal: 6, accidental: '##' },
    EB: { index: 2, intVal: 3, accidental: 'b' },
    EBB: { index: 2, intVal: 2, accidental: 'bb' },
    F: { index: 3, intVal: 5 },
    FN: { index: 3, intVal: 5, accidental: 'n' },
    'F#': { index: 3, intVal: 6, accidental: '#' },
    'F##': { index: 3, intVal: 7, accidental: '##' },
    FB: { index: 3, intVal: 4, accidental: 'b' },
    FBB: { index: 3, intVal: 3, accidental: 'bb' },
    G: { index: 4, intVal: 7 },
    GN: { index: 4, intVal: 7, accidental: 'n' },
    'G#': { index: 4, intVal: 8, accidental: '#' },
    'G##': { index: 4, intVal: 9, accidental: '##' },
    GB: { index: 4, intVal: 6, accidental: 'b' },
    GBB: { index: 4, intVal: 5, accidental: 'bb' },
    A: { index: 5, intVal: 9 },
    AN: { index: 5, intVal: 9, accidental: 'n' },
    'A#': { index: 5, intVal: 10, accidental: '#' },
    'A##': { index: 5, intVal: 11, accidental: '##' },
    AB: { index: 5, intVal: 8, accidental: 'b' },
    ABB: { index: 5, intVal: 7, accidental: 'bb' },
    B: { index: 6, intVal: 11 },
    BN: { index: 6, intVal: 11, accidental: 'n' },
    'B#': { index: 6, intVal: 12, accidental: '#' },
    'B##': { index: 6, intVal: 13, accidental: '##' },
    BB: { index: 6, intVal: 10, accidental: 'b' },
    BBB: { index: 6, intVal: 9, accidental: 'bb' },
    R: { index: 6, rest: true },
    X: {
        index: 6,
        accidental: '',
        octave: 4,
        code: 'noteheadXBlack',
        shiftRight: 5.5,
    },
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
const accidentalsOld = {
    '#': { code: 'accidentalSharp', parenRightPaddingAdjustment: -1 },
    '##': { code: 'accidentalDoubleSharp', parenRightPaddingAdjustment: -1 },
    b: { code: 'accidentalFlat', parenRightPaddingAdjustment: -2 },
    bb: { code: 'accidentalDoubleFlat', parenRightPaddingAdjustment: -2 },
    n: { code: 'accidentalNatural', parenRightPaddingAdjustment: -1 },
    '{': { code: 'accidentalParensLeft', parenRightPaddingAdjustment: -1 },
    '}': { code: 'accidentalParensRight', parenRightPaddingAdjustment: -1 },
    db: { code: 'accidentalThreeQuarterTonesFlatZimmermann', parenRightPaddingAdjustment: -1 },
    d: { code: 'accidentalQuarterToneFlatStein', parenRightPaddingAdjustment: 0 },
    '++': { code: 'accidentalThreeQuarterTonesSharpStein', parenRightPaddingAdjustment: -1 },
    '+': { code: 'accidentalQuarterToneSharpStein', parenRightPaddingAdjustment: -1 },
    '+-': { code: 'accidentalKucukMucennebSharp', parenRightPaddingAdjustment: -1 },
    bs: { code: 'accidentalBakiyeFlat', parenRightPaddingAdjustment: -1 },
    bss: { code: 'accidentalBuyukMucennebFlat', parenRightPaddingAdjustment: -1 },
    o: { code: 'accidentalSori', parenRightPaddingAdjustment: -1 },
    k: { code: 'accidentalKoron', parenRightPaddingAdjustment: -1 },
    bbs: { code: 'vexAccidentalMicrotonal1', parenRightPaddingAdjustment: -1 },
    '++-': { code: 'accidentalBuyukMucennebSharp', parenRightPaddingAdjustment: -1 },
    ashs: { code: 'vexAccidentalMicrotonal3', parenRightPaddingAdjustment: -1 },
    afhf: { code: 'vexAccidentalMicrotonal4', parenRightPaddingAdjustment: -1 },
    accSagittal5v7KleismaUp: { code: 'accSagittal5v7KleismaUp', parenRightPaddingAdjustment: -1 },
    accSagittal5v7KleismaDown: { code: 'accSagittal5v7KleismaDown', parenRightPaddingAdjustment: -1 },
    accSagittal5CommaUp: { code: 'accSagittal5CommaUp', parenRightPaddingAdjustment: -1 },
    accSagittal5CommaDown: { code: 'accSagittal5CommaDown', parenRightPaddingAdjustment: -1 },
    accSagittal7CommaUp: { code: 'accSagittal7CommaUp', parenRightPaddingAdjustment: -1 },
    accSagittal7CommaDown: { code: 'accSagittal7CommaDown', parenRightPaddingAdjustment: -1 },
    accSagittal25SmallDiesisUp: { code: 'accSagittal25SmallDiesisUp', parenRightPaddingAdjustment: -1 },
    accSagittal25SmallDiesisDown: { code: 'accSagittal25SmallDiesisDown', parenRightPaddingAdjustment: -1 },
    accSagittal35MediumDiesisUp: { code: 'accSagittal35MediumDiesisUp', parenRightPaddingAdjustment: -1 },
    accSagittal35MediumDiesisDown: { code: 'accSagittal35MediumDiesisDown', parenRightPaddingAdjustment: -1 },
    accSagittal11MediumDiesisUp: { code: 'accSagittal11MediumDiesisUp', parenRightPaddingAdjustment: -1 },
    accSagittal11MediumDiesisDown: { code: 'accSagittal11MediumDiesisDown', parenRightPaddingAdjustment: -1 },
    accSagittal11LargeDiesisUp: { code: 'accSagittal11LargeDiesisUp', parenRightPaddingAdjustment: -1 },
    accSagittal11LargeDiesisDown: { code: 'accSagittal11LargeDiesisDown', parenRightPaddingAdjustment: -1 },
    accSagittal35LargeDiesisUp: { code: 'accSagittal35LargeDiesisUp', parenRightPaddingAdjustment: -1 },
    accSagittal35LargeDiesisDown: { code: 'accSagittal35LargeDiesisDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp25SDown: { code: 'accSagittalSharp25SDown', parenRightPaddingAdjustment: -1 },
    accSagittalFlat25SUp: { code: 'accSagittalFlat25SUp', parenRightPaddingAdjustment: -1 },
    accSagittalSharp7CDown: { code: 'accSagittalSharp7CDown', parenRightPaddingAdjustment: -1 },
    accSagittalFlat7CUp: { code: 'accSagittalFlat7CUp', parenRightPaddingAdjustment: -1 },
    accSagittalSharp5CDown: { code: 'accSagittalSharp5CDown', parenRightPaddingAdjustment: -1 },
    accSagittalFlat5CUp: { code: 'accSagittalFlat5CUp', parenRightPaddingAdjustment: -1 },
    accSagittalSharp5v7kDown: { code: 'accSagittalSharp5v7kDown', parenRightPaddingAdjustment: -1 },
    accSagittalFlat5v7kUp: { code: 'accSagittalFlat5v7kUp', parenRightPaddingAdjustment: -1 },
    accSagittalSharp: { code: 'accSagittalSharp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat: { code: 'accSagittalFlat', parenRightPaddingAdjustment: -1 },
    accSagittalSharp5v7kUp: { code: 'accSagittalSharp5v7kUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat5v7kDown: { code: 'accSagittalFlat5v7kDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp5CUp: { code: 'accSagittalSharp5CUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat5CDown: { code: 'accSagittalFlat5CDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp7CUp: { code: 'accSagittalSharp7CUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat7CDown: { code: 'accSagittalFlat7CDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp25SUp: { code: 'accSagittalSharp25SUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat25SDown: { code: 'accSagittalFlat25SDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp35MUp: { code: 'accSagittalSharp35MUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat35MDown: { code: 'accSagittalFlat35MDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp11MUp: { code: 'accSagittalSharp11MUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat11MDown: { code: 'accSagittalFlat11MDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp11LUp: { code: 'accSagittalSharp11LUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat11LDown: { code: 'accSagittalFlat11LDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp35LUp: { code: 'accSagittalSharp35LUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat35LDown: { code: 'accSagittalFlat35LDown', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleSharp25SDown: { code: 'accSagittalDoubleSharp25SDown', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleFlat25SUp: { code: 'accSagittalDoubleFlat25SUp', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleSharp7CDown: { code: 'accSagittalDoubleSharp7CDown', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleFlat7CUp: { code: 'accSagittalDoubleFlat7CUp', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleSharp5CDown: { code: 'accSagittalDoubleSharp5CDown', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleFlat5CUp: { code: 'accSagittalDoubleFlat5CUp', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleSharp5v7kDown: { code: 'accSagittalDoubleSharp5v7kDown', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleFlat5v7kUp: { code: 'accSagittalDoubleFlat5v7kUp', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleSharp: { code: 'accSagittalDoubleSharp', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleFlat: { code: 'accSagittalDoubleFlat', parenRightPaddingAdjustment: -1 },
    accSagittal7v11KleismaUp: { code: 'accSagittal7v11KleismaUp', parenRightPaddingAdjustment: -1 },
    accSagittal7v11KleismaDown: { code: 'accSagittal7v11KleismaDown', parenRightPaddingAdjustment: -1 },
    accSagittal17CommaUp: { code: 'accSagittal17CommaUp', parenRightPaddingAdjustment: -1 },
    accSagittal17CommaDown: { code: 'accSagittal17CommaDown', parenRightPaddingAdjustment: -1 },
    accSagittal55CommaUp: { code: 'accSagittal55CommaUp', parenRightPaddingAdjustment: -1 },
    accSagittal55CommaDown: { code: 'accSagittal55CommaDown', parenRightPaddingAdjustment: -1 },
    accSagittal7v11CommaUp: { code: 'accSagittal7v11CommaUp', parenRightPaddingAdjustment: -1 },
    accSagittal7v11CommaDown: { code: 'accSagittal7v11CommaDown', parenRightPaddingAdjustment: -1 },
    accSagittal5v11SmallDiesisUp: { code: 'accSagittal5v11SmallDiesisUp', parenRightPaddingAdjustment: -1 },
    accSagittal5v11SmallDiesisDown: { code: 'accSagittal5v11SmallDiesisDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp5v11SDown: { code: 'accSagittalSharp5v11SDown', parenRightPaddingAdjustment: -1 },
    accSagittalFlat5v11SUp: { code: 'accSagittalFlat5v11SUp', parenRightPaddingAdjustment: -1 },
    accSagittalSharp7v11CDown: { code: 'accSagittalSharp7v11CDown', parenRightPaddingAdjustment: -1 },
    accSagittalFlat7v11CUp: { code: 'accSagittalFlat7v11CUp', parenRightPaddingAdjustment: -1 },
    accSagittalSharp55CDown: { code: 'accSagittalSharp55CDown', parenRightPaddingAdjustment: -1 },
    accSagittalFlat55CUp: { code: 'accSagittalFlat55CUp', parenRightPaddingAdjustment: -1 },
    accSagittalSharp17CDown: { code: 'accSagittalSharp17CDown', parenRightPaddingAdjustment: -1 },
    accSagittalFlat17CUp: { code: 'accSagittalFlat17CUp', parenRightPaddingAdjustment: -1 },
    accSagittalSharp7v11kDown: { code: 'accSagittalSharp7v11kDown', parenRightPaddingAdjustment: -1 },
    accSagittalFlat7v11kUp: { code: 'accSagittalFlat7v11kUp', parenRightPaddingAdjustment: -1 },
    accSagittalSharp7v11kUp: { code: 'accSagittalSharp7v11kUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat7v11kDown: { code: 'accSagittalFlat7v11kDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp17CUp: { code: 'accSagittalSharp17CUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat17CDown: { code: 'accSagittalFlat17CDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp55CUp: { code: 'accSagittalSharp55CUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat55CDown: { code: 'accSagittalFlat55CDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp7v11CUp: { code: 'accSagittalSharp7v11CUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat7v11CDown: { code: 'accSagittalFlat7v11CDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp5v11SUp: { code: 'accSagittalSharp5v11SUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat5v11SDown: { code: 'accSagittalFlat5v11SDown', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleSharp5v11SDown: { code: 'accSagittalDoubleSharp5v11SDown', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleFlat5v11SUp: { code: 'accSagittalDoubleFlat5v11SUp', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleSharp7v11CDown: { code: 'accSagittalDoubleSharp7v11CDown', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleFlat7v11CUp: { code: 'accSagittalDoubleFlat7v11CUp', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleSharp55CDown: { code: 'accSagittalDoubleSharp55CDown', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleFlat55CUp: { code: 'accSagittalDoubleFlat55CUp', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleSharp17CDown: { code: 'accSagittalDoubleSharp17CDown', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleFlat17CUp: { code: 'accSagittalDoubleFlat17CUp', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleSharp7v11kDown: { code: 'accSagittalDoubleSharp7v11kDown', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleFlat7v11kUp: { code: 'accSagittalDoubleFlat7v11kUp', parenRightPaddingAdjustment: -1 },
    accSagittal23CommaUp: { code: 'accSagittal23CommaUp', parenRightPaddingAdjustment: -1 },
    accSagittal23CommaDown: { code: 'accSagittal23CommaDown', parenRightPaddingAdjustment: -1 },
    accSagittal5v19CommaUp: { code: 'accSagittal5v19CommaUp', parenRightPaddingAdjustment: -1 },
    accSagittal5v19CommaDown: { code: 'accSagittal5v19CommaDown', parenRightPaddingAdjustment: -1 },
    accSagittal5v23SmallDiesisUp: { code: 'accSagittal5v23SmallDiesisUp', parenRightPaddingAdjustment: -1 },
    accSagittal5v23SmallDiesisDown: { code: 'accSagittal5v23SmallDiesisDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp5v23SDown: { code: 'accSagittalSharp5v23SDown', parenRightPaddingAdjustment: -1 },
    accSagittalFlat5v23SUp: { code: 'accSagittalFlat5v23SUp', parenRightPaddingAdjustment: -1 },
    accSagittalSharp5v19CDown: { code: 'accSagittalSharp5v19CDown', parenRightPaddingAdjustment: -1 },
    accSagittalFlat5v19CUp: { code: 'accSagittalFlat5v19CUp', parenRightPaddingAdjustment: -1 },
    accSagittalSharp23CDown: { code: 'accSagittalSharp23CDown', parenRightPaddingAdjustment: -1 },
    accSagittalFlat23CUp: { code: 'accSagittalFlat23CUp', parenRightPaddingAdjustment: -1 },
    accSagittalSharp23CUp: { code: 'accSagittalSharp23CUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat23CDown: { code: 'accSagittalFlat23CDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp5v19CUp: { code: 'accSagittalSharp5v19CUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat5v19CDown: { code: 'accSagittalFlat5v19CDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp5v23SUp: { code: 'accSagittalSharp5v23SUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat5v23SDown: { code: 'accSagittalFlat5v23SDown', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleSharp5v23SDown: { code: 'accSagittalDoubleSharp5v23SDown', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleFlat5v23SUp: { code: 'accSagittalDoubleFlat5v23SUp', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleSharp5v19CDown: { code: 'accSagittalDoubleSharp5v19CDown', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleFlat5v19CUp: { code: 'accSagittalDoubleFlat5v19CUp', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleSharp23CDown: { code: 'accSagittalDoubleSharp23CDown', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleFlat23CUp: { code: 'accSagittalDoubleFlat23CUp', parenRightPaddingAdjustment: -1 },
    accSagittal19SchismaUp: { code: 'accSagittal19SchismaUp', parenRightPaddingAdjustment: -1 },
    accSagittal19SchismaDown: { code: 'accSagittal19SchismaDown', parenRightPaddingAdjustment: -1 },
    accSagittal17KleismaUp: { code: 'accSagittal17KleismaUp', parenRightPaddingAdjustment: -1 },
    accSagittal17KleismaDown: { code: 'accSagittal17KleismaDown', parenRightPaddingAdjustment: -1 },
    accSagittal143CommaUp: { code: 'accSagittal143CommaUp', parenRightPaddingAdjustment: -1 },
    accSagittal143CommaDown: { code: 'accSagittal143CommaDown', parenRightPaddingAdjustment: -1 },
    accSagittal11v49CommaUp: { code: 'accSagittal11v49CommaUp', parenRightPaddingAdjustment: -1 },
    accSagittal11v49CommaDown: { code: 'accSagittal11v49CommaDown', parenRightPaddingAdjustment: -1 },
    accSagittal19CommaUp: { code: 'accSagittal19CommaUp', parenRightPaddingAdjustment: -1 },
    accSagittal19CommaDown: { code: 'accSagittal19CommaDown', parenRightPaddingAdjustment: -1 },
    accSagittal7v19CommaUp: { code: 'accSagittal7v19CommaUp', parenRightPaddingAdjustment: -1 },
    accSagittal7v19CommaDown: { code: 'accSagittal7v19CommaDown', parenRightPaddingAdjustment: -1 },
    accSagittal49SmallDiesisUp: { code: 'accSagittal49SmallDiesisUp', parenRightPaddingAdjustment: -1 },
    accSagittal49SmallDiesisDown: { code: 'accSagittal49SmallDiesisDown', parenRightPaddingAdjustment: -1 },
    accSagittal23SmallDiesisUp: { code: 'accSagittal23SmallDiesisUp', parenRightPaddingAdjustment: -1 },
    accSagittal23SmallDiesisDown: { code: 'accSagittal23SmallDiesisDown', parenRightPaddingAdjustment: -1 },
    accSagittal5v13MediumDiesisUp: { code: 'accSagittal5v13MediumDiesisUp', parenRightPaddingAdjustment: -1 },
    accSagittal5v13MediumDiesisDown: { code: 'accSagittal5v13MediumDiesisDown', parenRightPaddingAdjustment: -1 },
    accSagittal11v19MediumDiesisUp: { code: 'accSagittal11v19MediumDiesisUp', parenRightPaddingAdjustment: -1 },
    accSagittal11v19MediumDiesisDown: { code: 'accSagittal11v19MediumDiesisDown', parenRightPaddingAdjustment: -1 },
    accSagittal49MediumDiesisUp: { code: 'accSagittal49MediumDiesisUp', parenRightPaddingAdjustment: -1 },
    accSagittal49MediumDiesisDown: { code: 'accSagittal49MediumDiesisDown', parenRightPaddingAdjustment: -1 },
    accSagittal5v49MediumDiesisUp: { code: 'accSagittal5v49MediumDiesisUp', parenRightPaddingAdjustment: -1 },
    accSagittal5v49MediumDiesisDown: { code: 'accSagittal5v49MediumDiesisDown', parenRightPaddingAdjustment: -1 },
    accSagittal49LargeDiesisUp: { code: 'accSagittal49LargeDiesisUp', parenRightPaddingAdjustment: -1 },
    accSagittal49LargeDiesisDown: { code: 'accSagittal49LargeDiesisDown', parenRightPaddingAdjustment: -1 },
    accSagittal11v19LargeDiesisUp: { code: 'accSagittal11v19LargeDiesisUp', parenRightPaddingAdjustment: -1 },
    accSagittal11v19LargeDiesisDown: { code: 'accSagittal11v19LargeDiesisDown', parenRightPaddingAdjustment: -1 },
    accSagittal5v13LargeDiesisUp: { code: 'accSagittal5v13LargeDiesisUp', parenRightPaddingAdjustment: -1 },
    accSagittal5v13LargeDiesisDown: { code: 'accSagittal5v13LargeDiesisDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp23SDown: { code: 'accSagittalSharp23SDown', parenRightPaddingAdjustment: -1 },
    accSagittalFlat23SUp: { code: 'accSagittalFlat23SUp', parenRightPaddingAdjustment: -1 },
    accSagittalSharp49SDown: { code: 'accSagittalSharp49SDown', parenRightPaddingAdjustment: -1 },
    accSagittalFlat49SUp: { code: 'accSagittalFlat49SUp', parenRightPaddingAdjustment: -1 },
    accSagittalSharp7v19CDown: { code: 'accSagittalSharp7v19CDown', parenRightPaddingAdjustment: -1 },
    accSagittalFlat7v19CUp: { code: 'accSagittalFlat7v19CUp', parenRightPaddingAdjustment: -1 },
    accSagittalSharp19CDown: { code: 'accSagittalSharp19CDown', parenRightPaddingAdjustment: -1 },
    accSagittalFlat19CUp: { code: 'accSagittalFlat19CUp', parenRightPaddingAdjustment: -1 },
    accSagittalSharp11v49CDown: { code: 'accSagittalSharp11v49CDown', parenRightPaddingAdjustment: -1 },
    accSagittalFlat11v49CUp: { code: 'accSagittalFlat11v49CUp', parenRightPaddingAdjustment: -1 },
    accSagittalSharp143CDown: { code: 'accSagittalSharp143CDown', parenRightPaddingAdjustment: -1 },
    accSagittalFlat143CUp: { code: 'accSagittalFlat143CUp', parenRightPaddingAdjustment: -1 },
    accSagittalSharp17kDown: { code: 'accSagittalSharp17kDown', parenRightPaddingAdjustment: -1 },
    accSagittalFlat17kUp: { code: 'accSagittalFlat17kUp', parenRightPaddingAdjustment: -1 },
    accSagittalSharp19sDown: { code: 'accSagittalSharp19sDown', parenRightPaddingAdjustment: -1 },
    accSagittalFlat19sUp: { code: 'accSagittalFlat19sUp', parenRightPaddingAdjustment: -1 },
    accSagittalSharp19sUp: { code: 'accSagittalSharp19sUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat19sDown: { code: 'accSagittalFlat19sDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp17kUp: { code: 'accSagittalSharp17kUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat17kDown: { code: 'accSagittalFlat17kDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp143CUp: { code: 'accSagittalSharp143CUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat143CDown: { code: 'accSagittalFlat143CDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp11v49CUp: { code: 'accSagittalSharp11v49CUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat11v49CDown: { code: 'accSagittalFlat11v49CDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp19CUp: { code: 'accSagittalSharp19CUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat19CDown: { code: 'accSagittalFlat19CDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp7v19CUp: { code: 'accSagittalSharp7v19CUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat7v19CDown: { code: 'accSagittalFlat7v19CDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp49SUp: { code: 'accSagittalSharp49SUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat49SDown: { code: 'accSagittalFlat49SDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp23SUp: { code: 'accSagittalSharp23SUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat23SDown: { code: 'accSagittalFlat23SDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp5v13MUp: { code: 'accSagittalSharp5v13MUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat5v13MDown: { code: 'accSagittalFlat5v13MDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp11v19MUp: { code: 'accSagittalSharp11v19MUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat11v19MDown: { code: 'accSagittalFlat11v19MDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp49MUp: { code: 'accSagittalSharp49MUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat49MDown: { code: 'accSagittalFlat49MDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp5v49MUp: { code: 'accSagittalSharp5v49MUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat5v49MDown: { code: 'accSagittalFlat5v49MDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp49LUp: { code: 'accSagittalSharp49LUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat49LDown: { code: 'accSagittalFlat49LDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp11v19LUp: { code: 'accSagittalSharp11v19LUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat11v19LDown: { code: 'accSagittalFlat11v19LDown', parenRightPaddingAdjustment: -1 },
    accSagittalSharp5v13LUp: { code: 'accSagittalSharp5v13LUp', parenRightPaddingAdjustment: -1 },
    accSagittalFlat5v13LDown: { code: 'accSagittalFlat5v13LDown', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleSharp23SDown: { code: 'accSagittalDoubleSharp23SDown', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleFlat23SUp: { code: 'accSagittalDoubleFlat23SUp', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleSharp49SDown: { code: 'accSagittalDoubleSharp49SDown', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleFlat49SUp: { code: 'accSagittalDoubleFlat49SUp', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleSharp7v19CDown: { code: 'accSagittalDoubleSharp7v19CDown', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleFlat7v19CUp: { code: 'accSagittalDoubleFlat7v19CUp', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleSharp19CDown: { code: 'accSagittalDoubleSharp19CDown', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleFlat19CUp: { code: 'accSagittalDoubleFlat19CUp', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleSharp11v49CDown: { code: 'accSagittalDoubleSharp11v49CDown', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleFlat11v49CUp: { code: 'accSagittalDoubleFlat11v49CUp', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleSharp143CDown: { code: 'accSagittalDoubleSharp143CDown', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleFlat143CUp: { code: 'accSagittalDoubleFlat143CUp', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleSharp17kDown: { code: 'accSagittalDoubleSharp17kDown', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleFlat17kUp: { code: 'accSagittalDoubleFlat17kUp', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleSharp19sDown: { code: 'accSagittalDoubleSharp19sDown', parenRightPaddingAdjustment: -1 },
    accSagittalDoubleFlat19sUp: { code: 'accSagittalDoubleFlat19sUp', parenRightPaddingAdjustment: -1 },
    accSagittalShaftUp: { code: 'accSagittalShaftUp', parenRightPaddingAdjustment: -1 },
    accSagittalShaftDown: { code: 'accSagittalShaftDown', parenRightPaddingAdjustment: -1 },
    accSagittalAcute: { code: 'accSagittalAcute', parenRightPaddingAdjustment: -1 },
    accSagittalGrave: { code: 'accSagittalGrave', parenRightPaddingAdjustment: -1 },
    accSagittal1MinaUp: { code: 'accSagittal1MinaUp', parenRightPaddingAdjustment: -1 },
    accSagittal1MinaDown: { code: 'accSagittal1MinaDown', parenRightPaddingAdjustment: -1 },
    accSagittal2MinasUp: { code: 'accSagittal2MinasUp', parenRightPaddingAdjustment: -1 },
    accSagittal2MinasDown: { code: 'accSagittal2MinasDown', parenRightPaddingAdjustment: -1 },
    accSagittal1TinaUp: { code: 'accSagittal1TinaUp', parenRightPaddingAdjustment: -1 },
    accSagittal1TinaDown: { code: 'accSagittal1TinaDown', parenRightPaddingAdjustment: -1 },
    accSagittal2TinasUp: { code: 'accSagittal2TinasUp', parenRightPaddingAdjustment: -1 },
    accSagittal2TinasDown: { code: 'accSagittal2TinasDown', parenRightPaddingAdjustment: -1 },
    accSagittal3TinasUp: { code: 'accSagittal3TinasUp', parenRightPaddingAdjustment: -1 },
    accSagittal3TinasDown: { code: 'accSagittal3TinasDown', parenRightPaddingAdjustment: -1 },
    accSagittal4TinasUp: { code: 'accSagittal4TinasUp', parenRightPaddingAdjustment: -1 },
    accSagittal4TinasDown: { code: 'accSagittal4TinasDown', parenRightPaddingAdjustment: -1 },
    accSagittal5TinasUp: { code: 'accSagittal5TinasUp', parenRightPaddingAdjustment: -1 },
    accSagittal5TinasDown: { code: 'accSagittal5TinasDown', parenRightPaddingAdjustment: -1 },
    accSagittal6TinasUp: { code: 'accSagittal6TinasUp', parenRightPaddingAdjustment: -1 },
    accSagittal6TinasDown: { code: 'accSagittal6TinasDown', parenRightPaddingAdjustment: -1 },
    accSagittal7TinasUp: { code: 'accSagittal7TinasUp', parenRightPaddingAdjustment: -1 },
    accSagittal7TinasDown: { code: 'accSagittal7TinasDown', parenRightPaddingAdjustment: -1 },
    accSagittal8TinasUp: { code: 'accSagittal8TinasUp', parenRightPaddingAdjustment: -1 },
    accSagittal8TinasDown: { code: 'accSagittal8TinasDown', parenRightPaddingAdjustment: -1 },
    accSagittal9TinasUp: { code: 'accSagittal9TinasUp', parenRightPaddingAdjustment: -1 },
    accSagittal9TinasDown: { code: 'accSagittal9TinasDown', parenRightPaddingAdjustment: -1 },
    accSagittalFractionalTinaUp: { code: 'accSagittalFractionalTinaUp', parenRightPaddingAdjustment: -1 },
    accSagittalFractionalTinaDown: { code: 'accSagittalFractionalTinaDown', parenRightPaddingAdjustment: -1 },
    accidentalNarrowReversedFlat: { code: 'accidentalNarrowReversedFlat', parenRightPaddingAdjustment: -1 },
    accidentalNarrowReversedFlatAndFlat: {
        code: 'accidentalNarrowReversedFlatAndFlat',
        parenRightPaddingAdjustment: -1,
    },
    accidentalWilsonPlus: { code: 'accidentalWilsonPlus', parenRightPaddingAdjustment: -1 },
    accidentalWilsonMinus: { code: 'accidentalWilsonMinus', parenRightPaddingAdjustment: -1 },
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
    mordent: { code: 'ornamentShortTrill' },
    mordentInverted: { code: 'ornamentMordent' },
    mordent_inverted: { code: 'ornamentMordent' },
    turn: { code: 'ornamentTurn' },
    turnInverted: { code: 'ornamentTurnSlash' },
    turn_inverted: { code: 'ornamentTurnSlash' },
    tr: { code: 'ornamentTrill' },
    upprall: { code: 'ornamentPrecompSlideTrillDAnglebert' },
    downprall: { code: 'ornamentPrecompDoubleCadenceUpperPrefix' },
    prallup: { code: 'ornamentPrecompTrillSuffixDandrieu' },
    pralldown: { code: 'ornamentPrecompTrillLowerSuffix' },
    upmordent: { code: 'ornamentPrecompSlideTrillBach' },
    downmordent: { code: 'ornamentPrecompDoubleCadenceUpperPrefixTurn' },
    lineprall: { code: 'ornamentPrecompAppoggTrill' },
    prallprall: { code: 'ornamentTremblement' },
    scoop: { code: 'brassScoop' },
    doit: { code: 'brassDoitMedium' },
    fall: { code: 'brassFallLipShort' },
    doitLong: { code: 'brassLiftMedium' },
    fallLong: { code: 'brassFallRoughMedium' },
    bend: { code: 'brassBend' },
    plungerClosed: { code: 'brassMuteClosed' },
    plungerOpen: { code: 'brassMuteOpen' },
    flip: { code: 'brassFlip' },
    jazzTurn: { code: 'brassJazzTurn' },
    smear: { code: 'brassSmear' },
};
export class Tables {
    static currentMusicFont() {
        if (Tables.MUSIC_FONT_STACK.length === 0) {
            throw new RuntimeError('NoFonts', 'The font stack is empty. See: await Flow.fetchMusicFont(...); Flow.setMusicFont(...).');
        }
        else {
            return Tables.MUSIC_FONT_STACK[0];
        }
    }
    static clefProperties(clef) {
        if (!clef || !(clef in clefs))
            throw new RuntimeError('BadArgument', 'Invalid clef: ' + clef);
        return clefs[clef];
    }
    static lookupMetricFontInfo(key) {
        return {
            family: Tables.lookupMetric(`${key}.fontFamily`),
            size: Tables.lookupMetric(`${key}.fontSize`),
            weight: Tables.lookupMetric(`${key}.fontWeight`),
            style: Tables.lookupMetric(`${key}.fontStyle`),
        };
    }
    static lookupMetric(key, defaultValue) {
        var _a;
        const keyParts = key.split('.');
        const lastKeyPart = keyParts.pop();
        let curr = CommonMetrics;
        let retVal = defaultValue;
        while (curr) {
            retVal = (_a = curr[lastKeyPart]) !== null && _a !== void 0 ? _a : retVal;
            const keyPart = keyParts.shift();
            if (keyPart) {
                curr = curr[keyPart];
            }
            else {
                break;
            }
        }
        return retVal;
    }
    static keyProperties(keyOctaveGlyph, clef = 'treble', params) {
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
        const value = notesInfo[key];
        if (!value)
            throw new RuntimeError('BadArguments', 'Invalid key name: ' + key);
        if (value.octave)
            pieces[1] = value.octave.toString();
        let octave = parseInt(pieces[1], 10);
        octave += -1 * options.octaveShift;
        const baseIndex = octave * 7 - 4 * 7;
        let line = (baseIndex + value.index) / 2;
        line += Tables.clefProperties(clef).lineShift;
        let stroke = 0;
        if (line <= 0 && (line * 2) % 2 === 0)
            stroke = 1;
        if (line >= 6 && (line * 2) % 2 === 0)
            stroke = -1;
        const intValue = typeof value.intVal !== 'undefined' ? octave * 12 + value.intVal : undefined;
        const code = value.code;
        const shiftRight = value.shiftRight;
        let customNoteHeadProps = {};
        if (pieces.length > 2 && pieces[2]) {
            const glyphName = pieces[2].toUpperCase();
            customNoteHeadProps = { code: this.codeNoteHead(glyphName, duration) } || {};
        }
        return Object.assign({ key,
            octave,
            line,
            intValue, accidental: value.accidental, code,
            stroke,
            shiftRight, displaced: false }, customNoteHeadProps);
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
    static tabToGlyphProps(fret, scale = 1.0) {
        let glyph = undefined;
        let width = 0;
        let shiftY = 0;
        if (fret.toUpperCase() === 'X') {
            const glyphMetrics = new Glyph('accidentalDoubleSharp', Tables.TABLATURE_FONT_SCALE).getMetrics();
            glyph = 'accidentalDoubleSharp';
            if (glyphMetrics.width == undefined || glyphMetrics.height == undefined)
                throw new RuntimeError('InvalidMetrics', 'Width and height required');
            width = glyphMetrics.width;
            shiftY = -glyphMetrics.height / 2;
        }
        else {
            width = Tables.textWidth(fret);
        }
        return {
            text: fret,
            code: glyph,
            getWidth: () => width * scale,
            shiftY,
        };
    }
    static textWidth(text) {
        return 7 * text.toString().length;
    }
    static articulationCodes(artic) {
        return articulations[artic];
    }
    static accidentalCodesOld(acc) {
        return accidentalsOld[acc];
    }
    static accidentalCodes(acc) {
        var _a;
        return (_a = accidentals[acc]) !== null && _a !== void 0 ? _a : acc;
    }
    static ornamentCodes(acc) {
        return ornaments[acc];
    }
    static keySignature(spec) {
        const keySpec = keySignatures[spec];
        if (!keySpec) {
            throw new RuntimeError('BadKeySignature', `Bad key signature spec: '${spec}'`);
        }
        if (!keySpec.acc) {
            return [];
        }
        const accidentalList = {
            b: [2, 0.5, 2.5, 1, 3, 1.5, 3.5],
            '#': [0, 1.5, -0.5, 1, 2.5, 0.5, 2],
        };
        const notes = accidentalList[keySpec.acc];
        const accList = [];
        for (let i = 0; i < keySpec.num; ++i) {
            const line = notes[i];
            accList.push({ type: keySpec.acc, line });
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
        let code = '';
        switch (type) {
            case 'D0':
                code = 'noteheadDiamondWhole';
                break;
            case 'D1':
                code = 'noteheadDiamondHalf';
                break;
            case 'D2':
                code = 'noteheadDiamondBlack';
                break;
            case 'D3':
                code = 'noteheadDiamondBlack';
                break;
            case 'T0':
                code = 'noteheadTriangleUpWhole';
                break;
            case 'T1':
                code = 'noteheadTriangleUpHalf';
                break;
            case 'T2':
                code = 'noteheadTriangleUpBlack';
                break;
            case 'T3':
                code = 'noteheadTriangleUpBlack';
                break;
            case 'X0':
                code = 'noteheadXWhole';
                break;
            case 'X1':
                code = 'noteheadXHalf';
                break;
            case 'X2':
                code = 'noteheadXBlack';
                break;
            case 'X3':
                code = 'noteheadCircleX';
                break;
            case 'S1':
                code = 'noteheadSquareWhite';
                break;
            case 'S2':
                code = 'noteheadSquareBlack';
                break;
            case 'R1':
                code = 'vexNoteHeadRectWhite';
                break;
            case 'R2':
                code = 'vexNoteHeadRectBlack';
                break;
            case 'DO':
                code = 'noteheadTriangleUpBlack';
                break;
            case 'RE':
                code = 'noteheadMoonBlack';
                break;
            case 'MI':
                code = 'noteheadDiamondBlack';
                break;
            case 'FA':
                code = 'noteheadTriangleLeftBlack';
                break;
            case 'FAUP':
                code = 'noteheadTriangleRightBlack';
                break;
            case 'SO':
                code = 'noteheadBlack';
                break;
            case 'LA':
                code = 'noteheadSquareBlack';
                break;
            case 'TI':
                code = 'noteheadTriangleRoundDownBlack';
                break;
            case 'D':
            case 'H':
                switch (duration) {
                    case '1/2':
                        code = 'noteheadDiamondDoubleWhole';
                        break;
                    case '1':
                        code = 'noteheadDiamondWhole';
                        break;
                    case '2':
                        code = 'noteheadDiamondHalf';
                        break;
                    default:
                        code = 'noteheadDiamondBlack';
                        break;
                }
                break;
            case 'N':
            case 'G':
                switch (duration) {
                    case '1/2':
                        code = 'noteheadDoubleWhole';
                        break;
                    case '1':
                        code = 'noteheadWhole';
                        break;
                    case '2':
                        code = 'noteheadHalf';
                        break;
                    default:
                        code = 'noteheadBlack';
                        break;
                }
                break;
            case 'M':
            case 'X':
                switch (duration) {
                    case '1/2':
                        code = 'noteheadXDoubleWhole';
                        break;
                    case '1':
                        code = 'noteheadXWhole';
                        break;
                    case '2':
                        code = 'noteheadXHalf';
                        break;
                    default:
                        code = 'noteheadXBlack';
                        break;
                }
                break;
            case 'CX':
                switch (duration) {
                    case '1/2':
                        code = 'noteheadCircleXDoubleWhole';
                        break;
                    case '1':
                        code = 'noteheadCircleXWhole';
                        break;
                    case '2':
                        code = 'noteheadCircleXHalf';
                        break;
                    default:
                        code = 'noteheadCircleX';
                        break;
                }
                break;
            case 'CI':
                switch (duration) {
                    case '1/2':
                        code = 'noteheadCircledDoubleWhole';
                        break;
                    case '1':
                        code = 'noteheadCircledWhole';
                        break;
                    case '2':
                        code = 'noteheadCircledHalf';
                        break;
                    default:
                        code = 'noteheadCircledBlack';
                        break;
                }
                break;
            case 'SQ':
                switch (duration) {
                    case '1/2':
                        code = 'noteheadDoubleWholeSquare';
                        break;
                    case '1':
                        code = 'noteheadSquareWhite';
                        break;
                    case '2':
                        code = 'noteheadSquareWhite';
                        break;
                    default:
                        code = 'noteheadSquareBlack';
                        break;
                }
                break;
            case 'TU':
                switch (duration) {
                    case '1/2':
                        code = 'noteheadTriangleUpDoubleWhole';
                        break;
                    case '1':
                        code = 'noteheadTriangleUpWhole';
                        break;
                    case '2':
                        code = 'noteheadTriangleUpHalf';
                        break;
                    default:
                        code = 'noteheadTriangleUpBlack';
                        break;
                }
                break;
            case 'TD':
                switch (duration) {
                    case '1/2':
                        code = 'noteheadTriangleDownDoubleWhole';
                        break;
                    case '1':
                        code = 'noteheadTriangleDownWhole';
                        break;
                    case '2':
                        code = 'noteheadTriangleDownHalf';
                        break;
                    default:
                        code = 'noteheadTriangleDownBlack';
                        break;
                }
                break;
            case 'SF':
                switch (duration) {
                    case '1/2':
                        code = 'noteheadSlashedDoubleWhole1';
                        break;
                    case '1':
                        code = 'noteheadSlashedWhole1';
                        break;
                    case '2':
                        code = 'noteheadSlashedHalf1';
                        break;
                    default:
                        code = 'noteheadSlashedBlack1';
                }
                break;
            case 'SB':
                switch (duration) {
                    case '1/2':
                        code = 'noteheadSlashedDoubleWhole2';
                        break;
                    case '1':
                        code = 'noteheadSlashedWhole2';
                        break;
                    case '2':
                        code = 'noteheadSlashedHalf2';
                        break;
                    default:
                        code = 'noteheadSlashedBlack2';
                }
                break;
        }
        return code;
    }
    static getGlyphProps(duration, type = 'n') {
        duration = Tables.sanitizeDuration(duration);
        let code = durationCodes[duration];
        if (code === undefined) {
            code = durationCodes['4'];
        }
        let glyphTypeProperties = code[type];
        const codeNoteHead = Tables.codeNoteHead(type.toUpperCase(), duration);
        if (codeNoteHead != '')
            glyphTypeProperties = Object.assign(Object.assign({}, glyphTypeProperties), { codeHead: codeNoteHead, code: codeNoteHead });
        const codeHead = glyphTypeProperties.codeHead;
        const getWidth = (scale = Tables.NOTATION_FONT_SCALE) => Glyph.getWidth(codeHead, scale);
        return Object.assign(Object.assign(Object.assign({}, code.common), { getWidth: getWidth }), glyphTypeProperties);
    }
}
Tables.UNISON = true;
Tables.SOFTMAX_FACTOR = 10;
Tables.STEM_WIDTH = 1.5;
Tables.STEM_HEIGHT = 35;
Tables.STAVE_LINE_THICKNESS = 1;
Tables.RENDER_PRECISION_PLACES = 3;
Tables.RESOLUTION = RESOLUTION;
Tables.MUSIC_FONT_STACK = [];
Tables.NOTATION_FONT_SCALE = 39;
Tables.TABLATURE_FONT_SCALE = 39;
Tables.SLASH_NOTEHEAD_WIDTH = 15;
Tables.STAVE_LINE_DISTANCE = 10;
Tables.TEXT_HEIGHT_OFFSET_HACK = 1;
Tables.accidentalMap = accidentalsOld;
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
const durationCodes = {
    '1/2': {
        common: {
            codeHead: '',
            stem: false,
            flag: false,
            stemUpExtension: -Tables.STEM_HEIGHT,
            stemDownExtension: -Tables.STEM_HEIGHT,
            tabnoteStemUpExtension: -Tables.STEM_HEIGHT,
            tabnoteStemDownExtension: -Tables.STEM_HEIGHT,
            dotShiftY: 0,
            lineAbove: 0,
            lineBelow: 0,
        },
        r: {
            codeHead: 'restDoubleWhole',
            rest: true,
            position: 'B/5',
            dotShiftY: 0.5,
        },
        s: {
            getWidth: () => Tables.SLASH_NOTEHEAD_WIDTH,
            position: 'B/4',
        },
    },
    1: {
        common: {
            codeHead: '',
            stem: false,
            flag: false,
            stemUpExtension: -Tables.STEM_HEIGHT,
            stemDownExtension: -Tables.STEM_HEIGHT,
            tabnoteStemUpExtension: -Tables.STEM_HEIGHT,
            tabnoteStemDownExtension: -Tables.STEM_HEIGHT,
            dotShiftY: 0,
            lineAbove: 0,
            lineBelow: 0,
        },
        r: {
            codeHead: 'restWhole',
            ledgerCodeHead: 'restWholeLegerLine',
            rest: true,
            position: 'D/5',
            dotShiftY: 0.5,
        },
        s: {
            getWidth: () => Tables.SLASH_NOTEHEAD_WIDTH,
            position: 'B/4',
        },
    },
    2: {
        common: {
            codeHead: '',
            stem: true,
            flag: false,
            stemUpExtension: 0,
            stemDownExtension: 0,
            tabnoteStemUpExtension: 0,
            tabnoteStemDownExtension: 0,
            dotShiftY: 0,
            lineAbove: 0,
            lineBelow: 0,
        },
        r: {
            codeHead: 'restHalf',
            ledgerCodeHead: 'restHalfLegerLine',
            stem: false,
            rest: true,
            position: 'B/4',
            dotShiftY: -0.5,
        },
        s: {
            getWidth: () => Tables.SLASH_NOTEHEAD_WIDTH,
            position: 'B/4',
        },
    },
    4: {
        common: {
            codeHead: '',
            stem: true,
            flag: false,
            stemUpExtension: 0,
            stemDownExtension: 0,
            tabnoteStemUpExtension: 0,
            tabnoteStemDownExtension: 0,
            dotShiftY: 0,
            lineAbove: 0,
            lineBelow: 0,
        },
        r: {
            codeHead: 'restQuarter',
            stem: false,
            rest: true,
            position: 'B/4',
            dotShiftY: -0.5,
            lineAbove: 1.5,
            lineBelow: 1.5,
        },
        s: {
            getWidth: () => Tables.SLASH_NOTEHEAD_WIDTH,
            position: 'B/4',
        },
    },
    8: {
        common: {
            codeHead: '',
            stem: true,
            flag: true,
            beamCount: 1,
            stemBeamExtension: 0,
            codeFlagUpstem: 'flag8thUp',
            codeFlagDownstem: 'flag8thDown',
            stemUpExtension: 0,
            stemDownExtension: 0,
            tabnoteStemUpExtension: 0,
            tabnoteStemDownExtension: 0,
            dotShiftY: 0,
            lineAbove: 0,
            lineBelow: 0,
        },
        r: {
            codeHead: 'rest8th',
            stem: false,
            flag: false,
            rest: true,
            position: 'B/4',
            dotShiftY: -0.5,
            lineAbove: 1.0,
            lineBelow: 1.0,
        },
        s: {
            getWidth: () => Tables.SLASH_NOTEHEAD_WIDTH,
            position: 'B/4',
        },
    },
    16: {
        common: {
            codeHead: '',
            beamCount: 2,
            stemBeamExtension: 0,
            stem: true,
            flag: true,
            codeFlagUpstem: 'flag16thUp',
            codeFlagDownstem: 'flag16thDown',
            stemUpExtension: 0,
            stemDownExtension: 0,
            tabnoteStemUpExtension: 0,
            tabnoteStemDownExtension: 0,
            dotShiftY: 0,
            lineAbove: 0,
            lineBelow: 0,
        },
        r: {
            codeHead: 'rest16th',
            stem: false,
            flag: false,
            rest: true,
            position: 'B/4',
            dotShiftY: -0.5,
            lineAbove: 1.0,
            lineBelow: 2.0,
        },
        s: {
            getWidth: () => Tables.SLASH_NOTEHEAD_WIDTH,
            position: 'B/4',
        },
    },
    32: {
        common: {
            codeHead: '',
            beamCount: 3,
            stemBeamExtension: 7.5,
            stem: true,
            flag: true,
            codeFlagUpstem: 'flag32ndUp',
            codeFlagDownstem: 'flag32ndDown',
            stemUpExtension: 9,
            stemDownExtension: 9,
            tabnoteStemUpExtension: 9,
            tabnoteStemDownExtension: 9,
            dotShiftY: 0,
            lineAbove: 0,
            lineBelow: 0,
        },
        r: {
            codeHead: 'rest32nd',
            stem: false,
            flag: false,
            rest: true,
            position: 'B/4',
            dotShiftY: -1.5,
            lineAbove: 2.0,
            lineBelow: 2.0,
        },
        s: {
            getWidth: () => Tables.SLASH_NOTEHEAD_WIDTH,
            position: 'B/4',
        },
    },
    64: {
        common: {
            codeHead: '',
            beamCount: 4,
            stemBeamExtension: 15,
            stem: true,
            flag: true,
            codeFlagUpstem: 'flag64thUp',
            codeFlagDownstem: 'flag64thDown',
            stemUpExtension: 13,
            stemDownExtension: 13,
            tabnoteStemUpExtension: 13,
            tabnoteStemDownExtension: 13,
            dotShiftY: 0,
            lineAbove: 0,
            lineBelow: 0,
        },
        r: {
            codeHead: 'rest64th',
            stem: false,
            flag: false,
            rest: true,
            position: 'B/4',
            dotShiftY: -1.5,
            lineAbove: 2.0,
            lineBelow: 3.0,
        },
        s: {
            getWidth: () => Tables.SLASH_NOTEHEAD_WIDTH,
            position: 'B/4',
        },
    },
    128: {
        common: {
            codeHead: '',
            beamCount: 5,
            stemBeamExtension: 22.5,
            stem: true,
            flag: true,
            codeFlagUpstem: 'flag128thUp',
            codeFlagDownstem: 'flag128thDown',
            stemUpExtension: 22,
            stemDownExtension: 22,
            tabnoteStemUpExtension: 22,
            tabnoteStemDownExtension: 22,
            dotShiftY: 0,
            lineAbove: 0,
            lineBelow: 0,
        },
        r: {
            codeHead: 'rest128th',
            stem: false,
            flag: false,
            rest: true,
            position: 'B/4',
            dotShiftY: -2.5,
            lineAbove: 3.0,
            lineBelow: 3.0,
        },
        s: {
            getWidth: () => Tables.SLASH_NOTEHEAD_WIDTH,
            position: 'B/4',
        },
    },
};
