// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// TickContext Mocks

import { Fraction } from '../src/fraction';
import { NoteMetrics } from '../src/note';
import { Stave } from '../src/stave';
import { Tickable } from '../src/tickable';
import { TickContext } from '../src/tickcontext';
import { Voice } from '../src/voice';

class MockTickable extends Tickable {
  override tickContext?: TickContext;
  override ticks: Fraction = new Fraction(1, 1);
  override voice?: Voice;
  stave?: Stave;
  override ignoreTicks: boolean = false;

  init(): void {
    // DO NOTHING.
  }

  override getX(): number {
    return this.tickContext!.getX();
  }

  override getIntrinsicTicks(): number {
    return this.ticks.value();
  }

  override getTicks(): Fraction {
    return this.ticks;
  }

  setTicks(t: number): this {
    this.ticks = new Fraction(t, 1);
    return this;
  }

  // Called by TickContext.preFormat().
  getMetrics(): NoteMetrics {
    return {
      width: 0,
      glyphWidth: 0,
      notePx: this.width,
      modLeftPx: 0,
      modRightPx: 0,
      leftDisplacedHeadPx: 0,
      rightDisplacedHeadPx: 0,
      glyphPx: 0,
    };
  }

  override getWidth(): number {
    return this.width;
  }

  override setWidth(w: number): this {
    this.width = w;
    return this;
  }

  override setVoice(v: Voice): this {
    this.voice = v;
    return this;
  }

  setStave(stave: Stave): this {
    this.stave = stave;
    return this;
  }

  getStave(): Stave | undefined {
    return this.stave;
  }

  override setTickContext(tc: TickContext): this {
    this.tickContext = tc;
    return this;
  }

  override setIgnoreTicks(flag: boolean): this {
    this.ignoreTicks = flag;
    return this;
  }

  override shouldIgnoreTicks(): boolean {
    return this.ignoreTicks;
  }

  override preFormat(): void {
    // DO NOTHING.
  }

  // eslint-disable-next-line
  override draw(...args: any[]): void {
    // DO NOTHING.
  }
}

export { MockTickable };
