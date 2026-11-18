// Instrument mappings resolve named musical events into ordinary VF5 note descriptions.
import { Fraction } from './fraction';
import { copyBend, GuitarStroke, strokeIdentity, TimedStringBend } from './guitargesture';
import { NotationIdentity } from './note';
import { StaveNoteStruct } from './stavenote';
import { Tables } from './tables';
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

  /** Expand an ordered rasgueado into ordinary paired attacks. Offsets are exact whole-note fractions from its start. */
  rasgueado(
    positions: readonly { str: number; fret: number }[],
    strokes: readonly (GuitarStroke & { duration: string })[]
  ) {
    if (!strokes.length) throw new RuntimeError('BadArguments', 'A rasgueado needs at least one stroke.');
    const clock = new Fraction(0, 1);
    return strokes.map(({ duration, ...stroke }) => {
      const event = this.attack(positions, duration);
      const mark = strokeIdentity(stroke);
      const offset = clock.clone().simplify();
      clock.add(Tables.durationToTicks(duration), Tables.RESOLUTION);
      const notation = [...(event.note.notation ?? []), mark];
      return { offset, note: { ...event.note, notation }, tab: { ...event.tab, notation } };
    });
  }

  /** Attach a bend envelope to one played string. Both views retain its semantics and TAB draws the contour. */
  bentAttack(positions: readonly { str: number; fret: number }[], duration: string, spec: TimedStringBend) {
    const event = this.attack(positions, duration);
    const bend = copyBend(spec);
    const index = positions.findIndex((p) => p.str === bend.string);
    if (index < 0) throw new RuntimeError('BadArguments', 'The bent string must occur in the chord.');
    const label =
      'String ' +
      bend.string +
      ', bend ' +
      bend.semitones +
      (bend.semitones === 1 ? ' semitone by ' : ' semitones by ') +
      bend.rise.join('/') +
      (bend.hold ? ', hold to ' + bend.hold.join('/') : '') +
      (bend.release ? ', release to pitch by ' + bend.release.join('/') : '');
    const mark: NotationIdentity = { kind: 'technique', id: 'string-bend', index, label, bend };
    const notation = [...(event.note.notation ?? []), mark];
    return { note: { ...event.note, notation }, tab: { ...event.tab, notation } };
  }

  /** Build independent standard and tab descriptions for the same attack. */
  attack(
    positions: readonly ({ str: number; fret: number } | { str: number; fret: 'X'; displayKey: string })[],
    duration: string
  ): { note: StaveNoteStruct; tab: TabNoteStruct } {
    if (!positions.length || new Set(positions.map((p) => p.str)).size !== positions.length)
      throw new RuntimeError('BadArguments', 'A fretted attack needs distinct strings.');
    const keys = positions.map((position) => {
      const { str, fret } = position;
      if (fret === 'X') {
        this.tuning.getValueForString(str);
        if (!Number.isSafeInteger(str) || !position.displayKey || !/^[a-g][bn#]*\/\d+$/i.test(position.displayKey))
          throw new RuntimeError('BadArguments', 'A dead string needs a written display pitch.');
        return position.displayKey + '/X';
      }
      if (!Number.isSafeInteger(str) || !Number.isSafeInteger(fret) || fret < 0)
        throw new RuntimeError('BadArguments', 'Invalid string or fret.');
      return this.tuning.getNoteForFret(fret + this.capo, str);
    });
    const notation: NotationIdentity[] = positions.map(({ str, fret }, index) => ({
      kind: fret === 'X' ? 'unpitched' : 'tuning',
      id: 'string-' + str,
      label:
        fret === 'X' ? 'Muted strike on string ' + str : 'String ' + str + ', fret ' + fret + ', capo ' + this.capo,
      index,
    }));
    return {
      note: { keys, duration, notation },
      tab: { positions: positions.map(({ str, fret }) => ({ str, fret })), duration, notation },
    };
  }
}
