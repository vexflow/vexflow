// A local edit can be isolated when the host owns fixed, independent measures with no crossing spans.
export function benchmarkEdits() {
  const VF = window.VexFlow,
    host = document.createElement('div'),
    peer = document.createElement('div');
  document.body.append(host, peer);
  function measure(parent, number, changed) {
    const cell = document.createElement('div'),
      ctx = new VF.SVGContext(cell);
    ctx.resize(220, 140);
    const f = new VF.Factory({ renderer: { elementId: null, width: 220, height: 140 } }).setContext(ctx);
    const score = f.EasyScore();
    const notes = score.notes(changed ? 'C5/q,A4,F4,E4' : 'C5/q,G4,F4,E4');
    f.System({ x: 8, y: 8, width: 204 })
      .addStave({ voices: [score.voice(notes)] })
      .addClef('treble');
    if (parent.children[number]) parent.children[number].replaceWith(cell);
    else parent.append(cell);
    f.draw();
  }
  function full(parent, count, edited) {
    parent.replaceChildren();
    for (let i = 0; i < count; i++) measure(parent, i, i === edited);
  }
  function ink(parent) {
    return [...parent.querySelectorAll('path,text,rect')].map((e) => [
      e.tagName,
      e.textContent,
      ...['d', 'x', 'y', 'width', 'height', 'transform'].map((a) => e.getAttribute(a)),
    ]);
  }
  try {
    return [4, 16, 48].map((count) => {
      full(host, count, -1);
      let previous = -1;
      const samples = [];
      for (let j = 0; j < 5; j++) {
        const edited = (Math.floor(count / 2) + j) % count;
        let start = performance.now();
        if (previous >= 0) measure(host, previous, false);
        measure(host, edited, true);
        const update = performance.now() - start;
        start = performance.now();
        full(peer, count, edited);
        const clean = performance.now() - start;
        if (JSON.stringify(ink(host)) !== JSON.stringify(ink(peer)))
          throw Error('Incremental measure edit diverged from full rebuild');
        samples.push({ update, clean });
        previous = edited;
      }
      const median = (key) => samples.map((s) => s[key]).sort((a, b) => a - b)[2];
      return { measures: count, repeats: samples.length, updateMedian: median('update'), cleanMedian: median('clean') };
    });
  } finally {
    host.remove();
    peer.remove();
  }
}
