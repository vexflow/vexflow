// Grand-staff composition shared by the Explorer and responsive rendering checks.
export function renderEasyScoreComposition(VF, renderer, spacing = 'engraving', ink = '#24312c') {
  const score = VF.EasyScore.create({ renderer });
  score.setStyle({ fillStyle: ink, strokeStyle: ink });
  const result = score.compose({
    sheet: { width: renderer.width - 40, x: 20, y: 20, rowGap: 55 },
    system: { spaceBetweenStaves: 10, details: spacing === 'proportional' ? { spacing: { mode: 'proportional', pixelsPerQuarter: 70 } } : {} },
    accidentals: 'key-aware',
    signatures: 'every-measure',
    staves: [
      { id: 'right', key: 'G', measures: [
        // A pickup displays 4/4, but every voice occupies one quarter note.
        { span: '1/4', voices: [{ notes: 'D5/q' }] },
        { time: '2/4', voices: [
          { notes: 'F#5/8[id="start"], E5, D5, C5, B4, A4[id="end"]', stem: 'up', tuplets: [{ start: 0, count: 3 }, { start: 3, count: 3 }], autoBeam: true },
          { notes: 'G4/h', stem: 'down' },
        ] },
        { time: '3/4', voices: [{ notes: 'F#5/q, F5, F5' }] },
        { time: '4/4', voices: [{ notes: ['F#5/h', { change: { key: 'C', clef: 'bass' } }, 'G3/q, C4'] }] },
      ] },
      { id: 'left', clef: 'bass', key: 'G', measures: [
        { span: '1/4', voices: [{ notes: 'G2/q' }] },
        { time: '2/4', voices: [{ notes: '(G2 D3)/h' }] },
        { time: '3/4', voices: [{ notes: 'G2/h.' }] },
        { time: '4/4', voices: [{ notes: 'C3/w' }] },
      ] },
    ],
    spans: [{ kind: 'curve', from: 'start', to: 'end' }],
  });
  result.systems.forEach((system) => system.addConnector('brace'));
  const redraw = (width) => {
    result.sheet.setWidth(width - 40).format();
    const context = score.factory.getContext();
    context.resize(width, result.sheet.getHeight() + 35);
    context.clear();
    score.draw({ retain: true });
    return result.sheet.getRows().map((row) => ({ width: row.width, height: row.height, overflow: row.overflow }));
  };
  redraw(renderer.width);
  return { score, result, redraw };
}
