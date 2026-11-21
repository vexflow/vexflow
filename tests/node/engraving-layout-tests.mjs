// M1 contracts with real fonts, native notation, drawing and retained reflow.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { createCanvas, registerFont } from 'canvas';
import puppeteer from 'puppeteer';

import { passageView } from '../engraving/score-layout.mjs';
import { compositionInput, excerpt, loadScore, saveScore } from '../engraving/score-persistence.mjs';
import { featheredBeamStudy } from '../engraving/specialist-studies.mjs';

const VF = await import(new URL('../../build/esm/entry/vexflow-core.js', import.meta.url));
const passage = JSON.parse(readFileSync(new URL('../engraving/m1-passage.json', import.meta.url)));
for (const family of ['Bravura', 'Petaluma', 'Academico']) {
  const name = family.toLowerCase();
  registerFont(new URL(`../../node_modules/@vexflow-fonts/${name}/${name}.otf`, import.meta.url).pathname, { family });
}
VF.Element.setTextMeasurementCanvas(createCanvas(1, 1));

function factory(engraving) {
  const canvas = createCanvas(800, 720);
  const f = new VF.Factory({ renderer: { elementId: null }, engraving }).setContext(
    new VF.CanvasContext(canvas.getContext('2d'))
  );
  return { f, canvas };
}
function profile(family, options = {}) {
  const metadata = JSON.parse(
    readFileSync(new URL(`../../node_modules/@vexflow-fonts/${family.toLowerCase()}/metadata.json`, import.meta.url))
  );
  return new VF.EngravingProfile({ musicFont: family, metadata, ...options });
}
function measured(element) {
  const result = VF.measureEngraving(element);
  assert.deepEqual(result.diagnostics, [], element.getCategory());
  assert.ok(result.ink?.w > 0 && result.ink?.h > 0, element.getCategory());
  return result;
}

/** The slur, stacked articulations and slashed grace group stress the same lifecycle as the M0 fixtures. */
function engravingScene(policy) {
  const { f, canvas } = factory(policy);
  const es = f.EasyScore();
  const notes = es.notes('G4/16, B4/16, (D5 E5)/8, E4/q', { stem: 'up' });
  const beam = f.Beam({ notes: notes.slice(0, 2) });
  const group = f
    .GraceNoteGroup({
      notes: ['c/5', 'a/4'].map((key) => f.GraceNote({ keys: [key], duration: '16', slash: true })),
      slur: true,
    })
    .beamNotes();
  notes[2].addModifier(group, 0);
  for (const type of ['a.', 'a>']) notes[3].addModifier(f.Articulation({ type, position: 'below' }), 0);
  const curve = f.Curve({ from: notes[0], to: notes[2], options: { openingDirection: 'down' } });
  const system = f.System({ width: 450, y: 65 });
  system.addStave({ voices: [es.voice(notes, { mode: 'soft' })] });
  const snapshot = () => [beam, ...notes, curve].map(measured);
  return { f, canvas, notes, system, beam, snapshot };
}

test('geometry is available before draw and repeats across measure, draw and wide/narrow/wide', () => {
  const policy = profile('Bravura');
  const scene = engravingScene(policy);
  scene.system.format();
  const baseline = scene.snapshot();
  assert.ok(!scene.notes[0].isRendered());
  assert.deepEqual(scene.snapshot(), baseline);
  scene.f.draw({ retain: true });
  assert.deepEqual(scene.snapshot(), baseline);
  scene.system.setWidth(255).format();
  assert.notDeepEqual(scene.snapshot(), baseline);
  scene.system.setWidth(450).format();
  const fresh = engravingScene(policy);
  fresh.system.format();
  assert.deepEqual(scene.snapshot(), fresh.snapshot());
  assert.deepEqual(scene.snapshot(), baseline);
});

test('two live scores independently consume glyph metrics, anchors and beam policy', () => {
  const a = engravingScene(profile('Bravura'));
  const b = engravingScene(profile('Petaluma', { beamThickness: 0.7, clearance: 0.5 }));
  a.system.format();
  const original = a.snapshot();
  b.system.format();
  b.f.draw({ retain: true });
  assert.deepEqual(a.snapshot(), original);
  assert.equal(a.notes[0].noteHeads[0].fontInfo.family, 'Bravura');
  assert.equal(b.notes[0].noteHeads[0].fontInfo.family, 'Petaluma');
  assert.equal(a.beam.renderOptions.beamWidth, 5);
  assert.equal(b.beam.renderOptions.beamWidth, 7);
  assert.notEqual(b.notes[0].getHeadInk()[0].w, a.notes[0].getHeadInk()[0].w);
  const glyph = VF.VexFlow.Glyphs.noteheadBlack;
  assert.deepEqual(profile('Petaluma').stemAnchor(glyph, 'up'), [1.336, 0.288]);
  for (const metadata of [
    undefined,
    {},
    {
      fontName: 'Petaluma',
      engravingDefaults: { beamThickness: Infinity },
      glyphsWithAnchors: { noteheadBlack: { stemUpSE: [0, NaN] } },
    },
  ]) {
    const fallback = new VF.EngravingProfile({ musicFont: 'Petaluma', metadata });
    assert.equal(fallback.stemAnchor(glyph, 'up'), undefined);
    assert.equal(fallback.beamThickness, 0.5);
    const scene = engravingScene(fallback);
    scene.system.format();
    scene.snapshot();
  }
  assert.throws(() => profile('Bravura', { beamThickness: NaN }), RangeError);
});

