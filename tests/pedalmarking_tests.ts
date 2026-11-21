// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// Sustain pedal marks and concert harp pedal-change instructions.
// TODO: Fix Error => Type 'Tickable' is not assignable to type 'StaveNote'.
import { VexFlow } from '../src/vexflow';
import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { Factory } from '../src/factory';
import { HarpPedalSettings } from '../src/harppedals';
import { StaveNote } from '../src/stavenote';
import { Tickable } from '../src/tickable';

const PedalMarkingTests = {
  Start(): void {
    QUnit.module('PedalMarking');
    QUnit.test('annotationClearance', annotationClearance);

    const run = VexFlowTests.runTests;
    run('Harp pedal changes at a rest and entrance', harpPedalChanges);
    run('Simple Pedal 1', simple1);
    run('Simple Pedal 1b', simple1b);
    run('Simple Pedal 2', simple2);
    run('Simple Pedal 2b', simple2b);
    run('Simple Pedal 3', simple3);
    run('Simple Pedal 3b', simple3b);
    run('Release and Depress on Same Note 1b', releaseDepress1b);
    run('Release and Depress on Same Note 1', releaseDepress1);
    run('Release and Depress on Same Note 2b', releaseDepress2b);
    run('Release and Depress on Same Note 2', releaseDepress2);
    run('Custom Text 1', customTest1);
    run('Custom Text 2', customTest2);
  },
};

/** Check ordered changes, retained settings and modifier space on the same notes after reflow. */
function harpPedalChanges(options: TestOptions): void {
  const assert = options.assert;
  const f = VexFlowTests.makeFactory(options, 420, 155);
  const initial: HarpPedalSettings = {
    D: 'natural',
    C: 'natural',
    B: 'natural',
    E: 'natural',
    F: 'natural',
    G: 'natural',
    A: 'natural',
  };
  const pedals = new VexFlow.HarpPedalChanges(initial);
  const notes = [
    f.StaveNote({ keys: ['c/4'], duration: 'q' }),
    f.StaveNote({ keys: ['b/4'], duration: 'qr' }),
    f.StaveNote({ keys: ['g/4'], duration: 'q' }),
    f.StaveNote({ keys: ['f/4'], duration: 'q' }),
  ];
  const first = pedals.apply(notes[1], { F: 'sharp', B: 'flat' });
  assert.equal(first?.getText(), 'B♭\u2002F♯', 'Changed names follow pedal order');
  assert.deepEqual(pedals.getSettings(), { ...initial, B: 'flat', F: 'sharp' }, 'Other pedals stay natural');
  assert.equal(pedals.apply(notes[2], pedals.getSettings()), undefined, 'Repeated full setting is silent');
  assert.equal(notes[2].getModifiers().length, 0, 'No space reserved for an empty change');
  assert.throws(() => pedals.apply(notes[2], { F: 'invalid' } as unknown as Partial<HarpPedalSettings>), /pedal F/);
  const last = pedals.apply(notes[3], { F: 'natural' });
  assert.equal(last?.getText(), 'F♮');
  assert.deepEqual(pedals.getSettings(), { ...initial, B: 'flat' }, 'B remains flat after resetting F');
  if (!first || !last) return;

  const dynamic = f.TextDynamics({ text: 'mf', duration: 'q', line: 10 });
  const dynamics = [f.GhostNote('q'), f.GhostNote('q'), dynamic, f.GhostNote('q')];
  const system = f.System({ x: 12, y: 10, width: 400 });
  system.addStave({ voices: [f.Voice().addTickables(notes), f.Voice().addTickables(dynamics)] }).addClef('treble');
  const restXs = [];
  for (const width of [400, 260]) {
    system.setWidth(width);
    f.getContext().clear();
    f.draw({ retain: true });
    for (const label of [first, last]) {
      const box = label.getBoundingBox();
      const note = label.checkAttachedNote();
      const anchor = note.getModifierStartXY(VexFlow.Modifier.Position.BELOW, 0);
      assert.ok(Math.abs(box.x + box.w / 2 - anchor.x) < 0.01, 'Instruction stays centered at the anchor');
      const space = note.getModifierContext()!.getState();
      assert.ok(space.leftShift + note.getGlyphWidth() + space.rightShift >= box.w, 'The full label has space');
    }
    const rest = first.getBoundingBox();
    const mf = dynamic.getBoundingBox();
    assert.ok(rest.x + rest.w < mf.x && mf.x + mf.w < last.getBoundingBox().x, 'Both labels clear the dynamic');
    restXs.push(rest.x);
  }
  assert.ok(restXs[1] < restXs[0], 'The rest and its label moved when the system narrowed');
}

/**
 * Tests below uses this to set up the score and two staves with one voice.
 */
