// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// StaveConnector Tests

// TODO: Should we change StaveConnector.type => StaveConnectorType? We are inconsistent with this.

import { VexFlow } from '../src/vexflow';
import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { Modifier } from '../src/modifier';
import { ContextBuilder } from '../src/renderer';
import { Stave } from '../src/stave';
import { BarlineType } from '../src/stavebarline';
import { StaveConnector } from '../src/staveconnector';

const StaveConnectorTests = {
  Start(): void {
    QUnit.module('StaveConnector');
    const run = VexFlowTests.runTests;
    run('Single Draw Test', drawSingle);
    run('Single Draw Test, 4px Stave Line Thickness', drawSingle4pxStaveLines);
    run('Single Both Sides Test', drawSingleBoth);
    run('Double Draw Test', drawDouble);
    run('Bold Double Line Left Draw Test', drawRepeatBegin);
    run('Bold Double Line Right Draw Test', drawRepeatEnd);
    run('Thin Double Line Right Draw Test', drawThinDouble);
    run('Bold Double Lines Overlapping Draw Test', drawRepeatAdjacent);
    run('Bold Double Lines Offset Draw Test', drawRepeatOffset);
    run('Bold Double Lines Offset Draw Test 2', drawRepeatOffset2);
    run('Brace Draw Test', drawBrace);
    run('Brace Wide Draw Test', drawBraceWide);
    run('Bracket Draw Test', drawBracket);
    run('Combined Draw Test', drawCombined);
  },
};

function drawSingle(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 400, 300);
  const stave1 = new Stave(25, 10, 300);
  const stave2 = new Stave(25, 120, 300);
  stave1.setContext(ctx);
  stave2.setContext(ctx);
  const connector = new StaveConnector(stave1, stave2);
  connector.setType(StaveConnector.type.SINGLE);
  connector.setContext(ctx);
  stave1.drawWithStyle();
  stave2.drawWithStyle();
  connector.drawWithStyle();

  options.assert.ok(true, 'all pass');
}

function drawSingle4pxStaveLines(options: TestOptions, contextBuilder: ContextBuilder): void {
  const oldThickness = VexFlow.STAVE_LINE_THICKNESS;
  VexFlow.STAVE_LINE_THICKNESS = 4;
  const ctx = contextBuilder(options.elementId, 400, 300);
  const stave1 = new Stave(25, 10, 300);
  const stave2 = new Stave(25, 120, 300);
  stave1.setContext(ctx);
  stave2.setContext(ctx);
  const connector = new StaveConnector(stave1, stave2);
  connector.setType(StaveConnector.type.SINGLE);
  connector.setContext(ctx);
  stave1.drawWithStyle();
  stave2.drawWithStyle();
  connector.drawWithStyle();
  VexFlow.STAVE_LINE_THICKNESS = oldThickness;

  options.assert.ok(true, 'all pass');
}

function drawSingleBoth(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 400, 300);
  const stave1 = new Stave(25, 10, 300);
  const stave2 = new Stave(25, 120, 300);
  stave1.setContext(ctx);
  stave2.setContext(ctx);
  const connector1 = new StaveConnector(stave1, stave2);
  connector1.setType(StaveConnector.type.SINGLE_LEFT);
  connector1.setContext(ctx);
  const connector2 = new StaveConnector(stave1, stave2);
  connector2.setType(StaveConnector.type.SINGLE_RIGHT);
  connector2.setContext(ctx);
  stave1.drawWithStyle();
  stave2.drawWithStyle();
  connector1.drawWithStyle();
  connector2.drawWithStyle();

  options.assert.ok(true, 'all pass');
}

function drawDouble(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 400, 300);
  const stave1 = new Stave(25, 10, 300);
  const stave2 = new Stave(25, 120, 300);
  stave1.setContext(ctx);
  stave2.setContext(ctx);
  const connector = new StaveConnector(stave1, stave2);
  const line = new StaveConnector(stave1, stave2);
  connector.setType(StaveConnector.type.DOUBLE);
  connector.setContext(ctx);
  line.setType(StaveConnector.type.SINGLE);
  connector.setContext(ctx);
  line.setContext(ctx);
  stave1.drawWithStyle();
  stave2.drawWithStyle();
  connector.drawWithStyle();
  line.drawWithStyle();

  options.assert.ok(true, 'all pass');
}

