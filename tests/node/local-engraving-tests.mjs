// Single-measure engraving contracts in real browser SVG and Canvas with installed fonts.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import puppeteer from 'puppeteer';

/** Exercise ordinary, reduced-size and grace glyphs through the Factory and renderer. */
function renderMatrix({ family, textFamily, backend, metadata }) {
  const VF = window.VexFlow;
  VF.setFonts(family, textFamily);
  const target = document.createElement(backend === 'SVG' ? 'div' : 'canvas');
  target.id = 'matrix';
  document.body.replaceChildren(target);
  const factory = new VF.Factory({
    renderer: { elementId: target.id, width: 850, height: 500 },
    engraving: new VF.EngravingProfile({ musicFont: family, metadata }),
  });
  const score = factory.EasyScore();
  const notes = ['w', 'h', 'q', '8'].flatMap((duration) =>
    [1, -1].map((stemDirection) => factory.StaveNote({ keys: ['c#/6', 'c/6', 'cb/6'], duration, stemDirection }))
  );
  for (const note of notes) {
    ['#', 'n', 'b'].forEach((type, index) => note.addModifier(new VF.Accidental(type), index));
    VF.Dot.buildAndAttach([note]);
  }
  const cue = factory.StaveNote({ keys: ['e/4'], duration: '8', stemDirection: -1 });
  cue.setFontSize(cue.fontSizeInPoints * 0.75).reset();
  const host = factory.StaveNote({ keys: ['e/4'], duration: 'q' });
  const grace = factory.GraceNote({ keys: ['f/4'], duration: '16', slash: true });
  host.addModifier(factory.GraceNoteGroup({ notes: [grace], slur: true }), 0);
  const ornament = new VF.Ornament('turn').setUpperAccidental('#').setLowerAccidental('b').setDelayed(true);
  cue.addModifier(ornament, 0);
  const articulation = new VF.Articulation('a.').setPosition(VF.Modifier.Position.BELOW);
  host.addModifier(articulation, 0);
  const lyric = new VF.Annotation('dolce').setFont(textFamily, 12);
  notes[0].addModifier(lyric, 0);
  const tuplet = factory.Tuplet({
    notes: [cue, host],
    options: { numNotes: 3, notesOccupied: 2, ratioed: true, displayRatio: [6, 4], bracketed: true },
  });
  const systems = [];
  for (const [i, passage] of [notes.slice(0, 4), notes.slice(4), [cue, host, score.notes('A4/q')[0]]].entries()) {
    const system = factory.System({ width: 800, y: 30 + i * 145 });
    system.addStave({ voices: [score.voice(passage, { mode: 'soft' })] });
    systems.push(system);
  }
  systems.forEach((s) => s.format());
  const snapshot = () => {
    // Position the grace relative to its host before inspecting the individual glyph.
    const measured = [...notes, cue, host, grace, ornament, tuplet].map((el) => VF.measureEngraving(el));
    return { boxes: measured.map((m) => m.ink), diagnostics: measured.flatMap((m) => m.diagnostics) };
  };
  const before = snapshot();
  factory.draw({ retain: true });
  const after = snapshot();
  const rows = notes.map((note) => {
    const heads = note.getHeadInk();
    const ledger = note.getLedgerLines().at(-1);
    const signs = note
      .getModifiers()
      .filter((m) => m instanceof VF.Accidental)
      .map((m) => m.getInkBounds());
    const dot = note
      .getModifiers()
      .find((m) => m instanceof VF.Dot)
      .getInkBounds();
    return { heads, ledger, signs, dot, stem: note.getStemSegment(), family: note.noteHeads[0].fontInfo.family };
  });
  const sizes = [notes[0], cue, grace].map((note) => note.noteHeads[0].fontSizeInPoints);
  const drawnLabel = backend === 'SVG' ? target.querySelector('.vf-tuplet text')?.textContent : undefined;
  const pixels =
    backend === 'SVG'
      ? target.querySelectorAll('svg text').length
      : target
          .getContext('2d')
          .getImageData(0, 0, target.width, target.height)
          .data.some((v, i, data) => i % 4 === 3 && v > 128 && data[i - 1] < 64);
  return { before, after, rows, sizes, pixels, drawnLabel };
}

