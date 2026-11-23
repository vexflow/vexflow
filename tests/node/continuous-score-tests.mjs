// Contracts for single-source continuous scores, hard breaks and retained row-dependent notation.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { createCanvas, registerFont } from 'canvas';
import puppeteer from 'puppeteer';

import {
  balladeSpacingStudy,
  beamedSplitChordStudy,
  continuousBeamStudy,
  glissandoStudy,
  makeContinuousStudy,
  sextupletStudy,
  tabEndingStudy,
} from '../engraving/continuous-studies.mjs';

import { friskaSlurStudy, soleaSlurStudy } from '../engraving/slur-studies.mjs';

const { curveParts } = await import(new URL('../../build/esm/src/continuousspan.js', import.meta.url));
const VF = await import(new URL('../../build/esm/entry/vexflow-core.js', import.meta.url));
for (const family of ['Bravura', 'Academico']) {
  const name = family.toLowerCase();
  registerFont(new URL('../../node_modules/@vexflow-fonts/' + name + '/' + name + '.otf', import.meta.url).pathname, {
    family,
  });
}
VF.Element.setTextMeasurementCanvas(createCanvas(1, 1));
function factory() {
  const canvas = createCanvas(960, 1100),
    ctx = canvas.getContext('2d');
  const f = new VF.Factory({ renderer: { elementId: null, width: 960, height: 1100 } }).setContext(
    new VF.CanvasContext(ctx)
  );
  return { f, ctx, canvas };
}
function scene(kind, width, mode) {
  const { f, ctx, canvas } = factory(),
    c = makeContinuousStudy(VF, f, kind, width, mode),
    l = c.sheet.getContinuousLayout();
  const frame = (w) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    c.sheet.setWidth(w);
    f.draw({ retain: true });
    return {
      rows: l.rows.map((r) => ({ m: r.measures, v: r.visibleStaves, w: r.width, h: r.height, rest: r.restGroups })),
      fragments: structuredClone(l.fragments),
      diagnostics: structuredClone(l.diagnostics),
      pixels: canvas.toBuffer(),
    };
  };
  return { f, c, l, frame };
}
test('vocal phrase retains IDs; three fragments reunite at the original width with identical pixels', () => {
  const { c, l, frame } = scene('choir', 740),
    head = c.getNote('v00');
  const wide = frame(740);
  assert.equal(wide.rows.length, 1);
  const narrow = frame(260);
  assert.deepEqual(
    narrow.rows.map((r) => r.m),
    [
      [1, 2],
      [3, 4],
      [5, 6],
    ]
  );
  for (const id of ['sung-word', 'phrase'])
    assert.deepEqual(
      l.fragments.filter((f) => f.id === id).map((f) => f.part),
      ['first', 'middle', 'last']
    );
  const endSigns = c.staves[1][0].getModifiers(VF.StaveModifier.Position.END, VF.KeySignature.CATEGORY);
  assert.equal(endSigns.length, 1);
  assert.deepEqual(narrow.diagnostics, []);
  assert.equal(head, c.getNote('v00'));
  assert.deepEqual(frame(740), wide);
  assert.equal(c.staves[1][0].getModifiers(VF.StaveModifier.Position.END, VF.KeySignature.CATEGORY).length, 0);
});
test('balanced width avoids the greedy last-measure row on the same seven measures', () => {
  const greedy = scene('breaks', 415, 'greedy').frame(415),
    balanced = scene('breaks', 415, 'balanced').frame(415);
  assert.deepEqual(
    greedy.rows.map((r) => r.m.length),
    [6, 1]
  );
  assert.deepEqual(
    balanced.rows.map((r) => r.m.length),
    [3, 4]
  );
  assert.deepEqual(
    balanced.rows.flatMap((r) => r.m),
    greedy.rows.flatMap((r) => r.m)
  );
});
test('grand-staff drawing preserves cross-staff stem joins and wedge aperture across redraw', () => {
  const { c, frame } = scene('keyboard', 490);
  const wide = frame(490),
    n = c.getNote('cross'),
    staff = c.staves[0][1],
    beam = n.getBeam();
  assert.equal(n.getStave(), staff);
  assert.ok(beam.getStripBounds().every((b) => Number.isFinite(b.y)));
  const parts = wide.fragments.filter((f) => f.kind === 'crescendo');
  assert.deepEqual(
    parts.map((f) => f.part),
    ['first', 'last']
  );
  assert.equal(parts[0].progress[1], parts[1].progress[0]);
  assert.equal(parts[0].progress[0], 0);
  assert.equal(parts[1].progress[1], 1);
  assert.deepEqual(
    c.staves[0].map((s) => s.getY()),
    c.staves[1].map((s) => s.getY())
  );
  frame(300);
  assert.deepEqual(frame(490), wide);
  assert.equal(n.getStave(), staff);
});
test('silent staves return with their names and a compressed run retains its measure identities', () => {
  const { c, frame } = scene('ensemble', 430);
  const { rows, diagnostics } = frame(430);
  assert.deepEqual(diagnostics, []);
  assert.deepEqual(
    rows.map((r) => r.v),
    [['fl'], ['fl', 'vc']]
  );
  assert.deepEqual(rows[0].rest, [[2, 3, 4]]);
  assert.equal(c.notes.length, 6);
  assert.ok(c.notes[2][1][0][0].isRest());
  assert.equal(c.staves[4][1].getModifiers()[0].getType(), VF.Barline.type.REPEAT_BEGIN);
  assert.equal(c.staves[5][0].getModifiers()[1].getType(), VF.Barline.type.REPEAT_END);
});
function spec(count, continuous, notes = (i) => [{ id: 'n' + i, note: { keys: ['c/5'], duration: 'w' } }]) {
  return {
    staves: [{ id: 'staff', measures: Array.from({ length: count }, (_, i) => ({ voices: [{ notes: notes(i) }] })) }],
    continuous,
  };
}
/** Capture circles while the native Canvas context paints the wedges. */
function paintedTips(ctx, draw) {
  const circles = [];
  const arc = ctx.arc;
  ctx.arc = function (x, y, radius, ...angles) {
    circles.push({ x, y, radius });
    return arc.call(this, x, y, radius, ...angles);
  };
  try {
    draw();
    return circles;
  } finally {
    ctx.arc = arc;
  }
}

test('native niente circles touch the wedge, have open centers and fit its measured stroke bounds', () => {
  for (const space of [8, 12]) {
    const { f, ctx } = factory();
    const source = spec(2, {});
    source.staves[0].options = { spacingBetweenLinesPx: space };
    const c = f.EasyScore().compose(source);
    c.sheet.setWidth(500).format();
    const from = c.getNote('n0'),
      to = c.getNote('n1');
    for (const type of [VF.StaveHairpin.type.CRESC, VF.StaveHairpin.type.DECRESC]) {
      const hairpin = f.StaveHairpin({ from, to, type, options: { height: 2 } }).setStyle({ lineWidth: 2 });
      const render = () => paintedTips(f.getContext(), () => hairpin.drawWithStyle());
      assert.deepEqual(render(), []);
      const plain = hairpin.getBoundingBox();
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      hairpin.setRenderOptions({ ...hairpin.renderOptions, niente: true });
      const circles = render();
      assert.equal(circles.length, 1);
      const [{ x, y, radius }] = circles;
      assert.equal(radius, space * 0.35);
      const grows = type === VF.StaveHairpin.type.CRESC;
      const tip = (grows ? from : to).getModifierStartXY(VF.Modifier.Position.BELOW, 0);
      assert.ok(Math.abs((grows ? x + radius : x - radius) - tip.x) < 1e-6);
      const box = hairpin.getBoundingBox();
      assert.ok(Math.abs(box.w - plain.w - 2 * radius) < 1e-6);
      assert.ok(Math.abs(box.h - 2 * (radius + 1)) < 1e-6);
      assert.equal(ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data[3], 0);
      assert.ok(ctx.getImageData(Math.floor(x), Math.floor(y - radius), 1, 1).data[3] > 0);
      const shifted = paintedTips(f.getContext(), () =>
        VF.StaveHairpin.FormatByTicksAndDraw(
          f.getContext(),
          { pixelsPerTick: 2 },
          { firstNote: from, lastNote: to },
          type,
          VF.Modifier.Position.BELOW,
          { ...hairpin.renderOptions, leftShiftTicks: 2, rightShiftTicks: -2 }
        )
      );
      assert.deepEqual(shifted, [{ x: x + (grows ? 4 : -4), y, radius }]);
    }
  }
});

/** Record the actual quadratic arms while the Canvas context paints them. */
function paintedArms(ctx, draw) {
  const arms = [];
  let start;
  const recorder = Object.create(ctx);
  recorder.moveTo = (x, y) => {
    start = [x, y];
    return ctx.moveTo(x, y);
  };
  recorder.quadraticCurveTo = (cx, cy, x, y) => {
    arms.push([start, [cx, cy], [x, y]]);
    return ctx.quadraticCurveTo(cx, cy, x, y);
  };
  draw(recorder);
  return arms;
}

