export class Metrics {
    static getFontInfo(key) {
        return {
            family: Metrics.get(`${key}.fontFamily`),
            size: Metrics.get(`${key}.fontSize`) * Metrics.get(`${key}.fontScale`),
            weight: Metrics.get(`${key}.fontWeight`),
            style: Metrics.get(`${key}.fontStyle`),
        };
    }
    static get(key, defaultValue) {
        var _a;
        const keyParts = key.split('.');
        const lastKeyPart = keyParts.pop();
        let curr = MetricsDefaults;
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
}
export const MetricsDefaults = {
    fontFamily: 'Bravura,Academico',
    fontSize: 30,
    fontScale: 1.0,
    fontWeight: 'normal',
    fontStyle: 'normal',
    Accidental: {
        cautionary: {
            fontSize: 20,
        },
        grace: {
            fontSize: 25,
        },
        noteheadAccidentalPadding: 1,
        leftPadding: 2,
        accidentalSpacing: 3,
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
    GraceNote: {
        fontScale: 2 / 3,
    },
    GraceTabNote: {
        fontScale: 2 / 3,
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
        text: {
            fontSize: 12,
            fontWeight: 'bold',
            offsetX: 12,
            offsetY: 25,
            spacing: 5,
        },
        coda: {
            offsetY: 25,
        },
        segno: {
            offsetY: 10,
        },
    },
    Stave: {
        fontSize: 8,
        padding: 12,
        endPaddingMax: 10,
        endPaddingMin: 5,
        unalignedNotePadding: 10,
    },
    StaveConnector: {
        text: {
            fontSize: 16,
        },
    },
    StaveLine: {
        fontSize: 10,
    },
    StaveSection: {
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
        fontSize: 16,
    },
    StaveTie: {
        fontSize: 10,
    },
    StringNumber: {
        fontSize: 10,
        fontWeight: 'bold',
        verticalPadding: 8,
        stemPadding: 2,
        leftPadding: 5,
        rightPadding: 6,
    },
    Stroke: {
        text: {
            fontSize: 10,
            fontStyle: 'italic',
            fontWeight: 'bold',
        },
    },
    TabNote: {
        text: {
            fontSize: 9,
        },
    },
    TabSlide: {
        fontSize: 10,
        fontStyle: 'italic',
        fontWeight: 'bold',
    },
    TabTie: {
        fontSize: 10,
    },
    TextBracket: {
        fontSize: 15,
        fontStyle: 'italic',
    },
    TextNote: {
        text: {
            fontSize: 12,
        },
    },
    Tremolo: {
        spacing: 7,
    },
    Volta: {
        fontSize: 9,
        fontWeight: 'bold',
    },
};
