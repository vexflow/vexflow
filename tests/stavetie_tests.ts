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
    run('Laissez vibrer on one chord head', localTies);
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

/** Keep the open end next to the chosen chord head, including after a width change. */
function localTies(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 600, 240);
  for (const [row, width] of [540, 290].entries()) {
    const stave = f.Stave({ x: 12, y: 12 + row * 110, width }).addClef('treble');
    const chord = () => f.StaveNote({ keys: ['d/4', 'a/4'], duration: 'q', stemDirection: 1 });
    const lower = chord(),
      rest = f.StaveNote({ keys: ['b/4'], duration: 'qr' }),
      upper = chord();
    const voice = f.Voice().addTickables([lower, rest, upper, f.StaveNote({ keys: ['b/4'], duration: 'qr' })]);
    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);
    const down = f.StaveTie({ from: lower, firstIndexes: [0], options: { laissezVibrer: 18, direction: 1 } });
    const up = f.StaveTie({ from: upper, firstIndexes: [1], options: { laissezVibrer: 22, direction: -1 } });
    stave.draw();
    voice.draw(f.getContext(), stave);
    for (const [index, tie] of [down, up].entries()) {
      tie.drawWithStyle();
      const head = (index === 0 ? lower : upper).getHeadInk()[index];
      options.assert.equal(tie.getFirstX(), head.x + head.w, 'attached to the selected head');
      options.assert.equal(tie.getLastX() - tie.getFirstX(), index === 0 ? 18 : 22, 'free endpoint is local');
      options.assert.equal(tie.getBoundingBox().w, tie.getLastX() - tie.getFirstX(), 'layout bounds follow the arc');
      options.assert.deepEqual(tie.getNotes().lastIndexes, [index]);
    }
    options.assert.ok(down.getLastX() < rest.getNoteHeadBeginX(), 'rest on beat two clears the local tie');
    options.assert.ok(voice.isComplete());
    options.assert.equal(
      f.StaveTie({ from: lower }).getLastX(),
      stave.getTieEndX(),
      'ordinary partial tie reaches the edge'
    );
  }
}

VexFlowTests.register(StaveTieTests);
export { StaveTieTests };
