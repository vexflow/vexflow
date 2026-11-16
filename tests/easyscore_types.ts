// Compile-only consumer contracts. These calls are never executed by the test gallery.
import { Annotation, EasyScore, EasyScoreSource, Element, Fraction, Note, StaveTie, System, Voice } from '../src/index';

/** Keep native return types and reject invalid built-in option types. */
export function easyScoreTypes(): void {
  const score = EasyScore.create({ renderer: { elementId: 'score', width: 500, height: 240 } });
  score.autoBeam(score.notes('C4/8, D4'), { groups: [new Fraction(2, 8)], autoStem: false });
  score.make.tuplet({ notes: score.notes('C4/8, D4, E4'), options: { numNotes: 3, notesOccupied: 2 } });
  // @ts-expect-error The native hairpin renderer requires complete endpoints.
  score.make.hairpin({ type: 1 });
  const composed = score.compose({
    staves: [
      { id: 'staff', measures: [{ voices: [{ notes: [{ note: { keys: ['c/4'], duration: 'w' }, id: 'whole' }] }] }] },
    ],
    spans: [{ kind: 'tie', from: 'whole' }],
  });
  composed.sheet.setWidth(400);
  score.withDefaults({ clef: 'bass' }, (s) => s.notes('C3/w'));
  // @ts-expect-error Composition policies are named choices.
  score.compose({ staves: [], accidentals: 'automatic' });
  // @ts-expect-error Defaults cannot outlive their synchronous callback.
  score.withDefaults({}, async () => 1);
  const tab = score.make.tabNote({ positions: [{ str: 2, fret: 'X' }], duration: 'q' }, true);
  score.make.tabTie({ firstNote: tab }, 'H');
  score.attachToStave(score.make.tabStave(), score.make.clef('tab'));
  // @ts-expect-error Tablature positions require numeric string indexes.
  score.make.tabNote({ positions: [{ str: 'one', fret: 3 }], duration: 'q' });
  // @ts-expect-error Staff modifiers cannot be attached as note modifiers.
  score.attach(tab, score.make.clef('tab'));
  const nativeNote = score.make.note({ keys: ['c/4/x'], duration: 'q', autoStem: true });
  score.sequence(['C4/q', nativeNote, { keys: ['d/4'], duration: 'q' }]);
  score.make.graceNoteGroup({ notes: [score.make.graceNote({ keys: ['d/4'], duration: '16', slash: true })] });
  score.make.articulation({ type: 'fermata' }).setBetweenLines(false);
  score.make.ornament('tr', { upperAccidental: '#' });
  score.make.tremolo(3);
  // @ts-expect-error Typed notes require a duration.
  score.make.note({ keys: ['c/4'] });
  // @ts-expect-error Native tremolo counts are numbers.
  score.make.tremolo('three');
  const notes = score.notes('C4/h, C4', { octaveShift: 1, durationOverride: new Fraction(1, 2) });
  const annotation: Annotation = score.make.annotation({ text: 'dolce' });
  score.attach(notes[0], annotation);
  const tie: StaveTie = score.make.tie({ from: notes[0], to: notes[1] });
  tie.setDirection(1);
  const adopted: Annotation = score.adopt(new Annotation('extension'), 'modifier');
  const resolved: Element | undefined = score.getElement(adopted.getAttribute('id'));
  const named: Note = score.getNote(notes[0].getAttribute('id'));
  const source: EasyScoreSource | undefined = score.getSource(named);
  if (resolved && source) EasyScore.getSource(resolved);
  score.make.tie({ from: named });
  // @ts-expect-error Adoption needs an explicit known role.
  score.adopt(annotation, 'automatic');
  // @ts-expect-error Generic lookup cannot assume a note type.
  score.make.tie({ from: score.getElement('note') });
  const voice: Voice = score.voice(notes, { time: { numBeats: 4, beatValue: 4 }, mode: 'soft', softmaxFactor: 1 });
  const system: System = score.system();
  score.sheet({ width: 600 }).addSystem();
  const built: Annotation = score.build((builder) => builder.make.annotation({ text: 'batch' }));
  built.setText('native');
  // @ts-expect-error Batch construction cannot extend beyond its synchronous transaction.
  score.build(async () => 1);
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
