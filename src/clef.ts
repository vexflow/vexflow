// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
// Co-author: Benjamin W. Bohl
// Select, position, and measure native clef glyphs against their attached stave.

import { BoundingBox } from './boundingbox';
import { Glyphs } from './glyphs';
import { Metrics } from './metrics';
import { Stave } from './stave';
import { StaveModifier, StaveModifierPosition } from './stavemodifier';
import { Category } from './typeguard';
import { log } from './util';

/** Octave annotations share the G- or F-clef anchor, including clefs on nonstandard lines. */
const octaveGlyphs = new Map<string, Map<string, string>>([
  [
    Glyphs.gClef,
    new Map([
      ['8va', Glyphs.gClef8va],
      ['8vb', Glyphs.gClef8vb],
      ['15ma', Glyphs.gClef15ma],
      ['15mb', Glyphs.gClef15mb],
    ]),
  ],
  [
    Glyphs.fClef,
    new Map([
      ['8va', Glyphs.fClef8va],
      ['8vb', Glyphs.fClef8vb],
      ['15ma', Glyphs.fClef15ma],
      ['15mb', Glyphs.fClef15mb],
    ]),
  ],
]);

/** These composite glyphs can have annotation ink outside their advance. */
const doubleOctaveGlyphs = new Set<string>([Glyphs.gClef15ma, Glyphs.gClef15mb, Glyphs.fClef15ma, Glyphs.fClef15mb]);

// eslint-disable-next-line
function L(...args: any[]) {
  if (Clef.DEBUG) log('VexFlow.Clef', args);
}

/**
 * Clef implements various types of clefs that can be rendered on a stave.
 *
 * See `tests/clef_tests.ts` for usage examples.
 */
export class Clef extends StaveModifier {
  /** To enable logging for this class, set `VexFlow.Clef.DEBUG` to `true`. */
  static DEBUG: boolean = false;

  static override get CATEGORY(): string {
    return Category.Clef;
  }

  /**
   * The attribute `clef` must be a key from
   * `Clef.types`
   */
  code = Clef.types['treble'].code;
  line = Clef.types['treble'].line;

  protected size = 'default';
  protected type = 'treble';

  /**
   * Every clef name is associated with a glyph code from the font file
   * and a default stave line number.
   */
  static get types(): Record<string, { code: string; line: number }> {
    const { gClef, fClef, cClef, unpitchedPercussionClef1, sixStringTabClef } = Glyphs;

    return {
      'chant-c': { code: Glyphs.chantCclef, line: 1 },
      'chant-f': { code: Glyphs.chantFclef, line: 2 },
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

  /** Create a new clef. */
  constructor(type: string, size?: string, annotation?: string) {
    super();

    this.setPosition(StaveModifierPosition.BEGIN);
    this.setType(type, size, annotation);
    L('Creating clef:', type);
  }

  /** Return the named clef so staff attachments can retain musical state. */
  getType(): string {
    return this.type;
  }

  /** Set clef type, size and annotation. */
  setType(type: string, size: string = 'default', annotation?: string): this {
    this.type = type;
    this.code = Clef.types[type].code;
    this.line = Clef.types[type].line;
    this.size = size ?? 'default';

    // Octave clefs use complete SMuFL glyphs at the ordinary written-pitch anchor.
    if (annotation) {
      this.code = octaveGlyphs.get(this.code)?.get(annotation) ?? this.code;
    }
    this.text = this.code;
    this.fontInfo.size = Math.floor(Clef.getPoint(this.size));

    if (this.stave && type === 'tab') this.setStave(this.stave);
    return this;
  }

  /** Get point for clefs. */
  static getPoint(size?: string): number {
    // for sizes other than 'default', clef is 2/3 of the default value
    return size === 'default' ? Metrics.get('fontSize') : (Metrics.get('fontSize') * 2) / 3;
  }

  /** Set associated stave. */
  override setStave(stave: Stave): this {
    super.setStave(stave);
    if (this.type !== 'tab') return this;

    const strings = stave.getNumLines();
    this.text = this.code = strings === 4 ? Glyphs.fourStringTabClef : Glyphs.sixStringTabClef;
    const spaces = Math.max(0, strings - 1);
    this.line = spaces / 2;
    this.setFontSize(Math.floor(Clef.getPoint(this.size)));
    // A single string has a center but no vertical span to fit.
    if (spaces === 0) return this;

    // Measure the selected music face before fitting its ink between the outer strings.
    const reference = Clef.getPoint('default');
    this.fontInfo.size = reference;
    const { actualBoundingBoxAscent, actualBoundingBoxDescent } = this.measureText();
    const inkHeight = actualBoundingBoxAscent + actualBoundingBoxDescent;
    if (inkHeight > 0) {
      const lineWidth = stave.getStyle().lineWidth ?? 1;
      const span = stave.space(spaces);
      // Keep a stroke width plus 1/24 of the full span clear at each end.
      const clearance = lineWidth + span / 24;
      const height = Math.max(1, span - lineWidth - 2 * clearance);
      const targetHeight = (height * Clef.getPoint(this.size)) / reference;
      const points = (reference * targetHeight) / inkHeight;
      this.setFontSize(points);
      // Font hinting can round ink outwards at the fitted size. Allow one pixel for that rounding.
      const fitted = this.getTextMetrics();
      const fittedHeight = fitted.actualBoundingBoxAscent + fitted.actualBoundingBoxDescent;
      if (fittedHeight > targetHeight + 0.5) {
        this.setFontSize((points * Math.max(1, targetHeight - 1)) / fittedHeight);
      }
    }
    return this;
  }

  /** Baseline shared by drawing and hit testing. TAB fonts can have asymmetric ink. */
  getGlyphY(): number {
    const stave = this.checkStave();
    if (this.type !== 'tab') return stave.getYForLine(this.line);
    const { actualBoundingBoxAscent, actualBoundingBoxDescent } = this.textMetrics;
    return stave.getYForDrawnLine(this.line) + (actualBoundingBoxAscent - actualBoundingBoxDescent) / 2;
  }

  /** Positioned glyph ink, including an octave annotation if present. */
  getInkBounds(): BoundingBox {
    return this.getTextInk(this.getX(), this.getGlyphY());
  }

  /** The “15” can extend beyond the advance width in some fonts. Include its actual ink in hit testing. */
  override getBoundingBox(): BoundingBox {
    if (this.stave && doubleOctaveGlyphs.has(this.code)) {
      return this.getInkBounds();
    }
    return super.getBoundingBox();
  }

  /** Render clef. */
  override draw(): void {
    const stave = this.checkStave();
    const ctx = stave.checkContext();
    this.setRendered();

    const clsAttribute = this.getAttribute('class');
    ctx.openGroup('clef' + (clsAttribute ? ' ' + clsAttribute : ''), this.getAttribute('id'));

    this.y = this.getGlyphY();
    this.renderText(ctx, 0, 0);
    this.drawPointerRect();
    ctx.closeGroup();
  }
}
