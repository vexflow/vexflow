// Runs one edited example in an opaque-origin iframe and reports only serializable diagnostics.
(() => {
  'use strict';
  const channel = 'vexflow-explorer';
  let token,
    svg,
    overlay,
    selected,
    pinned = false;
  let inspection = true,
    bounds = false,
    grid = false;
  let elements = [],
    records = new Map();
  const send = (type, data) => parent.postMessage({ channel, token, type, ...data }, '*');
  const safe = (fn) => {
    try {
      return fn();
    } catch {
      return undefined;
    }
  };
  const rounded = (value) => Math.round(value * 100) / 100;
  const boxObject = (box) =>
    box && { x: rounded(box.getX()), y: rounded(box.getY()), width: rounded(box.getW()), height: rounded(box.getH()) };

  /** SVG bounds and VexFlow layout bounds describe different things; report both. */
  function describe(element) {
    const id = element.getAttribute('id');
    const node = document.getElementById(`vf-${id}`);
    const layout = safe(() => boxObject(element.getBoundingBox()));
    const rendered = safe(() => {
      if (!node) return undefined;
      const b = node.getBBox();
      const m = node.getCTM();
      const corners = [
        [b.x, b.y],
        [b.x + b.width, b.y],
        [b.x, b.y + b.height],
        [b.x + b.width, b.y + b.height],
      ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));
      const xs = corners.map((p) => p.x),
        ys = corners.map((p) => p.y);
      return {
        x: rounded(Math.min(...xs)),
        y: rounded(Math.min(...ys)),
        width: rounded(Math.max(...xs) - Math.min(...xs)),
        height: rounded(Math.max(...ys) - Math.min(...ys)),
      };
    });
    const properties = {};
    for (const [name, getter] of Object.entries({
      keys: 'getKeys',
      duration: 'getDuration',
      stem: 'getStemDirection',
      text: 'getText',
      style: 'getStyle',
    })) {
      const value = safe(() => element[getter]?.());
      if (value !== undefined && value !== '') properties[name] = value;
    }
    const related = new Set();
    for (const getter of ['getModifiers', 'getNotes', 'getTickables', 'getStaves', 'getVoices']) {
      const children = safe(() => element[getter]?.());
      if (Array.isArray(children))
        children.forEach((child) => {
          if (child?.getAttribute) related.add(child.getAttribute('id'));
        });
    }
    const stem = safe(() => element.getStem?.());
    if (stem) related.add(stem.getAttribute('id'));
    const voice = safe(() => element.getVoice?.());
    return {
      id,
      category: element.getCategory(),
      layout,
      rendered,
      properties,
      related: [...related],
      voice: voice?.getAttribute('id'),
    };
  }

  function rect(box, color, fill = 'none') {
    if (!box || !Object.values(box).every(Number.isFinite) || box.width < 0 || box.height < 0) return;
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    for (const [key, value] of Object.entries(box)) node.setAttribute(key, value);
    node.setAttribute('fill', fill);
    node.setAttribute('stroke', color);
    node.setAttribute('stroke-width', '0.8');
    overlay.appendChild(node);
  }

  /** Debug overlays never alter notation geometry or appear in exported SVGs. */
  function paint() {
    if (!svg) return;
    overlay?.remove();
    overlay = document.createElementNS(svg.namespaceURI, 'g');
    overlay.dataset.explorerOverlay = 'true';
    overlay.setAttribute('pointer-events', 'none');
    svg.appendChild(overlay);
    if (bounds) elements.filter((e) => e.rendered).forEach((e) => rect(e.rendered, '#7c9975'));
    if (selected && inspection) rect(selected.rendered ?? selected.layout, '#b74632', '#b7463210');
    document.body.style.backgroundImage = grid
      ? 'linear-gradient(#7f97701a 1px,transparent 1px),linear-gradient(90deg,#7f97701a 1px,transparent 1px)'
      : 'none';
    document.body.style.backgroundSize = '10px 10px';
  }

  function inspect(event, pin = false) {
    if (!inspection || (pinned && !pin)) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
    let node = event.target;
    let found;
    while (node && node !== svg) {
      found = records.get((node.id || '').replace(/^vf-/, ''));
      if (found) break;
      node = node.parentNode;
    }
    if (!found) {
      found = elements
        .filter((e) => {
          const b = e.rendered ?? e.layout;
          return (
            b &&
            b.width > 0 &&
            b.height > 0 &&
            point.x >= b.x &&
            point.x <= b.x + b.width &&
            point.y >= b.y &&
            point.y <= b.y + b.height
          );
        })
        .sort((a, b) => {
          const aa = a.rendered ?? a.layout,
            bb = b.rendered ?? b.layout;
          return aa.width * aa.height - bb.width * bb.height;
        })[0];
    }
    if (pin) pinned = !!found;
    selected = found;
    paint();
    send('inspect', { element: found, pinned, point: { x: rounded(point.x), y: rounded(point.y) } });
  }

  /** Collect elements via the public Registry hook rather than monkey-patching drawing methods. */
  async function run(message) {
    token = message.token;
    const VF = window.VexFlow;
    const registry = new VF.Registry();
    const collected = new Map();
    const original = registry.register.bind(registry);
    registry.register = (element, id) => {
      const result = original(element, id);
      collected.set(element.getAttribute('id'), element);
      return result;
    };
    VF.Registry.enableDefaultRegistry(registry);
    VF.setFonts(message.font, message.font === 'Petaluma' ? 'Petaluma Script' : 'Academico');
    await document.fonts.ready;
    const logs = [];
    console.log = (...values) => {
      if (logs.length < 20) logs.push(values.map((v) => String(v).slice(0, 500)).join(' '));
    };
    const start = performance.now();
    try {
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      await new AsyncFunction(
        'VF',
        'width',
        'height',
        'ink',
        'params',
        `"use strict";\n${message.code}\n//# sourceURL=explorer-example.js`
      )(VF, message.width, message.height, message.ink, message.params);
      await document.fonts.ready;
      svg = document.querySelector('#score svg');
      if (!svg) throw new Error('No SVG was rendered. Create a Factory or SVG Renderer in the #score container.');
      elements = [...collected.values()].map(describe);
      records = new Map(elements.map((e) => [e.id, e]));
      const raw = new XMLSerializer().serializeToString(svg);
      send('rendered', {
        elements,
        svg: raw,
        logs,
        duration: rounded(performance.now() - start),
        width: Number(svg.getAttribute('width')),
        height: Number(svg.getAttribute('height')),
      });
      svg.addEventListener('pointermove', (event) => inspect(event));
      svg.addEventListener('click', (event) => inspect(event, true));
      svg.addEventListener('pointerleave', () => {
        if (!pinned) {
          selected = undefined;
          paint();
          send('inspect', { element: undefined, pinned: false });
        }
      });
      inspection = message.inspect;
      bounds = message.bounds;
      grid = message.grid;
      paint();
    } catch (error) {
      const match = String(error.stack).match(/explorer-example\.js:(\d+):(\d+)/);
      send('error', {
        message: String(error.message).slice(0, 2500),
        name: error.name,
        line: match ? Math.max(1, Number(match[1]) - 3) : undefined,
      });
    } finally {
      VF.Registry.disableDefaultRegistry();
    }
  }

  // Surface delayed exceptions too, including errors from timers or rejected promises.
  window.addEventListener('error', (event) => {
    if (!token) return;
    event.preventDefault();
    send('error', { name: 'Error', message: String(event.message).slice(0, 2500) });
  });
  window.addEventListener('unhandledrejection', (event) => {
    if (!token) return;
    event.preventDefault();
    send('error', {
      name: 'Unhandled rejection',
      message: String(event.reason?.message ?? event.reason).slice(0, 2500),
    });
  });

  window.addEventListener('message', (event) => {
    if (event.source !== parent || event.data?.channel !== channel) return;
    const message = event.data;
    if (message.type === 'run') run(message);
    if (message.type === 'options' && message.token === token) {
      inspection = message.inspect;
      bounds = message.bounds;
      grid = message.grid;
      paint();
    }
    if (message.type === 'select' && message.token === token) {
      selected = records.get(message.id);
      pinned = !!selected;
      paint();
      send('inspect', { element: selected, pinned });
    }
  });
  parent.postMessage({ channel, type: 'ready' }, '*');
})();
