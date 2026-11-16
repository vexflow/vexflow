// SPA navigation, editable examples, inspection, diagnostics, and local drafts.
import { defaults, examples, groups, searchExamples } from './catalog.mjs';
import { createGlyphAtlas } from './glyphs.mjs';
import { Preview } from './preview.mjs';
import { analyzeLayout } from './render-metrics.mjs';

const $ = (id) => document.getElementById(id);
const node = (tag, text, className) => {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
};
let current,
  params = {},
  elements = [],
  lastSVG = '',
  lastWidth = 0,
  debounce,
  pending = false;
let dark = false,
  inspect = true,
  bounds = false,
  grid = false,
  toastTimer;
const draftsKey = 'vexflow-explorer-drafts-v1';
let drafts = {};
try {
  drafts = JSON.parse(localStorage.getItem(draftsKey) || '{}');
} catch {
  /* Private browsing may disable storage. */
}
const toast = (message) => {
  $('toast').textContent = message;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($('toast').hidden = true), 2400);
};
if (!drafts || typeof drafts !== 'object' || Array.isArray(drafts)) drafts = {};
const glyphs = createGlyphAtlas(toast);
const preview = new Preview($('frame-host'), receive);
$('example-count').textContent = examples.length;
$('version').textContent = VexFlow.BUILD?.VERSION ?? '';

/** All dynamic UI text uses textContent, including errors from edited code. */
function renderNavigation() {
  const found = searchExamples($('search').value);
  const nav = $('navigation');
  nav.replaceChildren();
  for (const group of groups) {
    const matches = found.filter((e) => e.group === group);
    if (!matches.length) continue;
    const section = node('section', undefined, 'nav-group');
    section.append(node('h2', group));
    for (const example of matches) {
      const link = node('a', example.title, 'nav-item');
      link.href = `#example/${example.id}`;
      link.dataset.id = example.id;
      if (example.id === current?.id) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
      section.append(link);
    }
    nav.append(section);
  }
  if (!found.length) nav.append(node('p', 'No matching notation. Try “tie”, “guitar”, or a class name.', 'no-results'));
}

/** Keep code and controls together; storage failure never blocks editing. */
function saveDraft() {
  if (!current) return;
  drafts[current.id] = { code: $('editor').value, params };
  try {
    localStorage.setItem(draftsKey, JSON.stringify(drafts));
  } catch {
    /* The current edit remains usable if storage is full. */
  }
  $('draft-state').textContent =
    $('editor').value === current.code && JSON.stringify(params) === JSON.stringify(defaults(current))
      ? 'Original example'
      : 'Saved on this device';
}
function lineNumbers() {
  const editor = $('editor');
  $('line-numbers').textContent = editor.value
    .split('\n')
    .map((_, i) => i + 1)
    .join('\n');
  $('line-numbers').scrollTop = editor.scrollTop;
}
function environment() {
  $('params-code').textContent = `const params = ${JSON.stringify(params, null, 2)};`;
}

/** Create controls from catalog metadata without replacing the edited recipe. */
function renderControls() {
  const form = $('controls');
  form.replaceChildren();
  for (const control of current.controls) {
    const wrap = node('div', undefined, 'control');
    const label = node('label', control.label);
    const id = `control-${control.key}`;
    label.htmlFor = id;
    const input = document.createElement(control.choices ? 'select' : 'input');
    input.id = id;
    if (control.choices) {
      for (const choice of control.choices) {
        const option = node('option', String(choice));
        option.value = choice;
        input.append(option);
      }
    } else if (control.min !== undefined) {
      input.type = 'range';
      input.min = control.min;
      input.max = control.max;
      input.step = control.step;
      label.className = 'range-label';
      const output = node('output', String(params[control.key]));
      output.htmlFor = id;
      label.append(output);
    } else input.type = 'text';
    input.value = params[control.key];
    input.addEventListener('input', () => {
      params[control.key] = typeof control.value === 'number' ? Number(input.value) : input.value;
      const output = label.querySelector('output');
      if (output) output.value = input.value;
      environment();
      saveDraft();
      schedule();
    });
    wrap.append(label, input);
    form.append(wrap);
  }
  form.hidden = !current.controls.length;
  environment();
}

