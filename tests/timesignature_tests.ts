// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// Exercise numeric and symbolic meters, including the four basic mensuration signs.

import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { Fraction } from '../src/fraction';
import { Glyphs } from '../src/glyphs';
import { ContextBuilder } from '../src/renderer';
import { Stave, StaveLineConfig } from '../src/stave';
import { StaveConnector } from '../src/staveconnector';
import { StaveNote } from '../src/stavenote';
import { TimeSignature } from '../src/timesignature';

const TimeSignatureTests = {
  Start(): void {
    QUnit.module('TimeSignature');
    QUnit.test('Time Signature Parser', parser);
    const run = VexFlowTests.runTests;
    run('White mensural long values and signs', mensuralValuesAndSigns, {}, ['Bravura']);
    run('Basic Time Signatures', basic);
    run('Big Signature Test', big);
    run('Additive Signature Test', additive);
    run('Alternating Signature Test', alternating);
    run('Interchangeable Signature Test', interchangeable);
    run('Aggregate Signature Test', agregate);
    run('Complex Signature Test', complex);
    run('Bounding Box Test', boundingBox);
    run('Time Signature multiple staves alignment test', multiple);
    run('Time Signature Change Test', change);
  },
};

/** Compare the same binary exercise under each sign and keep written time independent of the meter. */
function mensuralValuesAndSigns(options: TestOptions): void {
  const { assert } = options;
  const f = VexFlowTests.makeFactory(options, 510, 430);
  const signs = [
    ['mensural-semicircle', Glyphs.mensuralProlation6],
    ['mensural-circle', Glyphs.mensuralProlation2],
    ['mensural-circle-dot', Glyphs.mensuralProlation1],
    ['mensural-semicircle-dot', Glyphs.mensuralProlation5],
  ];
  const glyphs = [Glyphs.mensuralWhiteMaxima, Glyphs.mensuralWhiteLonga, Glyphs.mensuralWhiteBrevis];
  signs.forEach(([spec, glyph], i) => {
    const stave = f.Stave({ x: 10, y: i * 100, width: 475 }).addTimeSignature(spec);
    const [sign] = stave.getModifiers(undefined, TimeSignature.CATEGORY) as TimeSignature[];
    const notes = ['m', 'l', '1/2'].map((duration, index) =>
      f.StaveNote({ duration, keys: [index === 1 ? 'c/5' : 'b/4'], whiteMensural: true })
    );
    const voice = f.Voice({ time: '14/1' }).addTickables(notes);
    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);
    assert.ok(voice.isComplete(), 'four, two and one breves fill the voice');
    assert.deepEqual(
      notes.map((note) => note.getTicks().value() / notes[2].getTicks().value()),
      [4, 2, 1]
    );
    assert.deepEqual(
      notes.map((note) => note.noteHeads[0].text),
      glyphs
    );
    assert.deepEqual(
      notes.map((note) => note.getYs()[0]),
      [2, 1.5, 2].map((line) => stave.getYForLine(line))
    );
    const [maxima, longa, brevis] = notes.map((note) => note.noteHeads[0].getTextInk(0, 0));
    assert.ok(maxima.w > longa.w && Math.abs(longa.w - brevis.w) < 2, 'maxima has the widest body');
    assert.ok(longa.h > brevis.h * 2 && maxima.h > brevis.h * 2, 'maxima and longa include descending stems');
    assert.ok(
      notes.every((note) => !note.hasStem()),
      'no extra modern stem'
    );
    assert.equal(sign.text, glyph);
    const ink = sign.getInkBounds();
    assert.ok(ink.w > 0 && ink.x + ink.w < notes[0].getAbsoluteX(), 'sign precedes the first attack');
  });
  f.draw();
  // An explicitly ternary longa can keep its own duration and its white outline on the same stave.
  const ternary = new StaveNote({
    keys: ['c/5'],
    duration: 'l',
    durationOverride: new Fraction(6, 1),
    whiteMensural: true,
  });
  assert.equal(ternary.getTicks().value(), new StaveNote({ keys: ['c/5'], duration: '1/2' }).getTicks().value() * 3);
  assert.equal(ternary.noteHeads[0].text, Glyphs.mensuralWhiteLonga);
  assert.throws(() => new StaveNote({ keys: ['c/5'], duration: 'q', whiteMensural: true }), /maxima, longa or brevis/);
}

function parser(assert: Assert): void {
  const timeSig = new TimeSignature();
  assert.equal(timeSig.getTimeSpec(), '4/4', 'default time signature is 4/4');

  const mustFail = ['asdf', '123/', '/10', '/', 'C+'];
  mustFail.forEach((invalidString) => {
    assert.throws(() => new TimeSignature(invalidString), /BadTimeSignature/);
  });

  const mustPass = ['4/4', '10/12', '1/8', '1234567890/1234567890', 'C', 'C|', '+'];
  mustPass.forEach((validString) => new TimeSignature(validString));

  timeSig.setTimeSig('4/4');
  assert.equal(timeSig.getIsNumeric(), true, '4/4 is numeric');
  assert.equal(timeSig.getLine(), 0, 'digits are on line 0');
  timeSig.setTimeSig('C|');
  assert.equal(timeSig.getTimeSpec(), 'C|', 'timeSpec changed to C|');
  assert.equal(timeSig.getIsNumeric(), false, 'cut time is not numeric');
  assert.equal(timeSig.getLine(), 2, 'cut/common are on line 2');

  assert.ok(true, 'all pass');
}

