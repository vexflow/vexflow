// Strict musical-time placement, with measured bounds and separate zero-time prefixes.
// MIT License
import type { AlignmentTickContexts } from './formatter';
import { Fraction } from './fraction';
import { Stave } from './stave';
import { Tickable } from './tickable';
import { TickContext } from './tickcontext';
import { RuntimeError } from './util';
import { Voice } from './voice';

/** Equal durations occupy equal horizontal distances. */
export interface ProportionalSpacing {
  mode: 'proportional';
  /** Omit to fit the available width, or choose the minimum scale when no width is supplied. */
  pixelsPerQuarter?: number;
}

/** One voice's non-rhythmic objects immediately before an anchor. */
interface Prefix {
  contexts: TickContext[];
}

/** Measured extents on one stave, relative to the rhythmic anchor. */
interface Extent {
  left: number;
  right: number;
}

/** Notes at one musical time, plus independently positioned inline objects. */
interface Anchor {
  tick: number;
  context: TickContext;
  prefixes: Prefix[];
  extents: Map<Stave | undefined, Extent>;
}

/** Pixel allowance between measured boxes, including the two outer boundaries. */
const PADDING = 2;
/** Ignore floating-point noise when comparing computed pixel widths. */
const EPSILON = 1e-7;

/** Round required dimensions up so copying an error's suggestion is sufficient. */
function required(value: number): string {
  return (Math.ceil(value * 100) / 100).toFixed(2);
}

/** Build a common rational timeline without advancing time for clefs or barlines. */
export class ProportionalFormatter {
  readonly contexts: AlignmentTickContexts;
  private readonly anchors: Anchor[];
  private readonly quarterTicks: number;
  private readonly duration: number;
  private origin = 0;
  private tail = PADDING;
  private minimumScale = 0;
  private centeredWidth = 0;

  constructor(voices: Voice[], resolutionMultiplier: number) {
    const resolution = voices[0].getActualResolution() / voices[0].getResolutionMultiplier();
    this.quarterTicks = resolution / 4;
    let durationTicks = voices[0].getTotalTicks().value();
    // Inspect every duration, not only the final voice total. Tuplet denominators can cancel.
    for (const voice of voices) {
      if (voice.getActualResolution() / voice.getResolutionMultiplier() !== resolution) {
        throw new RuntimeError('BadArgument', 'Proportional voices must use the same tick resolution.');
      }
      durationTicks = Math.max(durationTicks, voice.getTicksUsed().value());
      for (const note of voice.getTickables()) {
        if (note.shouldIgnoreTicks()) continue;
        const ticks = note.getTicks();
        if (ticks.value() <= 0) throw new RuntimeError('BadArgument', 'Rhythmic durations must be positive.');
        resolutionMultiplier = Fraction.LCM(resolutionMultiplier, ticks.denominator);
      }
    }
    if (!Number.isSafeInteger(resolutionMultiplier) || resolutionMultiplier <= 0) {
      throw new RuntimeError('BadArgument', 'Proportional timeline exceeds the supported rational tick range.');
    }
    this.duration = durationTicks / this.quarterTicks;
    const byTick = new Map<number, Anchor>();
    for (const [voiceIndex, voice] of voices.entries()) {
      const elapsed = new Fraction(0, resolutionMultiplier);
      for (const note of voice.getTickables()) {
        const tick = elapsed.numerator;
        if (!Number.isSafeInteger(tick)) {
          throw new RuntimeError('BadArgument', 'Proportional timeline exceeds the supported rational tick range.');
        }
        let anchor = byTick.get(tick);
        if (!anchor) {
          anchor = { tick, context: new TickContext({ tickID: tick }), prefixes: [], extents: new Map() };
          byTick.set(tick, anchor);
        }
        if (note.shouldIgnoreTicks()) {
          // Each voice retains its inline sequence. Different voices may share the same time.
          const prefix = (anchor.prefixes[voiceIndex] ??= { contexts: [] });
          prefix.contexts.push(new TickContext({ tickID: tick }).addTickable(note, voiceIndex));
        } else {
          anchor.context.addTickable(note, voiceIndex);
          elapsed.add(note.getTicks());
        }
      }
    }
    this.anchors = [...byTick.values()].sort((a, b) => a.tick - b.tick);
    const map: Record<number, TickContext> = {};
    const array: TickContext[] = [];
    for (const anchor of this.anchors) {
      map[anchor.tick] = anchor.context;
      anchor.prefixes.forEach((prefix) => array.push(...prefix.contexts));
      array.push(anchor.context);
    }
    array.forEach((context) => (context.tContexts = array));
    this.contexts = { map, array, list: this.anchors.map((anchor) => anchor.tick), resolutionMultiplier };
  }

  /** Convert an exact timeline key once, at the point where pixels are needed. */
  private quarters(anchor: Anchor): number {
    return anchor.tick / this.contexts.resolutionMultiplier / this.quarterTicks;
  }

