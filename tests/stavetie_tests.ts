// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// StaveTie Tests

import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { BuilderOptions } from '../src/easyscore';
import { Factory } from '../src/factory';
import { Stave } from '../src/stave';
import { Stem } from '../src/stem';
import { StemmableNote } from '../src/stemmablenote';

const StaveTieTests = {
  Start(): void {
    QUnit.module('StaveTie');
    const run = VexFlowTests.runTests;
    run('Simple StaveTie', simple);
    run('Dashed ties on selected heads', dashedPitchTies);
    run('Chord StaveTie', chord);
    run('Stem Up StaveTie', stemUp);
    run('No End Note With Clef', noEndNote1);
    run('No End Note', noEndNote2);
    run('No Start Note With Clef', noStartNote1);
    run('No Start Note', noStartNote2);
    run('Set Direction Down', setDirectionDown);
    run('Set Direction Up', setDirectionUp);
    run('Tie Algorithms', tieAlgorithms);
  },
};

/**
 * Used by the 7 tests below to set up the stave, easyscore, notes, voice, and to format & draw.
 */
function createTest(
  notesData: [string, BuilderOptions],
  setupTies: (f: Factory, n: StemmableNote[], s: Stave) => void
) {
  return (options: TestOptions) => {
    const factory = VexFlowTests.makeFactory(options, 300);
    const stave = factory.Stave();
    const score = factory.EasyScore();
    const notes = score.notes(notesData[0], notesData[1]);
    const voice = score.voice(notes);
    // const tickables = voice.getTickables(); // same as the notes that we passed in.

    setupTies(factory, notes, stave);

    factory.Formatter().joinVoices([voice]).formatToStave([voice], stave);
    factory.draw();
    options.assert.ok(true);
  };
}

const simple = createTest(['(cb4 e#4 a4)/2, (d4 e4 f4)', { stem: 'down' }], (f, notes) => {
  f.StaveTie({
    from: notes[0],
    to: notes[1],
    firstIndexes: [0, 1],
    lastIndexes: [0, 1],
  });
});

const chord = createTest(['(d4 e4 f4)/2, (cn4 f#4 a4)', { stem: 'down' }], (f, notes) => {
  f.StaveTie({
    from: notes[0],
    to: notes[1],
    firstIndexes: [0, 1, 2],
    lastIndexes: [0, 1, 2],
  });
});

const stemUp = createTest(['(d4 e4 f4)/2, (cn4 f#4 a4)', { stem: 'up' }], (f, notes) => {
  f.StaveTie({
    from: notes[0],
    to: notes[1],
    firstIndexes: [0, 1, 2],
    lastIndexes: [0, 1, 2],
  });
});

const noEndNote1 = createTest(['(cb4 e#4 a4)/2, (d4 e4 f4)', { stem: 'down' }], (f, notes, stave) => {
  stave.addEndClef('treble');
  f.StaveTie({
    from: notes[1],
    firstIndexes: [2],
    lastIndexes: [2],
    text: 'slow.',
  });
});

const noEndNote2 = createTest(['(cb4 e#4 a4)/2, (d4 e4 f4)', { stem: 'down' }], (f, notes) => {
  f.StaveTie({
    from: notes[1],
    firstIndexes: [2],
    lastIndexes: [2],
    text: 'slow.',
  });
});

const noStartNote1 = createTest(['(cb4 e#4 a4)/2, (d4 e4 f4)', { stem: 'down' }], (f, notes, stave) => {
  stave.addClef('treble');
  f.StaveTie({
    to: notes[0],
    firstIndexes: [2],
    lastIndexes: [2],
    text: 'H',
  });
});

const noStartNote2 = createTest(['(cb4 e#4 a4)/2, (d4 e4 f4)', { stem: 'down' }], (f, notes) => {
  f.StaveTie({
    to: notes[0],
    firstIndexes: [2],
    lastIndexes: [2],
    text: 'H',
  });
});

const setDirectionDown = createTest(['(cb4 e#4 a4)/2, (d4 e4 f4)', { stem: 'down' }], (f, notes) => {
  f.StaveTie({
    from: notes[0],
    to: notes[1],
    firstIndexes: [0, 1],
    lastIndexes: [0, 1],
    options: { direction: Stem.DOWN },
  });
});

const setDirectionUp = createTest(['(cb4 e#4 a4)/2, (d4 e4 f4)', { stem: 'down' }], (f, notes) => {
  f.StaveTie({
    from: notes[0],
    to: notes[1],
    firstIndexes: [0, 1],
    lastIndexes: [0, 1],
    options: { direction: Stem.UP },
  });
});

function tieAlgorithms(options: TestOptions): void {
  const factory = VexFlowTests.makeFactory(options, 300);
  const stave = factory.Stave();
  const score = factory.EasyScore();
  const [n0, n1] = score.notes('(c4 e4 g4)/2, (c4 e4 g4)', { stem: 'up' });
  const voice = score.voice([n0, n1]);
  const tie1 = factory.StaveTie({
    from: n0,
    to: n1,
    firstIndexes: [0],
    lastIndexes: [0],
  });
  const tie2 = factory.StaveTie({
    from: n0,
    to: n1,
    firstIndexes: [1, 2],
    lastIndexes: [1, 2],
    options: { direction: Stem.DOWN },
  });
  factory.Formatter().joinVoices([voice]).formatToStave([voice], stave);
  factory.draw();
  options.assert.equal(tie1.getDirection(), Stem.UP);
  options.assert.equal(tie2.getDirection(), Stem.DOWN);
  options.assert.ok(tie1.getFirstX() < tie1.getLastX());
  n1.setStemDirection(Stem.DOWN);
  options.assert.equal(tie1.getDirection(), Stem.DOWN);
  options.assert.equal(tie2.getDirection(), Stem.DOWN);
}

/** The editorial tie and its solid control both belong to the lower note of each dyad. */
function dashedPitchTies(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 510, 155);
  for (const [bar, key] of ['e/4', 'g/4'].entries()) {
    const stave = f.Stave({ x: 10 + bar * 240, y: 15, width: 240 }).addClef('treble');
    const dyad = () => f.StaveNote({ keys: [key, 'b/4'], duration: 'h', stemDirection: 1 });
    const first = dyad(),
      last = dyad();
    const voice = f.Voice().addTickables([first, last]);
    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);
    const tie = f.StaveTie({ from: first, to: last, firstIndexes: [0], lastIndexes: [0] }).setDirection(1);
    if (bar === 0) tie.setStyle({ lineDash: '4 3' });
    stave.draw();
    voice.draw(f.getContext(), stave);
    tie.drawWithStyle();
    options.assert.deepEqual(tie.getNotes().firstIndexes, [0], 'only the lower head starts a tie');
    options.assert.equal(voice.getTickables().length, 2);
    options.assert.ok(voice.isComplete());
    const path = tie.getSVGElement()?.querySelector('path');
    if (path) {
      const d = path.getAttribute('d') ?? '';
      options.assert.equal((d.match(/Q/g) ?? []).length, bar === 0 ? 1 : 2, 'open dashed arc or closed solid ribbon');
      if (bar === 0) options.assert.ok(getComputedStyle(path).strokeDasharray.includes('4'), 'stroke has visible gaps');
    }
  }
}

VexFlowTests.register(StaveTieTests);
export { StaveTieTests };