test('default Bravura slash stems meet the published glyph anchors at normal and grace sizes', () => {
  const reference = profile('Bravura');
  const { f } = factory();
  for (const make of [f.StaveNote.bind(f), f.GraceNote.bind(f)])
    for (const duration of ['q', '8', 'h'])
      for (const direction of [VF.Stem.UP, VF.Stem.DOWN]) {
        const note = make({ keys: ['b/4'], duration, type: 's', stemDirection: direction });
        const stave = f.Stave({ x: 10, y: 60, width: 240 });
        VF.Formatter.FormatAndDraw(f.getContext(), stave, [note]);
        const head = note.noteHeads[0];
        const [x, y] = reference.stemAnchor(head.text, direction === VF.Stem.UP ? 'up' : 'down');
        const space = head.fontSizeInPixels / 4;
        const stem = note.getStem().getSegment();
        assert.equal(stem.x, note.getNoteHeadBeginX() + head.getXShift() + x * space - (direction * VF.Stem.WIDTH) / 2);
        assert.equal(stem.baseY, head.getY() - y * space);
      }
});

test('slash anchors follow the note font and respect explicit metadata', () => {
  const { f } = factory();
  const custom = new VF.EngravingProfile({
    musicFont: 'Bravura',
    metadata: { fontName: 'Bravura', glyphsWithAnchors: { noteheadSlashVerticalEnds: { stemUpSE: [1.25, 0.4] } } },
  });
  for (const [options, expectedY] of [
    [{ engraving: custom }, 0.4],
    [{ musicFont: 'Petaluma, Bravura' }, 0],
  ]) {
    const note = f.StaveNote({ keys: ['b/4'], duration: 'q', type: 's', stemDirection: VF.Stem.UP, ...options });
    VF.Formatter.FormatAndDraw(f.getContext(), f.Stave({ x: 10, y: 60, width: 240 }), [note]);
    const head = note.noteHeads[0];
    assert.equal(note.getStem().getSegment().baseY, head.getY() - (expectedY * head.fontSizeInPixels) / 4);
  }
});

test('beam clears a head whose attack falls strictly between its stems', () => {
  const build = (peerKey) => {
    const { f } = factory();
    const es = f.EasyScore(),
      notes = es.notes('C4/8, C4/8', { stem: 'up' });
    const others = ['b/4', peerKey, 'b/4'].map((key, i) =>
      f.StaveNote({ keys: [key], duration: ['16r', '16', '8r'][i], stemDirection: -1 })
    );
    const beam = f.Beam({ notes });
    const system = f.System({ width: 360, y: 50 });
    system.addStave({ voices: [es.voice(notes, { mode: 'soft' }), es.voice(others, { mode: 'soft' })] });
    system.format();
    return { strip: measured(beam).ink, obstacle: others[1].getHeadInk()[0] };
  };
  const control = build('g/5'),
    actual = build('c/5');
  assert.ok(
    actual.obstacle.x > actual.strip.x && actual.obstacle.x + actual.obstacle.w < actual.strip.x + actual.strip.w
  );
  assert.ok(
    control.strip.y < actual.obstacle.y + actual.obstacle.h && control.strip.y + control.strip.h > actual.obstacle.y
  );
  assert.ok(actual.strip.y >= actual.obstacle.y + actual.obstacle.h);
});

test('lyrics and cross-staff stems consume the pre-draw coordinates', () => {
  const { f } = factory(),
    es = f.EasyScore();
  const notes = es.notes('G4/8, C5/8', { stem: 'down' });
  const system = f.System({ width: 330, y: 10 });
  const top = system.addStave({ voices: [es.voice(notes, { mode: 'soft' })] });
  const bottom = system.addStave({ voices: [] });
  notes[1].setStave(bottom);
  const beam = f.Beam({ notes });
  const lyrics = notes.map((n, i) => {
    const mark = f.Annotation({ text: ['sum', 'mer'][i], vJustify: 'bottom' });
    n.addModifier(mark, 0);
    return mark;
  });
  system.format();
  const obstacle = measured(beam);
  assert.equal(notes[0].getStave(), top);
  assert.equal(notes[1].getStave(), bottom);
  for (const [i, n] of notes.entries())
    assert.equal(obstacle.anchors['stem' + i].y, measured(n).anchors.stemTip.y + VF.Stem.WIDTH / 2);
  // Place one lyric row below the occupied area. Exclude its own old baseline on a second pass.
  function placeLyricRow() {
    const extension = (element) => (lyrics.includes(element) ? { parts: [], anchors: {} } : undefined);
    const obstacles = [beam, ...notes].map((element) => VF.measureEngraving(element, { extension }).layout);
    const baseline =
      Math.max(...obstacles.map((box) => box.y + box.h)) +
      top.getSpacingBetweenLines() +
      Math.max(...lyrics.map((mark) => mark.getTextMetrics().actualBoundingBoxAscent));
    lyrics.forEach((mark) => mark.setTextBaseline(baseline));
    return baseline;
  }
  const baseline = placeLyricRow();
  assert.equal(placeLyricRow(), baseline);
  assert.deepEqual(
    lyrics.map((mark) => measured(mark).anchors.baseline.y),
    [baseline, baseline]
  );
});

