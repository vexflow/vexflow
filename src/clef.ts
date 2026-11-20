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

    // If an annotation, such as 8va, is specified, add it to the Clef object.
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

    if (stave.getNumLines() === 4) {
      this.text = this.code = Glyphs.fourStringTabClef;
      this.line = 1.5;
      // Music fonts have different TAB outlines. Measure the selected face at the
      // normal point size, leaving clearance for each of the three string spaces.
      const reference = Clef.getPoint('default');
      this.fontInfo.size = reference;
      const { actualBoundingBoxAscent, actualBoundingBoxDescent } = this.measureText();
      const inkHeight = actualBoundingBoxAscent + actualBoundingBoxDescent;
      if (inkHeight > 0) {
        const height = Math.max(1, stave.space(3) - 3 * (stave.getStyle().lineWidth ?? 1));
        this.setFontSize((Clef.getPoint(this.size) * height) / inkHeight);
      }
    } else if (this.code === Glyphs.fourStringTabClef) {
      // A modifier can be moved to another stave or survive a line-count change.
      this.text = this.code = Clef.types.tab.code;
      this.line = Clef.types.tab.line;
      this.setFontSize(Math.floor(Clef.getPoint(this.size)));
    }
    return this;
  }

  /** Baseline shared by drawing and hit testing. TAB fonts can have asymmetric ink. */
  getGlyphY(): number {
    const stave = this.checkStave();
    if (this.code !== Glyphs.fourStringTabClef) return stave.getYForLine(this.line);
    const { actualBoundingBoxAscent, actualBoundingBoxDescent } = this.textMetrics;
    return stave.getYForDrawnLine(this.line) + (actualBoundingBoxAscent - actualBoundingBoxDescent) / 2;
  }

  /** Positioned glyph ink, including an octave annotation if present. */
  getInkBounds(): BoundingBox {
    return this.getTextInk(this.getX(), this.getGlyphY());
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
