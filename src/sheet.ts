// Optional continuous-sheet layout for existing Systems. No music data model or pagination.
import type { Annotation } from './annotation';
import type { Bounds } from './boundingbox';
import { reserveChordSpacing } from './chordspacing';
import { ClefNote } from './clefnote';
import type { ContinuousLayout } from './continuouslayout';
import type { PlacedCompositionMark } from './easyscore/engraving';
import { Factory } from './factory';
import { Note } from './note';
import type { RenderContext } from './rendercontext';
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

/** A drum hand at a native attack. Rests and entries without a hand remain unmarked. */
export interface StickingAssignment {
  note: StaveNote;
  hand?: 'R' | 'L';
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
  /** Note-owned marks, grouped by measure so a line can follow any set of row breaks. */
  private stickingLines: Map<System, Annotation[]>[] = [];
  private placeEngraving?: (rows: readonly SheetRow[]) => PlacedCompositionMark[];
  private engravingMarks: PlacedCompositionMark[] = [];

  /** @internal Run the composition's final-placement hook after all its systems have coordinates. */
  setEngravingPlacement(place: (rows: readonly SheetRow[]) => PlacedCompositionMark[]): void {
    this.placeEngraving = place;
  }

  /** Source-owned custom ink in the sheet coordinate system. Recomputed on every format. */
  getEngravingMarks(): readonly PlacedCompositionMark[] {
    return this.engravingMarks;
  }

  /** @internal Paint after native notation. SVG groups retain the anchor and index into the measured marks. */
  drawEngraving(context: RenderContext): void {
    this.engravingMarks.forEach((mark, index) => {
      context.save();
      const group = context.openGroup('custom-engraving');
      try {
        group?.setAttribute('data-engraving-mark', String(index));
        group?.setAttribute('data-source-event', mark.source.getAttribute('id'));
        mark.draw(context);
      } finally {
        context.closeGroup();
        context.restore();
      }
    });
  }

  private alignedWidths?: readonly number[];

  /** @internal Fit a single reference system to the already formatted measures of a publication. */
  alignToMeasures(widths: readonly number[]): this {
    if (widths.length !== this.systems.length || widths.some((w) => !Number.isFinite(w) || w <= 0))
      throw new RuntimeError('BadArgument', 'Expected a positive width for each reference measure.');
    this.alignedWidths = widths.slice();
    return this;
  }

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

  /** Attach a percussion sticking line after the passage's voices have been added to the sheet. */
  addStickingLine(assignments: readonly StickingAssignment[]): Annotation[] {
    const owners = new Map<StaveNote, System>();
    for (const system of this.systems) {
      for (const voice of system.getVoices()) {
        for (const note of voice.getTickables()) if (note instanceof StaveNote) owners.set(note, system);
      }
    }

    // Validate the complete passage before attaching any marks to caller-owned notes.
    const seen = new Set<StaveNote>();
    let staffIndex: number | undefined;
    for (const { note, hand } of assignments) {
      const system = owners.get(note);
      if (!system || seen.has(note)) throw new RangeError('Sticking assignments need distinct notes on this sheet.');
      seen.add(note);
      if (hand !== undefined && hand !== 'R' && hand !== 'L') throw new RangeError('Expected a right or left hand.');
      const index = system.getStaves().indexOf(note.checkStave());
      if (index < 0 || (staffIndex !== undefined && index !== staffIndex))
        throw new RangeError('A sticking line follows one staff across measures.');
      staffIndex = index;
    }

    const line = new Map<System, Annotation[]>();
    const marks: Annotation[] = [];
    for (const { note, hand } of assignments) {
      if (note.isRest() || hand === undefined) continue;
      const mark = this.options.factory.Annotation({ text: hand, vJustify: 'bottom' });
      note.addModifier(mark);
      marks.push(mark);
      const system = owners.get(note)!;
      const group = line.get(system);
      if (group) group.push(mark);
      else line.set(system, [mark]);
    }
    for (const [system, group] of line) {
      system.getPhraseLayout().addLane(group[0].checkAttachedNote().checkStave(), group, { side: 'below' });
    }
    if (line.size) this.stickingLines.push(line);
    return marks;
  }