test('unsupported children and overflow are attributed to their source', () => {
  const scene = engravingScene();
  scene.system.format();
  const n = scene.notes[0],
    extra = new VF.Modifier().setAttribute('id', 'extension');
  n.addModifier(extra, 0);
  const d = VF.measureEngraving(n, { viewport: { x: 0, y: 0, w: 1, h: 1 } });
  assert.deepEqual(
    d.diagnostics.map(({ code, sourceId }) => [code, sourceId]),
    [
      ['UnsupportedGeometry', 'extension'],
      ['LayoutOverflow', n.getAttribute('id')],
    ]
  );
  const custom = VF.measureEngraving(extra, {
    extension: () => ({ parts: [{ x: 3, y: 5, w: 8, h: 6 }], anchors: {} }),
    paddingPx: 2,
  });
  assert.deepEqual({ ...custom.layout }, { x: 1, y: 3, w: 12, h: 10 });
  const invalid = VF.measureEngraving(extra, {
    extension: () => ({ parts: [], anchors: { tip: { x: Infinity, y: 0 } } }),
  });
  assert.deepEqual(invalid.diagnostics, [
    { code: 'InvalidGeometry', phase: 'measure', severity: 'error', sourceId: 'extension' },
  ]);
  assert.equal(
    VF.measureEngraving(new VF.StaveNote({ keys: ['c/4'], duration: 'q' })).diagnostics[0].code,
    'UnformattedGeometry'
  );
});

for (const format of ['logical', 'easyscore']) {
  test(format + ' full passage and excerpt reload in a fresh process, render and reflow', () => {
    for (const source of [passage, excerpt(passage, 'm3')]) {
      const wire = saveScore(source, format);
      const moduleURL = new URL('../engraving/score-persistence.mjs', import.meta.url);
      const loaded = JSON.parse(
        execFileSync(
          process.execPath,
          [
            '--input-type=module',
            '-e',
            `import {loadScore} from ${JSON.stringify(moduleURL.href)}; import {readFileSync} from 'node:fs'; console.log(JSON.stringify(loadScore(readFileSync(0,'utf8'))));`,
          ],
          { input: wire }
        )
      );
      assert.deepEqual(loaded, source);
      const { f, canvas } = factory(),
        view = passageView(VF, f, loaded);
      const { composition, dynamics } = view;
      const wide = view.draw(720),
        pixels = canvas.toBuffer('image/png');
      assert.equal(wide.rows.length, 1);
      assert.equal(wide.fragments.length, 1);
      const narrow = view.draw(250);
      if (loaded.measures.length === 3) {
        assert.deepEqual(narrow.rows.at(-1), [2]);
        assert.equal(narrow.fragments.length, 2);
        assert.equal(narrow.fragments[0].release, false);
        assert.equal(narrow.fragments[1].depress, false);
      } else {
        assert.deepEqual(
          loaded.staves.map((s) => [s.key, s.time]),
          [
            ['G', '4/4'],
            ['G', '4/4'],
          ]
        );
        assert.equal(narrow.fragments[0].depress, false);
      }
      assert.equal(narrow.fragments.at(-1).x2, composition.getNote('u3b').getAbsoluteX());
      assert.equal(narrow.fragments.at(-1).release, true);
      assert.equal(dynamics[0].owner, composition.getNote('u3b'));
      assert.equal(dynamics[0].glyph.getYShift(), dynamics[0].owner.checkStave().getSpacingBetweenLines());
      for (const [i, bar] of loaded.measures.entries())
        for (const [j, staff] of loaded.staves.entries()) {
          const native = composition.voices[i][j][0];
          let elapsed = 0;
          native.getTickables().forEach((note, k) => {
            const event = bar.voices[staff.voice][k];
            assert.equal(note, composition.getNote(event.id));
            assert.deepEqual(note.getKeys(), [event.pitch]);
            const frac = (s) => s.split('/').reduce((a, b) => a / b);
            assert.equal(elapsed, frac(event.at));
            const duration = note.getTicks().value() / VF.VexFlow.RESOLUTION;
            assert.equal(duration, frac(event.duration));
            elapsed += duration;
          });
        }
      assert.deepEqual(view.draw(720), wide);
      assert.deepEqual(canvas.toBuffer('image/png'), pixels);
    }
  });
}

