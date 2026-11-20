// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// TabStave Tests

import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { Clef } from '../src/clef';
import { ClefNote } from '../src/clefnote';
import { Glyphs } from '../src/glyphs';
import { ContextBuilder } from '../src/renderer';
import { TabStave } from '../src/tabstave';

const TabStaveTests = {
  Start(): void {
    QUnit.module('TabStave');
    const run = VexFlowTests.runTests;
    run('TabStave Draw Test', draw);
    run('Four-string TAB clefs', fourStringClefs);
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

/** Compare full and courtesy clefs at two string spacings, with six strings as the control. */
function fourStringClefs(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 500, 160);
  for (const [index, spacing] of [13, 9].entries()) {
    const stave = new TabStave(10 + index * 160, 10, 145, { spacingBetweenLinesPx: spacing })
      .setContext(ctx)
      .addClef('tab')
      .addEndClef('tab', 'small');
    // Exercise both the half-pixel alignment of a one-pixel stroke and the unshifted two-pixel stroke.
    const lineWidth = index + 1;
    stave.setStyle({ lineWidth });
    const sixStartX = stave.getNoteStartX();
    stave.setNumLines(4);
    const [start, end] = stave.getModifiers(undefined, Clef.CATEGORY) as Clef[];
    const full = start.getInkBounds();
    options.assert.equal(stave.getYForGlyphs(), stave.getYForLine(1.5), 'Four-string glyph anchor');
    options.assert.ok(stave.getNoteStartX() < sixStartX, 'Formatter reserves the narrower TAB glyph');
    for (const clef of [start, end]) {
      options.assert.equal(clef.code, Glyphs.fourStringTabClef, 'Select four-string TAB before drawing');
      const ink = clef.getInkBounds();
      options.assert.ok(ink.h > 0, 'TAB glyph has visible ink');
      const topString = stave.getYForLine(0) + (lineWidth === 1 ? 0.5 : 0);
      const bottomString = topString + 3 * spacing;
      const topGap = ink.y - (topString + lineWidth / 2);
      const bottomGap = bottomString - lineWidth / 2 - (ink.y + ink.h);
      // Allow for fractional font sizes and pixel rounding in the renderer.
      const minimumGap = lineWidth + spacing / 8 - 0.5;
      options.assert.ok(topGap >= minimumGap && bottomGap >= minimumGap, 'TAB clears both inner stroke edges');
      options.assert.ok(Math.abs(topGap - bottomGap) < 0.01, 'Equal clearance from the drawn outer strings');
    }
    options.assert.ok(end.getInkBounds().h < full.h, 'Courtesy clef stays smaller');
    stave.drawWithStyle();
    options.assert.deepEqual(start.getInkBounds(), full, 'Drawing uses the formatted geometry');
    const inline = new ClefNote('tab').setStave(stave);
    options.assert.equal(inline.getClef().code, start.code, 'Inline TAB uses the stave glyph');
    options.assert.equal(inline.getClef().getWidth(), start.getWidth(), 'Inline TAB has the same measured width');
    stave.setNumLines(6);
    options.assert.equal(start.code, Glyphs.sixStringTabClef, 'Restore the six-string glyph');
    options.assert.equal(stave.getNoteStartX(), sixStartX, 'Restore the six-string formatting');
  }
  const six = new TabStave(330, 10, 150).setContext(ctx).addClef('tab');
  six.draw();
  const [clef] = six.getModifiers(undefined, Clef.CATEGORY) as Clef[];
  options.assert.equal(clef.line, 2.5, 'Six-string TAB stays on its original line');
}

VexFlowTests.register(TabStaveTests);
export { TabStaveTests };