function drawBrace(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 450, 300);
  const stave1 = new Stave(100, 10, 300);
  const stave2 = new Stave(100, 120, 300);
  stave1.setContext(ctx);
  stave2.setContext(ctx);
  const connector = new StaveConnector(stave1, stave2);
  const line = new StaveConnector(stave1, stave2);
  connector.setType(StaveConnector.type.BRACE);
  connector.setContext(ctx);
  connector.setText('Piano');
  line.setType(StaveConnector.type.SINGLE);
  connector.setContext(ctx);
  line.setContext(ctx);
  stave1.drawWithStyle();
  stave2.drawWithStyle();
  connector.drawWithStyle();
  line.drawWithStyle();

  options.assert.ok(true, 'all pass');
}

function drawBraceWide(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 400, 300);
  const stave1 = new Stave(25, -20, 300);
  const stave2 = new Stave(25, 200, 300);
  stave1.setContext(ctx);
  stave2.setContext(ctx);
  const connector = new StaveConnector(stave1, stave2);
  const line = new StaveConnector(stave1, stave2);
  connector.setType(StaveConnector.type.BRACE);
  connector.setContext(ctx);
  line.setType(StaveConnector.type.SINGLE);
  connector.setContext(ctx);
  line.setContext(ctx);
  stave1.drawWithStyle();
  stave2.drawWithStyle();
  connector.drawWithStyle();
  line.drawWithStyle();

  options.assert.ok(true, 'all pass');
}

function drawBracket(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 400, 300);
  const stave1 = new Stave(25, 10, 300);
  const stave2 = new Stave(25, 120, 300);
  stave1.setContext(ctx);
  stave2.setContext(ctx);
  const connector = new StaveConnector(stave1, stave2);
  const line = new StaveConnector(stave1, stave2);
  connector.setType(StaveConnector.type.BRACKET);
  connector.setContext(ctx);
  line.setType(StaveConnector.type.SINGLE);
  connector.setContext(ctx);
  line.setContext(ctx);
  stave1.drawWithStyle();
  stave2.drawWithStyle();
  connector.drawWithStyle();
  line.drawWithStyle();

  options.assert.ok(true, 'all pass');
}

function drawRepeatBegin(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 400, 300);
  const stave1 = new Stave(25, 10, 300);
  const stave2 = new Stave(25, 120, 300);
  stave1.setContext(ctx);
  stave2.setContext(ctx);
  stave1.setBegBarType(BarlineType.REPEAT_BEGIN);
  stave2.setBegBarType(BarlineType.REPEAT_BEGIN);

  const line = new StaveConnector(stave1, stave2);
  line.setType(StaveConnector.type.BOLD_DOUBLE_LEFT);
  line.setContext(ctx);
  stave1.drawWithStyle();
  stave2.drawWithStyle();
  line.drawWithStyle();

  options.assert.ok(true, 'all pass');
}

function drawRepeatEnd(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 400, 300);
  const stave1 = new Stave(25, 10, 300);
  const stave2 = new Stave(25, 120, 300);
  stave1.setContext(ctx);
  stave2.setContext(ctx);
  stave1.setEndBarType(BarlineType.REPEAT_END);
  stave2.setEndBarType(BarlineType.REPEAT_END);

  const line = new StaveConnector(stave1, stave2);
  line.setType(StaveConnector.type.BOLD_DOUBLE_RIGHT);
  line.setContext(ctx);
  stave1.drawWithStyle();
  stave2.drawWithStyle();
  line.drawWithStyle();

  options.assert.ok(true, 'all pass');
}

function drawThinDouble(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 400, 300);
  const stave1 = new Stave(25, 10, 300);
  const stave2 = new Stave(25, 120, 300);
  stave1.setContext(ctx);
  stave2.setContext(ctx);
  stave1.setEndBarType(BarlineType.DOUBLE);
  stave2.setEndBarType(BarlineType.DOUBLE);

  const line = new StaveConnector(stave1, stave2);
  line.setType(StaveConnector.type.THIN_DOUBLE);
  line.setContext(ctx);
  stave1.drawWithStyle();
  stave2.drawWithStyle();
  line.drawWithStyle();

  options.assert.ok(true, 'all pass');
}