test('flared hairpins keep the native bounds and mirror their quarter-opening at the midpoint', () => {
  const { f } = factory();
  const source = spec(1, {}, () =>
    ['g/4', 'a/4', 'b/4', 'g/4'].map((key, i) => ({ id: 'a' + i, note: { keys: [key], duration: 'q' } }))
  );
  const score = f.EasyScore().compose(source);
  const from = score.getNote('a0');
  const to = score.getNote('a3');
  for (const width of [360, 210]) {
    score.sheet.setWidth(width).format();
    for (const type of [VF.StaveHairpin.type.CRESC, VF.StaveHairpin.type.DECRESC]) {
      const mark = f.StaveHairpin({ from, to, type, options: { height: 16, niente: true } });
      const paint = () => paintedArms(f.getContext(), (ctx) => mark.setContext(ctx).draw());
      const bounds = mark.getBoundingBox();
      assert.deepEqual(paint(), []);
      mark.setRenderOptions({ ...mark.renderOptions, flared: true });
      const [top, bottom] = paint();
      assert.deepEqual(top[0], bottom[0], 'one closed tip');
      const grows = type === VF.StaveHairpin.type.CRESC;
      const x = (note) => note.getModifierStartXY(VF.Modifier.Position.BELOW, 0).x;
      assert.equal(top[0][0], x(grows ? from : to));
      assert.equal(top[2][0], x(grows ? to : from));
      assert.equal(bottom[2][1] - top[2][1], 16);
      const midpointY = ([[, y0], [, cy], [, y1]]) => (y0 + 2 * cy + y1) / 4;
      assert.equal(midpointY(bottom) - midpointY(top), 4);
      assert.deepEqual(mark.getBoundingBox(), bounds);
    }
  }
});

test('flared hairpin fragments draw matching apertures and slopes at a system break', () => {
  const { f } = factory();
  for (const kind of ['crescendo', 'diminuendo']) {
    const span = { id: 'flare', kind, from: 'n0', to: 'n4', flared: true, niente: true };
    const score = f.EasyScore().compose(spec(5, { spans: [span] }));
    const layout = score.sheet.getContinuousLayout();
    for (const width of [600, 120, 600]) {
      score.sheet.setWidth(width).format();
      const arms = paintedArms(f.getContext(), (ctx) => layout.draw(ctx));
      assert.equal(arms.length, 2 * layout.fragments.length);
      assert.equal(layout.fragments.filter((f) => f.nienteTip).length, 1);
      assert.equal(layout.fragments.length === 1, width === 600);
      layout.fragments.forEach((fragment, i) => {
        const [a, b] = fragment.progress.map((p) => (kind === 'crescendo' ? p : 1 - p));
        const [top, bottom] = arms.slice(2 * i, 2 * i + 2);
        // The end ordinates are the aperture at each break. The control ordinate preserves the tangent there.
        for (const [j, ratio] of [a * a, a * b, b * b].entries())
          assert.ok(Math.abs(bottom[j][1] - top[j][1] - fragment.space * 1.1 * ratio) < 1e-8);
        assert.ok(Math.abs(top[1][0] - (fragment.x1 + fragment.x2) / 2) < 1e-8);
      });
    }
  }
});

test('a wrapped niente circle belongs only to its closed musical endpoint and its hit region', () => {
  for (const space of [8, 12]) {
    const { f } = factory();
    const spans = ['crescendo', 'diminuendo'].map((kind) => ({ id: kind, kind, from: 'n0', to: 'n4', niente: true }));
    const source = spec(5, { spans: [...spans, { ...spans[0], id: 'plain', niente: false }] });
    source.staves[0].options = { spacingBetweenLinesPx: space };
    const c = f.EasyScore().compose(source);
    for (const width of [600, 120, 600]) {
      c.sheet.setWidth(width).format();
      const layout = c.sheet.getContinuousLayout();
      const marked = layout.fragments.filter((f) => f.nienteTip);
      assert.deepEqual(
        marked.map((f) => f.id),
        ['crescendo', 'diminuendo']
      );
      assert.deepEqual(
        marked.map((f) => f.part),
        width === 120 ? ['first', 'last'] : ['single', 'single']
      );
      if (width === 120) assert.ok(layout.fragments.some((f) => f.part === 'middle'));
      assert.deepEqual(
        paintedTips(f.getContext(), () => layout.draw(f.getContext())),
        marked.map((f) => f.nienteTip)
      );
      const nav = new VF.ScoreNavigation(c, source.staves);
      for (const fragment of marked) {
        const { x, y, radius } = fragment.nienteTip;
        const side = fragment.kind === 'crescendo' ? -1 : 1;
        const vertex = side < 0 ? fragment.x1 : fragment.x2;
        assert.ok(Math.abs(x - side * radius - vertex) < 1e-6);
        assert.equal(nav.hitTest(x + side * radius, y)?.id, fragment.id);
      }
    }
  }
});

test('a lyric extender resolves a unique word on its source note during formatting', () => {
  const span = { id: 'hold', kind: 'lyric', from: 'n0', to: 'n1', syllableId: 'word' };
  const compose = (config) =>
    factory()
      .f.EasyScore()
      .compose(spec(2, { spans: [config] }));
  for (const invalid of [{ text: 'duplicate' }, { kind: 'tie' }, { syllableId: '' }]) {
    assert.throws(() => compose({ ...span, ...invalid }), /anchored lyric extender/);
  }
  const c = compose(span);
  const format = () => c.sheet.setWidth(600).format();
  assert.throws(format, /Expected one lyric annotation/);
  const source = c.getNote('n0');
  const word = () => new VF.Annotation('word').setAttribute('id', 'word');
  source.addModifier(word());
  format();
  source.addModifier(word());
  assert.throws(format, /Expected one lyric annotation/);
});

test('half-dashed slurs change stroke once at the midpoint of the entire fitted phrase', () => {
  const { f, ctx } = factory();
  const span = { id: 'editorial', kind: 'slur', from: 'n0', to: 'n4', halfDashed: true };
  const score = f.EasyScore().compose(spec(5, { spans: [span] }));
  const layout = score.sheet.getContinuousLayout();
  for (const width of [600, 120, 600]) {
    score.sheet.setWidth(width).format();
    assert.equal(layout.fragments.length === 1, width === 600);
    // Capture the cubics and dash arrays from the same Canvas context that paints them.
    const drawing = Object.create(f.getContext());
    const paths = [];
    let start;
    drawing.moveTo = (x, y) => {
      start = [x, y];
      return f.getContext().moveTo(x, y);
    };
    drawing.bezierCurveTo = (cx1, cy1, cx2, cy2, x, y) => {
      paths.push({ start, left: [cx1, cy1], right: [cx2, cy2], end: [x, y], dash: ctx.getLineDash() });
      return f.getContext().bezierCurveTo(cx1, cy1, cx2, cy2, x, y);
    };
    layout.draw(drawing);
    for (const frag of layout.fragments) {
      const [a, b] = frag.progress;
      if (a < 0.5 && b > 0.5) {
        const [opening, ending] = paths.splice(0, 2);
        assert.deepEqual(opening.dash, [4, 3]);
        assert.deepEqual(ending.dash, []);
        assert.deepEqual(opening.end, ending.start);
        const [x, y] = ending.start;
        const expectedX = frag.x1 + ((frag.x2 - frag.x1) * (0.5 - a)) / (b - a);
        assert.ok(Math.abs(x - expectedX) < 1e-7);
        const slopeIn = (y - opening.right[1]) / (x - opening.right[0]);
        const slopeOut = (ending.left[1] - y) / (ending.left[0] - x);
        assert.ok(Math.abs(slopeIn - slopeOut) < 1e-7, 'the tangent is continuous at the join');
      } else {
        assert.deepEqual(paths.shift().dash, b <= 0.5 ? [4, 3] : []);
      }
    }
    assert.equal(paths.length, 0);
    assert.deepEqual(ctx.getLineDash(), [], 'the slur restores the drawing style');
  }
});