  /** @internal Carry the lowest solved sticking baseline across the row before placing the next row. */
  alignSticking(row: SheetRow, includeInk?: (box: Bounds) => void): void {
    for (const line of this.stickingLines) {
      const marks = row.systems
        .flatMap((system) => line.get(system) ?? [])
        .filter((mark) => !this.continuous?.hidden.has(mark.checkAttachedNote()));
      if (!marks.length) continue;
      const baseline = Math.max(...marks.map((mark) => mark.computeY().y));
      for (const mark of marks) {
        mark.setLayoutBaseline(baseline);
        const ink = mark.getTextInk(mark.computeX().x, baseline);
        includeInk?.(ink);
        row.height = Math.max(row.height, ink.y + ink.h - row.y);
      }
    }
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

  /** Required drawing height, including the top inset and final custom ink. */
  getHeight(): number {
    const last = this.rows[this.rows.length - 1];
    let height = last ? last.y + last.height : this.options.y;
    for (const { bounds } of this.engravingMarks) height = Math.max(height, bounds.y + bounds.h);
    return height;
  }

  /** Measure and pack rows. Always recompute, so repeated resize is deterministic. */
  format(): this {
    this.formatRows();
    if (this.placeEngraving) this.engravingMarks = this.placeEngraving(this.rows);
    return this;
  }

  /** Measure and position native rows before custom elements read final coordinates. */
  private formatRows(): this {
    if (this.continuous) {
      this.rows = this.continuous.format(this.options, this.alignedWidths);
      return this;
    }
    const widths = this.measureSystems();
    const padding = new Map<System, number>();
    const fixed = this.alignedWidths;
    if (fixed) {
      const indices = this.systems.map((_, i) => i);
      const row = this.formatRow(indices, fixed, padding, this.options.y);
      // An overfull ossia keeps its barlines aligned and reports the tightest measure to the publication.
      reserveChordSpacing([row], padding);
      row.overflow = Math.max(
        0,
        ...widths.map((minimum, i) => minimum + (padding.get(this.systems[i]) ?? 0) - fixed[i])
      );
      this.rows = [row];
      return this;
    }
    do {
      this.rows = [];
      let y = this.options.y;
      for (const indices of this.packRows(widths, padding)) {
        const row = this.formatRow(indices, widths, padding, y);
        this.rows.push(row);
        y += row.height + this.options.rowGap;
      }
    } while (reserveChordSpacing(this.rows, padding));
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
  private packRows(widths: number[], padding: Map<System, number>): number[][] {
    const groups: number[][] = [];
    let group: number[] = [];
    let used = 0;
    widths.forEach((width, index) => {
      const gap = this.options.measureGap + (padding.get(this.systems[index - 1]) ?? 0);
      if (group.length && used + gap + width > this.options.width) {
        groups.push(group);
        group = [];
        used = 0;
      }
      used += (group.length ? gap : 0) + width;
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
  private formatRow(indices: number[], widths: readonly number[], padding: Map<System, number>, y: number): SheetRow {
    const last = indices[indices.length - 1];
    const endPadding = (index: number) => (index === last ? 0 : (padding.get(this.systems[index]) ?? 0));
    const minimum =
      indices.reduce((sum, index) => sum + widths[index] + endPadding(index), 0) +
      this.options.measureGap * (indices.length - 1);
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
        .setWidth(widths[index] + extra + endPadding(index));
      system.format({ endPadding: endPadding(index) });
      const bounds = this.verticalBounds(system);
      top = Math.min(top, bounds.top);
      bottom = Math.max(bottom, bounds.bottom);
      x += system.getWidth() + this.options.measureGap;
    });
    for (const index of indices) this.systems[index].setY(y - top).format({ endPadding: endPadding(index) });
    const width = x - this.options.x - this.options.measureGap;
    const row = {
      systems,
      x: this.options.x,
      y,
      width,
      height: bottom - top,
      overflow: Math.max(0, width - this.options.width),
    };
    this.alignSticking(row);
    return row;
  }
}