function drawRepeatAdjacent(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 400, 300);
  const stave1 = new Stave(25, 10, 150);
  const stave2 = new Stave(25, 120, 150);
  const stave3 = new Stave(175, 10, 150);
  const stave4 = new Stave(175, 120, 150);
  stave1.setContext(ctx);
  stave2.setContext(ctx);
  stave3.setContext(ctx);
  stave4.setContext(ctx);

  stave1.setEndBarType(BarlineType.REPEAT_END);
  stave2.setEndBarType(BarlineType.REPEAT_END);
  stave3.setEndBarType(BarlineType.END);
  stave4.setEndBarType(BarlineType.END);

  stave1.setBegBarType(BarlineType.REPEAT_BEGIN);
  stave2.setBegBarType(BarlineType.REPEAT_BEGIN);
  stave3.setBegBarType(BarlineType.REPEAT_BEGIN);
  stave4.setBegBarType(BarlineType.REPEAT_BEGIN);
  const connector1 = new StaveConnector(stave1, stave2);
  const connector2 = new StaveConnector(stave1, stave2);
  const connector3 = new StaveConnector(stave3, stave4);
  const connector4 = new StaveConnector(stave3, stave4);
  connector1.setContext(ctx);
  connector2.setContext(ctx);
  connector3.setContext(ctx);
  connector4.setContext(ctx);
  connector1.setType(StaveConnector.type.BOLD_DOUBLE_LEFT);
  connector2.setType(StaveConnector.type.BOLD_DOUBLE_RIGHT);
  connector3.setType(StaveConnector.type.BOLD_DOUBLE_LEFT);
  connector4.setType(StaveConnector.type.BOLD_DOUBLE_RIGHT);
  stave1.drawWithStyle();
  stave2.drawWithStyle();
  stave3.drawWithStyle();
  stave4.drawWithStyle();
  connector1.drawWithStyle();
  connector2.drawWithStyle();
  connector3.drawWithStyle();
  connector4.drawWithStyle();

  options.assert.ok(true, 'all pass');
}

function drawRepeatOffset2(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 400, 300);
  const stave1 = new Stave(25, 10, 150);
  const stave2 = new Stave(25, 120, 150);
  const stave3 = new Stave(175, 10, 150);
  const stave4 = new Stave(175, 120, 150);
  stave1.setContext(ctx);
  stave2.setContext(ctx);
  stave3.setContext(ctx);
  stave4.setContext(ctx);

  stave1.addClef('treble');
  stave2.addClef('bass');

  stave3.addClef('alto');
  stave4.addClef('treble');

  stave1.addTimeSignature('4/4');
  stave2.addTimeSignature('4/4');

  stave3.addTimeSignature('6/8');
  stave4.addTimeSignature('6/8');

  stave1.setEndBarType(BarlineType.REPEAT_END);
  stave2.setEndBarType(BarlineType.REPEAT_END);
  stave3.setEndBarType(BarlineType.END);
  stave4.setEndBarType(BarlineType.END);

  stave1.setBegBarType(BarlineType.REPEAT_BEGIN);
  stave2.setBegBarType(BarlineType.REPEAT_BEGIN);
  stave3.setBegBarType(BarlineType.REPEAT_BEGIN);
  stave4.setBegBarType(BarlineType.REPEAT_BEGIN);
  const connector1 = new StaveConnector(stave1, stave2);
  const connector2 = new StaveConnector(stave1, stave2);
  const connector3 = new StaveConnector(stave3, stave4);
  const connector4 = new StaveConnector(stave3, stave4);
  const connector5 = new StaveConnector(stave3, stave4);

  connector1.setContext(ctx);
  connector2.setContext(ctx);
  connector3.setContext(ctx);
  connector4.setContext(ctx);
  connector5.setContext(ctx);
  connector1.setType(StaveConnector.type.BOLD_DOUBLE_LEFT);
  connector2.setType(StaveConnector.type.BOLD_DOUBLE_RIGHT);
  connector3.setType(StaveConnector.type.BOLD_DOUBLE_LEFT);
  connector4.setType(StaveConnector.type.BOLD_DOUBLE_RIGHT);
  connector5.setType(StaveConnector.type.SINGLE_LEFT);

  connector1.setXShift(stave1.getModifierXShift());
  connector3.setXShift(stave3.getModifierXShift());

  stave1.drawWithStyle();
  stave2.drawWithStyle();
  stave3.drawWithStyle();
  stave4.drawWithStyle();
  connector1.drawWithStyle();
  connector2.drawWithStyle();
  connector3.drawWithStyle();
  connector4.drawWithStyle();
  connector5.drawWithStyle();

  options.assert.ok(true, 'all pass');
}

