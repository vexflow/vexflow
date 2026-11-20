// Exercise the three playable guide scores on both renderers and verify their musical identities.
import assert from 'node:assert/strict';
import { guitar } from '../../guide/catalog/guitar.mjs';

const studies = ['rasgueado-golpe', 'bossa-anticipation', 'string-mute-bend'];

/** Run the editable lesson as printed and read its actual formatted events and technique fragments. */
function renderStudy({ id, code, width, backend }) {
  const target = document.createElement(backend === 'Canvas' ? 'canvas' : 'div');
  target.id = 'score';
  document.body.replaceChildren(target);
  const run = new Function('VF', 'width', 'height', code + '\nreturn { score, composition, spec };');
  const { score, composition, spec } = run(VexFlow, width, 700);
  const navigation = new VexFlow.ScoreNavigation(composition, spec.staves);
  const events = navigation.events.filter((e) => /^(tab|staff)-/.test(e.id));
  const spans = navigation.regions.filter((r) => r.kind === 'span');
  const result = {
    events,
    spans,
    rows: composition.sheet.getRows().length,
    overflow: composition.sheet.getRows().some((r) => r.overflow > 1),
    diagnostics: composition.sheet.getContinuousLayout()?.diagnostics ?? [],
    allSelectable: events.every((e) => navigation.regions.some((r) => r.id === e.id && r.w > 0 && r.h > 0)),
  };
  if (id === 'rasgueado-golpe') {
    const tab = composition.getNote('tab-0');
    result.arrow = tab.getModifiers().find((m) => m instanceof VexFlow.Stroke).type;
    result.stroke = tab.notation.find((n) => n.stroke).stroke;
    // Read ink after drawing so both arrow conventions and both backends use the same clearance checks.
    result.arrowGaps = Array.from({ length: 7 }, (_, i) => {
      const note = composition.getNote('tab-' + i);
      const bounds = note
        .getModifiers()
        .find((m) => m instanceof VexFlow.Stroke)
        .getBoundingBox();
      return note.getAbsoluteX() - note.getLeftDisplacedHeadPx() - (bounds.x + bounds.w);
    });
    result.golpe = ['staff', 'tab'].map((view) => {
      const marks = composition.getNote(view + '-4').getModifiers();
      const label = marks.find((m) => m instanceof VexFlow.Annotation && m.text === 'i + golpe');
      const ink = label.getTextInk(label.computeX().x, label.computeY().y);
      const accent = marks.find((m) => m instanceof VexFlow.Articulation).getInkBounds();
      return { pt: VexFlow.Font.convertSizeToPointValue(label.fontInfo.size), gap: accent.y - (ink.y + ink.h) };
    });
  }
  if (id === 'string-mute-bend') {
    const tab = composition.getNote('tab-1-0-4');
    const bend = tab.getModifiers().find((m) => m instanceof VexFlow.Bend);
    result.bendString = tab.getPositions()[bend.getIndex()].str;
    // Read the same drawing commands used for SVG and Canvas. Ratios must follow the written phases.
    const original = bend.checkContext();
    const curves = [];
    let start;
    const recorder = Object.create(original);
    recorder.moveTo = (x, y) => {
      start = [x, y];
    };
    recorder.quadraticCurveTo = (_cx, _cy, x, y) => curves.push([start, [x, y]]);
    for (const method of [
      'lineTo',
      'fill',
      'stroke',
      'beginPath',
      'closePath',
      'fillText',
      'setFont',
      'setFillStyle',
      'setStrokeStyle',
      'setLineWidth',
    ])
      recorder[method] = () => recorder;
    try {
      bend.setContext(recorder).draw();
    } finally {
      bend.setContext(original);
    }
    const [[a, b], [c, d]] = curves;
    result.bendShape = [
      (b[0] - a[0]) / (d[0] - a[0]),
      (c[0] - a[0]) / (d[0] - a[0]),
      b[1] < a[1],
      c[1] === b[1],
      d[1] === a[1],
    ];
    const counts = tab.getModifiers().length;
    for (const w of [width === 820 ? 388 : 788, width - 32]) {
      composition.sheet.setWidth(w).format();
      score.draw({ retain: true });
    }
    const restored = new VexFlow.ScoreNavigation(composition, spec.staves);
    result.restored =
      tab.getModifiers().length === counts && JSON.stringify(restored.regions) === JSON.stringify(navigation.regions);
  }
  return result;
}