function createTest(makePedal: (f: Factory, v1: Tickable[], v2: Tickable[]) => void) {
  return (options: TestOptions) => {
    const f = VexFlowTests.makeFactory(options, 550, 200);
    const score = f.EasyScore();

    const stave0 = f.Stave({ width: 250 }).addClef('treble');
    const voice0 = score.voice(score.notes('b4/4, b4, b4, b4[stem="down"]', { stem: 'up' }));
    f.Formatter().joinVoices([voice0]).formatToStave([voice0], stave0);

    const stave1 = f.Stave({ width: 260, x: 250 });
    const voice1 = score.voice(score.notes('c4/4, c4, c4, c4', { stem: 'up' }));
    f.Formatter().joinVoices([voice1]).formatToStave([voice1], stave1);

    makePedal(f, voice0.getTickables(), voice1.getTickables());

    f.draw();

    options.assert.ok(true, 'Must render');
  };
}

/**
 * Tests below use this to set up the score and two staves with two voices.
 */
function createTest2(makePedal: (f: Factory, v1: Tickable[], v2: Tickable[]) => void) {
  return (options: TestOptions) => {
    const f = VexFlowTests.makeFactory(options, 550, 200);
    const score = f.EasyScore();

    const stave0 = f.Stave({ width: 250 }).addClef('treble');
    const voice0 = score.voice(score.notes('b4/4, b4, b4, b4', { stem: 'down' }));
    const voice0b = score.voice(score.notes('b5/4, b5, b5, b5', { stem: 'up' }));
    f.Formatter().joinVoices([voice0, voice0b]).formatToStave([voice0, voice0b], stave0);

    const stave1 = f.Stave({ width: 260, x: 250 });
    const voice1 = score.voice(score.notes('c4/4, c4, c4, c4', { stem: 'down' }));
    const voice1b = score.voice(score.notes('c5/4, c5, c5, c5/16, c5/16, c5/16, c5/16', { stem: 'up' }));
    f.Formatter().joinVoices([voice1, voice1b]).formatToStave([voice1, voice1b], stave1);

    makePedal(f, voice0.getTickables(), voice1.getTickables());

    f.draw();

    options.assert.ok(true, 'Must render');
  };
}

function withSimplePedal(style: string) {
  return (factory: Factory, notes0: Tickable[], notes1: Tickable[]) =>
    factory.PedalMarking({
      notes: [notes0[0], notes0[2], notes0[3], notes1[3]] as StaveNote[],
      options: { style },
    });
}

function withReleaseAndDepressedPedal(style: string) {
  return (factory: Factory, notes0: Tickable[], notes1: Tickable[]) =>
    factory.PedalMarking({
      notes: [notes0[0], notes0[3], notes0[3], notes1[1], notes1[1], notes1[3]] as StaveNote[],
      options: { style },
    });
}

const simple1 = createTest(withSimplePedal('text'));
const simple2 = createTest(withSimplePedal('bracket'));
const simple3 = createTest(withSimplePedal('mixed'));
const releaseDepress1 = createTest(withReleaseAndDepressedPedal('bracket'));
const releaseDepress2 = createTest(withReleaseAndDepressedPedal('mixed'));
const simple1b = createTest2(withSimplePedal('text'));
const simple2b = createTest2(withSimplePedal('bracket'));
const simple3b = createTest2(withSimplePedal('mixed'));
const releaseDepress1b = createTest2(withReleaseAndDepressedPedal('bracket'));
const releaseDepress2b = createTest2(withReleaseAndDepressedPedal('mixed'));

const customTest1 = createTest((factory, notes0, notes1) => {
  const pedal = factory.PedalMarking({
    notes: [notes0[0], notes1[3]] as StaveNote[],
    options: { style: 'text' },
  });
  pedal.setCustomText('una corda', 'tre corda');
  return pedal;
});

const customTest2 = createTest((factory, notes0, notes1) => {
  const pedal = factory.PedalMarking({
    notes: [notes0[0], notes1[3]] as StaveNote[],
    options: { style: 'mixed' },
  });
  pedal.setCustomText('Sost. Ped.');
  return pedal;
});

VexFlowTests.register(PedalMarkingTests);
export { PedalMarkingTests };

/** Pedal changes clear annotations on intermediate notes before those notes draw. */
function annotationClearance(assert: Assert): void {
  const V = VexFlow;
  const stave = new V.Stave(20, 60, 600);
  const notes = Array.from({ length: 4 }, () => new StaveNote({ keys: ['c/4'], duration: 'q' }).setStave(stave));
  const annotations = ['pedal', 'change', 'gypsy', 'mark'].map((text, i) => {
    const annotation = new V.Annotation(text).setVerticalJustification('bottom').setFontSize(20);
    notes[i].addModifier(annotation, 0);
    return annotation;
  });
  const voice = new V.Voice('4/4').addTickables(notes);
  new V.Formatter().joinVoices([voice]).formatToStave([voice], stave);
  for (const type of ['bracket', 'mixed']) {
    const pedal = new V.PedalMarking([notes[0], notes[1], notes[1], notes[3]]).setType(type);
    if (type === 'mixed') pedal.setCustomText('Ped.');
    const bottom = Math.max(...annotations.map((a) => a.computeY().y + a.getTextMetrics().actualBoundingBoxDescent));
    assert.ok(pedal.getYForStave(stave) - pedal.renderOptions.bracketHeight >= bottom + 4);
    annotations[2].setTextBaseline(300);
    assert.ok(pedal.getYForStave(stave) >= 314, 'Explicit baselines are respected');
    annotations[2].setTextBaseline();
  }
}
