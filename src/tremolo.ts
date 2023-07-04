// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author Mike Corrigan <corrigan@gmail.com>
// MIT License

import { Glyph } from './glyph';
import { GraceNote } from './gracenote';
import { Modifier } from './modifier';
import { Note } from './note';
import { Stem } from './stem';
import { Tables } from './tables';
import { Category, isGraceNote } from './typeguard';

/** Tremolo implements tremolo notation. */
export class Tremolo extends Modifier {
  static get CATEGORY(): string {
    return Category.Tremolo;
  }

  protected readonly code: string;
  protected readonly num: number;
  /** Extra spacing required for big strokes. */
  public ySpacingScale: number;
  /** Font scaling for big strokes. */
  public extraStrokeScale: number;

  /**
   * @param num number of bars
   */
  constructor(num: number) {
    super();

    this.num = num;
    this.position = Modifier.Position.CENTER;
    this.code = 'tremolo1';
    // big strokes scales initialised to 1 (no scale)
    this.ySpacingScale = 1;
    this.extraStrokeScale = 1;
  }

  /** Draw the tremolo on the rendering context. */
  draw(): void {
    const ctx = this.checkContext();
    const note = this.checkAttachedNote();
    this.setRendered();

    const stemDirection = note.getStemDirection();

    const start = note.getModifierStartXY(this.position, this.index);
    let x = start.x;

    const gn = isGraceNote(note);
    const scale = gn ? GraceNote.SCALE : 1;
    const category = `tremolo.${gn ? 'grace' : 'default'}`;

    const musicFont = Tables.currentMusicFont();
    let ySpacing = musicFont.lookupMetric(`${category}.spacing`) * stemDirection;
    // add ySpacingScale for big strokes (#1258)
    ySpacing *= this.ySpacingScale;
    const height = this.num * ySpacing;
    let y = note.getStemExtents().baseY - height;

    if (stemDirection < 0) {
      y += musicFont.lookupMetric(`${category}.offsetYStemDown`) * scale;
    } else {
      y += musicFont.lookupMetric(`${category}.offsetYStemUp`) * scale;
    }

    const fontScale = musicFont.lookupMetric(`${category}.point`) ?? Note.getPoint(gn ? 'grace' : 'default');

    x += musicFont.lookupMetric(`${category}.offsetXStem${stemDirection === Stem.UP ? 'Up' : 'Down'}`);
    for (let i = 0; i < this.num; ++i) {
      Glyph.renderGlyph(ctx, x, y, fontScale, this.code, { category, scale: this.extraStrokeScale });
      y += ySpacing;
    }
  }
}
