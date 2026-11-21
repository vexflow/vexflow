// Derive a conductor staff from two monophonic parts while preserving the original rhythmic voices.
import { Annotation } from './annotation';
import type { EasyScoreComposition, EasyScoreStaveSpec } from './easyscore';
import { StaveNote } from './stavenote';
import { Stem } from './stem';
import type { Tickable } from './tickable';
import { RuntimeError } from './util';

/** Players are ordered by desk number. Optional passage boundaries are inclusive source measure numbers. */
export interface PublicationCondense {
  players: readonly [string, string];
  measures?: readonly [number, number];
  name?: string;
}

/** Project both voices onto player one's staff without changing either authored part. */
export function condenseStaves(staves: EasyScoreStaveSpec[], request: PublicationCondense): EasyScoreStaveSpec[] {
  const [one, two] = request.players.map((id) => staves.find((s) => s.id === id));
  if (!one || !two || one === two || request.players.length !== 2)
    throw new RuntimeError('BadPublication', 'Condensing requires two distinct selected source players.');
  if (one.kind === 'tab' || two.kind === 'tab' || one.measures.length !== two.measures.length)
    throw new RuntimeError('BadPublication', 'Condensing requires two aligned pitched parts.');
  const name = request.name ?? [one.name ?? one.id, two.name ?? two.id].join(' / ');
  let key1 = one.key ?? 'C',
    key2 = two.key ?? 'C';
  let time1 = one.time ?? '4/4',
    time2 = two.time ?? '4/4';
  const measures = one.measures.map((a, index) => {
    const b = two.measures[index];
    key1 = a.key ?? key1;
    key2 = b.key ?? key2;
    time1 = a.time ?? time1;
    time2 = b.time ?? time2;
    if (a.voices.length !== 1 || b.voices.length !== 1 || key1 !== key2 || time1 !== time2)
      throw new RuntimeError(
        'BadPublication',
        'Condensing requires one voice per player in the same written key and meter.'
      );
    return {
      ...a,
      voices: [a.voices[0], b.voices[0]],
      chords: [...(a.chords ?? []), ...(b.chords ?? [])],
      verses: [...(a.verses ?? []), ...(b.verses ?? [])],
    };
  });
  const shared = { ...one, name, shortName: name, measures };
  return staves.filter((s) => s !== two).map((s) => (s === one ? shared : s));
}

type Texture = '1.' | '2.' | 'a2' | 'divided' | 'rest';

/** Ignore non-rhythmic signatures. A condensed player supplies a single pitch at each sounding attack. */
function line(voice: Tickable[]): StaveNote[] {
  return voice
    .filter((n) => !n.shouldIgnoreTicks())
    .map((note) => {
      if (!(note instanceof StaveNote) || (!note.isRest() && note.getKeys().length !== 1))
        throw new RuntimeError('BadPublication', 'Condense monophonic pitched parts.');
      return note;
    });
}

/** Pick one visible voice at rests or unisons, and give each player a stem when pitches divide. */
function condenseAttack(one: StaveNote, two: StaveNote): Texture {
  if (one.isRest() && two.isRest()) {
    two.renderOptions.draw = false;
    return 'rest';
  }
  if (one.isRest() || two.isRest()) {
    (one.isRest() ? one : two).renderOptions.draw = false;
    return one.isRest() ? '2.' : '1.';
  }
  if (one.getKeys()[0].toLowerCase() === two.getKeys()[0].toLowerCase()) {
    two.renderOptions.draw = false;
    return 'a2';
  }
  one.setStemDirection(Stem.UP);
  two.setStemDirection(Stem.DOWN);
  return 'divided';
}

/** Annotate changes once, before the first formatting pass, so reflow retains their source attacks. */
export function markCondensedPlayers(
  score: EasyScoreComposition,
  staffIndex: number,
  request: PublicationCondense
): void {
  let previous: Texture = 'rest';
  function entrance(texture: Texture, note: StaveNote) {
    if (texture !== previous && texture !== 'rest' && texture !== 'divided')
      note.addModifier(new Annotation(texture).setVerticalJustification('top'));
    previous = texture;
  }
  const [first, last] = request.measures ?? [1, score.notes.length];
  for (const parts of score.notes.slice(first - 1, last)) {
    const [one, two] = parts[staffIndex].map(line);
    const solo = one.every((n) => n.isRest()) ? 1 : two.every((n) => n.isRest()) ? 0 : undefined;
    if (solo !== undefined) {
      const voices = [one, two];
      for (const rest of voices[1 - solo]) rest.renderOptions.draw = false;
      for (const note of voices[solo]) entrance(note.isRest() ? 'rest' : solo === 0 ? '1.' : '2.', note);
    } else if (one.length === two.length && one.every((n, i) => n.getTicks().equals(two[i].getTicks()))) {
      one.forEach((a, i) => {
        const texture = condenseAttack(a, two[i]);
        entrance(texture, texture === '2.' ? two[i] : a);
      });
    } else {
      // Independent rhythms need both full voices, including their rests.
      one.forEach((n) => n.setStemDirection(Stem.UP));
      two.forEach((n) => n.setStemDirection(Stem.DOWN));
      previous = 'divided';
    }
  }
}
