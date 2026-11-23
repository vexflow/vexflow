// Measure and lay out opening text, inline rhythms and chord frames above the first system.
import { Beam } from './beam';
import { BoundingBox } from './boundingbox';
import { CanvasContext } from './canvascontext';
import { Element } from './element';
import { measureEngraving } from './engravinggeometry';
import type { FontInfo } from './font';
import { Formatter } from './formatter';
import { FretDiagram, FretDiagramSpec } from './fretdiagram';
import { RenderContext } from './rendercontext';
import { Stave } from './stave';
import { StaveNote } from './stavenote';
import { Tuplet } from './tuplet';

type Alignment = 'left' | 'center' | 'right';

/** A short rhythmic example shares a baseline with the surrounding text. */
export interface OpeningRhythm {
  notes: readonly string[];
  beam?: boolean;
  /** Written count and occupied count, e.g. [3, 2] for a triplet. */
  tuplet?: readonly [number, number];
  scale?: number;
}

export type OpeningRun = string | { text: string; font?: FontInfo } | OpeningRhythm;
export type OpeningBlock = (
  | { kind: 'text'; runs: readonly OpeningRun[] }
  | { kind: 'diagrams'; diagrams: readonly (FretDiagramSpec & { label: string })[] }
) & { align?: Alignment; font?: FontInfo };

/** Measurements use the same drawing units as the score and apply only to this composition. */
export interface ScoreOpening {
  indent?: number;
  font?: FontInfo;
  blocks?: readonly OpeningBlock[];
}

/** Local coordinates are relative to a text baseline, or to the top of a diagram cell. */
interface Item {
  width: number;
  top: number;
  bottom: number;
  draw: (ctx: RenderContext, x: number, baseline: number) => void;
}

const blockGap = 10;
const diagramGap = 12;

/** Preserve advances for spaces as well as the ink overhang of italic letters. */
function textItem(text: string, font: FontInfo): Item {
  const el = new Element('Annotation').setFont(font);
  // SVG collapses spaces at the edges of each text node. Position the visible string
  // using its measured leading advance so Canvas, live SVG and outlined print agree.
  const advance = el.setText(text).getWidth();
  const leading = el.setText(text.match(/^\s*/)?.[0] ?? '').getWidth();
  el.setText(text.trim());
  const box = el.getTextInk(leading, 0);
  const left = Math.min(0, box.x);
  return {
    width: Math.max(advance, box.x + box.w) - left,
    top: box.y,
    bottom: box.y + box.h,
    draw: (ctx, x, baseline) => el.renderText(ctx, x + leading - left, baseline),
  };
}

/** The hidden stave supplies pitch coordinates without adding a voice or an event to the composition. */
function rhythmItem(spec: OpeningRhythm): Item {
  const scale = spec.scale ?? 0.55;
  if (!spec.notes.length || !(Number.isFinite(scale) && scale > 0))
    throw new RangeError('An inline rhythm needs notes and a positive scale.');
  if (spec.tuplet && (spec.notes.length < 2 || !spec.tuplet.every((n) => Number.isSafeInteger(n) && n > 0)))
    throw new RangeError('An inline tuplet needs at least two notes and positive integer counts.');

  // Measure in native engraving units. Render at the final position with the same stave and tick spacing.
  function build(x: number, baseline: number) {
    const stave = new Stave(0, 0, 0);
    stave.setY(baseline - stave.getYForNote(3)).setNoteStartX(0);
    const notes = spec.notes.map((duration) =>
      new StaveNote({ keys: ['b/4'], duration, stemDirection: 1 }).setStave(stave)
    );
    const beam = spec.beam ? new Beam(notes) : undefined;
    const tuplet =
      spec.tuplet &&
      new Tuplet(notes, { numNotes: spec.tuplet[0], notesOccupied: spec.tuplet[1], bracketed: true, ratioed: false });
    Formatter.SimpleFormat(notes, x, { paddingBetween: 13 });
    return [...notes, ...(beam ? [beam] : []), ...(tuplet ? [tuplet] : [])];
  }
  const elements = build(0, 0);
  const ink = elements.map((el) => {
    const { ink } = measureEngraving(el);
    if (!ink) throw new RangeError('Unable to measure inline rhythm.');
    return ink;
  });
  const box = ink.reduce((all, part) => all.mergeWith(part), BoundingBox.copy(ink[0]));
  return {
    width: box.w * scale,
    top: box.y * scale,
    bottom: (box.y + box.h) * scale,
    draw(ctx, x, baseline) {
      ctx.save();
      const group = ctx.openGroup('opening-rhythm');
      try {
        const left = x - box.x * scale;
        let drawing = elements;
        if (group) group.setAttribute('transform', `translate(${left},${baseline}) scale(${scale})`);
        else if (ctx instanceof CanvasContext) {
          ctx.context2D.translate(left, baseline);
          ctx.scale(scale, scale);
        } else {
          // Third-party contexts can implement the basic scale operation without a translation API.
          ctx.scale(scale, scale);
          drawing = build(left / scale, baseline / scale);
        }
        for (const el of drawing) el.setContext(ctx).draw();
      } finally {
        ctx.closeGroup();
        ctx.restore();
      }
    },
  };
}