test('hard keeps overflow together and forced breaks win over spare space', () => {
  const { f } = factory();
  const c = f.EasyScore().compose(
    spec(4, {
      boundaries: [
        { measure: 2, breakBefore: 'keep' },
        { measure: 3, breakBefore: 'force' },
        { measure: 4, breakBefore: 'keep' },
      ],
    })
  );
  const l = c.sheet.getContinuousLayout();
  c.sheet.setWidth(12).format();
  assert.deepEqual(
    l.rows.map((r) => r.measures),
    [
      [1, 2],
      [3, 4],
    ]
  );
  assert.deepEqual(
    l.diagnostics.map((d) => d.code),
    ['RowOverflow', 'RowOverflow']
  );
  assert.ok(l.rows.every((r) => r.overflow > 0));
  c.sheet.setWidth(800).format();
  assert.deepEqual(
    l.rows.map((r) => r.measures),
    [
      [1, 2],
      [3, 4],
    ]
  );
  assert.deepEqual(l.diagnostics, []);
});
test('span families retain the source anchors and continuous parameter at first, middle and final fragments', () => {
  for (const kind of [
    'tie',
    'slur',
    'crescendo',
    'diminuendo',
    'pedal',
    'lyric',
    'hyphen',
    'volta',
    'ottava',
    'trill',
    'tuplet',
  ]) {
    const { f } = factory(),
      c = f.EasyScore().compose(
        spec(3, {
          spans: [{ id: 's', kind, from: 'n0', to: 'n2' }],
          boundaries: [
            { measure: 2, breakBefore: 'force' },
            { measure: 3, breakBefore: 'force' },
          ],
        })
      );
    f.draw({ retain: true });
    const l = c.sheet.getContinuousLayout(),
      fs = l.fragments;
    assert.deepEqual(l.diagnostics, [], kind);
    assert.deepEqual(
      fs.map((f) => f.part),
      ['first', 'middle', 'last'],
      kind
    );
    assert.ok(fs.every((f) => f.id === 's' && f.x1 < f.x2 && Number.isFinite(f.y1 + f.y2)));
    for (let i = 1; i < fs.length; i++) assert.equal(fs[i - 1].progress[1], fs[i].progress[0]);
  }
});
test('tab ties stay on the selected string through reflow and leave a visible incoming curve', () => {
  for (const selectors of [{ string: 2 }, { fromHead: 1 }, { toHead: 0 }, { fromHead: 1, toHead: 0 }, {}]) {
    const source = tabEndingStudy();
    const tie = source.continuous.spans[0];
    delete tie.fromHead;
    Object.assign(tie, selectors);
    const string = Object.keys(selectors).length ? 2 : 1;
    const { f } = factory();
    const score = f.EasyScore().compose(source);
    const layout = score.sheet.getContinuousLayout();
    function frame(width) {
      score.sheet.setWidth(width);
      f.draw({ retain: true });
      assert.deepEqual(layout.diagnostics, []);
      return structuredClone(layout.fragments);
    }
    const wide = frame(420);
    assert.deepEqual(
      wide.map((f) => f.part),
      ['single', 'single']
    );
    const narrow = frame(122);
    for (const kind of ['tie', 'volta'])
      assert.deepEqual(
        narrow.filter((f) => f.kind === kind).map((f) => f.part),
        ['first', 'last']
      );
    for (const f of narrow.filter((f) => f.kind === 'tie')) {
      const stave = score.staves[f.row][0];
      assert.deepEqual(f.strings, [string]);
      assert.ok(f.x2 - f.x1 >= stave.space(1), 'visible tie on each side of the break');
      const line = stave.getYForLine(string - 1);
      assert.ok(f.y1 < line && f.y1 > line - stave.space(0.5));
      assert.equal(f.y1, f.y2);
    }
    assert.deepEqual(frame(420), wide);
  }
});

// Two simultaneous TAB voices reproduce a string-five tie crossing a string-four fret.
function tieStudy(side, split = false, crowded = false) {
  const event = (id, str, fret, duration) => ({ id, tab: { positions: [{ str, fret }], duration } });
  const measures = [0, 1].map((m) => ({
    voices: [
      { notes: [event('bassHalf' + m, 5, 2, 'h'), event('bassQuarter' + m, 5, 2, 'q')] },
      { notes: [2, 2, 4, 2, 2, 2].map((str, i) => event('upper' + m + i, str, 3, '8')) },
    ],
  }));
  if (split) {
    measures[0].voices[0].notes[1].tab.positions[0].str = 2;
    measures[1].voices[0].notes[0].tab.positions[0].str = 2;
  }
  if (crowded)
    for (const m of measures)
      for (const e of m.voices[1].notes) e.tab.positions = [1, 2, 3, 4, 5, 6].map((str) => ({ str, fret: 38 }));
  return {
    staves: [{ id: 'guitar', kind: 'tab', time: '3/4', measures }],
    sheet: { width: 480, rowGap: 0 },
    continuous: {
      spans: [
        {
          id: 'hold',
          kind: 'tie',
          from: 'bassHalf0',
          to: split ? 'bassQuarter1' : 'bassQuarter0',
          ...(side ? { side } : {}),
        },
      ],
    },
  };
}
test('TAB ties measure other voices’ fret ink and keep one side across a system break', () => {
  function draw(side, split = false, crowded = false) {
    const { f } = factory(),
      c = f.EasyScore().compose(tieStudy(side, split, crowded)),
      layout = c.sheet.getContinuousLayout();
    const frame = (width) => {
      c.sheet.setWidth(width);
      f.draw({ retain: true });
      return { parts: structuredClone(layout.fragments), errors: structuredClone(layout.diagnostics) };
    };
    return { c, frame };
  }
  for (const side of [undefined, 'above', 'below']) {
    const { c, frame } = draw(side);
    const {
      parts: [f],
      errors,
    } = frame(480);
    assert.deepEqual(errors, []);
    assert.equal(f.above, side === 'above');
    assert.deepEqual(f.strings, [5]);
    const sign = f.above ? -1 : 1;
    const obstacle = c.getNote('upper02').getFretInk()[0];
    // Sample the visible quadratic ribbon through the fret box, independently of the fitter's bounds.
    for (let x = obstacle.x; x <= obstacle.x + obstacle.w; x += 0.2) {
      const t = (x - f.x1) / (f.x2 - f.x1),
        base = (1 - t) * f.y1 + t * f.y2;
      for (const edge of [0, f.space * 0.22]) {
        const y = base + sign * 2 * t * (1 - t) * (f.rise + edge);
        assert.ok(y < obstacle.y || y > obstacle.y + obstacle.h);
      }
    }
  }
  const split = draw(undefined, true);
  const wide = split.frame(480);
  const narrow = split.frame(245);
  assert.deepEqual(narrow.errors, []);
  assert.deepEqual(
    narrow.parts.map((f) => [f.part, f.above, f.strings]),
    [
      ['first', false, [5]],
      ['last', false, [5]],
    ]
  );
  assert.deepEqual(split.frame(480), wide);
  const crowded = draw('above', false, true).frame(480);
  assert.ok(crowded.parts[0].above);
  assert.ok(crowded.errors.some((d) => d.code === 'CurveCollision' && d.source === 'hold'));
});
test('tab ties reject unmatched strings, frets and invalid chord positions before drawing', () => {
  for (const selectors of [{ string: 7 }, { string: 3 }, { fromHead: -1 }, { toHead: 2 }, { fromHead: 1, toHead: 1 }]) {
    const source = tabEndingStudy();
    Object.assign(source.continuous.spans[0], selectors);
    assert.throws(() => factory().f.EasyScore().compose(source), /tab tie/i);
  }
  const source = tabEndingStudy();
  source.staves[0].measures[1].voices[0].notes[0].tab.positions[0] = { str: 2, fret: 11 };
  assert.throws(() => factory().f.EasyScore().compose(source), /same string and fret/);
});
test('a Soleá ligado and a Friska chord phrase clear the printed ink on each side of a break', () => {
  for (const [source, label] of [
    [soleaSlurStudy(), 'ligado'],
    [friskaSlurStudy(VF), 'friska'],
  ]) {
    for (const split of [false, true]) {
      source.continuous.verticalSpacing = 'profile';
      if (split) source.continuous.boundaries = [{ measure: 2, breakBefore: 'force' }];
      const { f } = factory();
      const c = f.EasyScore().compose(source),
        layout = c.sheet.getContinuousLayout();
      for (const width of [620, 460, 620]) {
        c.sheet.setWidth(width).format();
        f.draw({ retain: true });
        assert.deepEqual(layout.diagnostics, [], label + ' at ' + width);
        assert.deepEqual(
          layout.fragments.map((f) => f.part),
          split ? ['first', 'last'] : ['single']
        );
        for (const fragment of layout.fragments) {
          assert.ok(fragment.above, 'the explicit side survives a break');
          const notes = layout.rows[fragment.row].measures.flatMap((m) => c.notes[m - 1][0].flat());
          const boxes = notes.flatMap((n) => (n instanceof VF.TabNote ? n.getFretInk() : VF.measureEngraving(n).parts));
          const ribbon = curveParts(fragment);
          assert.ok(
            !ribbon.some((p) =>
              boxes.some((b) => p.x < b.x + b.w && b.x < p.x + p.w && p.y < b.y + b.h && b.y < p.y + p.h)
            ),
            'clear heads, dots, fingerings and articulations'
          );
          if (label === 'ligado') {
            const stave = notes[0].getStave(),
              line = stave.getYForLine(3);
            assert.deepEqual(fragment.strings, [4]);
            for (const y of [fragment.y1, fragment.y2]) assert.ok(y < line && y > line - stave.space(0.5));
          }
        }
      }
    }
  }
});

test('a selected head follows its pitch through reversal and the curve clears a slurred grace group', () => {
  for (const reversed of [false, true]) {
    const source = spec(2, {
      spans: [
        {
          id: 'selected',
          kind: 'slur',
          from: 'n0',
          to: 'n1',
          side: 'below',
          fromHead: reversed ? 1 : 0,
          toHead: reversed ? 1 : 0,
        },
      ],
    });
    source.staves[0].measures.forEach((m, i) => {
      const keys = ['d/4', 'a/4'];
      if (reversed) keys.reverse();
      m.voices[0].notes = [
        {
          id: 'n' + i,
          note: { keys, duration: 'w' },
          ...(i === 1 && {
            grace: { side: 'before', slur: true, notes: [{ keys: ['c/4'], duration: '16', slash: true }] },
          }),
        },
      ];
    });
    const { f } = factory(),
      score = f.EasyScore().compose(source);
    score.sheet.setWidth(400).format();
    const l = score.sheet.getContinuousLayout(),
      fragment = l.fragments[0];
    assert.deepEqual(l.diagnostics, []);
    assert.equal(fragment.above, false);
    const start = score.getNote('n0'),
      head = start.getHeadInk()[start.getKeys().indexOf('d/4')];
    assert.ok(
      fragment.y1 > head.y + head.h && fragment.y1 < head.y + head.h + fragment.space,
      'belongs to the selected low D'
    );
    const group = score
      .getNote('n1')
      .getModifiers()
      .find((m) => m instanceof VF.GraceNoteGroup);
    const graceSlur = group.getLayoutElements().find((e) => e instanceof VF.StaveTie);
    const ribbon = curveParts(fragment);
    for (const b of graceSlur.getRouteParts())
      assert.ok(!ribbon.some((p) => p.x < b.x + b.w && b.x < p.x + p.w && p.y < b.y + b.h && b.y < p.y + p.h));
  }
});

