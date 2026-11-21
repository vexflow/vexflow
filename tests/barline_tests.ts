// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// Covers stave and inline measure boundaries and their formatter widths.

import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { Renderer } from '../src/renderer';
import { Stave } from '../src/stave';
import { Barline, BarlineType } from '../src/stavebarline';
import { StaveModifierPosition } from '../src/stavemodifier';

const BarlineTests = {
  Start(): void {
    QUnit.module('Barline');
    QUnit.test('Enums', enums);
    const run = VexFlowTests.runTests;
    run('Editorial and double-heavy boundaries', measureBoundaries);
    run('Simple BarNotes', simple);
    run('Style BarNotes', style);
  },
};

function enums(assert: Assert): void {
  // VexFlow 4.0 renamed Barline.type => BarlineType.
  // The old way still works, for backwards compatibility.
  assert.equal(Barline.type, BarlineType);

  const a = BarlineType['DOUBLE'];
  const b = BarlineType.DOUBLE;
  assert.equal(a, b);
}

/** End each staff with a control or new style and repeat the same mark between two notes. */
function measureBoundaries(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 770, 230);
  const staves: Stave[] = [];
  const styles = ['dashed', 'dotted', 'doubleHeavy', 'double', 'end'];
  const pitches = [
    ['g/4', 'a/4'],
    ['b/4', 'a/4'],
    ['g/4', 'e/4'],
  ];
  for (const [row, width] of [145, 109].entries()) {
    for (const [index, style] of styles.entries()) {
      const stave = f.Stave({
        x: 12 + index * width,
        y: 6 + row * 108,
        width,
        options: row ? { barlineSpan: { top: 1, bottom: 3 } } : {},
      });
      const type = Barline.typeString[style];
      stave.setEndBarType(type);
      staves.push(stave);
      const [a, b] = pitches[index % pitches.length];
      const left = f.StaveNote({ keys: [a], duration: 'q' });
      const right = f.StaveNote({ keys: [b], duration: 'q' });
      const mark = f.BarNote({ type: style });
      const voice = f.Voice({ time: '2/4' }).addTickables([left, mark, right]);
      f.Formatter().joinVoices([voice]).formatToStave([voice], stave);
      options.assert.equal(mark.getType(), type, 'inline name selects the same stave boundary');
      options.assert.ok(mark.shouldIgnoreTicks() && voice.isComplete(), 'inline bar consumes no musical time');
      const metrics = new Barline(type).getLayoutMetrics();
      if (!metrics) throw new Error('Missing layout metrics for ' + style);
      options.assert.ok(left.getNoteHeadEndX() < mark.getAbsoluteX() + metrics.xMin, 'left note clears inline bar');
      options.assert.ok(mark.getAbsoluteX() + metrics.xMax < right.getNoteHeadBeginX(), 'right note clears inline bar');
      options.assert.ok(right.getNoteHeadEndX() < stave.getX() + width + metrics.xMin, 'last note clears end bar');
    }
  }
  f.draw();
  if (options.backend === Renderer.Backends.SVG) {
    for (const stave of staves) assertBarInk(options.assert, stave);
  }
}

/** Inspect the same ink the SVG renderer exposes to score readers. */
function assertBarInk(assert: Assert, stave: Stave): void {
  const bar = stave.getModifiers(StaveModifierPosition.END, Barline.CATEGORY)[0] as Barline;
  const type = bar.getType();
  const group = bar.getSVGElement();
  if (!group) throw new Error('Missing end bar');
  const shapes = Array.from(group.querySelectorAll<SVGGraphicsElement>('path, rect'))
    .filter((element) => element.getAttribute('opacity') !== '0')
    .map((element) => element.getBBox());
  const { topY, botY } = stave.getBarlineBounds();
  assert.ok(shapes.length >= 2, 'visible components');
  if (type === BarlineType.DASHED || type === BarlineType.DOTTED) {
    assert.ok(
      shapes.every((box) => box.y >= topY - 0.01 && box.y + box.height <= botY + 0.01),
      'inside span'
    );
    for (const [i, box] of shapes.entries()) {
      assert.equal(box.x, shapes[0].x, 'same vertical column');
      if (i > 0) assert.ok(shapes[i - 1].y + shapes[i - 1].height < box.y, 'gap between marks');
      assert.ok(
        type === BarlineType.DOTTED ? box.width === box.height : box.height > box.width,
        'dot or dash proportions'
      );
    }
  } else {
    const [left, right] = shapes;
    assert.equal(shapes.length, 2, 'two solid strokes');
    assert.ok(left.x + left.width < right.x, 'white gap');
    assert.deepEqual(
      [left.width, right.width],
      type === BarlineType.DOUBLE_HEAVY ? [3, 3] : type === BarlineType.END ? [1, 3] : [1, 1]
    );
    assert.equal(left.height, botY - topY, 'strokes fit span');
  }
}

function simple(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 380, 160);
  const stave = f.Stave();

  const notes = [
    f.StaveNote({ keys: ['d/4', 'e/4', 'f/4'], stemDirection: -1, duration: '2' }),
    f.BarNote({ type: 'single' }),
    f
      .StaveNote({ keys: ['c/4', 'f/4', 'a/4'], stemDirection: -1, duration: '2' })
      .addModifier(f.Accidental({ type: 'n' }), 0)
      .addModifier(f.Accidental({ type: '#' }), 1),
  ];

  const voice = f.Voice().addTickables(notes);
  f.Formatter().joinVoices([voice]).formatToStave([voice], stave);
  f.draw();

  options.assert.ok(true, 'Simple Test');
}

function style(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 380, 160);
  const stave = f.Stave();

  const notes = [
    f.StaveNote({ keys: ['d/4', 'e/4', 'f/4'], stemDirection: -1, duration: '2' }),
    f.BarNote({ type: 'single' }),
    f
      .StaveNote({ keys: ['c/4', 'f/4', 'a/4'], stemDirection: -1, duration: '2' })
      .addModifier(f.Accidental({ type: 'n' }), 0)
      .addModifier(f.Accidental({ type: '#' }), 1),
  ];
  notes[1].setStyle({ shadowBlur: 15, shadowColor: 'blue', fillStyle: 'blue', strokeStyle: 'blue' });

  const voice = f.Voice().addTickables(notes);
  f.Formatter().joinVoices([voice]).formatToStave([voice], stave);
  f.draw();

  options.assert.ok(true, 'Style');
}

VexFlowTests.register(BarlineTests);
export { BarlineTests };