/** Center the chord name above the native frame, including the open strings and starting fret. */
function diagramItem(spec: FretDiagramSpec, label: Item, frameY: number): Item {
  const frame = new FretDiagram(spec);
  const box = frame.getBoundingBox();
  const width = Math.max(label.width, box.w);
  return {
    width,
    top: label.top,
    bottom: frameY + box.h,
    draw(ctx, x, y) {
      label.draw(ctx, x + (width - label.width) / 2, y);
      frame
        .setX(x + (width - box.w) / 2)
        .setY(y + frameY)
        .setContext(ctx)
        .draw();
    },
  };
}

/** Lay out each line at the available width. Each diagram stays with its label as the group wraps. */
export function layoutOpening(opening: ScoreOpening, x: number, y: number, width: number) {
  const draws: ((ctx: RenderContext) => void)[] = [];
  let height = 0;
  let overflow = 0;
  function line(items: Item[], align: Alignment, gap: number) {
    if (!items.length) return;
    const used = items.reduce((w, item) => w + item.width, 0) + (items.length - 1) * gap;
    const spare = Math.max(0, width - used);
    let cursor = x + (align === 'center' ? spare / 2 : align === 'right' ? spare : 0);
    const baseline = y + height - Math.min(...items.map((v) => v.top));
    for (const item of items) {
      const left = cursor;
      draws.push((ctx) => item.draw(ctx, left, baseline));
      cursor += item.width + gap;
    }
    height = baseline - y + Math.max(...items.map((v) => v.bottom)) + blockGap;
    overflow = Math.max(overflow, used - width);
  }
  for (const block of opening.blocks ?? []) {
    const font = { ...opening.font, ...block.font };
    const align = block.align ?? 'left';
    if (!['left', 'center', 'right'].includes(align)) throw new RangeError('Unknown opening alignment.');
    if (block.kind === 'text') {
      const items = block.runs.map((run) =>
        typeof run === 'string'
          ? textItem(run, font)
          : 'notes' in run
            ? rhythmItem(run)
            : textItem(run.text, { ...font, ...run.font })
      );
      line(items, align, 0);
    } else if (block.kind === 'diagrams') {
      let row: Item[] = [];
      let used = 0;
      const labels = block.diagrams.map((diagram) => textItem(diagram.label, font));
      const frameY = Math.max(0, ...labels.map((label) => label.bottom)) + 4;
      for (const [i, spec] of block.diagrams.entries()) {
        const item = diagramItem(spec, labels[i], frameY);
        if (row.length && used + diagramGap + item.width > width) {
          line(row, align, diagramGap);
          row = [];
          used = 0;
        }
        used += (row.length ? diagramGap : 0) + item.width;
        row.push(item);
      }
      line(row, align, diagramGap);
    } else throw new RangeError('Unknown opening block.');
  }
  return {
    height,
    overflow,
    draw(ctx: RenderContext) {
      ctx.save();
      ctx.openGroup('score-opening');
      try {
        draws.forEach((draw) => draw(ctx));
      } finally {
        ctx.closeGroup();
        ctx.restore();
      }
    },
  };
}