test('TAB phrase endpoints can change fret or select a different string in the arrival chord', () => {
  const positions = (str, fret) => ({ str, fret });
  const source = soleaSlurStudy();
  const span = source.continuous.spans[0];
  source.staves[0].time = '2/2';
  source.staves[0].measures = [
    {
      voices: [
        {
          notes: [
            { id: span.from, tab: { positions: [positions(2, 2)], duration: 'h' } },
            { id: span.to, tab: { positions: [positions(3, 5), positions(2, 4)], duration: 'h' } },
          ],
        },
      ],
    },
  ];
  const draw = () => {
    const { f } = factory(),
      c = f.EasyScore().compose(source);
    c.sheet.format();
    assert.deepEqual(c.sheet.getContinuousLayout().diagnostics, []);
    return c.sheet.getContinuousLayout().fragments[0];
  };
  span.string = 2;
  assert.deepEqual(draw().strings, [2]);
  delete span.string;
  span.fromHead = 0;
  span.toHead = 0;
  assert.deepEqual(draw().strings, [2, 3]);
  span.string = 2;
  assert.throws(draw, /selected string/);
});

test('boundary key, clef and meter move together; explicit signs survive and returned tied accidentals reflow', () => {
  const { f } = factory(),
    es = f.EasyScore();
  const s = spec(2, { spans: [{ id: 'tie', kind: 'tie', from: 'n0', to: 'n1' }] }, (i) => [
    { id: 'n' + i, note: { keys: ['f#/4'], duration: 'w' } },
  ]);
  s.accidentals = 'key-aware';
  const c = es.compose(s),
    n = c.getNote('n1'),
    l = c.sheet.getContinuousLayout();
  const mods = () => n.getModifiers().filter((m) => m instanceof VF.Accidental);
  c.sheet.setWidth(680).format();
  assert.equal(mods().length, 0);
  c.sheet.setWidth(128).format();
  assert.equal(l.rows.length, 2);
  assert.equal(mods().length, 1);
  const explicit = f.Accidental({ type: 'n' }).setAsCautionary();
  n.addModifier(explicit, 0);
  c.sheet.setWidth(680).format();
  assert.deepEqual(mods(), [explicit]);
  const other = factory().f.EasyScore();
  const boundary = spec(2, {});
  boundary.staves[0].measures[0].key = 'D';
  Object.assign(boundary.staves[0].measures[1], { key: 'F', clef: 'bass', time: '2/2' });
  const b = other.compose(boundary);
  b.sheet.setWidth(145).format();
  const signs = (pos) => b.staves[0][0].getModifiers(pos).map((m) => m.getCategory());
  for (const cat of [VF.Clef.CATEGORY, VF.KeySignature.CATEGORY, VF.TimeSignature.CATEGORY])
    assert.ok(signs(VF.StaveModifier.Position.END).includes(cat), cat);
  b.sheet.setWidth(800).format();
  assert.deepEqual(signs(VF.StaveModifier.Position.END), [VF.Barline.CATEGORY]);
});
test('an authored rest remains visible on a silent staff and breaks a compressed rest run', () => {
  const measures = Array.from({ length: 3 }, (_, i) => ({
    voices: [{ notes: [{ note: { keys: ['r/4'], duration: 'wr', ...(i === 1 && { restLine: 0 }) } }] }],
  }));
  const source = { staves: [{ id: 'rest', measures }], continuous: { compressRests: true, hideEmptyStaves: true } };
  const { f } = factory();
  const score = f.EasyScore().compose(source);
  score.sheet.format();
  assert.deepEqual(
    score.sheet.getContinuousLayout().rows.flatMap((row) => row.restGroups),
    []
  );
  const melody = spec(3, {}).staves[0];
  const duet = factory()
    .f.EasyScore()
    .compose({ ...source, staves: [melody, ...source.staves] });
  duet.sheet.format();
  assert.ok(
    duet.sheet
      .getContinuousLayout()
      .rows.find((row) => row.measures.includes(2))
      .visibleStaves.includes('rest')
  );
});

test('structural marks interrupt rest compression; navigation targets and span heads validate atomically', () => {
  const { f } = factory(),
    es = f.EasyScore(),
    rest = () => [{ note: { keys: ['b/4'], duration: 'wr' } }];
  const c = es.compose(
    spec(
      7,
      {
        compressRests: true,
        boundaries: [
          { measure: 4, navigation: { kind: 'segno', id: 'sign' } },
          { measure: 7, navigation: { kind: 'dalSegno', target: 'sign' } },
        ],
      },
      rest
    )
  );
  c.sheet.setWidth(850).format();
  assert.deepEqual(
    c.sheet.getContinuousLayout().rows.flatMap((r) => r.restGroups),
    [
      [2, 3],
      [5, 6],
    ]
  );
  for (const config of [
    { spans: [{ id: 's', kind: 'tie', from: 'n0', to: 'n1', toHead: 5 }] },
    { boundaries: [{ measure: 1, navigation: { kind: 'toCoda', target: 'missing' } }] },
    { boundaries: [{ measure: 3 }] },
  ]) {
    const fresh = factory().f.EasyScore();
    assert.throws(() => fresh.compose(spec(2, config)));
    assert.equal(fresh.getElement('n0'), undefined);
  }
});

test('the shared stem and arpeggio follow the two native heads at each width', () => {
  const { c, frame } = scene('chord', 375);
  const wide = frame(375);
  assert.deepEqual(wide.diagnostics, []);
  const top = c.getNote('rh00'),
    bottom = c.getNote('lh00'),
    stroke = top.getModifiers().find((m) => m instanceof VF.Stroke);
  assert.equal(top.getStemX(), bottom.getStemX());
  const ink = stroke.getBoundingBox();
  assert.ok(ink.y <= top.getYs()[0] && ink.y + ink.h >= bottom.getYs()[0]);
  frame(160);
  assert.deepEqual(frame(375), wide);
});

/** Count rendered stems and heads, then check the joins independently against native geometry. */
function checkSplitChords(verticalSpacing) {
  for (const direction of [VF.Stem.UP, VF.Stem.DOWN]) {
    for (const beamStaff of ['upper', 'lower']) {
      const { f, canvas, ctx } = factory();
      const source = beamedSplitChordStudy(VF, direction, 8, beamStaff);
      source.continuous.verticalSpacing = verticalSpacing;
      const c = f.EasyScore().compose(source);
      const beam = c.getNote(beamStaff + '0').getBeam();
      const phrase = c.systems[0].getPhraseLayout();
      const stems = [];
      const heads = [];
      const render = f.getContext();
      const openGroup = render.openGroup.bind(render);
      render.openGroup = (name, ...args) => {
        if (name === 'stem') stems.push(args[0]);
        if (name === 'stavenote') heads.push(args[0]);
        return openGroup(name, ...args);
      };
      const frame = (gap) => {
        c.systems[0].setOptions({ factory: f, spaceBetweenStaves: gap });
        stems.length = heads.length = 0;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        f.draw({ retain: true });
        assert.deepEqual(phrase.diagnostics, []);
        assert.equal(stems.length, 4);
        assert.equal(heads.length, 8);
        assert.deepEqual(c.sheet.getContinuousLayout().diagnostics, []);
        assert.equal(beam.getNotes().length, 4);
        for (let i = 0; i < 4; i++) {
          const upper = c.getNote('upper' + i);
          const lower = c.getNote('lower' + i);
          const member = c.getNote(beamStaff + i);
          const other = member === upper ? lower : upper;
          assert.equal(beam.getNotes()[i], member);
          assert.equal(other.getStemSegment(), undefined);
          assert.equal(member.shouldDrawFlag() || other.shouldDrawFlag(), false);
          assert.equal(upper.checkTickContext(), lower.checkTickContext());
          assert.equal(upper.checkTickContext().getTickID(), (i * VF.VexFlow.RESOLUTION) / 8);
          assert.equal(upper.getTicks().value(), VF.VexFlow.RESOLUTION / 8);
          assert.equal(lower.getTicks().value(), VF.VexFlow.RESOLUTION / 8);
          const { baseY, tipY, x } = member.getStemSegment();
          assert.equal(x, other.getStemX());
          const [near, far] = direction === VF.Stem.UP ? [upper, lower] : [lower, upper];
          assert.equal(baseY, far.getYs()[0]);
          assert.ok(direction * (near.getYs()[0] - tipY) > 0, 'the stem crosses both heads');
          assert.ok(
            beam.getStripBounds().some((b) => x >= b.x && x <= b.x + b.w && tipY >= b.y && tipY <= b.y + b.h),
            'the visible tip meets the beam at its own x'
          );
        }
        return { gap: c.staves[0][1].getY() - c.staves[0][0].getY(), pixels: canvas.toBuffer() };
      };
      const narrow = frame(8);
      assert.ok(frame(18).gap > narrow.gap);
      assert.deepEqual(frame(8), narrow);
    }
  }
}

