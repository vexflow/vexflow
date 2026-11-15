// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// Voice Tests

import { VexFlow } from '../src/vexflow';
import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { Formatter } from '../src/formatter';
import { ContextBuilder } from '../src/renderer';
import { Stave } from '../src/stave';
import { Barline } from '../src/stavebarline';
import { StaveNote } from '../src/stavenote';
import { Voice } from '../src/voice';
import { MockTickable } from './mocks';

const VoiceTests = {
  Start(): void {
    QUnit.module('Voice');
    QUnit.test('tupletDurationEdits', tupletDurationEdits);
    QUnit.test('Strict Test', strict);
    QUnit.test('Ignore Test', ignore);
    VexFlowTests.runTests('Full Voice Mode Test', full);
  },
};

const BEAT = (1 * VexFlow.RESOLUTION) / 4;

// Helper function to create a tickable with a preset number of ticks.
const createTickable = () => new MockTickable().setTicks(BEAT);

function strict(assert: Assert): void {
  assert.expect(8);

  const tickables = [createTickable(), createTickable(), createTickable()];

  const voice = new Voice(VexFlow.TIME4_4);
  assert.equal(voice.getTotalTicks().value(), BEAT * 4, '4/4 Voice has 4 beats');
  assert.equal(voice.getTicksUsed().value(), BEAT * 0, 'No beats in voice');
  voice.addTickables(tickables);
  assert.equal(voice.getTicksUsed().value(), BEAT * 3, 'Three beats in voice');
  voice.addTickable(createTickable());
  assert.equal(voice.getTicksUsed().value(), BEAT * 4, 'Four beats in voice');
  assert.equal(voice.isComplete(), true, 'Voice is complete');

  const numeratorBeforeException = voice.getTicksUsed().numerator;
  assert.throws(() => voice.addTickable(createTickable()), /BadArgument/, '"Too many ticks" exception');

  // Verify that adding too many ticks does not affect the `ticksUsed` property of the voice.
  // See voice.ts: this.ticksUsed.subtract(ticks);
  assert.equal(
    voice.getTicksUsed().numerator,
    numeratorBeforeException,
    'Revert `ticksUsed` after a "Too many ticks" exception'
  );

  assert.equal(voice.getSmallestTickCount().value(), BEAT, 'Smallest tick count is BEAT');
}

function ignore(assert: Assert): void {
  const tickables = [
    createTickable(),
    createTickable(),
    createTickable().setIgnoreTicks(true),
    createTickable(),
    createTickable().setIgnoreTicks(true),
    createTickable(),
  ];

  const voice = new Voice(VexFlow.TIME4_4);
  voice.addTickables(tickables);
  assert.ok(true, 'all pass');
}

function full(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 550, 200);

  const stave = new Stave(10, 50, 500).addClef('treble').addTimeSignature('4/4').setEndBarType(Barline.type.END);

  const notes = [
    new StaveNote({ keys: ['c/4'], duration: '4' }),
    new StaveNote({ keys: ['d/4'], duration: '4' }),
    new StaveNote({ keys: ['r/4'], duration: '4r' }),
  ];

  notes.forEach((note) => note.setStave(stave));

  const voice = new Voice(VexFlow.TIME4_4).setMode(Voice.Mode.FULL).addTickables(notes);

  new Formatter().joinVoices([voice]).formatToStave([voice], stave);

  stave.setContext(ctx).drawWithStyle();
  voice.draw(ctx);
  const bb = voice.getBoundingBox();
  if (bb) {
    ctx.rect(bb.getX(), bb.getY(), bb.getW(), bb.getH());
  }
  ctx.stroke();

  options.assert.throws(
    () => voice.addTickable(new StaveNote({ keys: ['c/4'], duration: '2' })),
    /BadArgument/,
    'Voice cannot exceed full amount of ticks'
  );
}

VexFlowTests.register(VoiceTests);
export { VoiceTests };

/** Voice timing must follow late, repeated, and nested tuplet edits. */
function tupletDurationEdits(assert: Assert): void {
  const notes = Array.from({ length: 3 }, () => new StaveNote({ keys: ['c/4'], duration: '8' }));
  const voice = new Voice('1/4').setStrict(false).addTickables(notes);
  assert.equal(voice.getTicksUsed().value(), 6144);
  const tuplet = new VexFlow.Tuplet(notes, { numNotes: 3, notesOccupied: 2 });
  voice.setStrict(true);
  assert.equal(voice.getTicksUsed().value(), 4096);
  assert.ok(voice.isComplete());
  tuplet.attach();
  notes[0].addTuplet(tuplet);
  assert.equal(voice.getTicksUsed().value(), 4096, 'Repeated attachment is harmless');
  assert.equal(voice.getSmallestTickCount().value(), 4096 / 3);
  assert.equal(voice.getResolutionMultiplier(), 3);
  const nested = new VexFlow.Tuplet(notes, { numNotes: 3, notesOccupied: 2 });
  assert.equal(voice.getTicksUsed().value(), (4096 * 2) / 3);
  notes[0].setDuration(new VexFlow.Fraction(1, 4));
  nested.detach();
  tuplet.detach();
  assert.equal(voice.getTicksUsed().value(), 8192, 'Duration edits retain their unscaled base');
  assert.notOk(voice.isComplete());
  tuplet.attach();
  tuplet.setNotesOccupied(1);
  assert.equal(voice.getTicksUsed().value(), 8192 / 3);
  notes.forEach((note) => note.clearTuplets());
  assert.equal(voice.getTicksUsed().value(), 8192);
  const first = Array.from({ length: 3 }, () => new StaveNote({ keys: ['c/4'], duration: '8' }));
  new VexFlow.Tuplet(first, { numNotes: 3, notesOccupied: 2 });
  const strict = new Voice('1/4').addTickables(first);
  assert.ok(strict.isComplete());
  assert.throws(() => strict.addTickable(new StaveNote({ keys: ['c/4'], duration: '8' })), /Too many ticks/);
  const other = new Voice('1/4').addTickables([new StaveNote({ keys: ['d/4'], duration: 'q' })]);
  new Formatter().joinVoices([strict, other]).format([strict, other], 300);
}
