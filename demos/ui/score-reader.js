// A native HTML reading companion and shared pointer selection for Canvas and SVG scores.
(() => {
  const VF = window.VexFlow;
  const el = (id) => document.getElementById(id);
  const events = el('events'),
    viewport = el('viewport'),
    frame = el('frame');
  const pitches = [
    ['c/5', 'b/4', 'g/4'],
    ['f/4', 'a/4', 'c/5'],
    ['d/5', 'c/5', 'a/4'],
    ['g/4', 'e/4', 'c/4'],
  ];
  const kit = new VF.PercussionMap();
  /** Both renderers use one score with authored IDs. Each measure occupies exactly four beats. */
  function source(count, width) {
    const measures = (make) => Array.from({ length: count }, (_, i) => ({ voices: [{ notes: make(i) }] }));
    return {
      sheet: { width, x: 14, y: 46, rowGap: 8, measurePadding: 14 },
      continuous: {
        spans: [{ id: 'phrase', kind: 'slur', from: 'fl-1-2', to: 'fl-' + Math.min(3, count) + '-2', side: 'above' }],
      },
      staves: [
        {
          id: 'fl',
          name: 'Flute',
          clef: 'treble',
          time: '4/4',
          measures: measures((i) =>
            pitches[i % 4].map((key, j) => ({
              id: 'fl-' + (i + 1) + '-' + (j + 1),
              note: { keys: [key], duration: j === 2 ? 'h' : 'q' },
            }))
          ),
        },
        {
          id: 'kit',
          name: 'Drums',
          clef: 'percussion',
          time: '4/4',
          measures: measures((i) => [
            { id: 'kit-' + (i + 1) + '-1', note: kit.note(['kick'], 'q') },
            { id: 'kit-' + (i + 1) + '-2', note: { keys: ['b/4'], duration: 'qr' } },
            { id: 'kit-' + (i + 1) + '-3', note: kit.note(['snare', 'hat'], 'h') },
          ]),
        },
      ],
    };
  }

  /** Reflow retains the composed voice objects. Replacing the backend rebuilds from source. */
  function create(target, backend, width, count = 4) {
    const node = document.createElement(backend === 'Canvas' ? 'canvas' : 'div');
    target.replaceChildren(node);
    const renderer = new VF.Renderer(node, VF.Renderer.Backends[backend.toUpperCase()]);
    const factory = new VF.Factory({ renderer: { elementId: null, width: width + 28, height: 260 } }).setContext(
      renderer.getContext()
    );
    const spec = source(count, width);
    const composition = factory.EasyScore().compose(spec);
    const provenance = {};
    for (const staff of spec.staves)
      for (const [m, measure] of staff.measures.entries())
        for (const [n, event] of measure.voices[0].notes.entries())
          provenance[event.id] = staff.id + '/measure/' + (m + 1) + '/event/' + (n + 1);
    return {
      composition,
      factory,
      reflow(nextWidth) {
        composition.sheet.setWidth(nextWidth).format();
        const height = Math.ceil(composition.sheet.getHeight() + 20);
        const ctx = factory.getContext();
        ctx.resize(nextWidth + 28, height);
        ctx.clear();
        factory.draw({ retain: true });
        return { index: new VF.ScoreNavigation(composition, spec.staves, provenance), width: nextWidth + 28, height };
      },
    };
  }

  let view, snapshot, selected, previousWidth, previousBackend;
  function highlight() {
    const region = snapshot.index.regions.find((r) => r.kind === 'event' && r.id === selected);
    const box = el('highlight');
    box.hidden = !region;
    if (region)
      Object.assign(box.style, {
        left: region.x - 2 + 'px',
        top: region.y - 2 + 'px',
        width: region.w + 4 + 'px',
        height: region.h + 4 + 'px',
      });
  }
  function draw() {
    const backend = el('backend').value;
    const width = Math.max(160, Math.min(el('layout').value === 'Narrow' ? 340 : 920, viewport.clientWidth) - 28);
    if (view && previousWidth === width && previousBackend === backend) return;
    if (!view || previousBackend !== backend) view = create(el('surface'), backend, width);
    snapshot = view.reflow(width);
    previousWidth = width;
    previousBackend = backend;
    frame.style.width = snapshot.width + 'px';
    const reading = snapshot.index.events;
    selected = reading.find((e) => e.id === selected)?.id ?? reading[0]?.id;
    events.replaceChildren(...reading.map((e) => new Option(e.label, e.id)));
    events.value = selected;
    highlight();
  }
  events.addEventListener('change', () => {
    selected = events.value;
    highlight();
  });
  frame.addEventListener('click', (e) => {
    const rect = frame.getBoundingClientRect();
    const hit = snapshot.index.hitTest(
      ((e.clientX - rect.left) * snapshot.width) / rect.width,
      ((e.clientY - rect.top) * snapshot.height) / rect.height
    );
    if (hit?.kind === 'event') {
      selected = hit.id;
      events.value = selected;
      highlight();
      events.focus({ preventScroll: true });
    }
  });
  window.scoreReader = {
    create,
    source,
    get snapshot() {
      return snapshot;
    },
  };
  Promise.all([...document.fonts].map((f) => f.load()))
    .then(() => {
      draw();
      el('backend').onchange = draw;
      el('layout').onchange = draw;
      new ResizeObserver(draw).observe(viewport);
    })
    .catch((error) => {
      el('error').textContent = String(error);
    });
})();
