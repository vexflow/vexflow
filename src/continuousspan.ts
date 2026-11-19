// Logical event anchors and renderer-independent drawing of continuous-score span fragments.
import type { Annotation } from './annotation';
import { Bounds } from './boundingbox';
import { Element } from './element';
import { Glyphs } from './glyphs';
import { Note } from './note';
import { ribbonParts } from './phraseribbon';
import { RenderContext } from './rendercontext';
import { Stave } from './stave';
import { Tables } from './tables';

export type ContinuousSpanKind =
  | 'tie'
  | 'slur'
  | 'crescendo'
  | 'diminuendo'
  | 'pedal'
  | 'lyric'
  | 'hyphen'
  | 'volta'
  | 'ottava'
  | 'trill'
  | 'tuplet'
  | 'palmMute';
export interface ContinuousSpan {
  kind: ContinuousSpanKind;
  /** One-based string of a tab tie. Defaults to the string of the selected chord position. */
  string?: number;
  /** Required for palmMute. String numbers are one-based. */
  strings?: readonly number[];
  id: string;
  from: string;
  to: string;
  /** Optional zero-based chord-head indices. On a tab tie these index the positions arrays. */
  fromHead?: number;
  toHead?: number;
  side?: 'above' | 'below';
  /** Syllable, ending number, tuplet ratio or octave label, according to kind. */
  text?: string;
  /** Optional type size for this label, in points. Measured before system breaks are chosen. */
  labelFontSize?: number;
  /** For a lyric extender, take the baseline and ink edge from this Annotation on the source note. */
  syllableId?: string;
}
export interface SpanAnchor {
  measure: number;
  staff: number;
  note: Note;
}
export interface ResolvedSpan {
  spec: ContinuousSpan;
  first: SpanAnchor;
  last: SpanAnchor;
  label?: Element;
  syllable?: Annotation;
}
export interface SpanFragment {
  id: string;
  kind: ContinuousSpanKind;
  row: number;
  part: 'single' | 'first' | 'middle' | 'last';
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  /** Fraction of the drawn span used to interpolate the aperture across a system break. */
  progress: [number, number];
  /** String numbers covered by a tab tie or palm-mute fragment. */
  strings?: readonly number[];
  /** Authored TAB endpoints appear on the fragments containing them. */
  from?: string;
  to?: string;
  rise?: number;
  above: boolean;
  space: number;
}

/** Unlike a glyph sized in a default font, labels contribute their actual current text width to reservations. */
export function spanLabel(spec: ContinuousSpan): Element | undefined {
  const text =
    spec.text ??
    (spec.kind === 'palmMute' ? 'P.M. ' + spec.strings!.join(',') : undefined) ??
    (
      { volta: '1.', ottava: '8va', trill: Glyphs.ornamentTrill, tuplet: '3' } as Partial<
        Record<ContinuousSpanKind, string>
      >
    )[spec.kind];
  if (!text) return;
  let category = 'Annotation';
  if (spec.kind === 'trill') category = 'Ornament';
  if (spec.kind === 'lyric' || spec.kind === 'hyphen') category = 'Annotation.lyric';
  const label = new Element(category).setText(text);
  if (spec.labelFontSize !== undefined) label.setFontSize(spec.labelFontSize);
  return label;
}

export function spanAbove(span: ContinuousSpan): boolean {
  return span.side ? span.side === 'above' : ['slur', 'volta', 'ottava', 'trill', 'tuplet'].includes(span.kind);
}

/** Retain the written pitch through a clef change at a continuation edge. */
export function continuationPitch(anchor: SpanAnchor, stave: Stave, index = 0): number {
  const source = anchor.note.checkStave(),
    key = anchor.note.getKeys()[index];
  const offset = (anchor.note.getYs()[index] - source.getYForLine(0)) / source.space(1);
  const clefShift = Tables.keyProperties(key, source.getClef()).line - Tables.keyProperties(key, stave.getClef()).line;
  return stave.getYForLine(0) + stave.space(offset + clefShift);
}

/** Share control geometry between the clearance search and the renderer. */
function controls(f: SpanFragment) {
  const lift =
    (f.above ? -1 : 1) * (f.rise ?? Math.min(f.space * (f.kind === 'tie' ? 0.85 : 1.5), (f.x2 - f.x1) * 0.18));
  return {
    dx: (f.x2 - f.x1) / 3,
    a: f.y1 + lift * (f.part === 'first' || f.part === 'single' ? 1 : 0.35),
    b: f.y2 + lift * (f.part === 'last' || f.part === 'single' ? 1 : 0.35),
  };
}

