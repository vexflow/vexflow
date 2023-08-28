export const CommonMetrics = {
    smufl: true,
    stave: {
        padding: 12,
        endPaddingMax: 10,
        endPaddingMin: 5,
        unalignedNotePadding: 10,
    },
    accidental: {
        noteheadAccidentalPadding: 1,
        leftPadding: 2,
        accidentalSpacing: 3,
    },
    ornament: {
        brassScoop: {
            xOffset: -12,
            yOffset: 0,
            stemUpYOffset: 0,
            reportedWidth: 20,
        },
        brassDoitMedium: {
            xOffset: 16,
            yOffset: 0,
            stemUpYOffset: 0,
            reportedWidth: 22,
        },
        brassFallLipShort: {
            xOffset: 16,
            yOffset: 0,
            stemUpYOffset: 0,
            reportedWidth: 15,
        },
        brassLiftMedium: {
            xOffset: 16,
            yOffset: 5,
            stemUpYOffset: 0,
            reportedWidth: 5,
        },
        brassFallRoughMedium: {
            xOffset: 16,
            yOffset: 28,
            stemUpYOffset: 0,
            reportedWidth: 5,
        },
        brassBend: {
            xOffset: 2,
            yOffset: -8,
            stemUpYOffset: 25,
            reportedWidth: 5,
        },
        brassMuteClosed: {
            xOffset: 3,
            yOffset: -8,
            stemUpYOffset: 25,
            reportedWidth: 5,
        },
        brassMuteOpen: {
            xOffset: 3,
            yOffset: -7,
            stemUpYOffset: 25,
            reportedWidth: 5,
        },
        brassFlip: {
            xOffset: 10,
            yOffset: 0,
            stemUpYOffset: 7,
            reportedWidth: 10,
        },
        brassJazzTurn: {
            xOffset: 0,
            yOffset: 0,
            stemUpYOffset: 8,
            reportedWidth: 31,
        },
        brassSmear: {
            xOffset: 10,
            yOffset: 0,
            stemUpYOffset: 8,
            reportedWidth: 5,
        },
    },
    parenthesis: {
        default: {
            width: 7,
        },
        gracenote: {
            width: 3,
        },
    },
    digits: {
        shiftLine: -1,
        shiftY: -6,
    },
    articulation: {
        articStaccatissimoAbove: {
            padding: 2,
        },
        articStaccatissimoBelow: {
            padding: 2,
        },
    },
    staveRepetition: {
        symbolText: {
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
    noteHead: {
        minPadding: 2,
    },
    stem: {
        heightAdjustmentForFlag: -3,
        noteHead: {
            noteheadTriangleUpHalf: {
                offsetYBaseStemUp: 5,
                offsetYBaseStemDown: 4,
            },
            noteheadTriangleUpBlack: {
                offsetYBaseStemUp: 5,
                offsetYBaseStemDown: 4,
            },
            noteheadTriangleUpWhole: {
                offsetYBaseStemUp: 5,
                offsetYBaseStemDown: 4,
            },
            noteheadXHalf: {
                offsetYBaseStemUp: -4,
                offsetYBaseStemDown: 4,
            },
            noteheadXBlack: {
                offsetYBaseStemUp: -4,
                offsetYBaseStemDown: 4,
            },
            noteheadXWhole: {
                offsetYBaseStemUp: -4,
                offsetYBaseStemDown: 4,
            },
            noteheadHalf: {
                offsetYBaseStemUp: -2.55,
                offsetYBaseStemDown: 2.65,
            },
            noteheadBlack: {
                offsetYBaseStemUp: -2,
                offsetYBaseStemDown: 2,
            },
            noteheadSquareWhite: {
                offsetYBaseStemDown: -5,
                offsetYBaseStemUp: 5,
            },
        },
    },
    stringNumber: {
        verticalPadding: 8,
        stemPadding: 2,
        leftPadding: 5,
        rightPadding: 6,
    },
    tuplet: {
        noteHeadOffset: 20,
        stemOffset: 10,
        bottomLine: 4,
        topModifierOffset: 15,
    },
    glyphs: {
        coda: {
            shiftX: -7,
            shiftY: 8,
        },
        segno: {
            shiftX: -7,
        },
        flag: {
            shiftX: -0.75,
            staveTempo: {
                shiftX: -1,
            },
        },
        strokeStraight: {
            arrowheadBlackDown: {
                shiftX: -4.5,
            },
            arrowheadBlackUp: {
                shiftX: -0.85,
            },
        },
        strokeWiggly: {
            arrowheadBlackDown: {
                shiftX: -1,
                shiftY: 1,
            },
            arrowheadBlackUp: {
                shiftX: -1,
                shiftY: 1,
            },
        },
        textNote: {
            breathMarkTick: {
                shiftY: 9,
            },
            breathMarkComma: {},
            segno: {
                shiftX: -7,
                shiftY: 8,
            },
            coda: {
                shiftX: -7,
                shiftY: 8,
            },
            ornamentTrill: {
                shiftX: -8,
                shiftY: 8,
            },
            ornamentTurn: {},
            ornamentTurnSlash: {},
            ornamentMordent: {
                shiftX: -8,
            },
            ornamentShortTrill: {
                shiftX: -8,
            },
        },
        noteHead: {},
        chordSymbol: {
            scale: 0.8,
        },
    },
};
