// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors

import { FontInfo } from './font';

export class Metrics {
  /** Use the provided key to look up a FontInfo in CommonMetrics. **/
  static getFontInfo(key: string): Required<FontInfo> {
    return {
      family: Metrics.get(`${key}.fontFamily`),
      size: Metrics.get(`${key}.fontSize`),
      weight: Metrics.get(`${key}.fontWeight`),
      style: Metrics.get(`${key}.fontStyle`),
    };
  }

  /**
   * Use the provided key to look up a value in CommonMetrics.
   *
   * @param key is a string separated by periods (e.g., `Stroke.text.fontFamily`).
   * @param defaultValue is returned if the lookup fails.
   * @returns the retrieved value (or `defaultValue` if the lookup fails).
   *
   * For the key `Stroke.text.fontFamily`, check all of the following in order:
   *   1) CommonMetrics.fontFamily
   *   2) CommonMetrics.Stroke.fontFamily
   *   3) CommonMetrics.Stroke.text.fontFamily
   * Retrieve the value from the most specific key (i.e., prefer #3 over #2 over #1 in the above example).
   */
  // eslint-disable-next-line
  static get(key: string, defaultValue?: any): any {
    const keyParts = key.split('.');
    const lastKeyPart = keyParts.pop()!; // Use ! because keyParts is not empty, since ''.split('.') still returns [''].

    // Start from root of CommonMetrics and go down as far as possible.
    let curr = MetricsDefaults;
    let retVal = defaultValue;

    while (curr) {
      // Update retVal whenever we find a value assigned to a more specific key.
      retVal = curr[lastKeyPart] ?? retVal;
      const keyPart = keyParts.shift();
      if (keyPart) {
        curr = curr[keyPart]; // Go down one level.
      } else {
        break;
      }
    }

    return retVal;
  }
}

// eslint-disable-next-line
export const MetricsDefaults: Record<string, any> = {
  fontFamily: 'Bravura',
  fontSize: 30,
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