function basic(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 600, 120);

  new Stave(10, 10, 500)
    .addTimeSignature('2/2')
    .addTimeSignature('3/4')
    .addTimeSignature('4/4')
    .addTimeSignature('6/8')
    .addTimeSignature('C')
    .addTimeSignature('C|')
    .addTimeSignature('3')
    .addEndTimeSignature('2/2')
    .addEndTimeSignature('3/4')
    .addEndTimeSignature('4/4')
    .addEndClef('treble')
    .addEndTimeSignature('6/8')
    .addEndTimeSignature('C')
    .addEndTimeSignature('C|')
    .setContext(ctx)
    .drawWithStyle();

  options.assert.ok(true, 'all pass');
}

function big(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 400, 120);

  new Stave(10, 10, 300)
    .addTimeSignature('12/8')
    .addTimeSignature('7/16')
    .addTimeSignature('1234567/890')
    .addTimeSignature('987/654321')
    .setContext(ctx)
    .drawWithStyle();

  options.assert.ok(true, 'all pass');
}

function additive(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 400, 120);

  new Stave(10, 10, 300).addTimeSignature('2+3+2/8').setContext(ctx).drawWithStyle();

  options.assert.ok(true, 'all pass');
}

function alternating(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 400, 120);

  new Stave(10, 10, 300)
    .addTimeSignature('6/8')
    .addTimeSignature('+')
    .addTimeSignature('3/4')
    .setContext(ctx)
    .drawWithStyle();

  options.assert.ok(true, 'all pass');
}

function interchangeable(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 400, 120);

  new Stave(10, 10, 300)
    .addTimeSignature('3/4')
    .addTimeSignature('-')
    .addTimeSignature('2/4')
    .setContext(ctx)
    .drawWithStyle();

  options.assert.ok(true, 'all pass');
}

function agregate(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 400, 120);

  new Stave(10, 10, 300)
    .addTimeSignature('2/4')
    .addTimeSignature('+')
    .addTimeSignature('3/8')
    .addTimeSignature('+')
    .addTimeSignature('5/4')
    .setContext(ctx)
    .drawWithStyle();

  options.assert.ok(true, 'all pass');
}

function complex(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 400, 120);

  new Stave(10, 10, 300)
    .addTimeSignature('(2+3)/16')
    .addTimeSignature('+')
    .addTimeSignature('3/8')
    .setContext(ctx)
    .drawWithStyle();

  options.assert.ok(true, 'all pass');
}

function boundingBox(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 600, 120);

  const stave = new Stave(10, 10, 500)
    .addTimeSignature('(2+3)/16')
    .addTimeSignature('+')
    .addTimeSignature('3/8')
    .addTimeSignature('4/4')
    .addTimeSignature('C')
    .addTimeSignature('5322/3')
    .addTimeSignature('3/54444')
    .setContext(ctx)
    .drawWithStyle();

  const timeSignatures = stave.getModifiers();
  timeSignatures.forEach((timeSignature) => {
    VexFlowTests.drawBoundingBox(ctx, timeSignature);
  });

  options.assert.ok(true, 'all pass');
}

function multiple(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 400, 350);

  // Each StaveLineConfig object is of the form { visible: boolean }.
  const stave1LineConfig: StaveLineConfig[] = [false, false, true, false, false].map((visible) => ({ visible }));
  const stave1 = new Stave(15, 0, 300)
    .setConfigForLines(stave1LineConfig)
    .addClef('percussion')
    .addTimeSignature('4/4', 25) // passing the custom padding in pixels
    .setContext(ctx)
    .drawWithStyle();
  const stave2 = new Stave(15, 110, 300).addClef('treble').addTimeSignature('4/4').setContext(ctx).drawWithStyle();
  const stave3 = new Stave(15, 220, 300).addClef('bass').addTimeSignature('4/4').setContext(ctx).drawWithStyle();

  Stave.formatBegModifiers([stave1, stave2, stave3]);

  new StaveConnector(stave1, stave2).setType('single').setContext(ctx).drawWithStyle();
  new StaveConnector(stave2, stave3).setType('single').setContext(ctx).drawWithStyle();
  new StaveConnector(stave2, stave3).setType('brace').setContext(ctx).drawWithStyle();

  options.assert.ok(true, 'all pass');
}

function change(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 900);
  const stave = f.Stave({ x: 0, y: 0 }).addClef('treble').addTimeSignature('C|');

  const tickables = [
    f.StaveNote({ keys: ['c/4'], duration: '4', clef: 'treble' }),
    f.TimeSigNote({ time: '3/4' }),
    f.StaveNote({ keys: ['d/4'], duration: '4', clef: 'alto' }),
    f.StaveNote({ keys: ['b/3'], duration: '4r', clef: 'alto' }),
    f.TimeSigNote({ time: 'C' }),
    f.StaveNote({ keys: ['c/3', 'e/3', 'g/3'], duration: '4', clef: 'bass' }),
    f.TimeSigNote({ time: '9/8' }),
    f.StaveNote({ keys: ['c/4'], duration: '4', clef: 'treble' }),
  ];
  const voice = f.Voice().setStrict(false).addTickables(tickables);

  f.Formatter().joinVoices([voice]).formatToStave([voice], stave);
  f.draw();

  options.assert.ok(true, 'all pass');
}

VexFlowTests.register(TimeSignatureTests);
export { TimeSignatureTests };