test('refs follow a bar insertion and incomplete files report the offending object', () => {
  const edited = structuredClone(passage),
    bar = structuredClone(passage.measures[0]);
  bar.id = 'insert';
  bar.voices.soprano[0].id = 'new-u';
  bar.voices.bass[0].id = 'new-l';
  edited.measures.splice(2, 0, bar);
  for (const format of ['logical', 'easyscore']) {
    const loaded = loadScore(saveScore(edited, format));
    assert.deepEqual(excerpt(loaded, 'm3'), excerpt(passage, 'm3'));
    const view = passageView(VF, factory().f, loaded);
    const rendered = view.draw(720);
    assert.equal(rendered.fragments.at(-1).x2, view.composition.getNote('u3b').getAbsoluteX());
    const bad = structuredClone(passage);
    bad.marks[0].end.measure = 'missing';
    assert.throws(
      () => saveScore(bad, format),
      (e) => e.diagnostic.code === 'DanglingAnchor' && e.diagnostic.sourceId === 'p1'
    );
    const native = structuredClone(passage);
    class CustomBeat extends VF.GhostNote {}
    native.measures[0].voices.bass[0] = new CustomBeat('w').setAttribute('id', 'live');
    assert.throws(
      () => saveScore(native, format),
      (e) => e.diagnostic.code === 'UnsupportedInput' && e.diagnostic.sourceId === 'live'
    );
  }
});

/** Compare analytical bounds to independent raster ink. Allow one pixel for antialiasing. */
test('measured ink encloses the drawn parts for both stem directions and fonts', () => {
  for (const family of ['Bravura', 'Petaluma'])
    for (const direction of [VF.Stem.UP, VF.Stem.DOWN]) {
      const { f, canvas } = factory(profile(family));
      const notes = [['d/6', 'e/6'], ['f/4']].map((keys) =>
        f.StaveNote({ keys, duration: '16', stemDirection: direction })
      );
      const system = f.System({ width: 400, y: 120 });
      notes[0].addModifier(f.Articulation({ type: 'a.', position: direction === 1 ? 'above' : 'below' }), 0);
      system.addStave({ voices: [f.EasyScore().voice(notes, { mode: 'soft' })] });
      system.format();
      for (const element of [
        ...notes,
        f.Curve({ from: notes[0], to: notes[1], options: { openingDirection: 'up' } }),
      ]) {
        const { ink } = measured(element),
          ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        element.drawWithStyle();
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let count = 0;
        for (let i = 3; i < data.length; i += 4)
          if (data[i] > 100) {
            const x = ((i - 3) / 4) % canvas.width,
              y = Math.floor((i - 3) / 4 / canvas.width);
            assert.ok(
              x >= Math.floor(ink.x) - 1 &&
                y >= Math.floor(ink.y) - 1 &&
                x <= Math.ceil(ink.x + ink.w) + 1 &&
                y <= Math.ceil(ink.y + ink.h) + 1,
              `${family} ${element.getCategory()} pixel ${x},${y} outside ${JSON.stringify(ink)}`
            );
            count++;
          }
        assert.ok(count > 10);
      }
    }
});

test('browser SVG keeps one rehearsal mark, the dynamic and the pedal through reflow', async () => {
  const browser = await puppeteer.launch({ headless: true, args: process.env.CI ? ['--no-sandbox'] : [] });
  try {
    const page = await browser.newPage();
    await page.setContent('<style>body {background:white}</style><div id="score"></div>');
    await page.addScriptTag({ path: new URL('../../build/cjs/vexflow-debug.js', import.meta.url).pathname });
    // Only the projection runs in the browser. Supply its two local duration dependencies.
    await page.addScriptTag({
      content: `const durations = new Map([['1/1','w'],['1/2','h']]); const compositionInput = ${compositionInput}; const passageView = ${passageView};`,
    });
    const snapshots = await page.evaluate(async (score) => {
      await document.fonts.ready;
      const f = new VexFlow.Factory({
        renderer: { elementId: 'score', width: 800, height: 700 },
        engraving: new VexFlow.EngravingProfile({ musicFont: 'Petaluma' }),
      });
      const view = passageView({ VexFlow }, f, score);
      return [720, 250, 720].map((width) => {
        const rendering = view.draw(width);
        const nodes = [...document.querySelectorAll('#score svg text')];
        const boxes = nodes.map((node) => {
          const b = node.getBBox();
          return [node.textContent, b.x, b.y, b.width, b.height];
        });
        const head = view.composition.getNote('u3b');
        const mark = view.dynamics[0].glyph;
        return {
          rendering,
          boxes,
          owner: head.getAttribute('id'),
          baseline: VexFlow.measureEngraving(mark).anchors.baseline.y,
          dynamic: boxes.filter((b) => b[0] === VexFlow.Glyphs.dynamicPiano),
          rehearsal: boxes.filter((b) => b[0] === 'B'),
        };
      });
    }, passage);
    const [wide, narrow, restored] = snapshots;
    assert.deepEqual(restored, wide);
    assert.equal(narrow.rendering.fragments.length, 2);
    for (const s of snapshots) {
      assert.equal(s.owner, 'u3b');
      assert.equal(s.rehearsal.length, 1);
      assert.equal(s.dynamic.length, 1);
      assert.ok(s.dynamic[0][3] > 0 && s.rehearsal[0][3] > 0);
      assert.ok(s.dynamic[0][2] < s.baseline && s.dynamic[0][2] + s.dynamic[0][4] >= s.baseline);
    }
  } finally {
    await browser.close();
  }
});

