// Representative before/after drawings for text spacing, lyric baselines, and tie anchors.
export function renderExamples({ issue, family = 'Bravura' }) {
  const VF = globalThis.VexFlow;
  document.documentElement.style.cssText = 'background:white;color:black;color-scheme:light';
  const textFamily = family === 'Petaluma' ? 'Petaluma Script' : 'Academico';
  VF.setFonts(family, textFamily);
  document.body.innerHTML = '<div id="score"></div>';
  const renderer = new VF.Renderer(document.getElementById('score'), VF.Renderer.Backends.SVG);
  renderer.resize(760, 410);
  const context = renderer.getContext();
  if (issue === 152) {
    for (const [index, text] of ['Sing with gentle voices', 'Words need room to breathe'].entries()) {
      const label = new VF.Annotation(text).setFontSize(22);
      label.setContext(context);
      context.setFont(label.fontInfo).fillText(text, 30, 70 + index * 150);
      context
        .setFont(textFamily, 22)
        .setFillStyle('#777')
        .fillText(text, 30, 110 + index * 150);
      context.setFillStyle('black');
    }
    return { svg: context.toSVG() };
  }
  const offsets = [];
  const positions = [];
  for (let row = 0; row < 2; row++) {
    const staveY = 10 + row * 190;
    const stave = new VF.Stave(20, staveY, 700).addClef('treble');
    const keys = issue === 177 ? ['c/5', 'g/4', 'e/4', 'c/4'] : ['c/4', 'c/4'];
    const notes = keys.map(
      (key) => new VF.StaveNote({ keys: [key], duration: issue === 177 ? 'q' : 'h', stemDirection: row ? -1 : 1 })
    );
    const lyrics = issue === 177 ? ['Sing', 'with', 'gentle', 'voices'] : ['A very long lyric under a tied note', ''];
    const annotations = [];
    for (let i = 0; i < notes.length; i++) {
      const annotation = new VF.Annotation(lyrics[i])
        .setFont(textFamily, 12)
        .setVerticalJustification(VF.Annotation.VerticalJustify.BOTTOM);
      if (issue === 177) annotation.setTextBaseline?.(staveY + 145);
      notes[i].addModifier(annotation, 0);
      annotations.push(annotation);
    }
    if (issue === 182 && row) VF.Dot.buildAndAttach([notes[0]]);
    notes.forEach((note) => note.setStave(stave));
    const voice = new VF.Voice('4/4').addTickables(notes).setStave(stave);
    new VF.Formatter().joinVoices([voice]).formatToStave([voice], stave);
    const before = annotations.map((a) => a.computeY?.().y);
    stave.setContext(context).draw();
    voice.draw(context, stave);
    if (issue === 182)
      new VF.StaveTie({ firstNote: notes[0], lastNote: notes[1], firstIndexes: [0], lastIndexes: [0] })
        .setDirection(row ? 1 : -1)
        .setContext(context)
        .draw();
    offsets.push(notes[0].getTieRightX() - notes[0].getAbsoluteX());
    positions.push(before);
  }
  return { svg: context.toSVG(), offsets, positions };
}
