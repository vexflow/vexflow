// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author: Mark Meeus 2019

import { KeySignature, KeySpec } from './keysignature';
import { ModifierContext } from './modifiercontext';
import { Note } from './note';
import { Category } from './typeguard';

export class KeySigNote extends Note {
  static get CATEGORY(): string {
    return Category.KeySigNote;
  }

  protected keySignature: KeySignature;

  constructor(keySpec: KeySpec, cancelKeySpec?: string, alterKeySpec?: string[]) {
    super({ duration: 'b' });

    this.keySignature = new KeySignature(keySpec, cancelKeySpec, alterKeySpec);

    // Note properties
    this.ignoreTicks = true;
  }

  /* Overridden to ignore */
  // eslint-disable-next-line
  addToModifierContext(mc: ModifierContext): this {
    // DO NOTHING.
    return this;
  }

  preFormat(): this {
    this.preFormatted = true;
    this.keySignature.setStave(this.checkStave());
    this.setWidth(this.keySignature.getWidth());
    return this;
  }

  draw(): void {
    const ctx = this.checkStave().checkContext();
    this.setRendered();
    this.keySignature.setX(this.getAbsoluteX());
    this.keySignature.setContext(ctx);
    this.keySignature.draw();
  }
}
