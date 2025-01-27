// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// TabStave Tests

import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { ContextBuilder } from '../src/renderer';
import { TabStave } from '../src/tabstave';

const TabStaveTests = {
  Start(): void {
    QUnit.module('TabStave');
    const run = VexFlowTests.runTests;
    run('TabStave Draw Test', draw);
  },
};

function draw(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 400, 160);
  const stave = new TabStave(10, 10, 300);
  stave.setMeasure(1);
  stave.setNumLines(6);
  stave.setContext(ctx);
  stave.drawWithStyle();

  options.assert.equal(stave.getYForNote(0), 127, 'getYForNote(0)');
  options.assert.equal(stave.getYForLine(5), 127, 'getYForLine(5)');
  options.assert.equal(stave.getYForLine(0), 62, 'getYForLine(0) - Top Line');
  options.assert.equal(stave.getYForLine(4), 114, 'getYForLine(4) - Bottom Line');

  options.assert.ok(true, 'all pass');
}

VexFlowTests.register(TabStaveTests);
export { TabStaveTests };