/** Compare the text actually sent to each renderer with the frame and tie endpoints. */
function labelGeometry(backend) {
  const VF = window.VexFlow;
  VF.setFonts('Bravura', 'Academico');
  const target = document.createElement(backend === 'SVG' ? 'div' : 'canvas');
  document.body.replaceChildren(target);
  const ctx = new VF.Renderer(target, VF.Renderer.Backends[backend]).resize(400, 200).getContext();
  const stave = new VF.Stave(20, 80, 350).setContext(ctx);
  const note = new VF.StaveNote({ keys: ['c/4'], duration: 'q' }).setStave(stave);
  const label = stave.setSection('Bridge', 0).getModifiers().at(-1);
  const measurements = [];
  let frame, painted;
  const rect = ctx.rect.bind(ctx),
    fillText = ctx.fillText.bind(ctx);
  ctx.rect = (x, y, w, h) => {
    frame = { x, y, w, h };
    return rect(x, y, w, h);
  };
  ctx.fillText = (text, x, y) => {
    painted = { x, y, width: ctx.measureText(text).width };
    return fillText(text, x, y);
  };
  for (const [dx, dy] of [
    [0, 0],
    [17, -9],
  ]) {
    label.setXShift(dx).setYShift(dy);
    const before = label.getBoundingBox();
    label.draw();
    const m = label.getTextMetrics();
    const gaps = [
      painted.x - m.actualBoundingBoxLeft - frame.x,
      frame.x + frame.w - painted.x - m.actualBoundingBoxRight,
      painted.y - m.actualBoundingBoxAscent - frame.y,
      frame.y + frame.h - painted.y - m.actualBoundingBoxDescent,
    ];
    measurements.push({ x: painted.x, y: painted.y, gaps, frame, before: { ...before } });
  }
  const centers = [];
  for (const Tie of [VF.StaveTie, VF.TabTie]) {
    const tie = new Tie({ firstNote: note }, 'H').setContext(ctx);
    for (const size of [8, 32]) {
      ctx.setFont('monospace', size);
      const previous = ctx.getFont();
      tie.renderTieText(30, 140);
      centers.push({ x: painted.x + painted.width / 2, restored: previous === ctx.getFont() });
    }
  }
  return { measurements, centers };
}

test('Bravura, Petaluma and metadata-free Leland render local parts at normal, cue and grace sizes', async () => {
  const browser = await puppeteer.launch({ headless: true, args: process.env.CI ? ['--no-sandbox'] : [] });
  try {
    const page = await browser.newPage();
    await page.setContent('<body></body>');
    await page.addScriptTag({ path: new URL('../../build/cjs/vexflow-debug.js', import.meta.url).pathname });
    const file = (name, suffix) => new URL('../../node_modules/@vexflow-fonts/' + name + '/' + suffix, import.meta.url);
    for (const family of ['Bravura', 'Petaluma', 'Leland', 'Academico', 'Petaluma Script']) {
      const name = family.toLowerCase().replaceAll(' ', '');
      const bytes = await readFile(file(name, name + '.woff2'));
      await page.evaluate(
        async (family, data) => {
          const face = new FontFace(family, 'url(data:font/woff2;base64,' + data + ')');
          document.fonts.add(await face.load());
        },
        family,
        bytes.toString('base64')
      );
    }
    for (const backend of ['SVG', 'CANVAS']) {
      const {
        measurements: [original, shifted],
        centers,
      } = await page.evaluate(labelGeometry, backend);
      assert.equal(shifted.x - original.x, 17);
      assert.equal(shifted.y - original.y, -9);
      for (const { gaps, frame, before } of [original, shifted]) {
        assert.deepEqual(before, frame);
        assert.ok(
          gaps[0] > 0 && gaps.every((gap) => Math.abs(gap - gaps[0]) < 0.01),
          'equal ink padding on every edge'
        );
      }
      assert.ok(
        centers.every((c) => c.restored && Math.abs(c.x - 85) < 0.01),
        'tie text uses its own drawing font'
      );
    }
    for (const [family, textFamily] of [
      ['Bravura', 'Academico'],
      ['Petaluma', 'Petaluma Script'],
      ['Leland', 'Academico'],
    ]) {
      const metadata =
        family === 'Leland' ? undefined : JSON.parse(await readFile(file(family.toLowerCase(), 'metadata.json')));
      for (const backend of ['SVG', 'Canvas']) {
        const scene = await page.evaluate(renderMatrix, { family, textFamily, metadata, backend });
        assert.deepEqual(scene.before.diagnostics, [], family + ' ' + backend);
        assert.deepEqual(scene.after, scene.before);
        assert.ok(scene.pixels);
        if (backend === 'SVG') assert.equal(scene.drawnLabel, String.fromCharCode(0xe886, 0xe88a, 0xe884));
        assert.ok(scene.sizes[0] > scene.sizes[1] && scene.sizes[0] > scene.sizes[2]);
        for (const { heads, ledger, signs, dot, stem, family: used } of scene.rows) {
          assert.equal(used, family);
          assert.equal(new Set(heads.map((h) => h.x)).size, 3);
          const left = Math.min(...heads.map((h) => h.x)),
            right = Math.max(...heads.map((h) => h.x + h.w));
          assert.ok(ledger.x <= left && ledger.x + ledger.width >= right - 0.5, 'ledger encloses heads');
          assert.ok(
            signs.every((s) => s.x + s.w <= left + 1),
            'accidentals clear heads'
          );
          assert.ok(dot.x >= right - 1, 'dot clears heads');
          if (stem)
            assert.ok(
              heads.some((h) => h.x - 1 <= stem.x && stem.x <= h.x + h.w + 1),
              'stem joins a head'
            );
        }
      }
    }
  } finally {
    await browser.close();
  }
});
