// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author: Mark Meeus 2019

// Inline key signatures participate in voice spacing without consuming metered time.
import { ClefNote } from './clefnote';
import { KeySignature, OrderedKeySign } from './keysignature';
import { ModifierContext } from './modifiercontext';
import { Note } from './note';
import { Category } from './typeguard';

export class KeySigNote extends Note {
  static override get CATEGORY(): string {
    return Category.KeySigNote;
  }

  protected keySignature: KeySignature;

  private readonly explicitClef?: string;
  private hasWrittenPitches = false;

  constructor(keySpec: string, cancelKeySpec?: string, alterKeySpec?: string[], clef?: string) {
    super({ duration: 'b' });

    this.explicitClef = clef;
    this.keySignature = new KeySignature(keySpec, cancelKeySpec, alterKeySpec).setClef(clef);

    // Note properties
    this.ignoreTicks = true;
  }

  /** Restate a custom signature at this point in the voice, after any inline clef change. */
  setOrdered(entries: readonly OrderedKeySign[]): this {
    this.keySignature.setOrdered(entries);
    this.hasWrittenPitches = entries.some((entry) => entry.pitch !== undefined);
    this.preFormatted = false;
    return this;
  }

  /** A written signature follows the latest preceding clef on this staff in its voice. */
  private precedingClef(): string | undefined {
    const notes = this.voice?.getTickables();
    if (notes) {
      for (let i = notes.indexOf(this) - 1; i >= 0; i--) {
        const prior = notes[i];
        if (prior instanceof ClefNote && (!prior.getStave() || prior.getStave() === this.getStave()))
          return prior.getClef().getType();
      }
    }
  }

  /* Overridden to ignore */
  // eslint-disable-next-line
  override addToModifierContext(mc: ModifierContext): this {
    // DO NOTHING.
    return this;
  }

  override preFormat(): this {
    this.preFormatted = true;
    if (this.hasWrittenPitches) this.keySignature.setClef(this.explicitClef ?? this.precedingClef());
    this.keySignature.setStave(this.checkStave());
    this.setWidth(this.keySignature.getWidth());
    return this;
  }

  override draw(): void {
    const ctx = this.checkStave().checkContext();
    this.setRendered();
    this.keySignature.setX(this.getAbsoluteX());
    this.keySignature.setContext(ctx);
    this.keySignature.drawWithStyle();
  }
}