test('beam slope options are validated before reading note geometry', () => {
  const { f } = factory();
  const beam = f.Beam({ notes: f.EasyScore().notes('C4/8, E4', { stem: 'up' }) });
  const defaults = { ...beam.renderOptions };
  for (const settings of [
    ...[0, -1, 1.5, NaN, Infinity, 1001, Number.MAX_SAFE_INTEGER + 1].map((slopeIterations) => ({ slopeIterations })),
    { minSlope: NaN },
    { minSlope: -Infinity },
    { maxSlope: Infinity },
    { minSlope: 0.2, maxSlope: 0.1 },
  ]) {
    Object.assign(beam.renderOptions, defaults, settings);
    assert.throws(() => beam.calculateSlope(), { code: 'BadArguments' });
  }
});

test('beam fitting includes both endpoints, honors fixed slopes, and preserves the default fit', () => {
  const ascending = 'C4/8, F4, D5, G5';
  const descending = 'D6/8, F5, D4, G3';
  function fit(pitches, settings = {}) {
    const { f } = factory();
    const score = f.EasyScore();
    const notes = score.notes(pitches, { stem: 'up' });
    const beam = f.Beam({ notes });
    Object.assign(beam.renderOptions, settings);
    const system = f.System({ width: 350, y: 60 });
    system.addStave({ voices: [score.voice(notes, { mode: 'soft' })] }).addClef('treble');
    system.format();
    beam.postFormat();
    return beam.slope;
  }

  // These two steep contours favored opposite endpoints of the original default range.
  assert.equal(fit(ascending), -0.25);
  assert.equal(fit(descending), 0.25);
  for (const slopeIterations of [1, 3, 1000]) {
    const bounds = { minSlope: -0.1, maxSlope: 0.2, slopeIterations };
    assert.equal(fit(ascending, bounds), bounds.minSlope);
    assert.equal(fit(descending, bounds), bounds.maxSlope);
  }
  assert.equal(fit(ascending, { minSlope: 0.125, maxSlope: 0.125 }), 0.125);
});

test('default slope fitting preserves the chosen angle when several candidates have the same cost', () => {
  const { f } = factory();
  const notes = f.EasyScore().notes('G4/8, F4, E4, C4', { stem: 'up' });
  const beam = f.Beam({ notes });
  const stave = f.Stave({ y: 65 });
  // Four equally spaced attacks put neighboring slopes on the same cost plateau.
  notes.forEach((note, index) => {
    note.setStave(stave);
    new VF.TickContext()
      .addTickable(note)
      .preFormat()
      .setX(30 + 30 * index);
  });
  beam.calculateSlope();
  assert.ok(Math.abs(beam.slope - 0.15) < 1e-12);
});

test('French beaming leaves the gap open only at interior stems on uninterrupted strips', () => {
  function fit(stem, pitches, options, automatic = false) {
    const { f } = factory();
    const es = f.EasyScore();
    const notes = es.notes(pitches, { stem });
    const beam = automatic ? es.autoBeam(notes, options)[0] : f.Beam({ notes, options });
    const voice = es.voice(notes, { mode: 'soft' });
    const system = f.System({ width: 360, y: 65 });
    system.addStave({ voices: [voice] });
    system.format();
    beam.postFormat();
    // The logical primary fit stays in place. Compare the actual drawn tip against that edge.
    const insets = notes.map((note) => {
      const { topY } = note.getStemExtents();
      const inset = (note.getStemSegment().tipY - topY) * note.getStemDirection() - VF.Stem.WIDTH / 2;
      return Math.round(inset * 1000) / 1000;
    });
    return { insets, width: beam.renderOptions.beamWidth, ticks: voice.getTicksUsed().value() };
  }

  for (const direction of ['up', 'down']) {
    const pitches = 'G4/16, A4, B4, C5';
    const { width, ticks, insets } = fit(direction, pitches, { frenchBeams: true }, true);
    assert.equal(ticks, VF.VexFlow.RESOLUTION / 4);
    assert.deepEqual(insets, [0, 1.5 * width, 1.5 * width, 0]);
    assert.deepEqual(fit(direction, pitches, {}).insets, [0, 0, 0, 0]);
    assert.deepEqual(fit(direction, 'G4/8, A4, B4, C5', { frenchBeams: true }).insets, [0, 0, 0, 0]);
    assert.deepEqual(fit(direction, pitches, { frenchBeams: true, secondaryBeamBreaks: [1] }).insets, [0, 0, 0, 0]);

    // A hook still hangs from its stem, even when the next strip runs through the note.
    const mixed = fit(direction, 'G4/16, A4/32, B4/16, C5/8', { frenchBeams: true });
    assert.deepEqual(mixed.insets, [0, 1.5 * width, 0, 0]);
    const fan = fit(direction, pitches, { frenchBeams: true, feathered: 'right' });
    assert.ok(fan.insets[1] > 0 && fan.insets[1] < fan.insets[2] && fan.insets[2] < 1.5 * width);
  }
});