/** Load a recipe, its saved draft, API links, and neighboring navigation. */
function showExample(id) {
  current = examples.find((e) => e.id === id) ?? examples[0];
  const saved = drafts[current.id];
  params = { ...defaults(current), ...saved?.params };
  $('editor').value = typeof saved?.code === 'string' ? saved.code : current.code;
  $('category').textContent = `${String(groups.indexOf(current.group) + 1).padStart(2, '0')} / ${current.group}`;
  $('title').textContent = current.title;
  $('description').textContent = current.description;
  document.title = `${current.title} · VexFlow Explorer`;
  $('api-tips').textContent = current.tips || current.description;
  $('api-links').replaceChildren();
  const filenames = { Stroke: 'strokes', Volta: 'stavevolta', Repetition: 'staverepetition' };
  for (const api of current.api) {
    const a = node('a', `${api} ↗`, 'api-link');
    a.href = `https://github.com/vexflow/vexflow/blob/main/src/${filenames[api] ?? api.toLowerCase()}.ts`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    $('api-links').append(a);
  }
  const index = examples.indexOf(current);
  const prev = examples[(index + examples.length - 1) % examples.length],
    next = examples[(index + 1) % examples.length];
  $('previous').textContent = `← ${prev.title}`;
  $('previous').href = `#example/${prev.id}`;
  $('next').textContent = `${next.title} →`;
  $('next').href = `#example/${next.id}`;
  $('example-index').textContent = `${String(index + 1).padStart(2, '0')} / ${examples.length}`;
  renderControls();
  renderNavigation();
  lineNumbers();
  saveDraft();
  run();
}
/** Hash routes keep navigation compatible with static bucket hosting. */
function route() {
  const [section, id] = location.hash.slice(1).split('/');
  const isGlyph = section === 'glyphs';
  $('example-view').hidden = isGlyph;
  $('glyph-view').hidden = !isGlyph;
  $('sidebar').classList.remove('open');
  $('menu').setAttribute('aria-expanded', 'false');
  if (isGlyph) {
    glyphs.show(id ?? '').catch((error) => toast(error.message));
    document.title = 'Glyph atlas · VexFlow Explorer';
  } else showExample(id);
}
function schedule() {
  clearTimeout(debounce);
  if ($('auto-run').checked) debounce = setTimeout(run, 450);
  else $('draft-state').textContent = 'Edited · press Run to update';
}
/** Render the latest edit in the warm sandbox, with a clean score and registry. */
function run() {
  if (!current || $('example-view').hidden) return;
  clearTimeout(debounce);
  pending = true;
  const width = Math.max(280, Math.round($('preview').clientWidth));
  lastWidth = width;
  $('render-error').hidden = true;
  $('error-message').textContent = '';
  $('render-pending').hidden = false;
  $('download').disabled = true;
  $('render-status').textContent = 'Rendering…';
  $('pointer-position').textContent = 'Hover to explore · click to pin';
  $('elements').disabled = true;
  $('inspection').hidden = true;
  document.querySelector('.inspector-hint').hidden = false;
  preview.run({
    code: $('editor').value,
    params,
    width,
    height: 245,
    font: $('font').value,
    ink: dark ? '#eeeadd' : '#30382d',
    inspect,
    bounds,
    grid,
  });
}

/** Handle the current sandbox response and update only text or form state. */
function receive(message) {
  if (message.type === 'error') {
    pending = false;
    $('render-pending').hidden = true;
    $('render-error').hidden = false;
    $('error-message').textContent =
      `${message.name || 'Error'}${message.line ? ` · line ${message.line}` : ''}\n${message.message}`;
    $('render-status').textContent = 'Example needs attention';
    lastSVG = '';
    return;
  }
  if (message.type === 'inspect') {
    if (!message.element && !message.pinned) {
      $('pointer-position').textContent = 'Hover to explore · click to pin';
      $('inspection').hidden = true;
      document.querySelector('.inspector-hint').hidden = false;
    }
    showInspection(message.element, message.pinned);
    if (message.point)
      $('pointer-position').textContent =
        `x ${message.point.x} · y ${message.point.y}${message.pinned ? ' · pinned' : ''}`;
    return;
  }
  if (message.type !== 'rendered') return;
  pending = false;
  elements = message.elements.slice(0, 5000);
  lastSVG = message.svg;
  $('render-pending').hidden = true;
  $('download').disabled = false;
  $('elements').disabled = false;
  $('render-status').textContent =
    `${message.width} × ${message.height} · ${message.totalDuration} ms total · ${message.duration} ms render · ${elements.length} elements`;
  const select = $('elements');
  select.replaceChildren(node('option', 'Select an element…'));
  select.firstChild.value = '';
  for (const element of elements) {
    const option = node('option', `${element.category} · ${element.id}`);
    option.value = element.id;
    select.append(option);
  }
  showDiagnostics(message);
  if (Math.abs($('preview').clientWidth - lastWidth) > 2) {
    clearTimeout(debounce);
    debounce = setTimeout(run, 100);
  }
}

