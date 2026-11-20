// Internal ownership for a beamed chord whose heads belong to two piano staves.
import type { StaveNote } from './stavenote';
import { Stem } from './stem';
import type { StemmableNote } from './stemmablenote';

/** Each attack keeps both native notes. Only the member of the native beam prints the stem. */
interface SplitStem {
  upper: StaveNote;
  lower: StaveNote;
  owner: StaveNote;
  /** Head nearest the beam, regardless of which voice owns it. */
  tipNote: StaveNote;
}

const stems = new WeakMap<StemmableNote, SplitStem>();

/** Install a validated pair after the complete score has passed validation. */
export function linkSplitStem(upper: StaveNote, lower: StaveNote): void {
  const owner = upper.getBeam() ? upper : lower;
  const tipNote = owner.getStemDirection() === Stem.UP ? upper : lower;
  const split = { upper, lower, owner, tipNote };
  stems.set(upper, split);
  stems.set(lower, split);
}

/** Look up both original heads without transferring either event between voices. */
export function splitStemFor(note: StaveNote): SplitStem | undefined {
  return stems.get(note);
}

/** A strip participates in spacing on the staff nearest its tip, even when the other voice owns the beam. */
export function beamStave(note: StemmableNote) {
  return (stems.get(note)?.tipNote ?? note).checkStave();
}