test('contour beams preserve membership, minimum stems, beamlet overrides and endpoints across widths', () => {
  for (const width of [190, 340, 790]) {
    for (const stem of ['up', 'down']) {
      const { f } = factory(),
        es = f.EasyScore();
      const notes = es.notes('G4/8, A4/16, B4/8, C4/8', { stem });
      const beam = f.Beam({ notes });
      beam.renderOptions.contourSlope = true;
      beam.setPartialBeamSideAt(1, 'R');
      const sys = f.System({ width, y: 60 });
      sys.addStave({ voices: [es.voice(notes, { mode: 'soft' })] });
      sys.format();
      measured(beam);
      assert.deepEqual(beam.getNotes(), notes);
      const first = notes[0],
        last = notes.at(-1);
      assert.ok(beam.slope * (last.getYs()[0] - first.getYs()[0]) >= -1e-7);
      for (const n of notes) {
        const tip = n.getStemExtents().topY;
        const expected = beam.getBeamYToDraw() + beam.slope * (n.getStemX() - first.getStemX());
        assert.ok(Math.abs(tip - expected) < 1e-6);
        assert.ok(Math.abs(tip - n.getYs()[0]) >= n.getStemMinimumLength() - 1);
      }
      const [beamlet] = beam.getBeamLines('8');
      assert.equal(beamlet.end - beamlet.start, beam.renderOptions.partialBeamLength);
    }
  }
});

test('before and after grace groups on two staves clear their hosts at the start of a system', () => {
  const { f } = factory(),
    es = f.EasyScore();
  const sys = f.System({ width: 650 });
  const groups = [];
  for (const key of ['c/5', 'e/4']) {
    const host = f.StaveNote({ keys: [key], duration: 'w' });
    const sides = [VF.Modifier.Position.LEFT, VF.Modifier.Position.RIGHT].map((side, i) => {
      const grace = f
        .GraceNoteGroup({
          notes: Array.from({ length: i + 1 }, () => f.GraceNote({ keys: [key], duration: '16', slash: true })),
          slur: true,
        })
        .setPosition(side);
      if (i) grace.beamNotes();
      host.addModifier(grace, 0);
      return grace;
    });
    sys.addStave({ voices: [es.voice([host])] });
    groups.push({ host, sides });
  }
  sys.format();
  for (const {
    host,
    sides: [before, after],
  } of groups) {
    measured(before);
    measured(after);
    const [head] = host.getHeadInk();
    const pre = before.getGraceNotes().at(-1).getHeadInk()[0];
    const post = after.getGraceNotes()[0].getHeadInk()[0];
    assert.ok(pre.x + pre.w < head.x);
    assert.ok(post.x > head.x + head.w);
    assert.ok(pre.x >= host.checkStave().getX());
    for (const [group, offset] of [
      [before, 0],
      [after, host.getGlyphWidth()],
    ]) {
      const slur = group.getLayoutElements().at(-1);
      const start = slur.getFirstX() + slur.renderOptions.firstXShift - slur.renderOptions.tieSpacing;
      assert.ok(Math.abs(start - host.getNoteHeadBeginX() - offset) < 1e-7);
    }
    assert.equal(after.getGraceNotes()[0].getStave(), host.getStave());
  }
});

test('four voice columns avoid heads and rests, preserve distinct attacks and repeat for reversed voice input', () => {
  function passage(reverse) {
    const { f } = factory(),
      es = f.EasyScore();
    const entries = ['F5/q, G5/q', 'E5/8, C5/8, D5/q', 'D5/q, E5/q', 'B4/q/r, B4/q'].map((input, i) => {
      const notes = es.notes(input, { stem: i % 2 ? 'down' : 'up' });
      if (i === 0) VF.Dot.buildAndAttach([notes[0]]);
      if (i === 2) notes[0].addModifier(new VF.Accidental('#'), 0);
      return { notes, voice: es.voice(notes, { mode: 'soft' }) };
    });
    const sys = f.System({ width: 490 });
    const voices = entries.map((e) => e.voice);
    sys.addStave({ voices: reverse ? voices.reverse() : voices });
    sys.format();
    const boxes = entries.flatMap((e) =>
      e.notes.flatMap((n) => [...n.getHeadInk(), ...n.getModifiers().map((m) => m.getInkBounds())])
    );
    for (const [i, a] of boxes.entries())
      for (const b of boxes.slice(i + 1))
        assert.ok(
          a.x + a.w <= b.x + 1 || b.x + b.w <= a.x + 1 || a.y + a.h <= b.y + 1 || b.y + b.h <= a.y + 1,
          'voice head, rest, dot or sign overlapped'
        );
    return entries.map((e) => e.notes.map((n) => [n.getNoteHeadBeginX(), n.getYs()[0]]));
  }
  assert.deepEqual(passage(true), passage(false));
});