/** Display measured bounds and safe, public element properties. */
function showInspection(element, pinned = false) {
  if (!element) return;
  document.querySelector('.inspector-hint').hidden = true;
  const pane = $('inspection');
  pane.hidden = false;
  pane.replaceChildren();
  const heading = node('div', undefined, 'inspection-title');
  heading.append(node('h3', element.category));
  if (pinned) {
    const release = node('button', 'Unpin', 'text-button');
    release.onclick = () => {
      preview.post({ type: 'select', id: '' });
      pane.hidden = true;
      document.querySelector('.inspector-hint').hidden = false;
    };
    heading.append(release);
  }
  pane.append(heading, node('div', element.id, 'inspection-id'));
  for (const [name, box] of [
    ['Rendered bounds', element.rendered],
    ['Layout bounds', element.layout],
  ]) {
    if (!box) continue;
    const table = node('table', undefined, 'metric-table');
    const caption = node('caption', name);
    caption.className = 'subtle';
    table.append(caption);
    for (const [key, value] of Object.entries(box)) {
      const row = node('tr');
      row.append(node('td', key), node('td', `${value} px`));
      table.append(row);
    }
    pane.append(table);
  }
  const table = node('table', undefined, 'metric-table');
  for (const [key, value] of Object.entries(element.properties ?? {})) {
    if (value === undefined) continue;
    const row = node('tr');
    row.append(node('td', key), node('td', typeof value === 'object' ? JSON.stringify(value) : String(value)));
    table.append(row);
  }
  pane.append(table);
  const related = node('div', undefined, 'related');
  for (const id of element.related ?? []) {
    const child = elements.find((e) => e.id === id);
    if (!child) continue;
    const button = node('button', child.category);
    button.title = id;
    button.onclick = () => preview.post({ type: 'select', id });
    related.append(button);
  }
  if (related.childNodes.length) pane.append(node('p', 'Related elements', 'subtle'), related);
  $('elements').value = element.id;
}

/** Report heuristics separately from rendering errors. */
function showDiagnostics(message) {
  const boxes = elements
    .filter((e) => e.category === 'StaveNote' && e.layout)
    .map((e) => ({ id: e.id, group: e.voice, ...e.layout }));
  const metrics = analyzeLayout(boxes, { width: message.width, height: message.height });
  const count = metrics.collisions.length + metrics.overflow.length + metrics.invalid.length;
  $('diagnostic-summary').textContent = count ? `Layout checks · ${count} to review` : 'Layout checks · no flags';
  const body = $('diagnostic-body');
  body.replaceChildren(
    node(
      'p',
      'Heuristic checks for note bounds in each voice. Shared space can be intentional; these flags are prompts to inspect, not engraving verdicts.'
    )
  );
  for (const item of metrics.collisions) {
    const button = node('button', `Overlap ${item.area.toFixed(1)} px² · ${item.ids.join(' / ')}`, 'api-link');
    button.onclick = () => preview.post({ type: 'select', id: item.ids[0] });
    body.append(button);
  }
  for (const item of metrics.overflow)
    body.append(node('p', `${item.id}: ${item.excess.toFixed(1)} px outside the score.`));
  for (const id of metrics.invalid) body.append(node('p', `${id}: invalid bounds.`));
  if (message.logs?.length) body.append(node('pre', message.logs.join('\n')));
}

