// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author Cyril Silverman
//
// ## Description
//
// This file implements key signatures. A key signature sits on a stave
// and indicates the notes with implicit accidentals.

import { Element } from './element';
import { Stave } from './stave';
import { StaveModifier, StaveModifierPosition } from './stavemodifier';
import { Tables } from './tables';
import { Category } from './typeguard';
import { defined } from './util';

export class KeySignature extends StaveModifier {
  static get CATEGORY(): string {
    return Category.KeySignature;
  }

  protected glyphs: Element[];
  protected paddingForced: boolean;
  protected formatted?: boolean;
  protected cancelKeySpec?: string;
  protected accList: { type: string; line: number }[] = [];
  protected keySpec?: string;
  protected alterKeySpec?: string[];

  // Create a new Key Signature based on a `keySpec`
  constructor(keySpec: string, cancelKeySpec?: string, alterKeySpec?: string[]) {
    super();

    this.setKeySig(keySpec, cancelKeySpec, alterKeySpec);
    this.setPosition(StaveModifierPosition.BEGIN);
    this.glyphs = [];
    this.paddingForced = false;
  }

  // Add an accidental glyph to the `KeySignature` instance which represents
  // the provided `acc`. If `nextAcc` is also provided, the appropriate
  // spacing will be included in the glyph's position
  convertToGlyph(acc: { type: string; line: number }, nextAcc: { type: string; line: number }, stave: Stave): void {
    const code = Tables.accidentalCodes(acc.type);
    const glyph = new Element(Category.KeySignature);
    glyph.setText(code);

    // Determine spacing between current accidental and the next accidental
    const extraWidth = 1;
    // Place the glyph on the stave
    glyph.setYShift(stave.getYForLine(acc.line));
    if (this.glyphs.length > 0) {
      const prevGlyph = this.glyphs[this.glyphs.length - 1];
      glyph.setXShift(prevGlyph.getXShift() + prevGlyph.getWidth() + extraWidth);
    }
    this.glyphs.push(glyph);

    // Expand size of key signature
    this.width += glyph.getWidth() + extraWidth;
  }

  // Cancel out a key signature provided in the `spec` parameter. This will
  // place appropriate natural accidentals before the key signature.
  cancelKey(spec: string): this {
    this.formatted = false;
    this.cancelKeySpec = spec;

    return this;
  }

  convertToCancelAccList(spec: string): { type: string; accList: { type: string; line: number }[] } | undefined {
    // Get the accidental list for the cancelled key signature
    const cancelAccList = Tables.keySignature(spec);

    // If the cancelled key has a different accidental type, ie: # vs b
    const differentTypes =
      this.accList.length > 0 && cancelAccList.length > 0 && cancelAccList[0].type !== this.accList[0].type;

    // Determine how many naturals needed to add
    const naturals = differentTypes ? cancelAccList.length : cancelAccList.length - this.accList.length;

    // Return if no naturals needed
    if (naturals < 1) return undefined;

    // Get the line position for each natural
    const cancelled: { type: string; line: number }[] = [];
    for (let i = 0; i < naturals; i++) {
      let index = i;
      if (!differentTypes) {
        index = cancelAccList.length - naturals + i;
      }

      const acc = cancelAccList[index];
      cancelled.push({ type: 'n', line: acc.line });
    }

    // Combine naturals with main accidental list for the key signature
    this.accList = cancelled.concat(this.accList);

    return {
      accList: cancelled,
      type: cancelAccList[0].type,
    };
  }

  addToStave(stave: Stave): this {
    this.paddingForced = true;
    stave.addModifier(this);

    return this;
  }

