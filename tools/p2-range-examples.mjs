// Reproductions for issues #203, #206, #253, and #255, usable with old and new bundles.
export function renderRangeExample({ issue, family = 'Bravura', variant = 0 }) {
  const V = VexFlow;
  V.setFonts(family, family === 'Petaluma' ? 'PetalumaScript' : 'Academico');
  document.documentElement.style.cssText = 'background:white;color:black;color-scheme:light';
  document.body.style.cssText = 'margin:16px;background:white';
  document.body.innerHTML = `<h3 style="font:18px sans-serif">#${issue} — ${family}</h3><div id="score"></div>`;
  const renderer = new V.Renderer(document.getElementById('score'), V.Renderer.Backends.SVG);
  renderer.resize(740, 370);
  const ctx = renderer.getContext();
  const stave = new (issue === 255 ? V.TabStave : V.Stave)(35, 110, 660).setContext(ctx);
  stave.addClef(issue === 255 ? 'tab' : 'treble').draw();
  const note = (keys, duration = 'q', stemDirection = 1) =>
    new V.StaveNote({ keys, duration, stemDirection }).setStave(stave);
  const format = (voices) => new V.Formatter().joinVoices(voices).formatToStave(voices, stave);
  const voice = (notes) => new V.Voice('4/4').setStrict(false).addTickables(notes).setStave(stave);
  const box = (element) => {
    const b = element.getBoundingBox();
    return { x: b.x, y: b.y, w: b.w, h: b.h };
  };
  if (issue === 203) {
    const rest = note(['b/4'], 'qr', variant ? -1 : 1);
    const chord = note(variant ? ['c/4', 'e/4', 'g/4'] : ['g/4', 'c/5', 'g/5'], 'q', variant ? 1 : -1);
    const voices = [voice([variant ? chord : rest]), voice([variant ? rest : chord])];
    format(voices);
    voices.forEach((v) => v.draw(ctx, stave));
    return { rest: box(rest), chord: box(chord), line: rest.getKeyLine(0) };
  }
  if (issue === 206) {
    const notes = Array.from({ length: 4 }, () => note(['c/4']));
    const annotations = ['pedal', 'change', 'gypsy', 'mark'].map((text, i) => {
      const annotation = new V.Annotation(text).setVerticalJustification('bottom').setFontSize(variant ? 20 : 12);
      notes[i].addModifier(annotation, 0);
      return annotation;
    });
    const v = voice(notes);
    format([v]);
    const pedal = new V.PedalMarking([notes[0], notes[1], notes[1], notes[3]])
      .setType(variant ? 'mixed' : 'bracket')
      .setContext(ctx);
    if (variant) pedal.setCustomText('Ped.');
    const baseline = pedal.getYForStave ? pedal.getYForStave(stave) : stave.getYForBottomText(3);
    const bottom = Math.max(...annotations.map((a) => a.computeY().y + a.getTextMetrics().actualBoundingBoxDescent));
    v.draw(ctx, stave);
    pedal.draw();
    return { baseline, bottom, height: pedal.renderOptions.bracketHeight };
  }
  if (issue === 253) {
    const grace = [
      new V.GraceNote({ keys: ['d/4', 'e/4'], duration: '8', stemDirection: variant ? -1 : 1 }),
      new V.GraceNote({ keys: ['g/4'], duration: '8', stemDirection: variant ? -1 : 1 }),
    ];
    grace.forEach((g) => g.setStave(stave));
    const group = new V.GraceNoteGroup(grace);
    if (variant) group.beamNotes();
    const parent = note(['c/5'], 'q').addModifier(group, 0);
    const v = voice([parent, note(['d/5']), note(['e/5']), note(['f/5'])]);
    format([v]);
    const before = box(group);
    const repeat = box(group);
    const renderedBefore = grace.some((g) => g.isRendered());
    v.draw(ctx, stave);
    const after = box(group);
    ctx.save();
    ctx.setStrokeStyle('#e34444');
    ctx.beginPath();
    ctx.rect(before.x, before.y, before.w, before.h);
    ctx.stroke();
    ctx.restore();
    return { before, repeat, after, renderedBefore };
  }
  if (issue === 255) {
    const sizes = variant ? ['6pt', '12px', 14] : [4, 6, 9];
    const entries = sizes.map((size) => {
      const grace = new V.GraceTabNote({
        positions: [
          { str: 2, fret: 12 },
          { str: 4, fret: 3 },
        ],
        duration: '8',
      }).setFontSize(size);
      const parent = new V.TabNote({
        positions: [
          { str: 2, fret: 5 },
          { str: 4, fret: 7 },
        ],
        duration: 'q',
      }).setStave(stave);
      parent.addModifier(new V.GraceNoteGroup([grace]), 0);
      return { grace, parent, size };
    });
    const v = voice(entries.map((entry) => entry.parent));
    format([v]);
    v.draw(ctx, stave);
    return entries.map(({ grace, size }) => ({
      requested: V.Font.convertSizeToPointValue(size),
      width: grace.getWidth(),
      frets: grace.fretElement.map((el) => ({
        size: V.Font.convertSizeToPointValue(el.fontInfo.size),
        center:
          el.getYShift() +
          (el.getTextMetrics().actualBoundingBoxDescent - el.getTextMetrics().actualBoundingBoxAscent) / 2,
      })),
    }));
  }
  throw new Error(`Unknown issue ${issue}`);
}
