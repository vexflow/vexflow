// Optional continuous-sheet layout for existing Systems. No music data model or pagination.
import { ClefNote } from './clefnote';
import type { ContinuousLayout } from './continuouslayout';
import { Factory } from './factory';
import { Note } from './note';
import { StaveNote } from './stavenote';
import { StemmableNote } from './stemmablenote';
import { System, SystemOptions } from './system';
import { RuntimeError } from './util';

/** Dimensions are in rendering units (normally pixels). */
export interface SheetOptions {
  factory: Factory;
  width?: number;
  x?: number;
  y?: number;
  rowGap?: number;
  measureGap?: number;
  measurePadding?: number;
  justify?: boolean;
}

/** Layout result. Oversized measures occupy their own row and remain readable. */
export interface SheetRow {
  systems: System[];
  x: number;
  y: number;
  width: number;
  height: number;
  overflow: number;
}

/** Arrange measure-sized Systems left to right, wrapping at a requested width. */
export class Sheet {
  private options: Required<SheetOptions>;
  private continuous?: ContinuousLayout;

  /** Composition installs a score-aware layout while retaining the native sheet resize and draw API. */
  setContinuousLayout(layout: ContinuousLayout): this {
    this.continuous = layout;
    return this;
  }

  getContinuousLayout(): ContinuousLayout | undefined {
    return this.continuous;
  }

  private systems: System[] = [];
  private rows: SheetRow[] = [];

  constructor(options: SheetOptions) {
    this.options = {
      width: 500,
      x: 10,
      y: 10,
      rowGap: 40,
      measureGap: 0,
      measurePadding: 20,
      justify: true,
      ...options,
    };
    this.setWidth(this.options.width);
    for (const key of ['x', 'y', 'rowGap', 'measureGap', 'measurePadding'] as const) {
      if (!Number.isFinite(this.options[key]) || this.options[key] < 0) {
        throw new RuntimeError('BadArgument', `Sheet ${key} must be a nonnegative finite number.`);
      }
    }
  }

  /** Create a measure. Add its staves and voices with the existing System API. */
  addSystem(options: Omit<SystemOptions, 'factory' | 'width' | 'autoWidth' | 'noJustification'> = {}): System {
    const system = this.options.factory.System({ ...options, autoWidth: true, noJustification: false });
    this.systems.push(system);
    return system;
  }

  /** Update the available row width. Call format() or Factory.draw() to reflow. */
  setWidth(width: number): this {
    if (!Number.isFinite(width) || width <= 0) {
      throw new RuntimeError('BadArgument', 'Sheet width must be a positive finite number.');
    }
    this.options.width = width;
    return this;
  }

  /** Access the measures without exposing the membership array. */
  getSystems(): System[] {
    return this.systems.slice();
  }

  /** Inspect row bounds and overflow after formatting. */
  getRows(): SheetRow[] {
    return this.rows.map((row) => ({ ...row, systems: row.systems.slice() }));
  }

  /** Required drawing height, including the top inset. */
  getHeight(): number {
    const last = this.rows[this.rows.length - 1];
    return last ? last.y + last.height : this.options.y;
  }

  /** Measure and pack rows. Always recompute, so repeated resize is deterministic. */
  format(): this {
    if (this.continuous) {
      this.rows = this.continuous.format(this.options);
      return this;
    }
    const widths = this.measureSystems();
    this.rows = [];
    let y = this.options.y;
    for (const indices of this.packRows(widths)) {
      const row = this.formatRow(indices, widths, y);
      this.rows.push(row);
      y += row.height + this.options.rowGap;
    }
    return this;
  }

  /** Measure intrinsic widths without carrying coordinates over from a prior layout. */
  private measureSystems(): number[] {
    return this.systems.map((system) => {
      system.setX(0).setY(0).setWidth();
      system.format();
      return system.getWidth() + this.options.measurePadding;
    });
  }

  /** Greedy packing keeps measure order and gives oversized measures their own rows. */
  private packRows(widths: number[]): number[][] {
    const groups: number[][] = [];
    let group: number[] = [];
    let used = 0;
    widths.forEach((width, index) => {
      const gap = group.length ? this.options.measureGap : 0;
      if (group.length && used + gap + width > this.options.width) {
        groups.push(group);
        group = [];
        used = 0;
      }
      used += (group.length ? this.options.measureGap : 0) + width;
      group.push(index);
    });
    if (group.length) groups.push(group);
    return groups;
  }

  /** Include staff envelopes and note bounds in the ordinary vertical layout. */
  private verticalBounds(system: System): { top: number; bottom: number } {
    const envelope = system.getBoundingBox();
    let top = Math.min(0, envelope.y);
    let bottom = envelope.y + envelope.h;
    // Spanning marks and arbitrary annotations still need caller-supplied rowGap.
    for (const voice of system.getVoices()) {
      for (const note of voice.getTickables()) {
        // Modifier and generic text bounds may still contain coordinates from the last draw.
        // Measure pitched heads/stems and inline clefs from current layout only. Other notes use
        // their stave-relative Y positions; arbitrary labels and spans still need explicit rowGap.
        if (note instanceof StaveNote || note instanceof ClefNote) {
          const box = note instanceof StaveNote ? note.getBoundingBox(false) : note.getBoundingBox();
          top = Math.min(top, box.getY());
          bottom = Math.max(bottom, box.getY() + box.getH());
        } else if (note instanceof Note) {
          const padding = note.checkStave().getSpacingBetweenLines();
          const ys = note.getYs();
          top = Math.min(top, ...ys.map((y) => y - padding));
          bottom = Math.max(bottom, ...ys.map((y) => y + padding));
          if (note instanceof StemmableNote && note.hasStem()) {
            const { topY, baseY } = note.getStemExtents();
            top = Math.min(top, topY, baseY);
            bottom = Math.max(bottom, topY, baseY);
          }
        }
      }
    }
    return { top, bottom };
  }

  /** Justify a row horizontally, then place every measure on a shared baseline. */
  private formatRow(indices: number[], widths: number[], y: number): SheetRow {
    const minimum =
      indices.reduce((sum, index) => sum + widths[index], 0) + this.options.measureGap * (indices.length - 1);
    const extra = this.options.justify ? Math.max(0, this.options.width - minimum) / indices.length : 0;
    let x = this.options.x;
    let top = 0;
    let bottom = 0;
    const systems = indices.map((index) => this.systems[index]);
    indices.forEach((index) => {
      const system = this.systems[index];
      system
        .setX(x)
        .setY(0)
        .setWidth(widths[index] + extra);
      system.format();
      const bounds = this.verticalBounds(system);
      top = Math.min(top, bounds.top);
      bottom = Math.max(bottom, bounds.bottom);
      x += system.getWidth() + this.options.measureGap;
    });
    for (const system of systems) {
      system.setY(y - top);
      system.format();
    }
    const width = x - this.options.x - this.options.measureGap;
    return {
      systems,
      x: this.options.x,
      y,
      width,
      height: bottom - top,
      overflow: Math.max(0, width - this.options.width),
    };
  }
}
