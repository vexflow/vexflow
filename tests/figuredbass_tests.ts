// Figured-bass drawing, note anchoring, and independent continuation lines after reformatting.
import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { measureEngraving } from '../src/engravinggeometry';
import { FiguredBass } from '../src/figuredbass';

const FiguredBassTests = {
  Start(): void {
    QUnit.module('FiguredBass');
    VexFlowTests.runTests('Independent figured-bass continuations', independentRows);
  },
};

/** Engrave a 6/4 resolving to 5/3 and compare the same objects at two staff widths. */
function independentRows(options: TestOptions): void {
  const { assert } = options;
  const f = VexFlowTests.makeFactory(options, 580, 185);
  const stave = f.Stave({ x: 10, y: 10, width: 300 }).addClef('bass');
  const notes = Array.from({ length: 4 }, () => f.StaveNote({ clef: 'bass', keys: ['g/2'], duration: 'q' }));
  const [one, two, three, four] = notes;
  const voice = f.Voice().addTickables(notes);
  const bass = f.FiguredBass({
    rows: [
      [
        { note: one, figure: '6', extendTo: three },
        { note: four, figure: '5' },
      ],
      [
        { note: one, figure: '4' },
        { note: two, figure: '3', extendTo: four },
      ],
    ],
  });
  function format(width: number) {
    stave.setWidth(width);
    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);
    const geometry = measureEngraving(bass);
    assert.deepEqual(geometry.diagnostics, []);
    assert.equal(geometry.parts.length, 6, 'Four written digits and two lines');
    const [six, upper, five, lowerFour, lowerThree, lower] = geometry.parts;
    const centers = notes.map((n) => (n.getNoteHeadBeginX() + n.getNoteHeadEndX()) / 2);
    assert.deepEqual(
      [six, lowerFour, lowerThree, five].map((b) => Math.round(b.x + b.w / 2)),
      [centers[0], centers[0], centers[1], centers[3]].map(Math.round),
      'Each digit is centered on the written attack'
    );
    assert.ok(six.y > stave.getYForLine(4) && six.y + six.h < lowerFour.y, 'The rows clear the staff and each other');
    assert.ok(upper.x > six.x + six.w && lower.x > lowerThree.x + lowerThree.w, 'Lines clear their digits');
    assert.equal(upper.x + upper.w, centers[2], 'The 6 holds through the third G');
    assert.equal(lower.x + lower.w, centers[3], 'The 3 holds through the fourth G');
    assert.ok(upper.y < lowerFour.y && lower.y > five.y + five.h, 'Continuation lines stay within their rows');
    return geometry.parts;
  }
  const narrow = format(300);
  const wide = format(550);
  assert.ok(wide[1].w > narrow[1].w && wide[5].w > narrow[5].w, 'Both continuations grow with the bar');
  assert.deepEqual(format(300), narrow, 'Restoring the width restores every digit and line');

  const resolution = new FiguredBass({
    rows: [
      [
        { note: one, figure: '10', extendTo: two },
        { note: two, figure: '9' },
      ],
    ],
  });
  const [ten, line, nine] = resolution.getInkParts();
  assert.ok(ten.w > narrow[0].w && line.x + line.w < nine.x, 'A multi-digit figure clears its resolution');
  assert.throws(() => new FiguredBass({ rows: [[]] }), /row/, 'Reject an empty row');
  assert.throws(() => new FiguredBass({ rows: [[{ note: one, figure: 'A' }]] }), /digits/);
  assert.throws(() => new FiguredBass({ rows: [[{ note: two, figure: '4', extendTo: one }]] }).getInkParts(), /extend/);

  f.draw();
  assert.ok(bass.isRendered(), 'The factory draws every queued row on this backend');
}

VexFlowTests.register(FiguredBassTests);
export { FiguredBassTests };
