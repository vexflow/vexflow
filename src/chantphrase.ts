// Engrave square-notation chant with one indivisible neume per sung syllable.
import { ChantClef, ChantLine, ChantStave } from './chantstave';
import { Element } from './element';
import { Glyphs } from './glyphs';
import { RenderContext } from './rendercontext';

/** Natural pitches are written in singing order, e.g. ['c/4', 'd/4']. */
export interface ChantSyllable {
  pitches: readonly string[];
  syllable: string;
}

/** Each new system repeats the selected movable clef. Dimensions are renderer pixels. */
export interface ChantPhraseOptions {
  x: number;
  y: number;
  width: number;
  clef: ChantClef;
  line: ChantLine;
}

/** A rendered neume and its lyric share this horizontal center on the returned stave. */
export interface ChantGroupPlacement extends ChantSyllable {
  kind: 'punctum' | 'podatus' | 'clivis';
  x: number;
  ys: number[];
}

/** An oversized syllable gets a system wide enough to fit its complete neume and text. */
export interface ChantPhraseRow {
  stave: ChantStave;
  groups: ChantGroupPlacement[];
  lyricY: number;
}

/** Draw one SMuFL component with the middle of its ink at the given pitch. */
function component(ctx: RenderContext, glyph: Element, left: number, y: number): void {
  const ink = glyph.getTextInk(0, 0);
  glyph.renderText(ctx, left - ink.x, y - ink.y - ink.h / 2);
}

/** Use one set of music glyphs and staff-relative stroke widths throughout the phrase. */
function chantSigns(space: number) {
  const sign = (text: string) => new Element().setText(text).setFontSize(`${4 * space}px`);
  const punctum = sign(Glyphs.chantPunctum);
  const lower = sign(Glyphs.chantPodatusLower);
  const upper = sign(Glyphs.chantPodatusUpper);
  const squareWidth = punctum.getTextInk(0, 0).w;
  const risingWidth = Math.max(lower.getTextInk(0, 0).w, upper.getTextInk(0, 0).w);
  return {
    width(kind: ChantGroupPlacement['kind']): number {
      if (kind === 'podatus') return risingWidth;
      return kind === 'clivis' ? 2 * squareWidth : squareWidth;
    },
    draw(ctx: RenderContext, { kind, x: center, ys }: ChantGroupPlacement): void {
      if (kind === 'punctum') component(ctx, punctum, center - squareWidth / 2, ys[0]);
      else if (kind === 'podatus') {
        const right = center + risingWidth / 2;
        ctx.fillRect(right - space * 0.12, ys[1], space * 0.12, ys[0] - ys[1]);
        component(ctx, lower, right - lower.getTextInk(0, 0).w, ys[0]);
        component(ctx, upper, right - upper.getTextInk(0, 0).w, ys[1]);
      } else {
        const left = center - squareWidth;
        ctx.fillRect(left, ys[0], space * 0.12, space * 1.25);
        ctx.fillRect(center - space * 0.06, ys[0], space * 0.12, ys[1] - ys[0]);
        component(ctx, punctum, left, ys[0]);
        component(ctx, punctum, center, ys[1]);
      }
    },
  };
}

/** A phrase can be drawn repeatedly at different widths from the same syllables. */
export class ChantPhrase {
  private readonly syllables: ChantSyllable[];

  constructor(syllables: readonly ChantSyllable[]) {
    this.syllables = syllables.map(({ pitches, syllable }) => {
      if (pitches.length < 1 || pitches.length > 2 || !syllable.trim())
        throw new RangeError('A chant syllable needs text and one or two pitches.');
      return { pitches: pitches.slice(), syllable };
    });
  }

  /** Measure whole syllables before choosing breaks. Return the exact printed pitch positions. */
  draw(ctx: RenderContext, options: ChantPhraseOptions): ChantPhraseRow[] {
    const { x, y, width, clef, line } = options;
    if (![x, y, width].every(Number.isFinite) || width <= 0) throw new RangeError('Expected finite chant dimensions.');
    if (!this.syllables.length) return [];
    const makeStave = (top: number) => new ChantStave(x, top, width, { clef, line }).setContext(ctx);
    let stave = makeStave(y);
    const space = stave.getSpacingBetweenLines();
    const signs = chantSigns(space);
    const gap = 2 * space;
    const rightMargin = space;
    const rows: ChantPhraseRow[] = [];
    let cursor = stave.getNoteStartX() + space;
    let row: ChantPhraseRow = { stave, groups: [], lyricY: stave.getYForLine(3) + 2.5 * space };
    const labels: Element[] = [];

    // Spread complete groups over the available space only after choosing the break.
    const finishRow = () => {
      const spare = Math.max(0, x + width - (cursor - gap) - rightMargin);
      if (row.groups.length > 1) {
        row.groups.forEach((g, i) => (g.x += (i * spare) / (row.groups.length - 1)));
      }
      rows.push(row);
    };

    // Validate every pitch against the same clef before emitting any ink.
    const measured = this.syllables.map(({ pitches, syllable }) => {
      const lines = pitches.map((p) => stave.getLineForPitch(p));
      if (lines.length === 2 && lines[0] === lines[1]) throw new RangeError('A two-note neume must rise or fall.');
      const kind = lines.length === 1 ? 'punctum' : lines[1] < lines[0] ? 'podatus' : 'clivis';
      const musicWidth = signs.width(kind);
      const label = new Element('Annotation.lyric').setText(syllable);
      return { pitches, syllable, kind, lines, label, width: Math.max(musicWidth, label.getTextInk(0, 0).w) } as const;
    });

    for (const group of measured) {
      if (row.groups.length && cursor + group.width + rightMargin > x + width) {
        finishRow();
        stave = makeStave(stave.getY() + row.lyricY - stave.getTopLineTopY() + 3 * space);
        row = { stave, groups: [], lyricY: stave.getYForLine(3) + 2.5 * space };
        cursor = stave.getNoteStartX() + space;
      }
      const ys = group.lines.map((pitchLine) => stave.getYForLine(pitchLine));
      row.groups.push({
        pitches: group.pitches.slice(),
        syllable: group.syllable,
        kind: group.kind,
        ys,
        x: cursor + group.width / 2,
      });
      // Leave room below the lowest component anywhere on the current system.
      row.lyricY = Math.max(row.lyricY, Math.max(...ys) + 2.5 * space);
      labels.push(group.label);
      cursor += group.width;
      if (cursor + rightMargin > x + width) stave.setWidth(cursor + rightMargin - x);
      cursor += gap;
    }
    finishRow();

    let labelIndex = 0;
    ctx.save();
    for (const printed of rows) {
      printed.stave.draw();
      for (const group of printed.groups) {
        signs.draw(ctx, group);
        const label = labels[labelIndex++];
        const ink = label.getTextInk(0, 0);
        label.renderText(ctx, group.x - ink.x - ink.w / 2, printed.lyricY);
      }
    }
    ctx.restore();
    return rows;
  }
}
