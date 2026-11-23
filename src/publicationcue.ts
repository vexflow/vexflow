// Spell the pitches and signatures of a quoted source measure in a receiving part's written key.
import { Builder, EasyScoreContent, EasyScoreSourceSpan, EasyScoreStaveSpec } from './easyscore';
import type { Factory } from './factory';
import { NotationSpelling } from './notationspelling';
import type { StaveNoteStruct } from './stavenote';
import { Tickable } from './tickable';
import { RuntimeError } from './util';

/** Chromatic distance and letter-name displacement from the source to the receiving part. */
export interface CueTransposition {
  semitones: number;
  steps: number;
}

/** Transpose a written pitch while preserving its optional native notehead code. */
function pitch(key: string, interval: CueTransposition): string {
  const [name, octave, head] = key.split('/');
  const written = NotationSpelling.transpose(name + '/' + octave, interval.semitones, interval.steps);
  return head === undefined ? written : written + '/' + head;
}

/** Keep the ordinary parser, duration inheritance and commit hooks for EasyScore strings. */
export class CueBuilder extends Builder {
  constructor(
    factory: Factory,
    private readonly interval: CueTransposition
  ) {
    super(factory);
  }

  override commitPiece(source?: EasyScoreSourceSpan): void {
    if (!['r', 'g'].includes(this.piece.type?.toLowerCase() ?? '')) {
      for (const member of this.piece.chord) {
        const [name, octave] = pitch(member.key + (member.accid ?? '') + '/' + member.octave, this.interval).split('/');
        member.key = name[0];
        member.accid = name.slice(1) || undefined;
        member.octave = octave;
      }
    }
    super.commitPiece(source);
  }
}

/** Rebuild typed pitched events and key changes. Rest positions and durations are copied literally. */
export function writtenCue(staff: EasyScoreStaveSpec, interval: CueTransposition): EasyScoreStaveSpec {
  const signature = (key: string) => NotationSpelling.transposeKey(key, interval.semitones, interval.steps);
  function note<T extends StaveNoteStruct>(source: T): T {
    if (source.type === 'r' || source.duration.endsWith('r')) return source;
    if (source.heads)
      return { ...source, heads: source.heads.map((head) => ({ ...head, key: pitch(head.key, interval) })) };
    return source.keys ? { ...source, keys: source.keys.map((key) => pitch(key, interval)) } : source;
  }
  function event(item: EasyScoreContent): EasyScoreContent {
    if (typeof item === 'string') return item; // CueBuilder handles each parsed pitch.
    if (item instanceof Tickable || 'tab' in item)
      throw new RuntimeError('BadPublication', 'A written cue transposes declarative pitched staff notes.');
    if ('skip' in item || 'direction' in item) return item;
    if ('change' in item)
      return item.change.key ? { change: { ...item.change, key: signature(item.change.key) } } : item;
    if (!('note' in item)) return note(item);
    if (!item.grace) return { ...item, note: note(item.note) };
    const notes = item.grace.notes.map((grace) => {
      const written = note(grace);
      const accidentals = grace.accidentals?.map((mark) => {
        const key = grace.heads?.[mark.index]?.key ?? grace.keys?.[mark.index];
        if (!key) throw new RuntimeError('BadPublication', 'Missing grace head for a cue accidental.');
        const [name, octave] = key.split('/');
        const transposed = pitch(name[0] + mark.type + '/' + octave, interval);
        return { ...mark, type: transposed.split('/')[0].slice(1) || 'n' };
      });
      return { ...written, accidentals };
    });
    return { ...item, note: note(item.note), grace: { ...item.grace, notes } };
  }
  return {
    ...staff,
    key: signature(staff.key ?? 'C'),
    measures: staff.measures.map((measure) => ({
      ...measure,
      key: measure.key && signature(measure.key),
      chords: measure.chords?.map((chord) =>
        'harmony' in chord
          ? { ...chord, harmony: NotationSpelling.transposeChord(chord.harmony, interval.semitones, interval.steps) }
          : chord
      ),
      voices: measure.voices.map((voice) => ({
        ...voice,
        notes: typeof voice.notes === 'string' ? voice.notes : voice.notes.map(event),
      })),
    })),
  };
}
