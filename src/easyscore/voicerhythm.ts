// Resolve written beam groups and polyphonic stem directions once, before screen or page layout.
import type { EasyScore } from '../easyscore';
import { Fraction } from '../fraction';
import { GhostNote } from '../ghostnote';
import { Note } from '../note';
import { Stem } from '../stem';
import { StemmableNote } from '../stemmablenote';
import { Tables } from '../tables';
import { Tickable } from '../tickable';
import { Tuplet, TupletOptions } from '../tuplet';
import { RuntimeError } from '../util';
import type { EasyScoreVoiceSpec } from './composition';
import { autoBeam } from './rhythm';

/** A constructed local tuplet retains the side and bracket choices the author supplied. */
export interface VoiceRhythm {
  notes: Tickable[];
  assignments: Map<Note, string>;
  tuplets: { tuplet: Tuplet; options?: TupletOptions }[];
}

/** Absolute intervals let voices from different home staves share a physical staff, even in polymeter. */
interface Attack {
  note: StemmableNote;
  start: number;
  end: number;
  order: number;
}

/** The first sounding voice reads stems up, subsequent voices down. Skips advance time without taking a voice slot. */
export function resolveActiveStems(
  prepared: VoiceRhythm[][][],
  staffIds: string[],
  nativeInputs: ReadonlySet<Note>
): void {
  const attacks = new Map<string, Attack[]>();
  let firstVoice = 0;
  prepared.forEach((measures, j) => {
    let barStart = new Fraction(0, 1);
    let voiceCount = 0;
    for (const voices of measures) {
      let barEnd = barStart;
      voices.forEach((voice, v) => {
        const clock = barStart.clone();
        for (const note of voice.notes) {
          if (note.shouldIgnoreTicks()) continue;
          const start = clock.value();
          clock.add(note.getTicks());
          if (!(note instanceof StemmableNote) || note instanceof GhostNote) continue;
          const id = voice.assignments.get(note) ?? staffIds[j];
          const staff = attacks.get(id) ?? [];
          staff.push({ note, start, end: clock.value(), order: firstVoice + v });
          attacks.set(id, staff);
        }
        if (clock.greaterThan(barEnd)) barEnd = clock;
      });
      barStart = barEnd;
      voiceCount = Math.max(voiceCount, voices.length);
    }
    firstVoice += voiceCount;
  });
  for (const staff of attacks.values()) {
    staff.sort((a, b) => a.start - b.start);
    let active: Attack[] = [];
    const directions = new Map<StemmableNote, number>();
    for (const attack of staff) {
      active = active.filter((previous) => previous.end > attack.start);
      for (const previous of active) {
        const [upper, lower] = previous.order < attack.order ? [previous, attack] : [attack, previous];
        // A middle voice can meet an upper and a lower voice during one held note; its lower-voice role wins.
        if (!directions.has(upper.note)) directions.set(upper.note, Stem.UP);
        directions.set(lower.note, Stem.DOWN);
      }
      active.push(attack);
    }
    for (const [note, direction] of directions) {
      if (note.isAutoStem() && !nativeInputs.has(note)) note.setStemDirection(direction);
    }
  }
}

/** Apply the local groups before filling the unused beats; every note still contributes to the automatic meter grid. */
export function resolveVoiceBeams(
  score: EasyScore,
  spec: EasyScoreVoiceSpec,
  voice: VoiceRhythm,
  time: string,
  continuous?: ReadonlySet<StemmableNote>
): void {
  if (!spec.autoBeam && !spec.beams?.length) return;
  const timed = voice.notes.filter((note) => !note.shouldIgnoreTicks());
  if (!timed.every((note): note is StemmableNote => note instanceof StemmableNote))
    throw new RuntimeError('BadComposition', 'Beams require stemmable notes or skips.');
  const automatic = typeof spec.autoBeam === 'object' ? spec.autoBeam : {};
  const reserved = new Set<StemmableNote>(continuous && timed.filter((note) => continuous.has(note)));
  for (const group of spec.beams ?? []) {
    const { start, count } = group;
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(count) ||
      start < 0 ||
      count < 2 ||
      start + count > timed.length
    )
      throw new RuntimeError('BadComposition', 'Explicit beam range is outside its voice.');
    let run: StemmableNote[] = [];
    function finish() {
      if (run.length > 1) {
        const beam = score.make.beam({
          notes: run,
          options: {
            frenchBeams: group.frenchBeams ?? automatic.frenchBeams,
            feathered: group.feathered ?? automatic.feathered,
          },
        });
        beam.renderOptions.flatBeams = group.flatBeams ?? automatic.flatBeams ?? false;
        beam.renderOptions.showStemlets = group.showStemlets ?? automatic.showStemlets ?? false;
      }
      run = [];
    }
    for (const note of timed.slice(start, start + count)) {
      if (reserved.has(note)) throw new RuntimeError('BadComposition', 'Explicit beam groups overlap.');
      reserved.add(note);
      if (note instanceof GhostNote) finish();
      else {
        if (note.getIntrinsicTicks() >= Tables.durationToTicks('4'))
          throw new RuntimeError('BadComposition', 'Beamed notes must be shorter than a quarter note.');
        run.push(note);
      }
    }
    finish();
  }
  if (spec.autoBeam) score.withDefaults({ time }, () => autoBeam(score, timed, automatic, reserved));
}

/** Check every local tuplet after the last beam is attached, including nested and partly beamed groups. */
export function resolveTupletAppearance(voice: VoiceRhythm): void {
  for (const { tuplet, options } of voice.tuplets) {
    const members = tuplet.notes;
    const first = members.find((note) => !note.isRest()) ?? members.find((note) => !(note instanceof GhostNote));
    const beam = first?.getBeam();
    tuplet.setBracketed(options?.bracketed ?? (!beam || members.some((note) => note.getBeam() !== beam)));
    if (first)
      tuplet.setTupletLocation(
        options?.location ?? (first.getStemDirection() === Stem.DOWN ? Tuplet.LOCATION_BOTTOM : Tuplet.LOCATION_TOP)
      );
  }
}