  /** Measure each stave independently so unrelated onsets on other staves do not compete. */
  private measure(): void {
    this.origin = PADDING;
    this.tail = PADDING;
    this.minimumScale = 0;
    this.centeredWidth = 0;
    for (const anchor of this.anchors) {
      anchor.extents.clear();
      anchor.context.preFormat();
      for (const note of anchor.context.getTickables()) {
        const metrics = note.getMetrics();
        const left = metrics.modLeftPx + metrics.leftDisplacedHeadPx;
        const right = metrics.notePx + metrics.modRightPx + metrics.rightDisplacedHeadPx;
        if (note.isCenterAligned()) {
          this.centeredWidth = Math.max(this.centeredWidth, 2 * Math.max(left, right));
          continue;
        }
        const extent = anchor.extents.get(note.getStave()) ?? { left: 0, right: 0 };
        extent.left = Math.max(extent.left, left);
        extent.right = Math.max(extent.right, right);
        anchor.extents.set(note.getStave(), extent);
      }
      // Prefix widths are measured before placement. Keep the largest sequence on each stave.
      const prefixWidths = new Map<Stave | undefined, number>();
      anchor.prefixes.forEach((prefix) => {
        let width = 0;
        for (const context of prefix.contexts) width += context.preFormat().getWidth();
        const stave = prefix.contexts[0].getTickables()[0].getStave();
        prefixWidths.set(stave, Math.max(prefixWidths.get(stave) ?? 0, width));
      });
      for (const [stave, width] of prefixWidths) {
        const extent = anchor.extents.get(stave) ?? { left: 0, right: 0 };
        extent.left += width;
        anchor.extents.set(stave, extent);
      }
      for (const extent of anchor.extents.values()) {
        if (this.quarters(anchor) === 0) this.origin = Math.max(this.origin, extent.left + PADDING);
        if (this.quarters(anchor) === this.duration) this.tail = Math.max(this.tail, extent.right + PADDING);
      }
    }
    // All pairs also cover a wide earlier object extending past an intervening narrow one.
    const previous = new Map<Stave | undefined, { time: number; extent: Extent }[]>();
    for (const anchor of this.anchors) {
      const time = this.quarters(anchor);
      for (const [stave, extent] of anchor.extents) {
        for (const before of previous.get(stave) ?? []) {
          this.minimumScale = Math.max(
            this.minimumScale,
            (before.extent.right + extent.left + PADDING) / (time - before.time)
          );
        }
        if (time > 0) this.minimumScale = Math.max(this.minimumScale, (extent.left + PADDING - this.origin) / time);
        if (time < this.duration) {
          this.minimumScale = Math.max(
            this.minimumScale,
            (extent.right + PADDING - this.tail) / (this.duration - time)
          );
        }
        const list = previous.get(stave) ?? [];
        list.push({ time, extent });
        previous.set(stave, list);
      }
    }
    this.minimumScale = Math.max(this.minimumScale, this.centeredWidth / this.duration);
  }

  /** Compute one scale and validate it before changing any anchor positions. */
  private dimensions(spacing: ProportionalSpacing, width: number): { scale: number; width: number } {
    if (!Number.isFinite(width) || width < 0)
      throw new RuntimeError('BadArgument', 'Width must be finite and nonnegative.');
    const requested = spacing.pixelsPerQuarter;
    if (requested !== undefined && (!Number.isFinite(requested) || requested <= 0)) {
      throw new RuntimeError('BadArgument', 'pixelsPerQuarter must be positive and finite.');
    }
    this.measure();
    const minimumWidth = this.origin + this.duration * this.minimumScale + this.tail;
    const scale = requested ?? (width > 0 ? (width - this.origin - this.tail) / this.duration : this.minimumScale);
    const neededWidth = this.origin + this.duration * scale + this.tail;
    if (!Number.isFinite(neededWidth) || !Number.isFinite(this.minimumScale)) {
      throw new RuntimeError('BadArgument', 'Proportional dimensions exceed the supported pixel range.');
    }
    if (scale + EPSILON < this.minimumScale || (width > 0 && width + EPSILON < neededWidth)) {
      throw new RuntimeError(
        'InsufficientProportionalSpace',
        `Proportional spacing requires at least ${required(this.minimumScale)} px/quarter and ` +
          `${required(Math.max(minimumWidth, neededWidth))} px width; received ${scale.toFixed(2)} px/quarter` +
          (width > 0 ? ` and ${width.toFixed(2)} px width.` : '.')
      );
    }
    return { scale, width: neededWidth };
  }

  /** Minimum total width for autoWidth, honoring a supplied exact scale. */
  minimumWidth(spacing: ProportionalSpacing): number {
    return this.dimensions(spacing, 0).width;
  }

  /** Place anchors and prefixes, retaining the established centering exception for measure rests. */
  format(spacing: ProportionalSpacing, width: number): number {
    const dimensions = this.dimensions(spacing, width);
    for (const anchor of this.anchors) {
      const x = this.origin + this.quarters(anchor) * dimensions.scale;
      anchor.context.setX(x);
      anchor.context.getCenterAlignedTickables().forEach((note: Tickable) => {
        note.setCenterXShift(this.origin + (this.duration * dimensions.scale) / 2 - x);
      });
      anchor.prefixes.forEach((prefix) => {
        // Right-align each sequence just before the rhythmic note's left modifiers.
        const stave = prefix.contexts[0].getTickables()[0].getStave();
        const notes = anchor.context.getTickables().filter((note) => note.getStave() === stave);
        let right =
          x -
          Math.max(
            0,
            ...notes.map((note) => {
              const metrics = note.getMetrics();
              return metrics.modLeftPx + metrics.leftDisplacedHeadPx;
            })
          );
        for (const context of [...prefix.contexts].reverse()) {
          const metrics = context.getMetrics();
          context.setX(right - PADDING / 2 - metrics.notePx - metrics.totalRightPx);
          right -= context.getWidth();
        }
      });
    }
    return dimensions.width;
  }
}