/** Prefer the shallowest clear curve. Preserve the best finite candidate if the space is infeasible. */
export function fitSpan(f: SpanFragment, obstacles: Bounds[]): boolean {
  const thickness = (f.above ? -1 : 1) * f.space * 0.22;
  const initial = Math.min(f.space * (f.kind === 'tie' ? 0.85 : 1.5), (f.x2 - f.x1) * 0.18);
  let best = initial,
    cost = Infinity;
  for (let step = 0; step <= (f.kind === 'tie' ? 6 : 20); step++) {
    f.rise = initial + step * f.space * 0.4;
    const { dx, a, b } = controls(f);
    const left = { x: f.x1, y: f.y1 },
      right = { x: f.x2, y: f.y2 };
    const cps =
      f.kind === 'tie'
        ? [{ x: (f.x1 + f.x2) / 2, y: (a + b) / 2 }]
        : [
            { x: f.x1 + dx, y: a },
            { x: f.x2 - dx, y: b },
          ];
    const parts = ribbonParts(
      [left, ...cps, right],
      [left, ...cps.map((p) => ({ ...p, y: p.y + thickness })), right],
      f.space * 0.15
    );
    const hits = parts.filter((p) =>
      obstacles.some((o) => p.x < o.x + o.w && o.x < p.x + p.w && p.y < o.y + o.h && o.y < p.y + p.h)
    ).length;
    if (hits < cost) {
      best = f.rise;
      cost = hits;
    }
    if (!hits) break;
  }
  f.rise = best;
  return cost === 0;
}

/** Draw only the hooks, labels and wedge apertures belonging to this particular segment. */
export function drawSpan(ctx: RenderContext, f: SpanFragment, label?: Element): void {
  const { kind, space, x1, x2, y1, y2, above } = f;
  const start = f.part === 'single' || f.part === 'first',
    end = f.part === 'single' || f.part === 'last';
  const sign = above ? -1 : 1;
  const line = (a: number, b: number, c: number, d: number) => {
    ctx.beginPath();
    ctx.moveTo(a, b);
    ctx.lineTo(c, d);
    ctx.stroke();
  };
  ctx.save();
  try {
    if (kind === 'slur' || kind === 'tie') {
      const { dx, a, b } = controls(f);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      if (kind === 'tie') {
        const x = (x1 + x2) / 2,
          y = (a + b) / 2;
        ctx.quadraticCurveTo(x, y, x2, y2);
        ctx.quadraticCurveTo(x, y + sign * space * 0.22, x1, y1);
      } else {
        ctx.bezierCurveTo(x1 + dx, a, x2 - dx, b, x2, y2);
        ctx.bezierCurveTo(x2 - dx, b + sign * space * 0.22, x1 + dx, a + sign * space * 0.22, x1, y1);
      }
      ctx.closePath();
      ctx.fill();
      return;
    }
    if (kind === 'crescendo' || kind === 'diminuendo') {
      const [left, right] = f.progress.map((t) => space * 0.55 * (kind === 'crescendo' ? t : 1 - t));
      line(x1, y1 - left, x2, y2 - right);
      line(x1, y1 + left, x2, y2 + right);
      return;
    }
    if (kind === 'tuplet') {
      const mid = (x1 + x2) / 2,
        width = start && label ? label.getWidth() : 0,
        y = y1 + sign * space * 0.5;
      if (start && label) label.renderText(ctx, mid - width / 2, y1);
      if (width) {
        line(x1, y, mid - width / 2 - 2, y);
        line(mid + width / 2 + 2, y, x2, y);
      } else line(x1, y, x2, y);
      if (start) line(x1, y, x1, y - sign * space * 0.65);
      if (end) line(x2, y, x2, y - sign * space * 0.65);
      return;
    }
    const hasLabel = label && start;
    if (hasLabel) label.renderText(ctx, x1, y1);
    const left = hasLabel ? x1 + label.getWidth() + space * 0.35 : x1;
    if (kind === 'hyphen') {
      if (x2 - left >= space * 0.5) {
        const mid = (left + x2) / 2;
        line(mid - space * 0.25, y1 - space * 0.35, mid + space * 0.25, y1 - space * 0.35);
      }
      return;
    }
    if (kind === 'lyric') {
      if (x2 > left) line(left, y1 + 1, x2, y2 + 1);
      return;
    }
    if (kind === 'trill') {
      const period = space * 0.65;
      ctx.beginPath();
      ctx.moveTo(left, y1 - 3);
      for (let x = left; x < x2;) {
        const stop = Math.min(x + period, x2),
          d = stop - x;
        ctx.bezierCurveTo(x + d / 3, y1 - space * 0.8, x + (2 * d) / 3, y1 + space * 0.2, stop, y1 - 3);
        x = stop;
      }
      ctx.stroke();
      return;
    }
    if (kind === 'ottava' || kind === 'palmMute') ctx.setLineDash([space * 0.45, space * 0.35]);
    const y = kind === 'ottava' ? y1 - space * 0.5 : kind === 'volta' ? y1 - space * 1.35 : y1;
    if (x2 > left) line(kind === 'volta' ? x1 : left, y, x2, y);
    ctx.setLineDash([]);
    if (kind === 'pedal') {
      if (start) line(x1, y, x1, y - space * 0.8);
      if (end) line(x2, y, x2, y - space * 0.8);
    } else if (kind === 'volta') {
      if (start) line(x1, y, x1, y + space * 0.65);
      if (end) line(x2, y, x2, y + space * 0.65);
    } else if ((kind === 'ottava' || kind === 'palmMute') && end) line(x2, y, x2, y - sign * space * 0.6);
  } finally {
    ctx.restore();
  }
}