for (const mode of ['envelope', 'profile']) {
  test('beamed split piano chords keep their beam and stem joins under ' + mode + ' spacing', () => {
    checkSplitChords(mode);
  });
}

test('a split eighth must have exactly one beam owner and a unique pair of notes', () => {
  for (const beams of [false, true]) {
    const source = beamedSplitChordStudy(VF, VF.Stem.UP, 8);
    for (const staff of source.staves) staff.measures[0].voices[0].autoBeam = beams;
    assert.throws(() => factory().f.EasyScore().compose(source).sheet.format(), /beam on exactly one/);
  }
  const f = factory().f;
  const source = beamedSplitChordStudy(VF, VF.Stem.UP, 8);
  source.staves[0].measures[0].voices[0].autoBeam = false;
  const c = f.EasyScore().compose(source);
  f.Beam({ notes: c.notes[0][0][0] });
  c.sheet.format();
  assert.equal(c.getNote('lower0').shouldDrawFlag(), false);
  source.continuous.splitChords.push({ ...source.continuous.splitChords[0], id: 'again' });
  assert.throws(() => factory().f.EasyScore().compose(source), /only one split chord/);
});

test('instrument changes survive hiding and reflow and the new full name reserves row-start width', () => {
  const s = spec(3, { boundaries: [{ measure: 2, breakBefore: 'force' }] });
  s.staves[0].name = 'Flute';
  s.staves[0].shortName = 'Fl.';
  s.staves[0].measures[1].instrument = { name: 'Bass clarinet in B-flat', shortName: 'B. cl.' };
  const c = factory().f.EasyScore().compose(s);
  c.sheet.setWidth(165).format();
  assert.ok(c.staves[1][0].getX() > c.staves[0][0].getX() + 30);
  assert.ok(c.staves[2][0].getX() < c.staves[1][0].getX());
});

/** Measure the actual Saints verse and capture each renderer's text calls across line breaks. */
function renderSaints({ backend, space }) {
  const VF = window.VexFlow;
  VF.setFonts('Petaluma', 'Academico');
  const target = document.createElement(backend === 'svg' ? 'div' : 'canvas');
  target.id = 'saints';
  document.body.replaceChildren(target);
  const score = VF.EasyScore.create({ renderer: { elementId: target.id, width: 1100, height: 1800 } });
  const edition = window.FeaturedScores.saints.create(VF, score, 'Reharmonized');
  edition.spec.staves[0].options = { spacingBetweenLinesPx: space };
  edition.spec.sheet = { width: 1000, x: 16, y: 42, rowGap: 26, measurePadding: 18 };
  const music = score.compose(edition.spec);
  edition.decorate(music);
  const ctx = score.factory.getContext();
  const drawText = ctx.fillText.bind(ctx);
  let painted = [];
  ctx.fillText = (text, x, y) => {
    if (text === 'in' || text === 'sky') painted.push([text, y]);
    return drawText(text, x, y);
  };
  return [1000, 356, 1000].map((width) => {
    music.sheet.setWidth(width).format();
    const { rows, fragments, diagnostics } = music.sheet.getContinuousLayout();
    const words = music.notes.flat(3).flatMap((n) => n.getModifiers().filter((a) => a.phraseManaged));
    const expected = words.filter((a) => a.text === 'in' || a.text === 'sky').map((a) => [a.text, a.computeY().y]);
    const baselines = words.map((a) => a.computeY().y - a.checkAttachedNote().checkStave().getYForLine(0));
    const extenders = fragments
      .filter((f) => f.kind === 'lyric')
      .map((f) => {
        const spec = edition.spec.continuous.spans.find((s) => s.id === f.id);
        const word = music
          .getNote(spec.from)
          .getModifiers()
          .find((a) => a.getAttribute('id') === spec.syllableId);
        const ink = word.getTextInk(word.computeX().x, word.computeY().y);
        const staff = music.staves[rows[f.row].measures[0] - 1][0];
        return {
          word: word.text,
          part: f.part,
          y: f.y1 - staff.getYForLine(0),
          gap: f.x1 - (ink.x + ink.w),
          length: f.x2 - f.x1,
        };
      });
    ctx.clear();
    painted = [];
    score.draw({ retain: true });
    return {
      bars: rows.map((r) => r.measures),
      baselines,
      extenders,
      expected,
      painted,
      diagnostics: structuredClone(diagnostics),
    };
  });
}

test('Saints, choir, piano and ensemble reflow in browser SVG and Canvas with two font pairs', async () => {
  const browser = await puppeteer.launch({ headless: true, args: process.env.CI ? ['--no-sandbox'] : [] });
  try {
    const page = await browser.newPage();
    await page.setContent('<body></body>');
    await page.addScriptTag({ path: new URL('../../build/cjs/vexflow-debug.js', import.meta.url).pathname });
    await page.addScriptTag({ content: 'window.makeContinuousStudy=' + makeContinuousStudy.toString() });
    for (const family of ['Bravura', 'Academico', 'Petaluma', 'Petaluma Script']) {
      const name = family.toLowerCase().replaceAll(' ', '');
      const data = await readFile(
        new URL('../../node_modules/@vexflow-fonts/' + name + '/' + name + '.woff2', import.meta.url)
      );
      await page.evaluate(
        async (family, data) =>
          document.fonts.add(await new FontFace(family, 'url(data:font/woff2;base64,' + data + ')').load()),
        family,
        data.toString('base64')
      );
    }
    await page.evaluate(() => {
      window.FeaturedScores = {};
    });
    await page.addScriptTag({ path: new URL('../scores/saints.js', import.meta.url).pathname });
    for (const backend of ['svg', 'canvas']) {
      for (const space of [9, 10]) {
        const frames = await page.evaluate(renderSaints, { backend, space });
        assert.deepEqual(frames[2], frames[0], 'returning to page width restores all verse geometry');
        assert.ok(frames[1].bars.length > frames[0].bars.length);
        assert.ok(
          frames[1].extenders.some((f) => f.part === 'last'),
          'a held syllable crosses a system break'
        );
        for (const frame of frames) {
          assert.deepEqual(frame.diagnostics, []);
          assert.equal(frame.expected.filter(([text]) => text === 'in').length, 5);
          assert.equal(frame.expected.filter(([text]) => text === 'sky').length, 3);
          assert.deepEqual(frame.painted, frame.expected, 'each syllable is drawn once at its measured baseline');
          for (const y of frame.baselines) assert.ok([7.5, 9.5].some((line) => Math.abs(y - line * space) < 0.01));
          for (const line of frame.extenders) {
            assert.ok(Math.abs(line.y - (line.word === 'sky' ? 9.5 : 7.5) * space) < 0.01);
            assert.ok(line.length > 0);
            if (line.part === 'first' || line.part === 'single') assert.ok(Math.abs(line.gap - 0.35 * space) < 0.01);
          }
        }
      }
    }
    for (const backend of ['svg', 'canvas'])
      for (const kind of ['choir', 'keyboard', 'ensemble'])
        for (const family of ['Bravura', 'Petaluma']) {
          const output = await page.evaluate(
            ({ backend, kind, family }) => {
              const VF = window.VexFlow;
              VF.setFonts(family, family === 'Bravura' ? 'Academico' : 'Petaluma Script');
              const target = document.createElement(backend === 'svg' ? 'div' : 'canvas');
              target.id = 'study';
              document.body.replaceChildren(target);
              const f = new VF.Factory({ renderer: { elementId: 'study', width: 850, height: 1200 } });
              const c = window.makeContinuousStudy(VF, f, kind, 740),
                layout = c.sheet.getContinuousLayout();
              return [740, 270, 740].map((w) => {
                f.getContext().clear();
                c.sheet.setWidth(w);
                f.draw({ retain: true });
                const geometry = layout.rows.map((r) => [r.measures, r.visibleStaves, r.height, r.width]);
                const drawn =
                  backend === 'svg'
                    ? target.querySelectorAll('path,text').length > 0
                    : target
                        .getContext('2d')
                        .getImageData(0, 0, 850, 1200)
                        .data.some((v, i) => i % 4 === 3 && v > 0);
                return {
                  geometry,
                  fragments: structuredClone(layout.fragments),
                  diagnostics: structuredClone(layout.diagnostics),
                  drawn,
                };
              });
            },
            { backend, kind, family }
          );
          assert.deepEqual(output[0], output[2], backend + ' ' + kind + ' ' + family);
          assert.notDeepEqual(output[0].geometry, output[1].geometry);
          for (const frame of output) {
            assert.ok(frame.drawn);
            assert.deepEqual(frame.diagnostics, [], backend + ' ' + kind + ' ' + family);
          }
        }
  } finally {
    await browser.close();
  }
});

