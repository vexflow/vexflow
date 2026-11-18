// Opt-in accidental generation preserves written pitches and explicit native decorations.
import { Accidental } from '../accidental';
import type { EasyScore } from '../easyscore';
import { Fraction } from '../fraction';
import { GraceNoteGroup } from '../gracenotegroup';
import { Modifier } from '../modifier';
import { Music } from '../music';
import { Stave } from '../stave';
import { StaveNote } from '../stavenote';
import { Voice } from '../voice';

/** Inline signature changes use exact tick onsets shared by all voices on a stave. */
export interface KeyChange {
  at: Fraction;
  key: string;
}

/** Grace attacks in different voices align at the host end of a before-group
 * and at the beginning of an after-group. They never advance the voice clock. */
function orderedAttacks(hosts: StaveNote[], includeGrace: boolean): StaveNote[][] {
  const attacks = new Map<number, StaveNote[]>([[0, hosts.filter((note) => !note.isRest())]]);
  if (includeGrace)
    for (const host of hosts) {
      for (const group of host.getModifiers()) {
        if (!(group instanceof GraceNoteGroup)) continue;
        const notes = group.getGraceNotes();
        notes.forEach((note, i) => {
          if (!(note instanceof StaveNote) || note.isRest()) return;
          const offset = group.getPosition() === Modifier.Position.RIGHT ? i + 1 : i - notes.length;
          const simultaneous = attacks.get(offset) ?? [];
          simultaneous.push(note);
          attacks.set(offset, simultaneous);
        });
      }
    }
  return [...attacks.entries()].sort(([a], [b]) => a - b).map(([, notes]) => notes);
}

/** Each onset is evaluated against one prior state, so voice ordering cannot change accidental output. */
export function applyCompositionAccidentals(
  score: EasyScore,
  voices: Voice[],
  key: string,
  changes: KeyChange[],
  generated: Set<Accidental>,
  stave: Stave,
  includeGrace = false
): void {
  const music = new Music();
  let scale = music.createScaleMap(key);
  const state = new Map<string, string>();
  const positions = new Map<string, { at: Fraction; notes: StaveNote[] }>();
  for (const voice of voices) {
    const at = new Fraction(0, 1);
    for (const note of voice.getTickables()) {
      if (note.shouldIgnoreTicks()) continue;
      const id = at.clone().simplify().toString();
      const group = positions.get(id) ?? { at: at.clone(), notes: [] };
      if (note instanceof StaveNote && note.getStave() === stave) group.notes.push(note);
      positions.set(id, group);
      at.add(note.getTicks());
    }
  }
  let changeIndex = 0;
  const sorted = [...positions.values()].sort((a, b) => (a.at.equals(b.at) ? 0 : a.at.lessThan(b.at) ? -1 : 1));
  for (const group of sorted) {
    while (changeIndex < changes.length && !changes[changeIndex].at.greaterThan(group.at)) {
      scale = music.createScaleMap(changes[changeIndex++].key);
      state.clear();
    }
    for (const notes of orderedAttacks(group.notes, includeGrace)) applyAttack(notes);
  }

  /** Resolve each pitch against the same prior state before committing the whole attack. */
  function applyAttack(notes: StaveNote[]) {
    const simultaneous = new Map<string, Set<string>>();
    for (const note of notes)
      for (const written of note.getKeys()) {
        const [name, octave] = written.split('/');
        const parts = music.getNoteParts(name);
        const id = `${parts.root}/${octave}`;
        const values = simultaneous.get(id) ?? new Set<string>();
        values.add(parts.accidental || 'n');
        simultaneous.set(id, values);
      }
    const updates = new Map<string, Set<string>>();
    for (const note of notes) {
      note.getKeys().forEach((written, index) => {
        const [name, octave] = written.split('/');
        const parts = music.getNoteParts(name);
        const accidental = parts.accidental || 'n';
        const pitch = parts.root + accidental;
        const id = `${parts.root}/${octave}`;
        const previous = state.get(id) ?? scale[parts.root];
        // Only ordinary parser-generated marks can be suppressed. Native/cautionary/microtonal marks stay.
        const marks = note
          .getModifiers()
          .filter((mark): mark is Accidental => mark instanceof Accidental && mark.getIndex() === index);
        const explicit = marks.filter(
          (mark) => !generated.has(mark) || mark.isCautionary() || !Music.accidentals.includes(mark.type)
        );
        for (const mark of marks) {
          if (!explicit.includes(mark)) note.getModifiers().splice(note.getModifiers().indexOf(mark), 1);
        }
        if (!explicit.length && (previous !== pitch || (simultaneous.get(id)?.size ?? 0) > 1))
          score.attach(note, score.make.accidental({ type: accidental }), index);
        // Microtonal spellings have no native key-string representation. Force a fresh sign next time.
        const value = explicit.some((mark) => !Music.accidentals.includes(mark.type)) ? 'microtonal' : pitch;
        const values = updates.get(id) ?? new Set<string>();
        values.add(value);
        updates.set(id, values);
      });
    }
    // Conflicting simultaneous spellings require an explicit sign on the next occurrence.
    updates.forEach((values, id) => state.set(id, values.size === 1 ? [...values][0] : 'ambiguous'));
  }
}
