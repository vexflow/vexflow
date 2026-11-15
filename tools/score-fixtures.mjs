// Small original score studies for repeatable layout and rendering benchmarks.
// No external score data or network access is needed. This function also runs inside Chromium.
export function renderScore({ kind = 'chorale', systems = 4, containerId = 'score' } = {}) {
  const VF = globalThis.VexFlow;
  document.documentElement.style.cssText = 'background:white;color:black;color-scheme:light';
  const container = document.getElementById(containerId);
  container.replaceChildren();
  const staffCount = kind === 'chamber' ? 3 : 2;
  const systemHeight = staffCount * 150 + 40;
  const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
  renderer.resize(1100, systems * systemHeight);
  const context = renderer.getContext();
  const measures = [];
  let noteCount = 0;
  const start = performance.now();
  const melody = ['c/5', 'd/5', 'e/5', 'g/5', 'a/5', 'g/5', 'e/5', 'd/5'];

  for (let system = 0; system < systems; system++) {
    for (let bar = 0; bar < 4; bar++) {
      for (let staff = 0; staff < staffCount; staff++) {
        const clef = staff === staffCount - 1 ? 'bass' : 'treble';
        const stave = new VF.Stave(15 + bar * 267, system * systemHeight + staff * 150 + 35, 267);
        if (bar === 0) stave.addClef(clef).addTimeSignature('4/4');
        const voices = [];
        const beams = [];
        const tuplets = [];
        const ties = [];
        const notes = [];
        const count = kind === 'chorale' ? 4 : kind === 'piano' ? 8 : 12;
        for (let beat = 0; beat < count; beat++) {
          const key = clef === 'bass' ? ['c/3', 'g/2', 'a/2', 'f/2'][(bar + beat) % 4] : melody[(bar + beat) % 8];
          const keys = kind === 'piano' && staff === 1 ? [key, 'e/3', 'g/3'] : [key];
          const note = new VF.StaveNote({ keys, clef, duration: count === 4 ? 'q' : '8', stemDirection: 1 });
          if (kind === 'chorale' && staff === 0) {
            const lyric = new VF.Annotation(['Sing', 'with', 'gentle', 'voices'][beat]).setVerticalJustification(
              VF.Annotation.VerticalJustify.BOTTOM
            );
            lyric.setTextBaseline?.(system * systemHeight + 162);
            note.addModifier(lyric, 0);
          }
          notes.push(note);
        }
        if (kind === 'chamber') {
          for (let i = 0; i < notes.length; i += 3) {
            tuplets.push(new VF.Tuplet(notes.slice(i, i + 3), { numNotes: 3, notesOccupied: 2 }));
            beams.push(new VF.Beam(notes.slice(i, i + 3)));
          }
          notes[0].addModifier(new VF.Ornament('tr'), 0);
        } else if (kind === 'piano') {
          for (let i = 0; i < notes.length; i += 4) beams.push(new VF.Beam(notes.slice(i, i + 4)));
        }
        voices.push(new VF.Voice('4/4').addTickables(notes));
        noteCount += notes.length;
        if (kind === 'chorale') {
          const lower = [0, 1].map(
            () => new VF.StaveNote({ keys: [clef === 'bass' ? 'c/2' : 'g/4'], clef, duration: 'h', stemDirection: -1 })
          );
          voices.push(new VF.Voice('4/4').addTickables(lower));
          ties.push(
            new VF.StaveTie({
              firstNote: lower[0],
              lastNote: lower[1],
              firstIndexes: [0],
              lastIndexes: [0],
            }).setDirection(-1)
          );
          noteCount += lower.length;
        }
        measures.push({ stave, voices, beams, tuplets, ties });
      }
    }
  }
  const constructed = performance.now();
  for (const { stave, voices } of measures) {
    voices.forEach((voice) => {
      voice.setStave(stave);
      voice.getTickables().forEach((note) => note.setStave(stave));
    });
    new VF.Formatter().joinVoices(voices).formatToStave(voices, stave);
  }
  const formatted = performance.now();
  for (const { stave, voices, beams, tuplets, ties } of measures) {
    stave.setContext(context).draw();
    voices.forEach((voice) => voice.draw(context, stave));
    [...beams, ...tuplets, ...ties].forEach((element) => element.setContext(context).draw());
  }
  const drawn = performance.now();
  return {
    kind,
    systems,
    staves: measures.length,
    notes: noteCount,
    constructionMs: constructed - start,
    layoutMs: formatted - constructed,
    drawMs: drawn - formatted,
    totalMs: drawn - start,
    svg: context.svg.outerHTML,
  };
}