test('a cross-bar beam refits the same four attacks on one row or two', () => {
  const { f, ctx, canvas } = factory();
  const c = f.EasyScore().compose(continuousBeamStudy());
  const l = c.sheet.getContinuousLayout();
  const members = ['b', 'c', 'd', 'e'].map((id) => c.getNote(id));
  const beam = members[0].getBeam();
  const timeline = () =>
    c.voices.flat(2).map((voice) => {
      let onset = 0;
      return voice.getTickables().map((t) => {
        const time = [t.getAttribute('id'), onset, t.getTicks().value()];
        onset += time[2];
        return time;
      });
    });
  const original = timeline();
  const groups = [];
  const renderer = f.getContext(),
    open = renderer.openGroup.bind(renderer);
  renderer.openGroup = (name, ...args) => {
    groups.push(name);
    return open(name, ...args);
  };
  function frame(width, roles) {
    groups.length = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    c.sheet.setWidth(width);
    f.draw({ retain: true });
    assert.deepEqual(
      l.fragments.map((f) => f.part),
      roles
    );
    assert.equal(groups.filter((g) => g === 'beam').length, roles.length);
    assert.equal(groups.filter((g) => g === 'stem').length, 6);
    assert.deepEqual(beam.getNotes(), members);
    assert.deepEqual(timeline(), original);
    assert.equal(c.getNote('g').hasBeam(), false);
    assert.equal(c.getNote('f').hasBeam(), false);
    assert.deepEqual(l.diagnostics, []);
    for (const n of members) {
      assert.equal(n.getBeam(), beam);
      assert.equal(n.shouldDrawFlag(), false);
      const row = l.rows.findIndex((r) => r.systems.some((s) => s.getStaves().includes(n.getStave())));
      const line = l.fragments[row],
        x = n.getStemX();
      const y = line.y1 + ((line.y2 - line.y1) * (x - line.x1)) / (line.x2 - line.x1);
      assert.ok(Math.abs(y - n.getStemExtents().topY) < 0.001, 'stem touches the local beam edge');
    }
    return canvas.toBuffer();
  }
  const wide = frame(450, ['single']);
  frame(160, ['first', 'last']);
  assert.ok(l.fragments[0].x2 > members[1].getStemX());
  assert.ok(l.fragments[1].x1 < members[2].getStemX());
  assert.deepEqual(frame(450, ['single']), wide);
  const forced = factory()
    .f.EasyScore()
    .compose(continuousBeamStudy([{ measure: 2, breakBefore: 'force' }]));
  forced.sheet.setWidth(450).format();
  assert.deepEqual(
    forced.sheet.getContinuousLayout().fragments.map((f) => f.part),
    ['first', 'last']
  );
});

test('a system break can leave a single beamed attack, with secondary levels continued only where shared', () => {
  const { f } = factory();
  const source = continuousBeamStudy([{ measure: 2, breakBefore: 'force' }]);
  const measures = source.staves[0].measures;
  measures[0].voices[0].notes = [
    { id: 'g', note: { keys: ['g/4'], duration: 'q', dots: 1 } },
    { id: 'b', note: { keys: ['b/4'], duration: '16', stemDirection: -1 } },
    { id: 'c', note: { keys: ['c/5'], duration: '16', stemDirection: -1 } },
  ];
  source.continuous.spans[0].from = 'c';
  const c = f.EasyScore().compose(source);
  f.draw({ retain: true });
  const [outgoing, incoming] = c.sheet.getContinuousLayout().fragments;
  const n = c.getNote('c');
  assert.ok(outgoing.x1 <= n.getStemX() && outgoing.x2 > n.getStemX());
  assert.equal(outgoing.y1, outgoing.y2);
  assert.ok(incoming.x1 < c.getNote('d').getStemX());
  assert.ok(
    n
      .getBeam()
      .getStripBounds()
      .every((b) => Number.isFinite(b.x + b.y + b.w + b.h))
  );
  for (const bad of ['g', 'f']) {
    const input = continuousBeamStudy();
    if (bad === 'g') input.continuous.spans[0].from = bad;
    else input.continuous.spans[0].to = bad;
    assert.throws(() => factory().f.EasyScore().compose(input), /beamable pitched notes/);
  }
});

test('a same-measure continuous beam matches native beam ink', () => {
  function render(continuous) {
    const { f, canvas } = factory();
    const source = continuousBeamStudy();
    source.staves[0].measures.length = 1;
    const notes = source.staves[0].measures[0].voices[0].notes;
    notes[0].note.stemDirection = 1;
    notes[1].note.stemDirection = 1;
    notes[2].note.stemDirection = 1;
    source.continuous.spans = continuous ? [{ id: 'local', kind: 'beam', from: 'b', to: 'c' }] : [];
    const c = f.EasyScore().compose(source);
    if (!continuous) f.Beam({ notes: [c.getNote('b'), c.getNote('c')] });
    f.draw();
    return canvas.toBuffer();
  }
  assert.deepEqual(render(true), render(false));
});

test('straight glissandi preserve direction and selected head clearance through a system break', () => {
  for (const descending of [false, true]) {
    const { f, ctx, canvas } = factory();
    const score = f.EasyScore().compose(glissandoStudy(descending));
    const from = score.getNote('from');
    const to = score.getNote('to');
    const layout = score.sheet.getContinuousLayout();
    const render = (width, parts) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      score.sheet.setWidth(width);
      f.draw({ retain: true });
      const segments = layout.fragments;
      // This study has only glissando spans. Capture their actual Canvas paths independently of the note drawing.
      const paths = [];
      const drawing = f.getContext();
      drawing.save();
      try {
        const recorder = Object.create(drawing);
        recorder.moveTo = (x, y) => paths.push([x, y]);
        recorder.lineTo = (x, y) => paths.at(-1).push(x, y);
        recorder.stroke = () => {};
        layout.draw(recorder);
      } finally {
        drawing.restore();
      }
      assert.deepEqual(
        paths,
        segments.map((s) => [s.x1, s.y1, s.x2, s.y2])
      );
      assert.deepEqual(
        segments.map((s) => s.part),
        parts
      );
      assert.deepEqual(layout.diagnostics, []);
      const first = segments[0],
        last = segments[segments.length - 1];
      const a = from.getHeadInk()[1],
        b = to.getHeadInk()[0];
      assert.ok(first.x1 > a.x + a.w && last.x2 < b.x);
      assert.equal(first.y1, from.getYs()[1]);
      assert.equal(last.y2, to.getYs()[0]);
      for (const s of segments) {
        assert.ok(s.x2 > s.x1);
        assert.equal(Math.sign(s.y2 - s.y1), descending ? 1 : -1);
        const row = layout.rows[s.row];
        assert.ok(Math.min(s.y1, s.y2) >= row.y && Math.max(s.y1, s.y2) < row.y + row.height);
      }
      assert.equal(score.getNote('from'), from);
      assert.equal(score.getNote('to'), to);
      return { segments: structuredClone(segments), pixels: canvas.toBuffer() };
    };
    const wide = render(430, ['single']);
    const split = render(150, ['first', 'last']);
    const [left, right] = split.segments;
    assert.ok(
      Math.abs((left.y2 - left.y1) / (left.x2 - left.x1) - (right.y2 - right.y1) / (right.x2 - right.x1)) < 0.00001
    );
    assert.deepEqual(render(430, ['single']), wide);

    const forced = factory().f.EasyScore().compose(glissandoStudy(descending, true));
    forced.sheet.setWidth(430).format();
    assert.deepEqual(
      forced.sheet.getContinuousLayout().fragments.map((s) => s.part),
      ['first', 'last']
    );
  }
});

test('wavy glissandi fit whole waves normal to the pitch line through a break and rejoin', () => {
  for (const descending of [false, true]) {
    const source = glissandoStudy(descending);
    source.continuous.spans[0].wavy = true;
    const { f, ctx, canvas } = factory();
    const score = f.EasyScore().compose(source);
    const layout = score.sheet.getContinuousLayout();
    const render = (width, parts) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      score.sheet.setWidth(width);
      f.draw({ retain: true });
      assert.deepEqual(
        layout.fragments.map((segment) => segment.part),
        parts
      );
      assert.deepEqual(layout.diagnostics, []);
      const paths = [];
      layout.draw({
        save() {},
        restore() {},
        beginPath() {},
        stroke() {},
        moveTo(x, y) {
          paths.push([[x, y]]);
        },
        quadraticCurveTo(...points) {
          paths.at(-1).push(points);
        },
      });
      assert.equal(paths.length, parts.length);
      for (const [i, segment] of layout.fragments.entries()) {
        const { x1, x2, y1, y2, space } = segment;
        const [start, ...halves] = paths[i];
        assert.equal(segment.wavy, true);
        assert.deepEqual(start, [x1, y1]);
        assert.deepEqual(halves.at(-1).slice(2), [x2, y2]);
        assert.ok(halves.length >= 2 && halves.length % 2 === 0);
        const length = Math.hypot(x2 - x1, y2 - y1);
        const tx = (x2 - x1) / length,
          ty = (y2 - y1) / length;
        assert.equal(Math.sign(ty), descending ? 1 : -1);
        let previous = start;
        for (const [index, [cx, cy, x, y]] of halves.entries()) {
          // At the middle of a quadratic the crest is halfway to the control point from the chord.
          const ox = (cx - (previous[0] + x) / 2) / 2,
            oy = (cy - (previous[1] + y) / 2) / 2;
          assert.ok(Math.abs(ox * tx + oy * ty) < 1e-8);
          assert.ok(Math.hypot(ox, oy) > space * 0.1 && Math.hypot(ox, oy) <= space * 0.19);
          assert.equal(Math.sign(tx * oy - ty * ox), index % 2 === 0 ? -1 : 1);
          previous = [x, y];
        }
      }
      const first = layout.fragments[0],
        last = layout.fragments.at(-1);
      const from = score.getNote('from'),
        to = score.getNote('to');
      const head = from.getHeadInk()[1];
      assert.ok(first.x1 > head.x + head.w && last.x2 < to.getHeadInk()[0].x);
      assert.equal(first.y1, from.getYs()[1]);
      assert.equal(last.y2, to.getYs()[0]);
      return { paths, pixels: canvas.toBuffer() };
    };
    const wide = render(520, ['single']);
    const compact = render(320, ['single']);
    assert.ok(wide.paths[0].length > compact.paths[0].length);
    render(150, ['first', 'last']);
    assert.deepEqual(render(520, ['single']), wide);
  }
});

