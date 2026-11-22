// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
// Map physical frets to written pitches using each string's open pitch and nut position.

import { Tables } from './tables';
import { RuntimeError } from './util';

/** Strings are ordered by their one-based TAB numbers, starting with string 1. */
export class Tuning {
  protected tuningValues: number[] = [];
  private nutFrets: readonly number[] = [];

  static get names(): Record<string, string> {
    return {
      standard: 'E/5,B/4,G/4,D/4,A/3,E/3',
      dagdad: 'D/5,A/4,G/4,D/4,A/3,D/3',
      dropd: 'E/5,B/4,G/4,D/4,A/3,D/3',
      eb: 'Eb/5,Bb/4,Gb/4,Db/4,Ab/3,Eb/3',
      standardBanjo: 'D/5,B/4,G/4,D/4,G/5',
    };
  }

  /** Use a preset or comma-separated written pitches, optionally specifying a nut fret for each string. */
  constructor(tuningString = 'E/5,B/4,G/4,D/4,A/3,E/3,B/2,E/2', nutFrets?: readonly number[]) {
    this.setTuning(tuningString, nutFrets);
  }

  /** Return the note number associated to the note string. */
  noteToInteger(noteString: string): number {
    return Tables.keyProperties(noteString).intValue ?? -1;
  }

  /** Replace pitches and nut positions together. A custom tuning defaults to full-length strings. */
  setTuning(tuningString: string, nutFrets?: readonly number[]): void {
    if (tuningString === 'standardBanjo') nutFrets ??= [0, 0, 0, 0, 5];
    if (Object.prototype.hasOwnProperty.call(Tuning.names, tuningString)) {
      tuningString = Tuning.names[tuningString];
    }

    // Splitting first avoids repeatedly scanning long whitespace runs for a comma.
    const values = tuningString.split(',').map((key) => this.noteToInteger(key.trim()));
    if (
      nutFrets &&
      (nutFrets.length !== values.length || Array.from(nutFrets).some((n) => !Number.isSafeInteger(n) || n < 0))
    )
      throw new RuntimeError('BadArguments', 'Expected a nonnegative integer nut fret for each string.');
    this.tuningValues = values;
    this.nutFrets = nutFrets ? [...nutFrets] : [];
  }

  /** Return the note number associated with a tablature string. */
  getValueForString(stringNum: string | number): number {
    const s = Number(stringNum);
    if (!Number.isSafeInteger(s) || s < 1 || s > this.tuningValues.length) {
      throw new RuntimeError(
        'BadArguments',
        `String number must be between 1 and ${this.tuningValues.length}:${stringNum}`
      );
    }

    return this.tuningValues[s - 1];
  }

  /** A displayed zero rings the open string. Numbered frets are measured from the capo or the neck origin. */
  getValueForFret(fretNum: string | number, stringNum: string | number, capo = 0): number {
    const stringValue = this.getValueForString(stringNum);
    const nut = this.nutFrets[Number(stringNum) - 1] ?? 0;
    const fret = Number(fretNum);
    if (!Number.isFinite(fret) || fret < 0 || !Number.isSafeInteger(capo) || capo < 0)
      throw new RuntimeError('BadArguments', 'Expected a nonnegative fret and capo.');
    // A capo below a short string's nut leaves its open pitch unchanged.
    const physical = fret === 0 ? Math.max(nut, capo) : capo + fret;
    if (physical < nut) throw new RuntimeError('BadArguments', `Fret ${physical} is below the nut at fret ${nut}.`);
    return stringValue + physical - nut;
  }

  /** Return the written note for a displayed fret and an optional capo. */
  getNoteForFret(fretNum: string | number, stringNum: string | number, capo = 0): string {
    const noteValue = this.getValueForFret(fretNum, stringNum, capo);
    const octave = Math.floor(noteValue / 12);
    const value = noteValue % 12;

    return `${Tables.integerToNote(value)}/${octave}`;
  }
}
