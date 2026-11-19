// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// Shared drawing metrics, with separate defaults for text and music glyphs.

import { ElementStyle } from './element';
import { FontInfo } from './font';
import { TextMetricsCache } from './textmetricscache';

export class Metrics {
  protected static cacheStyle = new Map<string, ElementStyle>();
  protected static cacheFont = new Map<string, Required<FontInfo>>();
  /** Use the provided key to look up a FontInfo in CommonMetrics. **/
  static clear(key?: string) {
    TextMetricsCache.clear();
    if (key) {
      // Nested roles such as Annotation.lyric inherit values from the parent category.
      for (const cache of [this.cacheFont, this.cacheStyle]) {
        for (const category of cache.keys()) {
          if (category === key || category.startsWith(key + '.')) cache.delete(category);
        }
      }
    } else {
      this.cacheFont.clear();
      this.cacheStyle.clear();
    }
  }

  static getFontInfo(key: string): Required<FontInfo> {
    let font = this.cacheFont.get(key);
    if (!font) {
      font = {
        family: Metrics.getFontFamily(key),
        size: Metrics.get(`${key}.fontSize`) * Metrics.get(`${key}.fontScale`),
        weight: Metrics.get(`${key}.fontWeight`),
        style: Metrics.get(`${key}.fontStyle`),
      };
      this.cacheFont.set(key, font);
    }
    // FontInfo contains only scalar values. Each caller still receives its own object.
    return { ...font };
  }

  /** Keep text spaces in the text font while honoring class-specific font overrides. */
  private static getFontFamily(key: string): string {
    if (!Metrics.get(`${key}.isText`, false)) return Metrics.get(`${key}.fontFamily`);
    let family = MetricsDefaults.textFontFamily;
    let metrics = MetricsDefaults;
    for (const part of key.split('.')) {
      metrics = metrics?.[part];
      if (!metrics) break;
      family = metrics.fontFamily ?? family;
    }
    return family;
  }

  static getStyle(key: string): ElementStyle {
    let style = this.cacheStyle.get(key);
    if (!style) {
      style = {
        fillStyle: Metrics.get(`${key}.fillStyle`),
        strokeStyle: Metrics.get(`${key}.strokeStyle`),
        lineWidth: Metrics.get(`${key}.lineWidth`),
        lineDash: Metrics.get(`${key}.lineDash`),
        shadowBlur: Metrics.get(`${key}.shadowBlur`),
        shadowColor: Metrics.get(`${key}.shadowColor`),
      };
      this.cacheStyle.set(key, style);
    }
    // ElementStyle contains only scalar values, including the SVG lineDash string.
    return { ...style };
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
  pointerRect: false,
  fontFamily: 'Bravura,Academico',
  textFontFamily: 'Academico,Bravura',
  fontSize: 30,
  fontScale: 1.0,
  fontWeight: 'normal',
  fontStyle: 'normal',

  Accidental: {
    cautionary: {
      fontSize: 20,
    },
    grace: {
      fontSize: 20,
    },
    noteheadAccidentalPadding: 1,
    leftPadding: 2,
    accidentalSpacing: 3,
  },

  Annotation: {
    isText: true,
    fontSize: 10,
    guitarStroke: {
      fontSize: 11,
    },
    lyric: {
      fontSize: 12,
    },
  },

  Bend: {
    isText: true,
    fontSize: 10,
    line: {
      strokeStyle: '#777777',
      lineWidth: 1,
    },
  },

  ChordSymbol: {
    isText: true,
    fontSize: 14,
    spacing: 0.05,
    subscriptOffset: 0.2,
    superscriptOffset: -0.4,
    superSubRatio: 0.6,
  },

  FretDiagram: {
    isText: true,
    fontSize: 9,
  },

  FretHandFinger: {
    isText: true,
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
      isText: true,
      fontSize: 12,
      fontStyle: 'italic',
    },
  },

  Repetition: {
    text: {
      isText: true,
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
    isText: true,
    strokeStyle: '#999999',
    fontSize: 8,
    padding: 12,
    endPaddingMax: 10,
    endPaddingMin: 5,
    unalignedNotePadding: 10,
  },

  StaveConnector: {
    text: {
      isText: true,
      fontSize: 16,
    },
  },

  StaveLine: {
    isText: true,
    fontSize: 10,
  },

  StaveNote: {
    pointerRect: true,
  },

  StaveSection: {
    isText: true,
    fontSize: 10,
    fontWeight: 'bold',
    lineWidth: 2,
    padding: 2,
    strokeStyle: 'black',
  },

  StaveTempo: {
    isText: true,
    fontSize: 14,
    glyph: {
      isText: false,
      fontSize: 25,
    },
    name: {
      fontWeight: 'bold',
    },
  },

  StaveText: {
    isText: true,
    fontSize: 16,
  },

  StaveTie: {
    isText: true,
    fontSize: 10,
  },

  Stem: {
    strokeStyle: 'black',
  },

  StringNumber: {
    isText: true,
    fontSize: 10,
    fontWeight: 'bold',
    verticalPadding: 8,
    stemPadding: 2,
    leftPadding: 5,
    rightPadding: 6,
  },

  Stroke: {
    text: {
      isText: true,
      fontSize: 11,
      fontStyle: 'italic',
      fontWeight: 'bold',
    },
  },

  TabNote: {
    text: {
      isText: true,
      fontSize: 11,
    },
  },

  TabSlide: {
    isText: true,
    fontSize: 10,
    fontStyle: 'italic',
    fontWeight: 'bold',
  },

  TabStave: {
    isText: true,
    strokeStyle: '#999999',
    fontSize: 8,
  },

  TabTie: {
    isText: true,
    fontSize: 10,
    techniqueLetter: {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: 11,
      fontWeight: 'bold',
    },
  },

  TextBracket: {
    isText: true,
    fontSize: 15,
    fontStyle: 'italic',
  },

  TextNote: {
    text: {
      isText: true,
      fontSize: 12,
    },
  },

  Tremolo: {
    spacing: 7,
  },

  Tuplet: {
    pointerRect: true,
    yOffset: 0,
    textYOffset: 2,
    bracket: {
      padding: 5,
      lineWidth: 1,
      legLength: 10,
    },
    suffix: {
      fontScale: 1 / 2,
      extraSpacing: 1,
      suffixOffsetY: -3,
    },
  },

  Volta: {
    isText: true,
    fontSize: 9,
    fontWeight: 'bold',
  },
};
