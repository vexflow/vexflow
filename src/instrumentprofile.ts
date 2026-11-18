// Instrument mappings resolve named musical events into ordinary VF5 note descriptions.
import { NotationIdentity } from './note';
import { StaveNoteStruct } from './stavenote';
import { TabNoteStruct } from './tabnote';
import { Tuning } from './tuning';
import { RuntimeError } from './util';

/** A written position uses VexFlow note lines (1 = bottom line, 5 = top on a five-line staff). */
export interface PercussionInstrument {
  id: string;
  label: string;
  line: number;
  head?: 'normal' | 'cross' | 'circle-cross' | 'triangle';
  stem: 'up' | 'down';
}

/** A custom kit and its legend share the same named entries. No playback pitches are inferred. */
export class PercussionMap {
  static readonly kit: readonly PercussionInstrument[] = [
    { id: 'kick', label: 'Bass drum', line: 1.5, stem: 'down' },
    { id: 'snare', label: 'Snare drum', line: 3.5, stem: 'up' },
    { id: 'hat', label: 'Closed hi-hat', line: 5.5, head: 'cross', stem: 'up' },
  ];
  readonly instruments: readonly PercussionInstrument[];

  constructor(entries: readonly PercussionInstrument[] = PercussionMap.kit) {
    if (new Set(entries.map((e) => e.id)).size !== entries.length)
      throw new RuntimeError('BadArguments', 'Duplicate percussion ID.');
    this.instruments = entries.map((entry) => {
      if (!entry.id || !entry.label || !Number.isSafeInteger(entry.line * 2))
        throw new RuntimeError('BadArguments', 'Invalid percussion entry.');
      return { ...entry };
    });
  }

  /** The first instrument supplies the default stem. Callers can override it for another voice. */
  note(ids: readonly string[], duration: string, stem?: 'up' | 'down'): StaveNoteStruct {
    if (!ids.length) throw new RuntimeError('BadArguments', 'A percussion attack needs an instrument.');
    const entries = ids.map((id) => {
      const entry = this.instruments.find((item) => item.id === id);
      if (!entry) throw new RuntimeError('BadArguments', 'Unknown percussion instrument: ' + id);
      return entry;
    });
    const keys = entries.map(({ line, head }) => {
      const step = 28 + 2 * line;
      const key = 'cdefgab'[((step % 7) + 7) % 7] + '/' + Math.floor(step / 7);
      const shape = head === 'cross' ? 'X' : head === 'circle-cross' ? 'CX' : head === 'triangle' ? 'TU' : '';
      return shape ? key + '/' + shape : key;
    });
    return {
      keys,
      duration,
      clef: 'percussion',
      stemDirection: (stem ?? entries[0].stem) === 'up' ? 1 : -1,
      notation: entries.map(({ id, label }, index) => ({ kind: 'unpitched', id, label, index })),
    };
  }
}

/** Paired notation uses written open-string pitches and fret numbers relative to the capo. */
export class FrettedInstrument {
  private readonly tuning: Tuning;

  constructor(
    tuning: string = 'standard',
    readonly capo = 0
  ) {
    if (!Number.isSafeInteger(capo) || capo < 0) throw new RuntimeError('BadArguments', 'Invalid capo fret.');
    this.tuning = new Tuning(tuning);
  }

  /** Build independent standard and tab descriptions for the same attack. */
  attack(
    positions: readonly { str: number; fret: number }[],
    duration: string
  ): { note: StaveNoteStruct; tab: TabNoteStruct } {
    if (!positions.length || new Set(positions.map((p) => p.str)).size !== positions.length)
      throw new RuntimeError('BadArguments', 'A fretted attack needs distinct strings.');
    const keys = positions.map(({ str, fret }) => {
      if (!Number.isSafeInteger(str) || !Number.isSafeInteger(fret) || fret < 0)
        throw new RuntimeError('BadArguments', 'Invalid string or fret.');
      return this.tuning.getNoteForFret(fret + this.capo, str);
    });
    const notation: NotationIdentity[] = positions.map(({ str, fret }, index) => ({
      kind: 'tuning',
      id: 'string-' + str,
      label: 'String ' + str + ', fret ' + fret + ', capo ' + this.capo,
      index,
    }));
    return {
      note: { keys, duration, notation },
      tab: { positions: positions.map((p) => ({ ...p })), duration, notation },
    };
  }
}
