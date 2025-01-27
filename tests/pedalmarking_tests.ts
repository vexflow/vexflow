// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// PedalMarking Tests

// TODO: Fix Error => Type 'Tickable' is not assignable to type 'StaveNote'.

import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { Factory } from '../src/factory';
import { StaveNote } from '../src/stavenote';
import { Tickable } from '../src/tickable';

const PedalMarkingTests = {
  Start(): void {
    QUnit.module('PedalMarking');

    const run = VexFlowTests.runTests;
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