/** Scope errors fail before they can silently change the performance. Exercise semantic SVG export as well. */
function contracts() {
  const VF = VexFlow;
  const guitar = new VF.FrettedInstrument();
  const positions = [
    { str: 3, fret: 7 },
    { str: 2, fret: 5 },
  ];
  const timing = { string: 3, semitones: 2, rise: [1, 2], hold: [3, 4], release: [1, 1] };
  const stroke = { finger: 'a', duration: '16', direction: 'bass-to-treble' };
  const fan = guitar.rasgueado(positions, [stroke, stroke, { ...stroke, duration: '8' }, stroke]);
  const paired = guitar.bentAttack(positions, 'w', timing);
  const spec = (strings) => ({
    staves: [
      {
        id: 'tab',
        kind: 'tab',
        measures: ['a', 'b'].map((id) => ({ voices: [{ notes: [{ id, tab: paired.tab }] }] })),
      },
    ],
    continuous: { spans: [{ kind: 'palmMute', id: 'mute', strings, from: 'a', to: 'b' }] },
  });
  const host = document.createElement('div');
  document.body.append(host);
  try {
    const invalid = [
      () => guitar.bentAttack(positions, 'q', { ...timing, string: 6 }),
      () => guitar.bentAttack(positions, 'q', { ...timing, hold: [2, 4] }),
      () => guitar.bentAttack(positions, 'q', { ...timing, rise: [1, 0] }),
      () => guitar.bentAttack(positions, 'q', { ...timing, release: [5, 4] }),
      () => guitar.rasgueado(positions, [{ ...stroke, direction: 'up' }]),
      () => guitar.attack([{ str: 6, fret: 'X' }], '8'),
      ...[[], [3, 3], [0], [6]].map((strings) => () => new VF.Publication(spec(strings)).render(host)),
    ].map((call) => {
      try {
        call();
        return false;
      } catch (e) {
        return e.code;
      }
    });
    host.replaceChildren();
    new VF.Publication(spec([2, 3])).render(host);
    const meta = JSON.parse(host.querySelector('metadata').textContent);
    return {
      offsets: fan.map((e) => e.offset.toString()),
      invalid,
      span: meta.spans[0],
      bend: meta.events[0].notation.find((n) => n.bend).bend,
    };
  } finally {
    host.remove();
  }
}

export async function guitarStudies(context) {
  const page = await context.newPage();
  try {
    await page.goto('http://score.test/empty');
    await page.addScriptTag({ path: 'build/cjs/vexflow-debug.js' });
    await page.evaluate(async () => Promise.all([...document.fonts].map((f) => f.load())));
    const checks = await page.evaluate(contracts);
    assert.deepEqual(checks.offsets, ['0/1', '1/16', '1/8', '1/4']);
    assert.deepEqual(checks.invalid, [...Array(6).fill('BadArguments'), ...Array(4).fill('BadContinuousScore')]);
    assert.deepEqual(checks.span, {
      id: 'mute',
      kind: 'palmMute',
      part: 'single',
      strings: [2, 3],
      from: 'a',
      to: 'b',
    });
    assert.deepEqual(checks.bend, { string: 3, semitones: 2, rise: [1, 2], hold: [3, 4], release: [1, 1] });
    for (const id of studies) {
      const { code } = guitar.find((e) => e.id === id);
      let reference;
      for (const backend of ['SVG', 'Canvas'])
        for (const width of [820, 420]) {
          const options = { id, code, width, backend };
          const result = await page.evaluate(renderStudy, options);
          assert.ok(result.allSelectable && !result.overflow, id + ' event bounds or row overflow at ' + width);
          assert.deepEqual(result.diagnostics, []);
          if (reference) assert.deepEqual(result.events, reference);
          reference = result.events;
          const tab = result.events.filter((e) => e.staff === 'tab');
          if (id === 'rasgueado-golpe') {
            assert.deepEqual(
              tab.map((e) => e.onset),
              ['0/1', '1/16', '1/8', '3/16', '1/4', '1/2', '3/4']
            );
            assert.match(tab[3].label, /treble to bass/);
            assert.match(tab[4].label, /simultaneous golpe/);
            assert.match(tab[6].label, /Rolled rasgueado/);
            const flipped = await page.evaluate(renderStudy, {
              ...options,
              code: code.replace("const arrows = 'strings'", "const arrows = 'hand'"),
            });
            assert.notEqual(flipped.arrow, result.arrow);
            assert.equal(flipped.stroke.direction, result.stroke.direction);
            assert.deepEqual(flipped.events, result.events);
            for (const fan of [result, flipped]) {
              assert.ok(
                fan.arrowGaps.every((gap) => gap >= 3),
                'Stroke arrows clear the frets'
              );
              assert.ok(
                fan.golpe.every(({ pt, gap }) => pt === 11 && gap >= 3),
                'The accent clears the 11 pt label'
              );
            }
          } else if (id === 'bossa-anticipation') {
            assert.equal(tab.find((e) => e.id === 'tab-0-1-0').duration, '1/2');
            assert.equal(tab.find((e) => e.id === 'tab-0-0-3').onset, '3/8');
            assert.equal(tab.find((e) => e.id === 'tab-1-0-0').onset, '0/1');
            assert.match(tab.find((e) => e.id === 'tab-1-0-1').label, /Muted strike on string 3/);
          } else {
            assert.equal(result.bendString, 3);
            assert.ok(Math.abs(result.bendShape[0] - 0.5) < 1e-9);
            assert.ok(Math.abs(result.bendShape[1] - 0.75) < 1e-9);
            assert.deepEqual(result.bendShape.slice(2), [true, true, true]);
            assert.equal(result.restored, true);
            assert.match(tab.find((e) => e.id === 'tab-0-1-0').label, /Begin palm mute on string 6/);
            assert.match(tab.find((e) => e.id === 'tab-1-1-0').label, /Last palm-muted attack on string 6/);
            assert.equal(result.spans.length, width === 820 ? 1 : 2);
            assert.ok(result.spans.every((r) => r.id === 'mute-six' && r.strings.join(',') === '6'));
          }
        }
    }
    return { studies, widths: [820, 420], backends: ['SVG', 'Canvas'] };
  } finally {
    await page.close();
  }
}
