// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
// Groups tickables and validates the meter used to count their duration.

import { BoundingBox } from './boundingbox';
import { Element } from './element';
import { Fraction } from './fraction';
import { RenderContext } from './rendercontext';
import { Stave } from './stave';
import { Tables } from './tables';
import { Tickable } from './tickable';
import { Category } from './typeguard';
import { defined, RuntimeError, sumArray } from './util';

export interface VoiceTime {
  numBeats: number;
  beatValue: number;
  /** Defaults to `VexFlow.RESOLUTION` if not provided. */
  resolution?: number;
}

export enum VoiceMode {
  STRICT = 1,
  SOFT = 2,
  FULL = 3,
}

/**
 * `Voice` is mainly a container object to group `Tickables` for formatting.
 */
export class Voice extends Element {
  static override get CATEGORY(): string {
    return Category.Voice;
  }

  /**
   * Modes allow the addition of ticks in three different ways:
   * - STRICT: This is the default. Ticks must fill the voice.
   * - SOFT: Ticks can be added without restrictions.
   * - FULL: Ticks do not need to fill the voice, but can't exceed the maximum tick length.
   */
  static get Mode(): typeof VoiceMode {
    return VoiceMode;
  }

  protected resolutionMultiplier: number = 1;
  protected smallestTickCount: Fraction;
  protected stave?: Stave;
  protected mode: VoiceMode = VoiceMode.STRICT;
  protected expTicksUsed?: number;
  protected preFormatted: boolean = false;
  /** Durations can change after insertion, for example when attaching tuplets. */
  private ticksDirty: boolean = false;
  protected options: { softmaxFactor: number };

  protected readonly totalTicks: Fraction;
  protected readonly ticksUsed: Fraction = new Fraction(0, 1);
  protected readonly largestTickWidth: number = 0;
  protected readonly tickables: Tickable[] = [];
  protected readonly time: Required<VoiceTime>;

  constructor(time?: VoiceTime | string) {
    super();

    this.options = {
      softmaxFactor: Tables.SOFTMAX_FACTOR,
    };

    // Convert the `time` string into a VoiceTime object if necessary.
    let voiceTime: VoiceTime | undefined;
    if (typeof time === 'string') {
      // Time signature shortcut: "4/4", "3/8", etc.
      const match = time.length <= 64 ? /^(\d+)\/(\d+)$/.exec(time) : null;
      if (!match) {
        throw new RuntimeError('BadArgument', 'Invalid time signature. Expected positive integers such as 4/4.');
      }
      voiceTime = { numBeats: Number(match[1]), beatValue: Number(match[2]) };
    } else {
      voiceTime = time;
    }

    // Default time signature is 4/4.
    this.time = {
      numBeats: 4,
      beatValue: 4,
      resolution: Tables.RESOLUTION,
      ...voiceTime,
    };

    // Reject invalid meters before they can introduce infinity or NaN into tick arithmetic.
    const { numBeats, beatValue, resolution } = this.time;
    if (![numBeats, beatValue, resolution].every((value) => Number.isSafeInteger(value) && value > 0)) {
      throw new RuntimeError('BadArgument', 'Meter and resolution must be positive safe integers.');
    }
    const totalTicks = numBeats * (resolution / beatValue);
    if (!Number.isFinite(totalTicks) || totalTicks <= 0 || totalTicks > Number.MAX_SAFE_INTEGER) {
      throw new RuntimeError('BadArgument', 'Meter exceeds the supported tick range.');
    }
    this.totalTicks = new Fraction(totalTicks, 1);
    // until tickables are added, the smallestTickCount is the same as the stated totalTicks duration.
    this.smallestTickCount = this.totalTicks.clone();
  }

  /** Get the total ticks in the voice. */
  getTotalTicks(): Fraction {
    this.refreshTicks();
    return this.totalTicks;
  }