  // Apply the accidental staff line placement based on the `clef` and
  // the  accidental `type` for the key signature ('# or 'b').
  convertAccLines(clef: string, type?: string, accList = this.accList): void {
    let offset = 0.0; // if clef === "treble"
    let customLines; // when clef doesn't follow treble key sig shape

    switch (clef) {
      // Treble & Subbass both have offsets of 0, so are not included.
      case 'soprano':
        if (type === '#') customLines = [2.5, 0.5, 2, 0, 1.5, -0.5, 1];
        else offset = -1;
        break;
      case 'mezzo-soprano':
        if (type === 'b') customLines = [0, 2, 0.5, 2.5, 1, 3, 1.5];
        else offset = 1.5;
        break;
      case 'alto':
        offset = 0.5;
        break;
      case 'tenor':
        if (type === '#') customLines = [3, 1, 2.5, 0.5, 2, 0, 1.5];
        else offset = -0.5;
        break;
      case 'baritone-f':
      case 'baritone-c':
        if (type === 'b') customLines = [0.5, 2.5, 1, 3, 1.5, 3.5, 2];
        else offset = 2;
        break;
      case 'bass':
      case 'french':
        offset = 1;
        break;
      default:
        break;
    }

    // If there's a special case, assign those lines/spaces:
    let i;
    if (typeof customLines !== 'undefined') {
      for (i = 0; i < accList.length; ++i) {
        accList[i].line = customLines[i];
      }
    } else if (offset !== 0) {
      for (i = 0; i < accList.length; ++i) {
        accList[i].line += offset;
      }
    }
  }

  getPadding(index: number): number {
    if (!this.formatted) this.format();

    return this.glyphs.length === 0 || (!this.paddingForced && index < 2) ? 0 : this.padding;
  }

  getWidth(): number {
    if (!this.formatted) this.calculateWidth();

    return this.width;
  }

  setKeySig(keySpec: string, cancelKeySpec?: string, alterKeySpec?: string[]): this {
    this.formatted = false;
    this.keySpec = keySpec;
    this.cancelKeySpec = cancelKeySpec;
    this.alterKeySpec = alterKeySpec;

    return this;
  }

  // Alter the accidentals of a key spec one by one.
  // Each alteration is a new accidental that replaces the
  // original accidental (or the canceled one).
  alterKey(alterKeySpec: string[]): this {
    this.formatted = false;
    this.alterKeySpec = alterKeySpec;

    return this;
  }

  convertToAlterAccList(alterKeySpec: string[]): void {
    const max = Math.min(alterKeySpec.length, this.accList.length);
    for (let i = 0; i < max; ++i) {
      if (alterKeySpec[i]) {
        this.accList[i].type = alterKeySpec[i];
      }
    }
  }

  format(): void {
    const stave = this.checkStave();

    this.width = 0;
    this.glyphs = [];
    this.accList = Tables.keySignature(defined(this.keySpec));
    const accList = this.accList;
    const firstAccidentalType = accList.length > 0 ? accList[0].type : undefined;
    let cancelAccList;
    if (this.cancelKeySpec) {
      cancelAccList = this.convertToCancelAccList(this.cancelKeySpec);
    }
    if (this.alterKeySpec) {
      this.convertToAlterAccList(this.alterKeySpec);
    }

    if (this.accList.length > 0) {
      const clef =
        (this.position === StaveModifierPosition.END ? stave.getEndClef() : stave.getClef()) || stave.getClef();
      if (cancelAccList) {
        this.convertAccLines(clef, cancelAccList.type, cancelAccList.accList);
      }
      this.convertAccLines(clef, firstAccidentalType, accList);
      for (let i = 0; i < this.accList.length; ++i) {
        this.convertToGlyph(this.accList[i], this.accList[i + 1], stave);
      }
    }

    this.formatted = true;
  }

  protected calculateWidth(): void {
    this.width = 0;
    this.accList = Tables.keySignature(defined(this.keySpec));
    if (this.cancelKeySpec) {
      this.convertToCancelAccList(this.cancelKeySpec);
    }
    if (this.alterKeySpec) {
      this.convertToAlterAccList(this.alterKeySpec);
    }

    if (this.accList.length > 0) {
      for (let i = 0; i < this.accList.length; ++i) {
        const code = Tables.accidentalCodes(this.accList[i].type);
        const glyph = new Element(Category.KeySignature);
        glyph.setText(code);
        // Determine spacing between current accidental and the next accidental
        const extraWidth = 1;

        // Expand size of key signature
        this.width += glyph.getWidth() + extraWidth;
      }
    }
  }

  draw(): void {
    const stave = this.checkStave();
    const ctx = stave.checkContext();

    if (!this.formatted) this.format();
    this.setRendered();

    this.applyStyle(ctx);
    ctx.openGroup('keysignature', this.getAttribute('id'));
    for (let i = 0; i < this.glyphs.length; i++) {
      const glyph = this.glyphs[i];
      glyph.renderText(ctx, this.x, 0);
    }
    ctx.closeGroup();
    this.restoreStyle(ctx);
  }
}
