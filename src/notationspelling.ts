// Opt-in written pitch and rhythm spelling. Neither helper edits an existing voice.
import { Tables } from './tables';
import { RuntimeError } from './util';

/** One printable segment. tieNext joins a pitched continuation across a requested boundary. */
export interface RhythmSegment {
  start: number;
  duration: string;
  dots: number;
  tieNext: boolean;
}

export class NotationSpelling {
  /** Transpose by both chromatic semitones and diatonic steps, e.g. +2/+1 for B-flat clarinet. */
  static transpose(key: string, semitones: number, steps: number): string {
    const parsed = /^([a-g])(bb|##|b|#|n)?\/(-?\d+)$/i.exec(key);
    if (!parsed || !Number.isSafeInteger(semitones) || !Number.isSafeInteger(steps))
      throw new RuntimeError('BadArguments', 'Expected a written pitch and integer transposition.');
    const letters = 'cdefgab',
      naturals = [0, 2, 4, 5, 7, 9, 11];
    const index = letters.indexOf(parsed[1].toLowerCase()),
      octave = Number(parsed[3]);
    const target = octave * 7 + index + steps,
      letter = ((target % 7) + 7) % 7;
    const targetOctave = Math.floor(target / 7);
    const signs = ['bb', 'b', '', '#', '##'];
    const accidental = parsed[2]?.toLowerCase();
    const alteration = accidental && accidental !== 'n' ? signs.indexOf(accidental) - 2 : 0;
    const delta = octave * 12 + naturals[index] + alteration + semitones - (targetOctave * 12 + naturals[letter]);
    if (!(Math.abs(delta) <= 2))
      throw new RuntimeError('BadArguments', 'Spelling requires more than a double accidental.');
    return letters[letter] + signs[delta + 2] + '/' + targetOctave;
  }

  /** Preserve the mode while spelling the transposed tonic. Reject unavailable standard signatures. */
  static transposeKey(key: string, semitones: number, steps: number): string {
    Tables.keySignature(key);
    const minor = key.endsWith('m');
    const pitch = this.transpose((minor ? key.slice(0, -1) : key) + '/4', semitones, steps).split('/')[0];
    const result = pitch[0].toUpperCase() + pitch.slice(1) + (minor ? 'm' : '');
    Tables.keySignature(result);
    return result;
  }

  /** Spell on a 1/64-note grid. Cuts are absolute barlines or group boundaries supplied by the caller. */
  static rhythm(start: number, length: number, cuts: readonly number[] = [], rest = false): RhythmSegment[] {
    const end = start + length;
    if (![start, length, end, ...cuts].every(Number.isSafeInteger) || start < 0 || length <= 0)
      throw new RuntimeError('BadArguments', 'Expected integer positions in 64th notes and a positive length.');
    const stops = [...new Set(cuts.filter((n) => n > start && n < end))].sort((a, b) => a - b);
    const segments: RhythmSegment[] = [];
    let position = start;
    for (const stop of [...stops, end]) {
      while (position < stop) {
        const remaining = stop - position;
        let unit = 64;
        while (unit > remaining) unit /= 2;
        const dotted = unit >= 2 && unit * 1.5 <= remaining;
        const next = position + unit * (dotted ? 1.5 : 1);
        segments.push({
          start: position,
          duration: String(64 / unit),
          dots: dotted ? 1 : 0,
          tieNext: !rest && next < end,
        });
        position = next;
      }
    }
    return segments;
  }
}

/** Accidental memory for a single staff and bar. A signature maps a letter to a written sign in every octave. */
export class WrittenAccidentalState {
  private readonly seen = new Map<string, string>();
  private readonly signature: Readonly<Record<string, string>>;

  constructor(signature: Readonly<Record<string, string>> = {}) {
    this.signature = { ...signature };
  }

  /** Start a new bar in the same signature. Construct a new state on a signature change. */
  reset(): void {
    this.seen.clear();
  }

  /** Return the sign to print. Cautionaries print on request even when the sign is already in force. */
  sign(key: string, sign: string, cautionary = false): string | undefined {
    const pitch = key.toLowerCase();
    if (!/^[a-g]\/-?\d+$/.test(pitch) || !sign)
      throw new RuntimeError('BadArguments', 'Expected a staff pitch and a written accidental.');
    const previous = this.seen.get(pitch) ?? this.signature[pitch[0]] ?? 'n';
    this.seen.set(pitch, sign);
    return cautionary || sign !== previous ? sign : undefined;
  }
}
