export const CommonMetrics = {
  smufl: true,

  // These are for numeric digits, such as in time signatures
  digits: {
    // used by TimeSignature objects
    shiftLine: -1,

    // used by tuplets
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

  // Values under here are used by the Glyph class to reposition and rescale
  // glyphs based on their category. This should be the first stop for
  // custom font glyph repositioning.
  //
  // The glyph loader first looks up a specific set of settings based on the
  // glyph code, and if not found, uses the defaults from the category. See
  // glyphs.textNote for an example of this.
  //
  // Details in Glyph.lookupFontMetrics.
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
    chordSymbol: {
      scale: 0.8,
    },
  },
};