function reset() {
  delete drafts[current.id];
  $('editor').value = current.code;
  params = defaults(current);
  renderControls();
  lineNumbers();
  saveDraft();
  run();
}
function options() {
  preview.post({ type: 'options', inspect, bounds, grid });
}
$('search').oninput = renderNavigation;
$('search').onkeydown = (event) => {
  if (event.key === 'Enter') {
    const first = $('navigation').querySelector('a');
    if (first) location.hash = first.hash;
  }
};
$('editor').oninput = () => {
  lineNumbers();
  saveDraft();
  schedule();
};
$('editor').onscroll = () => ($('line-numbers').scrollTop = $('editor').scrollTop);
$('editor').onkeydown = (event) => {
  if (event.key === 'Tab') {
    event.preventDefault();
    const el = event.target;
    el.setRangeText('  ', el.selectionStart, el.selectionEnd, 'end');
    lineNumbers();
    saveDraft();
    schedule();
  }
};
$('controls').onsubmit = (event) => event.preventDefault();
$('run').onclick = run;
$('reset').onclick = reset;
$('recover').onclick = reset;
$('reset-runtime').onclick = () => {
  preview.reset();
  run();
};
$('auto-run').onchange = () => {
  if ($('auto-run').checked) run();
};
$('font').onchange = run;
$('inspect-toggle').onclick = () => {
  inspect = !inspect;
  $('inspect-toggle').setAttribute('aria-pressed', inspect);
  options();
};
$('bounds-toggle').onclick = () => {
  bounds = !bounds;
  $('bounds-toggle').setAttribute('aria-pressed', bounds);
  options();
};
$('grid-toggle').onclick = () => {
  grid = !grid;
  $('grid-toggle').setAttribute('aria-pressed', grid);
  options();
};
$('paper-toggle').onclick = () => {
  dark = !dark;
  $('preview').classList.toggle('dark', dark);
  $('paper-toggle').setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} paper`);
  run();
};
$('elements').onchange = () => preview.post({ type: 'select', id: $('elements').value });
for (const tab of ['inspect', 'api'])
  $(`${tab}-tab`).onclick = () => {
    for (const name of ['inspect', 'api']) {
      $(`${name}-tab`).setAttribute('aria-selected', name === tab);
      $(`${name}-panel`).hidden = name !== tab;
      $(`${name}-tab`).tabIndex = name === tab ? 0 : -1;
    }
  };

$('api-tab').tabIndex = -1;
for (const tab of ['inspect', 'api']) {
  $(`${tab}-tab`).addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'inspect' : event.key === 'End' ? 'api' : tab === 'inspect' ? 'api' : 'inspect';
    $(`${next}-tab`).click();
    $(`${next}-tab`).focus();
  });
}
$('copy-code').onclick = () => {
  const code = `// Load VexFlow and add <div id="score"></div> to the page.\nconst VF = VexFlow;\nconst width = ${lastWidth};\nconst height = 245;\nconst ink = '${dark ? '#eeeadd' : '#30382d'}';\nconst params = ${JSON.stringify(params, null, 2)};\nVF.setFonts('${$('font').value}', '${$('font').value === 'Petaluma' ? 'Petaluma Script' : 'Academico'}');\nawait document.fonts.ready;\n\n${$('editor').value}`;
  navigator.clipboard
    .writeText(code)
    .then(() => toast('Runnable example copied'))
    .catch(() => toast('Select the code and copy it with your keyboard.'));
};
$('download').onclick = async () => {
  if (!lastSVG) return;
  try {
    const fonts = await fetch(new URL('./font-data.json', import.meta.url)).then((r) => r.json());
    const css = Object.entries(fonts)
      .map(([family, data]) => `@font-face{font-family:'${family}';src:url(data:font/otf;base64,${data})}`)
      .join('');
    const svg = lastSVG.replace(/(<svg[^>]*>)/, `$1<defs><style>${css}</style></defs>`);
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const a = node('a');
    a.href = url;
    a.download = `vexflow-${current.id}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    toast(`Export failed: ${error.message}`);
  }
};
$('menu').onclick = () => {
  const open = $('sidebar').classList.toggle('open');
  $('menu').setAttribute('aria-expanded', open);
};
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    $('sidebar').classList.add('open');
    $('menu').setAttribute('aria-expanded', 'true');
    $('search').focus();
    $('search').select();
  }
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    run();
  }
  if (event.key === 'Escape') {
    $('sidebar').classList.remove('open');
    $('menu').setAttribute('aria-expanded', 'false');
    preview.post({ type: 'select', id: '' });
  }
});
new ResizeObserver(() => {
  if (!pending && Math.abs($('preview').clientWidth - lastWidth) > 2 && !$('example-view').hidden) {
    clearTimeout(debounce);
    debounce = setTimeout(run, 200);
  }
}).observe($('preview'));
window.addEventListener('hashchange', route);
renderNavigation();
route();