test('bracket and label clear upper and lower ornament signs before drawing and after resize', () => {
  for (const [position, location] of [
    [VF.Modifier.Position.ABOVE, 1],
    [VF.Modifier.Position.BELOW, -1],
  ]) {
    const { f } = factory(),
      es = f.EasyScore();
    const notes = es.notes('G4/8, A4/8, B4/8');
    const mark = new VF.Ornament('turn').setPosition(position).setUpperAccidental('#').setLowerAccidental('b');
    notes[1].addModifier(mark, 0);
    const tuplet = f.Tuplet({ notes, options: { bracketed: true, location } });
    const system = f.System({ width: 430, y: 80 });
    system.addStave({ voices: [es.voice(notes, { mode: 'soft' })] });
    for (const width of [430, 260, 430]) {
      system.setWidth(width).format();
      const bracket = measured(tuplet).ink,
        sign = measured(mark).ink;
      const gap = location === 1 ? sign.y - bracket.y - bracket.h : bracket.y - sign.y - sign.h;
      assert.ok(gap >= 2, 'Bracket clears nearest auxiliary accidental by at least two pixels');
    }
  }
});

test('feathered beam ink fits its bounds and both players retain their beat-two entry through reflow', async () => {
  const browser = await puppeteer.launch({ headless: true, args: process.env.CI ? ['--no-sandbox'] : [] });
  try {
    const page = await browser.newPage();
    await page.setContent('<main id="music"></main>');
    await page.addScriptTag({ path: 'build/cjs/vexflow-debug.js' });
    await page.addScriptTag({ content: 'window.featheredBeamStudy=' + featheredBeamStudy });
    const results = await page.evaluate(async () => {
      const VF = VexFlow;
      await VF.loadFonts('Bravura', 'Academico');
      await document.fonts.ready;
      function frames(feathered, direction) {
        const host = document.querySelector('main');
        host.replaceChildren();
        const f = new VF.Factory({ renderer: { elementId: 'music', width: 680, height: 520 } });
        const c = featheredBeamStudy(VF, f, 620, feathered, direction);
        return [620, 190, 620].map((width) => {
          f.getContext().clear();
          c.sheet.setWidth(width);
          f.draw({ retain: true });
          const bars = [0, 1].map((bar) => {
            const notes = Array.from({ length: 5 }, (_, i) => c.getNote('lead-' + bar + '-' + i));
            const beam = notes[0].getBeam();
            const group = document.getElementById('vf-' + beam.getAttribute('id'));
            const strips = Array.from(group.children).filter((el) => el.tagName === 'path');
            // Opposite corners lie half a perimeter apart on each parallelogram.
            const top = (path) => [0, 1].map((t) => path.getPointAtLength(t === 0 ? 0 : path.getTotalLength() / 2));
            const box = VF.measureEngraving(beam).ink;
            const contains = strips.every((path) => {
              const b = path.getBBox();
              return (
                b.x >= box.x - 0.02 &&
                b.y >= box.y - 0.02 &&
                b.x + b.width <= box.x + box.w + 0.02 &&
                b.y + b.height <= box.y + box.h + 0.02
              );
            });
            const edges = strips.map((p) => top(p).map((pt) => pt.y));
            const spread = edges[0].map((v, i) => Math.abs(v - edges[1][i]));
            const primary = beam.getBeamYToDraw();
            const attached = notes
              .slice(0, 4)
              .every(
                (n) =>
                  Math.abs(
                    n.getStemExtents().topY - beam.getSlopeY(n.getStemX(), notes[0].getStemX(), primary, beam.slope)
                  ) < 0.02
              );
            return {
              contains,
              spread,
              attached,
              ticks: notes.map((n) => n.getTicks().value() / VF.RESOLUTION),
              entry: notes[4].getAbsoluteX(),
              bass: c.getNote('entry-' + bar).getAbsoluteX(),
            };
          });
          return { bars, rows: c.sheet.getRows().map((r) => r.systems.length) };
        });
      }
      return [-1, 1].map((direction) => ({ fan: frames(true, direction), plain: frames(false, direction) }));
    });
    for (const { fan, plain } of results) {
      assert.deepEqual(fan[0], fan[2]);
      assert.deepEqual(fan[0].rows, [2]);
      assert.deepEqual(fan[1].rows, [1, 1]);
      for (const [frameIndex, frame] of fan.entries()) {
        for (const [bar, b] of frame.bars.entries()) {
          const control = plain[frameIndex].bars[bar];
          assert.ok(b.contains && b.attached);
          assert.deepEqual(b.ticks, [1 / 16, 1 / 16, 1 / 16, 1 / 16, 1 / 4]);
          assert.equal(b.entry, b.bass);
          assert.equal(b.entry, control.entry);
          assert.ok(b.spread[bar] < 0.03 && b.spread[1 - bar] > 5);
          assert.ok(Math.abs(control.spread[0] - control.spread[1]) < 0.03);
        }
      }
    }
  } finally {
    await browser.close();
  }
});

