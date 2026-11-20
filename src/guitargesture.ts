// Guitar performance data and its written signs on paired notation and tablature.
import type { NotationIdentity } from './note';
import { RuntimeError } from './util';

/** One right-hand action. Direction follows the physical order of strings for either arrow convention. */
export interface GuitarStroke {
  finger: 'p' | 'i' | 'm' | 'a' | 'e';
  direction: 'bass-to-treble' | 'treble-to-bass';
  golpe?: boolean;
  /** One freely rolled chord occupies its written value. Individual finger attacks are unspecified. */
  roll?: boolean;
  arrows?: 'strings' | 'hand';
}

/** Endpoints are exact fractions of this attack's duration, measured from its onset. */
export interface TimedStringBend {
  string: number;
  semitones: number;
  rise: readonly [number, number];
  hold?: readonly [number, number];
  release?: readonly [number, number];
  /** Optional written amount, e.g. “½”. Defaults to full, ½ or an explicit semitone count. */
  label?: string;
}

/** A string tie carries the target between two adjacent events. Rise belongs to the first event, and
 * hold and release are measured from the start of the tied continuation.
 */
export interface TiedBend {
  semitones: number;
  rise: readonly [number, number];
  hold: readonly [number, number];
  release: readonly [number, number];
  label?: string;
}

/** Normalize the written amount independently of the bend's horizontal length. */
export function bendAmount(bend: Pick<TimedStringBend, 'semitones' | 'label'>): string {
  return bend.label ?? (bend.semitones === 2 ? 'full' : bend.semitones === 1 ? '½' : String(bend.semitones) + ' st');
}

/** Validate increasing fractions within one written event. */
function checkPhases(ends: readonly (readonly [number, number])[]): void {
  let previous: readonly [number, number] = [0, 1];
  for (const end of ends) {
    if (
      !Array.isArray(end) ||
      end.length !== 2 ||
      !end.every(Number.isSafeInteger) ||
      end[1] <= 0 ||
      end[0] <= 0 ||
      end[0] > end[1] ||
      BigInt(end[0]) * BigInt(previous[1]) <= BigInt(previous[0]) * BigInt(end[1])
    )
      throw new RuntimeError('BadArguments', 'Bend endpoints must increase within the written duration.');
    previous = end;
  }
}

/** Check the clocks of the initial attack and tied continuation independently. */
export function copyTiedBend(bend: TiedBend): TiedBend {
  if (!Number.isFinite(bend.semitones) || bend.semitones <= 0)
    throw new RuntimeError('BadArguments', 'A tied bend needs a positive semitone amount.');
  checkPhases([bend.rise]);
  checkPhases([bend.hold, bend.release]);
  return { ...bend, rise: [...bend.rise], hold: [...bend.hold], release: [...bend.release] };
}

/** Validate the performed order before constructing a modifier or changing a note. */
export function copyBend(bend: TimedStringBend): TimedStringBend {
  if (!Number.isInteger(bend.string) || bend.string < 1 || !Number.isFinite(bend.semitones) || bend.semitones <= 0)
    throw new RuntimeError('BadArguments', 'A timed bend needs a string and positive semitone amount.');
  checkPhases([bend.rise, ...(bend.hold ? [bend.hold] : []), ...(bend.release ? [bend.release] : [])]);
  return {
    ...bend,
    rise: [...bend.rise],
    hold: bend.hold && [...bend.hold],
    release: bend.release && [...bend.release],
  };
}

/** Preserve the action as structured score metadata as well as a spoken description. */
export function strokeIdentity(action: GuitarStroke): NotationIdentity {
  if (
    !['p', 'i', 'm', 'a', 'e'].includes(action.finger) ||
    !['bass-to-treble', 'treble-to-bass'].includes(action.direction) ||
    !['hand', 'strings'].includes(action.arrows ?? 'strings')
  )
    throw new RuntimeError('BadArguments', 'Invalid rasgueado finger, direction or arrow convention.');
  const label = [action.roll ? 'Rolled rasgueado' : 'Rasgueado', action.finger, action.direction.replace(/-/g, ' ')];
  if (action.golpe) label.push('simultaneous golpe');
  return { kind: 'technique', id: 'rasgueado', label: label.join(', '), stroke: { ...action } };
}
