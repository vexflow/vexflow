// Compile-only consumer contracts. These calls are never executed by the test gallery.
import { Annotation, EasyScore, Fraction, StaveTie, System, Voice } from '../src/index';

/** Keep native return types and reject invalid built-in option types. */
export function easyScoreTypes(): void {
  const score = EasyScore.create({ renderer: { elementId: 'score', width: 500, height: 240 } });
  const notes = score.notes('C4/h, C4', { octaveShift: 1, durationOverride: new Fraction(4096, 1) });
  const annotation: Annotation = score.make.annotation({ text: 'dolce' });
  score.attach(notes[0], annotation);
  const tie: StaveTie = score.make.tie({ from: notes[0], to: notes[1] });
  tie.setDirection(1);
  const voice: Voice = score.voice(notes, { time: { numBeats: 4, beatValue: 4 }, mode: 'soft', softmaxFactor: 1 });
  const system: System = score.system();
  system.addStave({ voices: [voice] });
  // @ts-expect-error Known note fields retain their native types, despite legacy extension options.
  score.notes('C4/q', { octaveShift: 'one' });
  // @ts-expect-error Voice modes are explicit.
  score.voice(notes, { mode: 'relaxed' });
  // @ts-expect-error Native annotation options are not arbitrary strings.
  score.make.annotation({ text: 123 });
  // @ts-expect-error Tie endpoints are notes.
  score.make.tie({ from: annotation });
}
