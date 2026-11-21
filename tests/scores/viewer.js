// Lazy-load one edition. Retain the selected event ID when harmony, part or available width changes.
(() => {
  const el = (id) => document.getElementById(id);
  const pieces = ['saints', 'electric', 'kesh', 'falseta', 'sumer', 'prelude', 'drums', 'quartertones'];
  // Resolve editions relative to this script, including in the fingerprinted static gallery.
  const base = document.currentScript.src;
  const sources = {
    guitar: new URL('./guitar.js', base).href,
    saints: new URL('./saints.js', base).href,
    electric: new URL('./electric.js', base).href,
    kesh: new URL('./kesh.js', base).href,
    falseta: new URL('./falseta.js', base).href,
    sumer: new URL('./sumer.js', base).href,
    prelude: new URL('./prelude.js', base).href,
    drums: new URL('./drums.js', base).href,
    quartertones: new URL('./quartertones.js', base).href,
  };
  let selected, navigation, edition, composition, score, spec, renderedWidth;

  function highlight() {
    const region = navigation.regions.find((r) => r.kind === 'event' && r.id === selected);
    const box = el('highlight');
    box.hidden = !region;
    if (region) {
      const svg = el('score').querySelector('svg');
      const matrix = svg.getScreenCTM();
      const point = new DOMPoint(region.x, region.y).matrixTransform(matrix);
      const frame = el('frame').getBoundingClientRect();
      Object.assign(box.style, {
        left: point.x - frame.left - 2 + 'px',
        top: point.y - frame.top - 2 + 'px',
        width: region.w * matrix.a + 4 + 'px',
        height: region.h * matrix.d + 4 + 'px',
      });
    }
  }

  /** Recompute hit regions after VexFlow has assigned the new system positions. */
  function reflow() {
    if (!composition) return;
    const width = Math.min(el('page').clientWidth, el('width').value === 'Narrow' ? 390 : 1100);
    if (width === renderedWidth) return;
    renderedWidth = width;
    const sheet = composition.sheet;
    sheet.setWidth(Math.max(210, width - 34)).format();
    const ctx = score.factory.getContext();
    const height = Math.ceil(sheet.getHeight() + 90);
    ctx.resize(width, height);
    ctx.clear();
    score.draw({ retain: true });
    // An indivisible bar can exceed the target width. Fit all of its ink, including ledger lines
    // and marks outside the nominal stave. Hit testing uses the inverse of this same transform.
    const svg = el('score').querySelector('svg');
    const ink = svg.getBBox();
    const x = Math.min(0, ink.x - 8),
      y = Math.min(0, ink.y - 8);
    const w = Math.max(width, ink.x + ink.width + 8) - x,
      h = ink.y + ink.height + 12 - y;
    svg.setAttribute('viewBox', [x, y, w, h].join(' '));
    svg.style.width = '100%';
    svg.style.height = (width * h) / w + 'px';
    el('score').style.width = '100%';
    el('frame').style.width = width + 'px';
    navigation = new VexFlow.ScoreNavigation(composition, spec.staves);
    const events = navigation.events;
    selected = events.some((e) => e.id === selected) ? selected : events[0]?.id;
    el('events').replaceChildren(...events.map((e) => new Option(e.label, e.id)));
    el('events').value = selected;
    highlight();
  }
  function render() {
    const choice = el('edition').value;
    el('score').replaceChildren();
    if (edition.publication) {
      const { spec, options } = edition.publication(choice, VexFlow);
      new VexFlow.Publication(spec).render(el('score'), options);
      el('frame').className = 'publication';
      return;
    }
    score = VexFlow.EasyScore.create({ renderer: { elementId: 'score', width: 700, height: 300 } });
    const music = edition.create(VexFlow, score, choice);
    spec = music.spec;
    spec.sheet = { width: 700, x: 16, y: 42, rowGap: 26, measurePadding: 18 };
    composition = score.compose(spec);
    music.decorate?.(composition);
    el('legend').textContent = music.legend ?? '';
    el('legend').hidden = !music.legend;
    renderedWidth = undefined;
    reflow();
  }
  /** Initialize native controls after the selected font faces are ready to measure. */
  function loadScript(name) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = sources[name];
      script.onload = resolve;
      script.onerror = () => reject(Error('Unable to load ' + name + '.js'));
      document.head.append(script);
    });
  }
  /** Classic scripts also work when Grunt opens the gallery directly from disk. */
  async function open() {
    const id = new URLSearchParams(location.search).get('piece');
    if (!pieces.includes(id)) throw Error('Choose a score from the gallery.');
    window.FeaturedScores = {};
    if (id === 'electric' || id === 'falseta') await loadScript('guitar');
    await loadScript(id);
    edition = window.FeaturedScores[id];
    document.title = edition.title + ' · VexFlow';
    for (const key of ['title', 'credit', 'intro']) el(key).textContent = edition[key];
    el('source').href = sources[id];
    el('source').hidden = false;
    const fonts = edition.fonts ?? ['Bravura', 'Academico'];
    VexFlow.setFonts(...fonts);
    await Promise.all(fonts.map((name) => document.fonts.load('16px "' + name + '"')));
    if (edition.choices) {
      el('edition-label').hidden = false;
      el('edition-label').firstElementChild.textContent = edition.control + ' ';
      el('edition').replaceChildren(...edition.choices.map((c) => new Option(c, c)));
    }
    selected = edition.focus;
    render();
    el('edition').onchange = render;
    el('width').onchange = reflow;
    el('print').hidden = !edition.publication;
    el('print').onclick = () => window.print();
    el('width-label').hidden = !!edition.publication;
    el('reading').hidden = !!edition.publication;
    el('events').onchange = () => {
      selected = el('events').value;
      highlight();
      if (!el('highlight').hidden) el('highlight').scrollIntoView({ block: 'nearest' });
    };
    if (edition.focus) {
      el('action').hidden = false;
      el('action').textContent = edition.action ?? 'Follow the held “in”';
      el('action').onclick = () => {
        selected = edition.focus;
        el('events').value = selected;
        highlight();
        el('highlight').scrollIntoView({ block: 'center' });
      };
    }
    el('frame').onclick = (e) => {
      if (!navigation) return;
      const matrix = el('score').querySelector('svg').getScreenCTM();
      const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
      const hit = navigation.hitTest(point.x, point.y);
      if (hit?.kind === 'event') {
        selected = hit.id;
        el('events').value = selected;
        highlight();
      }
    };
    el('tools').hidden = false;
    el('status').textContent = '';
    // Reflow changes the page height. Let the browser finish delivering resize notifications first.
    new ResizeObserver(() => requestAnimationFrame(reflow)).observe(el('page'));
  }
  open().catch((error) => {
    el('status').textContent = error.message;
    console.error(error);
  });
})();