  /** Get the total ticks used in the voice by all the tickables. */
  getTicksUsed(): Fraction {
    this.refreshTicks();
    return this.ticksUsed;
  }

  /** Get the largest width of all the tickables. */
  getLargestTickWidth(): number {
    return this.largestTickWidth;
  }

  /** Get the tick count for the shortest tickable */
  getSmallestTickCount(): Fraction {
    this.refreshTicks();
    return this.smallestTickCount;
  }

  /** Get the tickables in the voice. */
  getTickables(): Tickable[] {
    return this.tickables;
  }

  /** Get the voice mode (Voice.Mode.SOFT, STRICT, or FULL) */
  getMode(): number {
    return this.mode;
  }

  /**
   * Set the voice mode.
   * @param mode value from `VoiceMode` or Voice.Mode
   */
  setMode(mode: number): this {
    this.mode = mode;
    return this;
  }

  /** Get the resolution multiplier for the voice. */
  getResolutionMultiplier(): number {
    this.refreshTicks();
    return this.resolutionMultiplier;
  }

  /** Get the actual tick resolution for the voice. */
  getActualResolution(): number {
    return this.getResolutionMultiplier() * this.time.resolution;
  }

  /** Set the voice's stave. */
  setStave(stave: Stave): this {
    this.stave = stave;
    return this;
  }

  getStave(): Stave | undefined {
    return this.stave;
  }

  /** Get the bounding box for the voice. */
  override getBoundingBox(): BoundingBox {
    const boundingBox = this.tickables[0].getBoundingBox();
    for (let i = 1; i < this.tickables.length; ++i) {
      const tickable = this.tickables[i];
      if (!tickable.getStave() && this.stave) tickable.setStave(this.stave);
      const bb = tickable.getBoundingBox();
      boundingBox.mergeWith(bb);
    }
    return boundingBox;
  }

  /** Set the voice mode to strict or soft. */
  setStrict(strict: boolean): this {
    this.mode = strict ? VoiceMode.STRICT : VoiceMode.SOFT;
    return this;
  }

  /** Determine if the voice is complete according to the voice mode. */
  isComplete(): boolean {
    this.refreshTicks();
    if (this.mode === VoiceMode.STRICT || this.mode === VoiceMode.FULL) {
      return this.ticksUsed.equals(this.totalTicks);
    } else {
      return true;
    }
  }

  /**
   * We use softmax to layout the tickables proportional to the exponent of
   * their duration. The softmax factor is used to determine the 'linearness' of
   * the layout.
   *
   * The softmax of all the tickables in this voice should sum to 1.
   */
  setSoftmaxFactor(factor: number): this {
    this.options.softmaxFactor = factor;
    this.expTicksUsed = 0; // reset
    return this;
  }

  /**
   * Calculate the sum of the exponents of all the ticks in this voice to use
   * as the denominator of softmax.  (It is not the sum of the softmax(t) over all tickables)
   *
   * Note that the "exp" of "expTicksUsed" stands for "expontential" ticks used,
   * not "expected" ticks used.
   */
  protected reCalculateExpTicksUsed(): number {
    const totalTicks = this.ticksUsed.value();
    const exp = (tickable: Tickable) => Math.pow(this.options.softmaxFactor, tickable.getTicks().value() / totalTicks);
    this.expTicksUsed = sumArray(this.tickables.map(exp));
    return this.expTicksUsed;
  }

  /** Get the softmax-scaled value of a tick duration. 'tickValue' is a number. */
  softmax(tickValue: number): number {
    this.refreshTicks();
    if (!this.expTicksUsed) {
      this.expTicksUsed = this.reCalculateExpTicksUsed();
    }

    const totalTicks = this.ticksUsed.value();
    const exp = (v: number) => Math.pow(this.options.softmaxFactor, v / totalTicks);
    const sm = exp(tickValue) / this.expTicksUsed;
    return sm;
  }

