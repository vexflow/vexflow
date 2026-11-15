// Shared responsive-sheet study for browser checks and local visual comparisons.
// Invoke in a browser with VexFlow and an empty #score element already loaded.
export function renderSheetStudy({
  width = 680,
  backend = 'svg',
  font = 'Bravura',
  theme = '#e7edf5',
  widths = [],
} = {}) {
  const VF = globalThis.VexFlow;
  VF.setFonts(font, font === 'Petaluma' ? 'Petaluma Script' : 'Academico');
  const host = document.getElementById('score');
  host.replaceChildren();
  host.style.background = '#17283c';
  const target = backend === 'canvas' ? host.appendChild(document.createElement('canvas')) : host;
  target.id = backend === 'canvas' ? 'score-canvas' : 'score';
  const factory = new VF.Factory({ renderer: { elementId: target.id, width: width + 40, height: 1000 } });
  const ctx = factory.getContext();
  factory.setStyle({ fillStyle: theme, strokeStyle: theme });
  const sheet = factory.Sheet({ width, x: 20, y: 35, rowGap: 45 });
  const score = factory.EasyScore();
  const upper = score.measures('C6/8, D6, E6, F6, G5/q, C5 | (C5 E5)/h, G4 | E5/q, D5, C5, G4 | C5/w');
  const lower = score.measures('C3/h, G2 | C3, G2 | C3, G2 | C3/w', { clef: 'bass' });
  const systems = upper.map((notes, i) => {
    const system = sheet.addSystem({ spaceBetweenStaves: 10 });
    system.addStave({ voices: [score.voice(notes)] }).addClef('treble');
    system.addStave({ voices: [score.voice(lower[i])] }).addClef('bass');
    system.addConnector('brace');
    if (i === 0) {
      score.beam(notes.slice(0, 4));
      notes[4].setStyle({ fillStyle: '#ed9b40', strokeStyle: '#ed9b40' });
      factory.TextBracket({
        from: notes[0],
        to: notes[3],
        text: '8',
        options: { superscript: 'va', position: 'top', line: 3 },
      });
      factory.PedalMarking({ notes: [lower[i][0], lower[i][1]] });
    }
    return system;
  });
  const snapshots = [];
  for (const nextWidth of [width, ...widths]) {
    sheet.setWidth(nextWidth).format();
    ctx.resize(nextWidth + 40, sheet.getHeight() + 40);
    ctx.clear();
    factory.draw({ retain: true });
    const rows = sheet.getRows().map(({ systems: rowSystems, ...row }) => ({ ...row, count: rowSystems.length }));
    const boxes = [];
    systems.forEach((system, s) => {
      const box = system.getBoundingBox();
      boxes.push({
        id: `measure-${s}`,
        group: 'measures',
        x: box.getX(),
        y: box.getY(),
        width: box.getW(),
        height: box.getH(),
      });
      system.getVoices().forEach((voice, v) =>
        voice.getTickables().forEach((note, n) => {
          const b = note.getBoundingBox();
          boxes.push({
            id: `note-${s}-${v}-${n}`,
            group: `voice-${s}-${v}`,
            x: b.getX(),
            y: b.getY(),
            width: b.getW(),
            height: b.getH(),
          });
        })
      );
    });
    snapshots.push({ width: nextWidth, height: sheet.getHeight(), rows, boxes });
  }
  const svg = host.querySelector('svg');
  const colors = svg
    ? [...svg.querySelectorAll('path,text,rect')]
        .filter((node) => node.getAttribute('fill') !== 'none' || node.getAttribute('stroke') !== 'none')
        .map((node) => {
          const style = getComputedStyle(node);
          return { tag: node.tagName, fill: style.fill, stroke: style.stroke };
        })
    : [];
  return { snapshots, colors, svg: svg?.outerHTML, cssWidth: svg?.style.width };
}
