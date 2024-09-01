// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author Cyril Silverman
//
// ## Description
//
// This file implements key signatures. A key signature sits on a stave
// and indicates the notes with implicit accidentals.

import { BoundingBox } from './boundingbox';
import { Element } from './element';
import { Glyphs } from './glyphs';
import { Stave } from './stave';
import { StaveModifier, StaveModifierPosition } from './stavemodifier';
import { Tables } from './tables';
import { Category } from './typeguard';
import { defined } from './util';

export class KeySignature extends StaveModifier {
  static get CATEGORY(): string {
    return Category.KeySignature;
  }

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
    this.children = [];
    this.paddingForced = false;
  }

  // Add an accidental glyph to the `KeySignature` instance which represents
  // the provided `acc`. If `nextAcc` is also provided, the appropriate
  // spacing will be included in the glyph's position
  protected convertToGlyph(
    acc: { type: string; line: number },
    nextAcc: { type: string; line: number },
    stave: Stave
  ): void {
    const code = Tables.accidentalCodes(acc.type);
    const glyph = new Element(Category.KeySignature);
    glyph.setText(code);

    // Determine spacing between current accidental and the next accidental
    let extraWidth = 1;
    // Place the glyph on the stave
    glyph.setYShift(stave.getYForLine(acc.line));
    if (this.children.length > 0) {
      const prevGlyph = this.children[this.children.length - 1];
      if (
        (prevGlyph.getText() === Glyphs.accidentalNatural || glyph.getText() === Glyphs.accidentalNatural) &&
        Math.abs(glyph.getYShift() - prevGlyph.getYShift()) < 10
      ) {
        extraWidth = 2;
      }
      glyph.setXShift(prevGlyph.getXShift() + prevGlyph.getWidth() + extraWidth);
    }
    this.children.push(glyph);

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

  // Convert the `cancelKeySpec` into a list of naturals to be displayed
  protected convertToCancelAccList(
    spec: string
  ): { type: string; accList: { type: string; line: number }[] } | undefined {
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

  // Add this key signature to the start of a stave.
  addToStave(stave: Stave): this {
    this.paddingForced = true;
    stave.addModifier(this);

    return this;
  }

  // Get the `BoundingBox`
  getBoundingBox(): BoundingBox {
    if (!this.formatted) this.format();

    return super.getBoundingBox();
  }

  // Calculate the width and height for the entire signature
  protected calculateDimensions(): void {
    let boundingBox: BoundingBox;
    if (this.children.length > 0) {
      boundingBox = this.children[0].getBoundingBox();
    } else {
      boundingBox = new BoundingBox(this.x + this.xShift, this.y + this.yShift, 0, 0);
    }
    this.children.forEach((glyph) => {
      boundingBox.mergeWith(glyph.getBoundingBox());
    });
    this.width = boundingBox.getW();
    this.height = boundingBox.getH();
    this.y = boundingBox.getY();
  }

  // Apply the accidental staff line placement based on the `clef` and
  // the  accidental `type` for the key signature ('# or 'b').
  protected convertAccLines(clef: string, type?: string, accList = this.accList): void {
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

  // Get the padding required for this modifier
  getPadding(index: number): number {
    if (!this.formatted) this.format();

    return this.children.length === 0 || (!this.paddingForced && index < 2) ? 0 : this.padding;
  }

  // Get the width of the modifier
  getWidth(): number {
    if (!this.formatted) this.format();

    return this.width;
  }

  // Set the key signature to a specific key, ie: 'C' or 'Gm'
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

  // Convert the `alterKeySpec` into a list of accidentals to be displayed
  protected convertToAlterAccList(alterKeySpec: string[]): void {
    const max = Math.min(alterKeySpec.length, this.accList.length);
    for (let i = 0; i < max; ++i) {
      if (alterKeySpec[i]) {
        this.accList[i].type = alterKeySpec[i];
      }
    }
  }

  // Format and position the modifier
  format(): void {
    const stave = this.checkStave();

    this.width = 0;
    this.children = [];
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

    this.calculateDimensions();
    this.formatted = true;
  }

  // Render the key signature
  draw(): void {
    const stave = this.checkStave();
    const ctx = stave.checkContext();

    if (!this.formatted) this.format();
    this.setRendered();

    ctx.save();
    this.applyStyle(ctx);
    ctx.openGroup('keysignature', this.getAttribute('id'));
    for (let i = 0; i < this.children.length; i++) {
      const glyph = this.children[i];
      glyph.renderText(ctx, this.x, 0);
    }
    ctx.closeGroup();
    ctx.restore();
  }
}
