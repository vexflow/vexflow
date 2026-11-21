// M3 placement contracts on native voices, curves, staff groups and retained systems.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { createCanvas, registerFont } from 'canvas';
import puppeteer from 'puppeteer';

import { elisionStudy, makePhraseStudy, stanzaStudy } from '../engraving/phrase-studies.mjs';

const VF = await import(new URL('../../build/esm/entry/vexflow-core.js', import.meta.url));

for (const family of ['Bravura', 'Academico']) {
  const n = family.toLowerCase();
  registerFont(new URL('../../node_modules/@vexflow-fonts/' + n + '/' + n + '.otf', import.meta.url).pathname, {
    family,
  });
}
VF.Element.setTextMeasurementCanvas(createCanvas(1, 1));

function factory() {
  return new VF.Factory({ renderer: { elementId: null } }).setContext(
    new VF.CanvasContext(createCanvas(720, 420).getContext('2d'))
  );
}
function score(text = 'G4/q, A4/q, B4/q, A4/q, G4/q') {
  const f = factory(),
    es = f.EasyScore(),
    notes = es.notes(text, { stem: 'down' });
  const system = f.System({ width: 510, y: 30, spaceBetweenStaves: 4 });
  const staff = system.addStave({ voices: [es.voice(notes, { mode: 'soft' })] });
  return { f, notes, system, staff, layout: system.getPhraseLayout() };
}
function measured(mark) {
  const g = VF.measureEngraving(mark);
  assert.deepEqual(g.diagnostics, []);
  return g;
}
function intersects(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

test('whole syllables, hyphens and extenders stay in their verses across retained reflow', () => {
  const f = factory(),
    { layout, system, lyrics, notes, bass } = makePhraseStudy(VF.VexFlow, f, 'choir');
  const inspect = () => {
    const rows = lyrics.map((verse) => verse.map((mark) => measured(mark)));
    const baselines = rows.map((row) => row[0].anchors.baseline.y);
    rows.forEach((row, i) => assert.ok(row.every((g) => g.anchors.baseline.y === baselines[i])));
    assert.ok(rows[0].every((a) => rows[1].every((b) => a.ink.y + a.ink.h < b.ink.y)));
    const links = layout.getLyricConnectors();
    assert.equal(links.length, 5);
    const [hyphen, extender] = links;
    assert.ok(hyphen.x > rows[0][0].ink.x + rows[0][0].ink.w && hyphen.x + hyphen.w < rows[0][1].ink.x);
    assert.equal(extender.x + extender.w, notes[3].getNoteHeadBeginX() + notes[3].getGlyphWidth());
    assert.ok(links.every((link) => rows.flat().every((g) => !intersects(link, g.ink))));
    assert.ok(bass.getYForLine(0) > Math.max(...links.map((b) => b.y + b.h)));
    assert.deepEqual(layout.diagnostics, []);
    return { rows, links, gap: bass.getY(), bounds: layout.bounds };
  };
  system.format();
  const wide = inspect();
  f.draw({ retain: true });
  assert.deepEqual(inspect(), wide);
  system.setWidth(390).format();
  assert.notDeepEqual(inspect(), wide);
  system.setWidth(615).format();
  assert.deepEqual(inspect(), wide);
});
test('a cubic slur clears internal accents while the wedge, pedal and ottava retain their anchors', () => {
  const f = factory(),
    { system, layout, notes, slur, hairpin, octave, pedal, dynamics, bass } = makePhraseStudy(VF.VexFlow, f, 'piano');
  for (const width of [615, 390, 615]) {
    system.setWidth(width).format();
    f.draw({ retain: true });
    assert.deepEqual(layout.diagnostics, []);
    const routed = slur.getRouteParts(),
      anchors = slur.getAnchors();
    const accent = measured(notes[1].getModifiers()[0]).ink;
    assert.ok(routed.every((b) => !intersects(b, accent)));
    const ottava = measured(octave).ink;
    assert.ok(ottava.y + ottava.h < Math.min(...routed.map((b) => b.y)));
    const [p, forte] = dynamics.map((m) => measured(m).ink),
      wedge = measured(hairpin).ink;
    assert.ok(p.x + p.w < wedge.x && wedge.x + wedge.w < forte.x);
    assert.ok(measured(pedal).ink.y > bass.getYForLine(4));
    slur.setLayoutRise(0);
    assert.deepEqual(slur.getAnchors(), anchors);
    assert.notDeepEqual(routed, slur.getRouteParts());
  }
});
test('pinned verse and staff collisions name their owners and terminate', () => {
  const { system, layout, notes, staff } = score();
  const bottom = system.addStave({ voices: [] });
  layout.lockStaffGap(bottom);
  const ids = ['one', 'two'];
  ids.forEach((id) =>
    layout.addVerse(staff, [{ note: notes[0], text: 'word' }], { baselineSpaces: 7 })[0].setAttribute('id', id)
  );
  system.format();
  assert.ok(layout.diagnostics.some((d) => d.code === 'PinnedCollision' && ids.every((id) => d.sources.includes(id))));
  assert.ok(
    layout.diagnostics.some((d) => d.code === 'PinnedCollision' && d.sources.includes(bottom.getAttribute('id')))
  );
  for (const m of notes[0].getModifiers()) assert.equal(measured(m).anchors.baseline.y, staff.getYForLine(7));
  assert.equal(layout.passes, 1);
});
test('a restricted pass budget leaves finite repeatable evidence', () => {
  const f = factory(),
    { system, layout } = makePhraseStudy(VF.VexFlow, f, 'choir');
  layout.setPassLimit(1);
  const inspect = () => {
    system.format();
    return { diagnostics: structuredClone(layout.diagnostics), bounds: layout.bounds, passes: layout.passes };
  };
  const first = inspect();
  assert.equal(first.passes, 1);
  assert.ok(first.diagnostics.some((d) => d.code === 'IterationLimit'));
  assert.ok(Object.values(first.bounds).every(Number.isFinite));
  assert.deepEqual(inspect(), first);
  layout.setPassLimit(4);
  system.format();
  assert.deepEqual(layout.diagnostics, []);
});
test('whole Latin combining sequences and CJK keep their text, unsupported script and invalid anchors name the mark', () => {
  const { f, system, layout, notes, staff } = score();
  const texts = ['E\u0301', '歌', 'سلام'];
  const marks = layout.addVerse(
    staff,
    texts.map((text, i) => ({ note: notes[i], text }))
  );
  const detached = f.Annotation({ text: 'detached' });
  layout.addLane(staff, [detached]);
  const truncated = f.StaveTie({ from: notes[3] });
  layout.route(truncated);
  system.format();
  assert.deepEqual(
    marks.map((m) => m.text),
    texts
  );
  assert.deepEqual(
    layout.diagnostics.filter((d) => d.code === 'UnsupportedScript').map((d) => d.sources),
    [[marks[2].getAttribute('id')]]
  );
  for (const m of [detached, truncated])
    assert.ok(layout.diagnostics.some((d) => d.code === 'InvalidAnchor' && d.sources.includes(m.getAttribute('id'))));
});
test('nested quadratic and cubic routes preserve tied chord indices, manual controls and crossing diagnostics', () => {
  const { f, system, layout, notes } = score('(G4 B4)/q, (G4 B4)/q, (G4 B4)/q, (G4 B4)/q, (G4 B4)/q');
  const tie = f.StaveTie({
    from: notes[1],
    to: notes[3],
    firstIndexes: [1],
    lastIndexes: [1],
    options: { direction: -1 },
  });
  const slur = f.Curve({
    from: notes[0],
    to: notes[4],
    options: {
      openingDirection: 'down',
      cps: [
        { x: 2, y: 39 },
        { x: 3, y: 43 },
      ],
    },
  });
  system.format();
  const manual = slur.getRouteParts();
  layout.route(slur).route(tie);
  system.format();
  assert.deepEqual(slur.getRouteParts(), manual);
  assert.deepEqual(tie.getNotes().firstIndexes, [1]);
  assert.ok(tie.getRouteParts().length > 1);
  assert.ok(!layout.diagnostics.some((d) => d.code === 'CrossingSpans'));
  const cross = f.Curve({ from: notes[0], to: notes[2] });
  layout.route(cross);
  system.format();
  assert.ok(layout.diagnostics.some((d) => d.code === 'CrossingSpans' && d.sources.includes(cross.getAttribute('id'))));
});
test('authored whole and half rests retain their supporting line across staves and formatting passes', () => {
  for (const lines of [4, 5]) {
    const f = factory();
    const stave = f.Stave({ options: { numLines: lines } });
    for (const [duration, plain, ledger] of [
      ['hr', VF.VexFlow.Glyphs.restHalf, VF.VexFlow.Glyphs.restHalfLegerLine],
      ['wr', VF.VexFlow.Glyphs.restWhole, VF.VexFlow.Glyphs.restWholeLegerLine],
    ]) {
      const bottom = 6 - lines;
      for (const line of [bottom - 1, bottom, 3, 5, 6]) {
        const rest = f.StaveNote({ keys: ['r/4'], duration, restLine: line });
        const other = f.StaveNote({ keys: ['b/4'], duration: 'w', stemDirection: VF.Stem.DOWN });
        const voices = [rest, other].map((n) => f.Voice().setMode(VF.Voice.Mode.SOFT).addTickable(n));
        for (let pass = 0; pass < 2; pass++) {
          new VF.Formatter().joinVoices(voices).formatToStave(voices, stave, { alignRests: true });
          for (const voice of voices) voice.draw(f.getContext(), stave);
          const [head] = rest.noteHeads;
          assert.equal(rest.getKeyLine(0), line);
          assert.equal(head.getY(), stave.getYForNote(line));
          assert.equal(head.getText(), line < bottom || line > 5 ? ledger : plain);
        }
      }
    }
  }
  const rest = new VF.StaveNote({ keys: ['r/4'], duration: 'wr', restLine: 1 });
  rest.setStave(new VF.Stave(0, 0, 100, { numLines: 4 }));
  assert.equal(rest.noteHeads[0].text, VF.VexFlow.Glyphs.restWholeLegerLine);
  rest.setStave(new VF.Stave(0, 0, 100));
  assert.equal(rest.noteHeads[0].text, VF.VexFlow.Glyphs.restWhole);
});

test('automatic rests clear a fixed rest and resume alignment after releasing a pin', () => {
  const f = factory();
  const next = f.StaveNote({ keys: ['d/5'], duration: 'q' });
  const fixed = f.StaveNote({ keys: ['r/4'], duration: 'qr', restLine: 3 });
  VF.Formatter.AlignRestsToNotes([fixed, next], true);
  assert.equal(fixed.getKeyLine(0), 3);
  const auto = f.StaveNote({ keys: ['r/4'], duration: 'qr' });
  const stave = f.Stave();
  const voices = [fixed, auto].map((n) => f.Voice().setMode(VF.Voice.Mode.SOFT).addTickable(n));
  new VF.Formatter().joinVoices(voices).formatToStave(voices, stave);
  assert.equal(fixed.getKeyLine(0), 3);
  assert.notEqual(auto.getKeyLine(0), 3);
  assert.notEqual(auto.renderOptions.draw, false);
  fixed.setRestLine(0).setRestLine(undefined);
  VF.Formatter.AlignRestsToNotes([fixed, next], true);
  assert.equal(fixed.getKeyLine(0), next.getLineForRest());
  assert.throws(() => next.setRestLine(1), /rest/i);
  assert.throws(() => auto.setRestLine(NaN), /finite/);
});

test('a rest clears ink anchored at an earlier attack and reports a collision when pinned', () => {
  function restCase(pin) {
    const { f, system, staff, layout, notes } = score('G4/q, B4/q/r, G4/q');
    const [host, rest] = notes,
      obstruction = f.Annotation({ text: 'x' });
    host.addModifier(obstruction, 0);
    system.format();
    const b = measured(rest).ink,
      a = measured(obstruction).ink;
    obstruction.setXShift(a.x - b.x).setTextBaseline(obstruction.computeY().y + b.y - a.y);
    assert.ok(rest.isRest());
    const original = rest.getKeyLine(0);
    if (pin === 'phrase') layout.pin(rest);
    if (pin === 'rest') rest.setRestLine(original);
    system.format();
    assert.equal(intersects(measured(rest).ink, measured(obstruction).ink), Boolean(pin));
    assert.equal(rest.getKeyLine(0) === original, Boolean(pin));
    assert.equal(
      layout.diagnostics.some((d) => d.code === 'PinnedCollision'),
      Boolean(pin)
    );
    const line = rest.getKeyLine(0);
    system.format();
    assert.equal(rest.getKeyLine(0), line);
    assert.equal(host.getStave(), staff);
  }
  restCase(false);
  restCase('phrase');
  restCase('rest');
});
test('staff separation refits cross-staff beams to the visible stem tips after resizing', () => {
  const { f, system, staff, layout, notes } = score('G4/8, C5/8, G4/q');
  const bottom = system.addStave({ voices: [] }).addClef('bass');
  notes[1].setStave(bottom);
  const beam = f.Beam({ notes: notes.slice(0, 2) });
  layout.addVerse(staff, [{ note: notes[2], text: 'glow' }]);
  const inspect = () => {
    system.format();
    assert.deepEqual(layout.diagnostics, []);
    assert.ok(layout.passes >= 2 && layout.passes <= 4);
    const geometry = measured(beam);
    for (const [i, n] of notes.slice(0, 2).entries())
      assert.equal(geometry.anchors['stem' + i].y, measured(n).anchors.stemTip.y + VF.Stem.WIDTH / 2);
    return { beam: geometry.ink, stave: bottom.getY() };
  };
  const before = inspect();
  system.setWidth(340);
  assert.notDeepEqual(inspect(), before);
  system.setWidth(510);
  assert.deepEqual(inspect(), before);
});

test('clefs, key and time signatures follow the lower stave on each staff refit', () => {
  const f = factory();
  const { system, layout, bass } = makePhraseStudy(VF.VexFlow, f, 'choir');
  bass.addKeySignature('E').addTimeSignature('6/8');
  const key = bass.getModifiers().find((m) => m instanceof VF.KeySignature);
  const meter = bass.getModifiers().find((m) => m instanceof VF.TimeSignature);
  const inspect = () => {
    system.format();
    assert.deepEqual(layout.diagnostics, []);
    return [...key.getInkParts(), meter.getInkBounds()].map((b) => b.y - bass.getY());
  };
  const initial = inspect();
  assert.equal(initial.length, 5);
  system.setY(system.getY() + 80);
  assert.deepEqual(inspect(), initial);
});

test('choir and piano phrases render through SVG and Canvas with Bravura and Petaluma', async () => {
  const browser = await puppeteer.launch({ headless: true, args: process.env.CI ? ['--no-sandbox'] : [] });
  try {
    const page = await browser.newPage();
    await page.setContent('<body></body>');
    await page.addScriptTag({ path: new URL('../../build/cjs/vexflow-debug.js', import.meta.url).pathname });
    await page.addScriptTag({ content: 'window.makePhraseStudy = ' + makePhraseStudy.toString() });
    for (const family of ['Bravura', 'Academico', 'Petaluma', 'Petaluma Script']) {
      const name = family.toLowerCase().replaceAll(' ', '');
      const data = await readFile(
        new URL('../../node_modules/@vexflow-fonts/' + name + '/' + name + '.woff2', import.meta.url)
      );
      await page.evaluate(
        async (family, base64) => {
          document.fonts.add(await new FontFace(family, 'url(data:font/woff2;base64,' + base64 + ')').load());
        },
        family,
        data.toString('base64')
      );
    }
    for (const [family, textFamily] of [
      ['Bravura', 'Academico'],
      ['Petaluma', 'Petaluma Script'],
    ])
      for (const kind of ['choir', 'piano'])
        for (const backend of ['SVG', 'Canvas']) {
          const result = await page.evaluate(
            ({ family, textFamily, kind, backend }) => {
              const VF = window.VexFlow;
              VF.setFonts(family, textFamily);
              const target = document.createElement(backend === 'SVG' ? 'div' : 'canvas');
              target.id = 'phrase';
              document.body.replaceChildren(target);
              const f = new VF.Factory({ renderer: { elementId: 'phrase', width: 670, height: 380 } });
              const { system, layout, lyrics } = window.makePhraseStudy(VF, f, kind);
              const widths = [615, 390, 615];
              const results = widths.map((w) => {
                system.setWidth(w);
                f.draw({ retain: true });
                return {
                  diagnostics: structuredClone(layout.diagnostics),
                  bounds: layout.bounds,
                  connectors: layout.getLyricConnectors(),
                };
              });
              const ink =
                backend === 'SVG'
                  ? target.querySelectorAll('svg path').length > 0
                  : target
                      .getContext('2d')
                      .getImageData(0, 0, target.width, target.height)
                      .data.some((v, i) => i % 4 === 3 && v > 0);
              return { results, ink, syllables: lyrics?.flat().length ?? 0 };
            },
            { family, textFamily, kind, backend }
          );
          assert.ok(result.ink, family + ' ' + kind + ' ' + backend);
          for (const row of result.results) assert.deepEqual(row.diagnostics, [], family + ' ' + kind + ' ' + backend);
          assert.deepEqual(result.results[0], result.results[2]);
          assert.notDeepEqual(result.results[0], result.results[1]);
          assert.equal(result.results[0].connectors.length, kind === 'choir' ? 5 : 0);
        }
  } finally {
    await browser.close();
  }
});

// The default text face supplies the syllables and the music face supplies the undertie.
test('two elided syllables share one centered anchor and clear both lyric connectors after reflow', async () => {
  const browser = await puppeteer.launch({ headless: true, args: process.env.CI ? ['--no-sandbox'] : [] });
  try {
    const page = await browser.newPage();
    await page.setContent('<body></body>');
    await page.addScriptTag({ path: new URL('../../build/cjs/vexflow-debug.js', import.meta.url).pathname });
    await page.evaluate(async () => {
      await VexFlow.loadFonts('Bravura', 'Academico');
      await document.fonts.ready;
    });
    for (const backend of ['SVG', 'Canvas']) {
      const frames = await page.evaluate(
        ({ backend, spec }) => {
          const VF = VexFlow;
          const host = document.createElement(backend === 'SVG' ? 'div' : 'canvas');
          host.id = 'lyrics';
          document.body.replaceChildren(host);
          const factory = new VF.Factory({ renderer: { elementId: host.id, width: 660, height: 530 } });
          const music = factory.EasyScore().compose(spec);
          const note = music.getNote('word-1-0');
          const [group, plain] = note.getModifiers();
          return [620, 220, 620].map((width) => {
            music.sheet.setWidth(width);
            factory.getContext().clear();
            factory.draw({ retain: true });
            const baseline = group.computeY().y;
            const { x, textWidth } = group.computeX();
            const geometry = group.getTextInk(x, baseline);
            const [hyphen, extender] = music.systems[1].getPhraseLayout().getLyricConnectors();
            // Check the actual SVG glyph extent or look for Canvas ink below the baseline between the two syllables.
            let undertieInk;
            if (backend === 'SVG') {
              const node = document.getElementById('vf-' + group.getAttribute('id')).querySelector('text');
              const extent = node.getExtentOfChar(2);
              undertieInk = node.textContent === 'la' + VF.Glyphs.lyricsElision + 'mi' && extent.width > 0;
            } else {
              const ctx = host.getContext('2d');
              ctx.font = VF.Font.toCSSString(group.fontInfo);
              const midpoint = x + ctx.measureText('la').width + ctx.measureText(VF.Glyphs.lyricsElision).width / 2;
              undertieInk = ctx
                .getImageData(Math.floor(midpoint) - 1, Math.floor(baseline), 3, 4)
                .data.some((v, i) => i % 4 === 3 && v > 0);
            }
            return {
              rows: music.sheet.getRows().length,
              x,
              baseline,
              textWidth,
              undertieInk,
              attached: group.checkAttachedNote() === note && plain.checkAttachedNote() === note,
              sameCenter: Math.abs(x + textWidth / 2 - plain.computeX().x - plain.getWidth() / 2) < 1e-6,
              plain: plain.text,
              verseOrder: baseline < plain.computeY().y,
              reserved: textWidth > VF.Element.measureWidth('lami', 'Annotation.lyric'),
              hyphenClear: geometry.x + geometry.w < hyphen.x,
              extenderEnd: extender.x + extender.w,
              lastHead: music.getNote('word-1-2').getNoteHeadBeginX() + music.getNote('word-1-2').getGlyphWidth(),
              diagnostics: music.systems[1].getPhraseLayout().diagnostics,
            };
          });
        },
        { backend, spec: elisionStudy(620) }
      );
      assert.deepEqual(
        frames.map((f) => f.rows),
        [1, 2, 1]
      );
      assert.deepEqual(frames[2], frames[0]);
      for (const frame of frames) {
        assert.ok(frame.attached && frame.sameCenter && frame.verseOrder);
        assert.equal(frame.plain, 'do');
        assert.ok(frame.undertieInk && frame.reserved && frame.hyphenClear, backend + JSON.stringify(frame));
        assert.equal(frame.extenderEnd, frame.lastHead);
        assert.deepEqual(frame.diagnostics, []);
      }
    }
  } finally {
    await browser.close();
  }
});

test('a stanza column fits inside an unsigned staff at fixed and intrinsic widths', () => {
  const { f, layout, staff, system, notes } = score();
  const label = '112.';
  const words = layout.addVerse(staff, [{ note: notes[0], text: 'Light' }], { stanza: label });
  // Rejecting an empty label must leave the existing syllable and lane intact.
  assert.throws(() => layout.addVerse(staff, [{ note: notes[0], text: 'word' }], { stanza: ' ' }), /stanza/);
  const ctx = f.getContext();
  const drawText = ctx.fillText.bind(ctx);
  const labelMetrics = new VF.Annotation(label).setFont({ ...words[0].fontInfo, weight: 'bold' });
  let ink;
  ctx.fillText = (text, x, y) => {
    if (text === label) ink = labelMetrics.getTextInk(x, y);
    return drawText(text, x, y);
  };
  for (const width of [undefined, 420, undefined]) {
    system.setWidth(width);
    f.draw({ retain: true });
    const word = measured(words[0]).ink;
    assert.ok(ink.x >= staff.getX() && ink.x + ink.w + 3 < word.x);
    assert.deepEqual(layout.diagnostics, []);
  }
});

// Read the painted origins on each backend so a missing or repeated label fails even when layout is correct.
test('stanza numbers share a left margin and stay on their word baselines through a system break', async () => {
  const browser = await puppeteer.launch({ headless: true, args: process.env.CI ? ['--no-sandbox'] : [] });
  try {
    const page = await browser.newPage();
    await page.setContent('<body></body>');
    await page.addScriptTag({ path: new URL('../../build/cjs/vexflow-debug.js', import.meta.url).pathname });
    await page.evaluate(async () => {
      await VexFlow.loadFonts('Bravura', 'Academico');
      await document.fonts.ready;
    });
    for (const backend of ['SVG', 'Canvas']) {
      for (const stanza of ['1.', '10.']) {
        const frames = await page.evaluate(
          ({ backend, stanza, spec }) => {
            const VF = VexFlow;
            const host = document.createElement(backend === 'SVG' ? 'div' : 'canvas');
            host.id = 'hymn';
            document.body.replaceChildren(host);
            const f = new VF.Factory({ renderer: { elementId: host.id, width: 680, height: 480 } });
            const music = f.EasyScore().compose(spec);
            const ctx = f.getContext();
            const fill = ctx.fillText.bind(ctx);
            const metrics = document.createElement('canvas').getContext('2d');
            let painted = [];
            ctx.fillText = (text, x, y) => {
              if ([stanza, '12.', 'Bright', 'The'].includes(text)) {
                const font = music.getNote('g0').getModifiers()[0].fontInfo;
                metrics.font = VF.Font.toCSSString({ ...font, weight: text.endsWith('.') ? 'bold' : font.weight });
                const ink = metrics.measureText(text);
                painted.push({ text, left: x - ink.actualBoundingBoxLeft, right: x + ink.actualBoundingBoxRight, y });
              }
              return fill(text, x, y);
            };
            return [620, 350, 620].map((width) => {
              music.sheet.setWidth(width);
              ctx.clear();
              painted = [];
              f.draw({ retain: true });
              const first = music.getNote('g0');
              return {
                painted,
                bars: music.sheet.getRows().map((row) => row.systems.length),
                wordCenters: first.getModifiers().map((mark) => mark.computeX().x + mark.getWidth() / 2),
                anchor: first.getModifierStartXY(VF.Modifier.Position.ABOVE, 0).x,
                staffLeft: first.checkStave().getX(),
                diagnostics: music.systems.flatMap((system) => system.getPhraseLayout().diagnostics),
              };
            });
          },
          { backend, stanza, spec: stanzaStudy(stanza) }
        );
        assert.deepEqual(frames[0], frames[2]);
        assert.deepEqual(
          frames.map((f) => f.bars),
          [[2], [1, 1], [2]]
        );
        for (const frame of frames) {
          assert.deepEqual(frame.diagnostics, []);
          assert.deepEqual(frame.wordCenters, [frame.anchor, frame.anchor]);
          assert.equal(frame.painted.length, 4);
          const [upper, lower, bright, the] = [stanza, '12.', 'Bright', 'The'].map((text) =>
            frame.painted.find((mark) => mark.text === text)
          );
          assert.ok(Math.abs(upper.left - lower.left) < 0.01 && upper.left >= frame.staffLeft);
          assert.ok(Math.max(upper.right, lower.right) + 3 < Math.min(bright.left, the.left));
          assert.equal(upper.y, bright.y);
          assert.equal(lower.y, the.y);
          assert.ok(upper.y < lower.y);
        }
      }
    }
  } finally {
    await browser.close();
  }
});