test('a glissando retains its pitch progression through an intermediate row and a repeated bass clef', () => {
  const source = glissandoStudy();
  source.staves[0].measures.splice(1, 0, {
    clef: 'bass',
    voices: [{ notes: [{ note: { keys: ['g/3'], duration: 'h' } }] }],
  });
  source.continuous.boundaries = [2, 3].map((measure) => ({ measure, breakBefore: 'force' }));
  const { f } = factory();
  const c = f.EasyScore().compose(source);
  f.draw({ retain: true });
  const { fragments } = c.sheet.getContinuousLayout();
  assert.deepEqual(
    fragments.map((f) => f.part),
    ['first', 'middle', 'last']
  );
  assert.ok(fragments.every((f) => f.y2 < f.y1));
  // On the last two rows the same clef projects the shared boundary pitch onto the same staff line.
  assert.ok(Math.abs(fragments[1].y2 - c.staves[1][0].getY() - (fragments[2].y1 - c.staves[2][0].getY())) < 0.00001);
});

test('a dashed lower-head tie keeps its stroke, pitch and endpoints when the score wraps and rejoins', () => {
  const { f, ctx, canvas } = factory();
  const event = (id, keys) => ({ id, note: { keys, duration: 'q', stemDirection: 1 } });
  const measures = [
    { voices: [{ notes: [event('lead', ['g/4']), event('from', ['e/4', 'b/4'])] }] },
    { voices: [{ notes: [event('to', ['e/4', 'b/4']), event('end', ['g/4'])] }] },
  ];
  const score = f.EasyScore().compose({
    sheet: { width: 430 },
    staves: [{ id: 'staff', time: '2/4', measures }],
    continuous: {
      spans: [
        { id: 'editorial', kind: 'tie', from: 'from', to: 'to', fromHead: 0, toHead: 0, side: 'below', dashed: true },
      ],
    },
  });
  const frame = (width, parts) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    score.sheet.setWidth(width);
    f.draw({ retain: true });
    const layout = score.sheet.getContinuousLayout();
    const segments = layout.fragments;
    assert.deepEqual(
      segments.map((s) => s.part),
      parts
    );
    assert.ok(segments.every((s) => s.dashed));
    assert.equal(segments[0].y1, score.getNote('from').getYs()[0] + segments[0].space / 2);
    assert.equal(segments.at(-1).y2, score.getNote('to').getYs()[0] + segments.at(-1).space / 2);
    const strokes = [];
    const recorder = Object.create(f.getContext());
    recorder.stroke = () => strokes.push(ctx.getLineDash());
    recorder.fill = () => assert.fail('a dashed arc must have open gaps');
    layout.draw(recorder);
    assert.deepEqual(
      strokes,
      parts.map(() => [4, 3])
    );
    return canvas.toBuffer();
  };
  const wide = frame(430, ['single']);
  frame(125, ['first', 'last']);
  assert.deepEqual(frame(430, ['single']), wide);
});

test('one rhythmic sextuplet times both measures and reflows its own bracket', () => {
  const source = sextupletStudy();
  const { f, canvas, ctx } = factory();
  const score = f.EasyScore().compose(source);
  const layout = score.sheet.getContinuousLayout();
  const notes = source.continuous.tuplets[0].members.map((id) => score.getNote(id));
  const group = notes[0].getTuplet();
  const quarter = VF.VexFlow.RESOLUTION / 4;
  function draw(width, parts) {
    const labels = [];
    const drawing = f.getContext();
    const text = drawing.fillText;
    drawing.fillText = function (s, ...args) {
      if (s === '6') labels.push(s);
      return text.call(this, s, ...args);
    };
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    try {
      score.sheet.setWidth(width);
      f.draw({ retain: true });
    } finally {
      drawing.fillText = text;
    }
    assert.deepEqual(labels, ['6']);
    assert.deepEqual(
      layout.fragments.map((f) => [f.id, f.part]),
      parts.map((p) => ['six', p])
    );
    assert.deepEqual(layout.diagnostics, []);
    assert.deepEqual(group.getNotes(), notes);
    assert.ok(notes.every((n) => n.getTuplet() === group && n.getDuration() === '8'));
    assert.ok(notes.every((n) => n.getTicks().equals(new VF.Fraction(quarter, 3))));
    assert.ok(notes.reduce((sum, n) => sum.add(n.getTicks()), new VF.Fraction(0, 1)).equals(quarter * 2));
    for (const [m, measures] of score.notes.entries()) {
      const at = new VF.Fraction(0, 1);
      for (const n of measures[0][0]) {
        const i = notes.indexOf(n);
        if (i >= 0) assert.ok(at.equals(new VF.Fraction((m === 0 ? 9 + i : i - 3) * quarter, 3)));
        if (n === score.getNote('next')) assert.ok(at.equals(quarter));
        at.add(n.getTicks());
      }
      assert.ok(at.equals(4 * quarter));
    }
    assert.equal(layout.fragments[0].x1, notes[0].getAbsoluteX());
    assert.equal(layout.fragments.at(-1).x2, notes[5].getAbsoluteX() + notes[5].getGlyphWidth());
    return { spans: structuredClone(layout.fragments), pixels: canvas.toBuffer() };
  }
  const wide = draw(530, ['single']);
  draw(290, ['first', 'last']);
  assert.deepEqual(draw(530, ['single']), wide);
});

test('rhythmic tuplet membership rejects gaps, reversed events, duplicate members and invalid ratios', () => {
  for (const overrides of [
    { members: ['t0', 't2'] },
    { members: ['t3', 't2'] },
    { members: ['t0', 't0'] },
    { members: [] },
    { notesOccupied: 0 },
    { numNotes: 2.5 },
  ]) {
    const source = sextupletStudy();
    Object.assign(source.continuous.tuplets[0], overrides);
    assert.throws(() => factory().f.EasyScore().compose(source), /continuous tuplet/i);
  }
});

test('independent meters keep each staff’s pulse, local bars and source positions through a wrap', () => {
  const { f, ctx, canvas } = factory();
  const staves = [3, 4].map((beats, s) => ({
    id: 'part' + s,
    time: beats + '/4',
    measures: Array.from({ length: 12 / beats }, (_, m) => ({
      voices: [
        {
          notes: Array.from({ length: beats }, (_, i) => ({
            id: s + '-' + (beats * m + i),
            note: { keys: [['g/4', 'a/4', 'b/4'][i % 3]], duration: 'q' },
          })),
        },
      ],
    })),
  }));
  const score = f.EasyScore().compose({ staves, continuous: { independentMeters: true } });
  const notes = staves.map((_, s) => Array.from({ length: 12 }, (_, i) => score.getNote(s + '-' + i)));
  const quarter = VF.VexFlow.RESOLUTION / 4;
  function render(width) {
    score.sheet.setWidth(width);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    f.draw({ retain: true });
    const bars = [[], []];
    let pulses = 0;
    score.notes.forEach((parts, i) => {
      pulses += parts[0][0].length;
      for (let s = 0; s < 2; s++) {
        const bar = score.staves[i][s].getModifiers(VF.StaveModifier.Position.END, VF.Barline.CATEGORY)[0];
        if (bar.getType() !== VF.Barline.type.NONE) bars[s].push(pulses);
      }
    });
    assert.deepEqual(bars, [
      [3, 6, 9, 12],
      [4, 8, 12],
    ]);
    for (const [i, top] of notes[0].entries()) {
      assert.equal(top.getAbsoluteX(), notes[1][i].getAbsoluteX());
      for (const [s, group] of notes.entries()) {
        const n = group[i],
          beats = 3 + s,
          pos = score.meterPositions.get(n);
        assert.equal(score.getNote(s + '-' + i), n);
        assert.equal(n.getTicks().value(), quarter);
        assert.deepEqual(
          [pos.staff, pos.measure, pos.event, pos.onset.value()],
          ['part' + s, 1 + Math.floor(i / beats), i % beats, (i % beats) * quarter]
        );
      }
    }
    return canvas.toBuffer();
  }
  const wide = render(900);
  assert.equal(score.sheet.getRows().length, 1);
  assert.notDeepEqual(render(330), wide);
  assert.equal(score.sheet.getRows().length, 2);
  assert.notEqual(notes[0][5].getStave().getY(), notes[0][6].getStave().getY());
  assert.deepEqual(render(900), wide);
  assert.throws(() => factory().f.EasyScore().compose({ staves, continuous: {} }), /same number of measures/);
  assert.throws(
    () =>
      factory()
        .f.EasyScore()
        .compose({
          staves: [staves[0], { ...staves[1], measures: staves[1].measures.slice(1) }],
          continuous: { independentMeters: true },
        }),
    /same total duration/
  );
});