function drawRepeatOffset(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 400, 300);
  const stave1 = new Stave(25, 10, 150);
  const stave2 = new Stave(25, 120, 150);
  const stave3 = new Stave(185, 10, 150);
  const stave4 = new Stave(185, 120, 150);
  stave1.setContext(ctx);
  stave2.setContext(ctx);
  stave3.setContext(ctx);
  stave4.setContext(ctx);

  stave1.addClef('bass');
  stave2.addClef('alto');

  stave3.addClef('treble');
  stave4.addClef('tenor');

  stave3.addKeySignature('Ab');
  stave4.addKeySignature('Ab');

  stave1.addTimeSignature('4/4');
  stave2.addTimeSignature('4/4');

  stave3.addTimeSignature('6/8');
  stave4.addTimeSignature('6/8');

  stave1.setEndBarType(BarlineType.REPEAT_END);
  stave2.setEndBarType(BarlineType.REPEAT_END);
  stave3.setEndBarType(BarlineType.END);
  stave4.setEndBarType(BarlineType.END);

  stave1.setBegBarType(BarlineType.REPEAT_BEGIN);
  stave2.setBegBarType(BarlineType.REPEAT_BEGIN);
  stave3.setBegBarType(BarlineType.REPEAT_BEGIN);
  stave4.setBegBarType(BarlineType.REPEAT_BEGIN);

  const connector1 = new StaveConnector(stave1, stave2);
  const connector2 = new StaveConnector(stave1, stave2);
  const connector3 = new StaveConnector(stave3, stave4);
  const connector4 = new StaveConnector(stave3, stave4);
  const connector5 = new StaveConnector(stave3, stave4);
  connector1.setContext(ctx);
  connector2.setContext(ctx);
  connector3.setContext(ctx);
  connector4.setContext(ctx);
  connector5.setContext(ctx);
  connector1.setType(StaveConnector.type.BOLD_DOUBLE_LEFT);
  connector2.setType(StaveConnector.type.BOLD_DOUBLE_RIGHT);
  connector3.setType(StaveConnector.type.BOLD_DOUBLE_LEFT);
  connector4.setType(StaveConnector.type.BOLD_DOUBLE_RIGHT);
  connector5.setType(StaveConnector.type.SINGLE_LEFT);

  connector1.setXShift(stave1.getModifierXShift());
  connector3.setXShift(stave3.getModifierXShift());

  stave1.drawWithStyle();
  stave2.drawWithStyle();
  stave3.drawWithStyle();
  stave4.drawWithStyle();
  connector1.drawWithStyle();
  connector2.drawWithStyle();
  connector3.drawWithStyle();
  connector4.drawWithStyle();
  connector5.drawWithStyle();

  options.assert.ok(true, 'all pass');
}

function drawCombined(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 550, 700);
  const stave1 = new Stave(150, 10, 300);
  const stave2 = new Stave(150, 100, 300);
  const stave3 = new Stave(150, 190, 300);
  const stave4 = new Stave(150, 280, 300);
  const stave5 = new Stave(150, 370, 300);
  const stave6 = new Stave(150, 460, 300);
  const stave7 = new Stave(150, 560, 300);
  stave1.setStaveText('Violin', Modifier.Position.LEFT);
  stave1.setContext(ctx);
  stave2.setContext(ctx);
  stave3.setContext(ctx);
  stave4.setContext(ctx);
  stave5.setContext(ctx);
  stave6.setContext(ctx);
  stave7.setContext(ctx);
  const connSingle = new StaveConnector(stave1, stave7);
  const connDouble = new StaveConnector(stave2, stave3);
  const connBracket = new StaveConnector(stave4, stave7);
  const connNone = new StaveConnector(stave4, stave5);
  const connBrace = new StaveConnector(stave6, stave7);
  connSingle.setType(StaveConnector.type.SINGLE);
  connDouble.setType(StaveConnector.type.DOUBLE);
  connBracket.setType(StaveConnector.type.BRACKET);
  connBrace.setType(StaveConnector.type.BRACE);
  connBrace.setXShift(-5);
  connDouble.setText('Piano');
  connNone.setText('Multiple', { shiftY: -15 });
  connNone.setText('Line Text', { shiftY: 15 });
  connBrace.setText('Harpsichord');
  connSingle.setContext(ctx);
  connDouble.setContext(ctx);
  connBracket.setContext(ctx);
  connNone.setContext(ctx);
  connBrace.setContext(ctx);
  stave1.drawWithStyle();
  stave2.drawWithStyle();
  stave3.drawWithStyle();
  stave4.drawWithStyle();
  stave5.drawWithStyle();
  stave6.drawWithStyle();
  stave7.drawWithStyle();
  connSingle.drawWithStyle();
  connDouble.drawWithStyle();
  connBracket.drawWithStyle();
  connNone.drawWithStyle();
  connBrace.drawWithStyle();

  options.assert.ok(true, 'all pass');
}

VexFlowTests.register(StaveConnectorTests);
export { StaveConnectorTests };