  /** Invalidate cached duration totals when a member's duration changes. */
  invalidateTicks(): void {
    this.ticksDirty = true;
    this.expTicksUsed = undefined;
  }

  /** Recount once after a batch of duration edits; avoid partial-tuplet validation. */
  private refreshTicks(): void {
    if (!this.ticksDirty) return;
    this.ticksUsed.set(0, 1);
    this.totalTicks.set(this.time.numBeats * (this.time.resolution / this.time.beatValue), 1);
    this.smallestTickCount = this.totalTicks.clone();
    for (const tickable of this.tickables) {
      if (tickable.shouldIgnoreTicks()) continue;
      const ticks = tickable.getTicks();
      this.ticksUsed.add(ticks);
      if (ticks.lessThan(this.smallestTickCount)) this.smallestTickCount = ticks.clone();
    }
    this.resolutionMultiplier = this.ticksUsed.denominator;
    this.totalTicks.add(0, this.resolutionMultiplier);
    this.ticksDirty = false;
  }

  /** Add a tickable to the voice. */
  addTickable(tickable: Tickable): this {
    this.refreshTicks();
    if (!tickable.shouldIgnoreTicks()) {
      const ticks = tickable.getTicks();

      // Update the total ticks for this line.
      this.ticksUsed.add(ticks);
      this.expTicksUsed = 0; // reset

      if (
        (this.mode === VoiceMode.STRICT || this.mode === VoiceMode.FULL) &&
        this.ticksUsed.greaterThan(this.totalTicks)
      ) {
        this.ticksUsed.subtract(ticks);
        throw new RuntimeError('BadArgument', 'Too many ticks.');
      }

      // Track the smallest tickable for formatting.
      if (ticks.lessThan(this.smallestTickCount)) {
        this.smallestTickCount = ticks.clone();
      }

      this.resolutionMultiplier = this.ticksUsed.denominator;

      // Expand total ticks using denominator from ticks used.
      this.totalTicks.add(0, this.ticksUsed.denominator);
    }

    // Add the tickable to the line.
    this.tickables.push(tickable);
    tickable.setVoice(this);
    return this;
  }

  /** Add an array of tickables to the voice. */
  addTickables(tickables: Tickable[]): this {
    for (let i = 0; i < tickables.length; ++i) {
      this.addTickable(tickables[i]);
    }
    return this;
  }

  /** Preformat the voice by applying the voice's stave to each note. */
  preFormat(): this {
    if (this.preFormatted) return this;
    const stave = this.checkStave();
    this.tickables.forEach((tickable) => {
      if (!tickable.getStave()) {
        tickable.setStave(stave);
      }
    });
    this.preFormatted = true;
    return this;
  }

  checkStave(): Stave {
    return defined(this.stave, 'NoStave', 'No stave attached to instance.');
  }

  /** Preserve per-event cross-staff assignments when drawing a continuous score. */
  preserveStaveAssignments = false;

  /**
   * Render the voice onto the canvas `context` and an optional `stave`.
   * If `stave` is omitted, it is expected that the notes have staves
   * already set.
   *
   * This method also calculates the voice's boundingBox while drawing
   * the notes. Note the similarities with this.getBoundingBox().
   */
  override draw(context: RenderContext = this.checkContext(), stave?: Stave): void {
    const override = stave ?? (this.preserveStaveAssignments ? undefined : this.stave);
    this.setRendered();
    for (let i = 0; i < this.tickables.length; ++i) {
      const tickable = this.tickables[i];
      // Set the stave if provided.
      if (override) {
        tickable.setStave(override);
      } else if (this.preserveStaveAssignments && !tickable.getStave() && this.stave) {
        tickable.setStave(this.stave);
      }
      defined(tickable.getStave(), 'MissingStave', 'The voice cannot draw tickables without staves.');

      tickable.setContext(context);
      tickable.drawWithStyle();
    }
  }
}
