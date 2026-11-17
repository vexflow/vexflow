// Automatic beaming reuses native rational grouping with an explicit EasyScore stem policy.
import { Beam } from '../beam';
import type { EasyScore } from '../easyscore';
import { Factory } from '../factory';
import { Fraction } from '../fraction';
import { StemmableNote } from '../stemmablenote';
import { Tables } from '../tables';
import { RuntimeError } from '../util';

/** Native grouping/render options, with the same stem override used by EasyScore.beam(). */
export type EasyScoreAutoBeamOptions = Omit<NonNullable<Parameters<typeof Beam.generateBeams>[1]>, 'stemPolicy'> & {
  autoStem?: boolean;
};

/** Validate every setting before native grouping mutates existing notes or tuplets. */
export function autoBeam(score: EasyScore, notes: StemmableNote[], options: EasyScoreAutoBeamOptions): Beam[] {
  if (new Set(notes).size !== notes.length) throw new RuntimeError('BadArguments', 'Beam notes must be distinct.');
  notes.forEach((note) => {
    if (!(note instanceof StemmableNote) || Factory.getOwner(note) !== score.factory)
      throw new RuntimeError('BadArguments', 'Beam notes must belong to this Factory.');
    if (note.hasBeam()) throw new RuntimeError('BadArguments', 'Note already belongs to a beam.');
  });
  const time = score.defaults.time ?? '4/4';
  const signature = typeof time === 'string' ? time : `${time.numBeats}/${time.beatValue}`;
  const groups = options.groups ?? Beam.getDefaultBeamGroups(signature);
  if (
    !groups.length ||
    groups.some((group) => !(group instanceof Fraction) || !Number.isFinite(group.value()) || group.value() <= 0)
  ) {
    throw new RuntimeError('BadArguments', 'Beam groups must be positive finite Fractions.');
  }
  if (options.secondaryBreaks !== undefined) Tables.durationToTicks(options.secondaryBreaks);
  if (options.stemDirection !== undefined && ![1, -1].includes(options.stemDirection))
    throw new RuntimeError('BadArguments', 'Invalid beam stem direction.');
  const { autoStem, ...native } = options;
  const stemPolicy =
    autoStem === false ? 'preserve' : autoStem === true || options.stemDirection !== undefined ? 'auto' : 'explicit';
  return score.build(() =>
    Beam.generateBeams(notes, { ...native, groups: groups.map((group) => group.clone()), stemPolicy }).map((beam) =>
      score.adopt(beam, 'drawable')
    )
  );
}