test('a held note survives a local barline on another staff', () => {
  const { f } = factory();
  const score = f.EasyScore().compose({
    continuous: { independentMeters: true },
    staves: [
      { id: 'upper', time: '2/4', measures: [{ voices: [{ notes: 'C5/h' }] }, { voices: [{ notes: 'D5/h' }] }] },
      {
        id: 'lower',
        time: '4/4',
        measures: [{ voices: [{ notes: [{ id: 'held', note: { keys: ['g/4'], duration: 'w' } }] }] }],
      },
    ],
  });
  f.draw({ retain: true });
  assert.equal(score.systems.length, 1);
  assert.equal(score.getNote('held').getTicks().value(), VF.VexFlow.RESOLUTION);
  assert.equal(score.meterPositions.get(score.notes[0][0][0][1]).measure, 2);
});

test('cross-bar tuplet timing precedes alignment to an independently metered staff', () => {
  const source = sextupletStudy();
  source.continuous.independentMeters = true;
  source.staves.push({
    id: 'pulse',
    time: '2/4',
    measures: Array.from({ length: 4 }, () => ({
      voices: [{ notes: 'G4/q, G4/q' }],
    })),
  });
  const { f } = factory();
  const score = f.EasyScore().compose(source);
  const written = source.continuous.tuplets[0].members.map((id) => score.getNote(id));
  for (const width of [530, 290, 530]) {
    score.sheet.setWidth(width);
    f.draw({ retain: true });
    assert.deepEqual(
      written.map((n) => n.getTupletStack().length),
      Array(6).fill(1)
    );
    assert.deepEqual(
      written.map((n) => score.meterPositions.get(n).measure),
      [1, 1, 1, 2, 2, 2]
    );
    assert.ok(written.every((n) => n.getTicks().equals(new VF.Fraction(VF.VexFlow.RESOLUTION / 4, 3))));
    assert.ok(score.meterPositions.get(score.getNote('next')).onset.equals(VF.VexFlow.RESOLUTION / 4));
  }
});

test('continuous score breaks retain centered drum hands and enclose the sticking in each row', () => {
  const { f } = factory();
  const source = spec(3, { boundaries: [{ measure: 3, breakBefore: 'force' }] });
  source.sheet = { width: 600, rowGap: 0 };
  const c = f.EasyScore().compose(source);
  const notes = [0, 1, 2].map((i) => c.getNote('n' + i));
  notes[0].addModifier(f.Articulation({ type: 'a>', position: 'below' }));
  const marks = c.sheet.addStickingLine(notes.map((note, i) => ({ note, hand: i === 1 ? 'L' : 'R' })));
  c.sheet.format();
  const [first, second] = c.sheet.getRows();
  assert.equal(first.systems.length, 2);
  assert.equal(second.systems.length, 1);
  assert.equal(marks[0].computeY().y, marks[1].computeY().y);
  for (const [i, mark] of marks.entries()) {
    const row = i < 2 ? first : second;
    assert.equal(mark.getNote(), notes[i]);
    const ink = VF.measureEngraving(mark).ink;
    assert.ok(ink.y >= row.y && ink.y + ink.h <= row.y + row.height);
  }
});

test('staff profiles distinguish coincident and staggered extremes after reflow', () => {
  function gap(staggered, extraInk = false, minimum) {
    const { f } = factory();
    const part = (id, clef, pitches) => ({
      id,
      clef,
      time: '4/4',
      measures: [{ voices: [{ notes: pitches.map((pitch) => ({ note: { keys: [pitch], duration: 'h' } })) }] }],
    });
    const c = f.EasyScore().compose({
      staves: [
        part('upper', 'treble', ['c/3', 'g/5']),
        part('lower', 'bass', staggered ? ['c/2', 'g/4'] : ['g/4', 'c/2']),
      ],
      sheet: { width: 350 },
      system: minimum === undefined ? {} : { spaceBetweenStaves: minimum },
      continuous: {
        verticalSpacing: 'profile',
        inkBounds: (stave) =>
          extraInk && stave.getClef() === 'treble'
            ? [{ x: stave.getX(), y: stave.getYForLine(11), w: stave.getWidth(), h: 12 }]
            : [],
      },
    });
    const measure = (width) => {
      c.sheet.setWidth(width).format();
      const [upper, lower] = c.staves[0];
      return lower.getYForLine(0) - upper.getYForLine(4);
    };
    const first = measure(350);
    measure(250);
    assert.equal(measure(350), first);
    return first;
  }
  assert.ok(gap(false) - gap(true) >= 30);
  assert.ok(gap(true, true) > gap(true) + 20);
  assert.ok(gap(true, false, 18) >= 140);
});

test('Maple Leaf Rag crossed-hand sixteenths remain attached to the lower stave and their beams', () => {
  const { f } = factory();
  const pitches = ['b/3', 'ab/2', 'cb/3', 'ab/3', 'b/3', 'ab/3', 'cb/4', 'ab/4'];
  const notes = pitches.map((pitch, i) => ({
    id: 'cross' + i,
    stave: 'lower',
    note: { keys: [pitch], clef: 'bass', duration: i % 4 === 0 ? '16r' : '16', stemDirection: 1 },
  }));
  const c = f.EasyScore().compose({
    staves: [
      {
        id: 'upper',
        clef: 'treble',
        time: '2/4',
        measures: [{ voices: [{ notes, autoBeam: true }] }, { voices: [{ notes: 'Ab4/8, Cb5, Ab5, Ab6' }] }],
      },
      {
        id: 'lower',
        clef: 'bass',
        time: '2/4',
        measures: [
          { voices: [{ notes: 'Ab1/8, B3/8/r, Ab2/8, B3/8/r' }] },
          { voices: [{ notes: 'Ab3/8, B3/8/r, Ab4/8, B3/8/r' }] },
        ],
      },
    ],
    continuous: { verticalSpacing: 'profile' },
  });
  for (const width of [640, 195, 640]) {
    c.sheet.setWidth(width).format();
    for (const i of [1, 2, 3, 5, 6, 7]) {
      const n = c.getNote('cross' + i);
      assert.equal(n.getStave(), c.staves[0][1]);
      const tip = n.getStemSegment();
      assert.ok(
        n
          .getBeam()
          .getStripBounds()
          .some((b) => tip.x >= b.x && tip.x <= b.x + b.w && tip.tipY >= b.y - 1 && tip.tipY <= b.y + b.h + 1)
      );
    }
  }
});

test('the Ballade cue and pedal remain inside their screen rows', () => {
  const c = factory().f.EasyScore().compose(balladeSpacingStudy());
  for (const width of [580, 340]) {
    c.sheet.setWidth(width).format();
    const { rows, fragments } = c.sheet.getContinuousLayout();
    assert.deepEqual(
      rows.map((r) => r.visibleStaves),
      [
        ['ossia', 'upper', 'lower'],
        ['upper', 'lower'],
      ]
    );
    const cue = c.staves[0][0];
    assert.ok(cue.getYForLine(0) >= rows[0].y && cue.getYForLine(4) < c.staves[0][1].getYForLine(0));
    const pedal = fragments.find((f) => f.id === 'pedal');
    assert.ok(pedal.y1 > c.staves[1][2].getYForLine(4));
    assert.ok(pedal.y1 <= rows[1].y + rows[1].height);
  }
});

test('screen rows share whitespace while retaining the requested clearance at every beat', () => {
  const gap = 24;
  const bottom = (box) => box.y + box.h;
  function layout(staggered) {
    const { f } = factory();
    const c = f.EasyScore().compose({
      sheet: { width: 380, rowGap: gap },
      continuous: { verticalSpacing: 'profile', boundaries: [{ measure: 2, breakBefore: 'force' }] },
      staves: [
        {
          id: 'part',
          time: '4/4',
          showTimeSignature: false,
          measures: [{ voices: [{ notes: 'C3/h, G5' }] }, { voices: [{ notes: staggered ? 'C4/h, G6' : 'G6/h, C4' }] }],
        },
      ],
    });
    c.sheet.format();
    const boxes = c.notes.map((m) => m.flat(2).flatMap((n) => VF.measureEngraving(n).parts));
    for (const a of boxes[0])
      for (const b of boxes[1]) {
        if (a.x < b.x + b.w && b.x < a.x + a.w) assert.ok(b.y - bottom(a) >= gap - 0.01);
      }
    return c.sheet.getRows()[1].y;
  }
  const aligned = layout(false),
    staggered = layout(true);
  assert.ok(aligned - staggered > 20, JSON.stringify({ aligned, staggered }));
});