test('the two sides of a broken feathered beam share the same secondary spacing', () => {
  const { f } = factory();
  const notes = (bar) =>
    Array.from({ length: 4 }, (_, i) => ({
      id: 's' + bar + i,
      note: { keys: ['c/5'], duration: '16', stemDirection: -1 },
    }));
  const c = f.EasyScore().compose({
    staves: [{ id: 'solo', time: '1/4', measures: [0, 1].map((bar) => ({ voices: [{ notes: notes(bar) }] })) }],
    continuous: {
      spans: [{ id: 'fan', kind: 'beam', from: 's00', to: 's13' }],
      boundaries: [{ measure: 2, breakBefore: 'force' }],
    },
  });
  const beam = c.getNote('s00').getBeam();
  // Record the beam renderer's filled strips. Stems and staff lines are stroked.
  const ctx = f.getContext(),
    paths = [];
  ctx.beginPath = () => {
    paths.push([]);
    return ctx;
  };
  ctx.moveTo = ctx.lineTo = (x, y) => {
    paths.at(-1).push({ x, y });
    return ctx;
  };
  function spreads(direction) {
    beam.renderOptions.feathered = direction;
    c.sheet.format();
    paths.length = 0;
    beam.setContext(ctx).draw();
    const beams = paths.filter((p) => p.length === 4);
    assert.equal(beams.length, 4);
    return [0, 2].flatMap((i) => [0, 3].map((j) => Math.abs(beams[i][j].y - beams[i + 1][j].y)));
  }
  for (const direction of ['left', 'right']) {
    const [first, outgoing, incoming, last] = spreads(direction);
    assert.ok(Math.abs(incoming - outgoing) < 0.001);
    assert.ok(outgoing > Math.min(first, last) && outgoing < Math.max(first, last));
    assert.equal(first > last, direction === 'left');
  }
  assert.deepEqual(new Set(spreads(undefined)), new Set([7.5]));
});

test('key-aware accidentals share one sign only at the same printed unison head', () => {
  const voice = (id, key = 'e#/5') => ({
    notes: [{ id, note: { keys: [key], duration: 'q', stemDirection: id === 'upper' ? 1 : -1 } }],
  });
  function render(parts, prepare = () => {}) {
    const { f } = factory();
    const source = {
      accidentals: 'key-aware',
      continuous: {},
      staves: parts.map((voices, i) => ({ id: 'staff' + i, time: '1/4', key: 'Bm', measures: [{ voices }] })),
    };
    const score = f.EasyScore().compose(source);
    const notes = score.notes[0].flat(2);
    const marks = notes.flatMap((n) => n.getModifiers().filter((m) => m instanceof VF.Accidental));
    prepare(notes, marks);
    // Count actual glyph emissions, including a deliberate enclosure, without counting the key signature.
    const drawn = [];
    for (const mark of marks) {
      const render = mark.renderText;
      mark.renderText = function (...args) {
        drawn.push(this);
        return render.apply(this, args);
      };
    }
    let last;
    for (const width of [350, 180, 350]) {
      f.getContext().clear();
      drawn.length = 0;
      score.sheet.setWidth(width);
      f.draw({ retain: true });
      if (last) assert.deepEqual(drawn, last);
      last = drawn.slice();
    }
    return { drawn, notes, marks };
  }
  const both = [voice('upper'), voice('lower')];
  const shared = render([both]);
  assert.equal(shared.drawn.length, 1);
  assert.deepEqual(
    shared.marks.map((m) => m.getInkBounds()),
    [shared.drawn[0].getInkBounds(), shared.drawn[0].getInkBounds()]
  );
  assert.deepEqual(
    shared.notes.map((n) => [n.getKeys(), n.getStemDirection(), n.getTicks().value()]),
    [
      [['e#/5'], 1, VF.VexFlow.RESOLUTION / 4],
      [['e#/5'], -1, VF.VexFlow.RESOLUTION / 4],
    ]
  );
  for (const v of both) assert.equal(render([[v]]).drawn.length, 1);
  assert.equal(render([[voice('upper'), voice('lower', 'eb/5')]]).drawn.length, 2);
  assert.equal(render(both.map((v) => [v])).drawn.length, 2);
  assert.equal(render([both], (notes) => notes[1].noteHeads[0].setXShift(12)).drawn.length, 2);
  const caution = render([both], (_, marks) => marks[1].setAsCautionary());
  assert.deepEqual(caution.drawn, [caution.marks[1]]);
  assert.equal(caution.drawn[0].isCautionary(), true);
  assert.equal(render([both], (_, marks) => marks.forEach((m) => m.setAsCautionary())).drawn.length, 2);
  const unison = VF.VexFlow.UNISON;
  try {
    VF.VexFlow.UNISON = false;
    const separate = render([both]);
    assert.notEqual(separate.notes[0].getNoteHeadBeginX(), separate.notes[1].getNoteHeadBeginX());
    assert.equal(separate.drawn.length, 2);
  } finally {
    VF.VexFlow.UNISON = unison;
  }
});
