// Lesson navigation, playground widgets, local drafts, and downloadable examples.
import { examples, lessons, sections } from './content.mjs';
import { createEditor, highlightCode } from './runtime/editor.mjs';
import { Preview } from './runtime/preview.mjs';
import { findNotationRange } from './runtime/source.mjs';

const $ = (id) => document.getElementById(id);
const draftsKey = 'vexflow-guide-drafts-v1';
const fonts = await fetch(new URL('./runtime/font-data.json', import.meta.url)).then((response) => response.json());
const version = await fetch(new URL('./version.json', import.meta.url)).then((response) => response.json());
const sourceRoot = `https://github.com/vexflow/vexflow/blob/${version.commit}/`;
let currentLesson,
  currentExample,
  params = {},
  lastSVG = '',
  renderedCode = '',
  pending = false,
  timer,
  toastTimer,
  observedWidth;
let drafts = {};
try {
  const stored = JSON.parse(localStorage.getItem(draftsKey) || '{}');
  if (stored && typeof stored === 'object' && !Array.isArray(stored)) drafts = stored;
} catch {
  /* Storage is optional; editing still works. */
}

/** DOM helpers insert dynamic values as text, including code and diagnostics. */
function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}
/** Construct navigation without interpreting its label as markup. */
function link(text, href) {
  const element = node('a', text);
  element.href = href;
  return element;
}
/** Announce transient copy/export results without interrupting editing. */
function toast(text) {
  $('toast').textContent = text;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    $('toast').hidden = true;
  }, 3500);
}
/** Derive initial control values from catalog metadata. */
function defaults(example) {
  return Object.fromEntries(example.controls.map((control) => [control.key, control.value]));
}

const preview = new Preview($('frame-host'), receive);
const editor = createEditor($('editor'), () => {
  saveDraft();
  schedule();
});
/** Search lesson titles and prose; preserve the four section headings. */
function navigation() {
  const query = $('search').value.toLowerCase().trim();
  const words = query.split(/\s+/);
  $('navigation').replaceChildren();
  let count = 0;
  for (const section of sections) {
    const found = lessons.filter(
      (lesson) =>
        lesson.section === section.id &&
        words.every((word) =>
          `${lesson.title} ${lesson.summary} ${lesson.body.replace(/<[^>]+>/g, ' ')}`.toLowerCase().includes(word)
        )
    );
    if (!found.length) continue;
    const group = node('section', undefined, 'nav-section');
    group.append(node('h2', section.title));
    for (const lesson of found) {
      const item = link(lesson.title, lesson.id === 'playground' ? '#playground/first-notes' : `#lesson/${lesson.id}`);
      if (lesson.id === currentLesson?.id) item.setAttribute('aria-current', 'page');
      group.append(item);
      count++;
    }
    $('navigation').append(group);
  }
  if (!count) $('navigation').append(node('p', 'No lessons found. Try “voice”, “tab”, or “font”.'));
}

/** Drafts are per example, so moving between a lesson and playground preserves edits. */
function saveDraft() {
  if (!currentExample) return;
  const original =
    editor.getCode() === currentExample.code && JSON.stringify(params) === JSON.stringify(defaults(currentExample));
  if (original) delete drafts[currentExample.id];
  else drafts[currentExample.id] = { code: editor.getCode(), params };
  let saved = true;
  try {
    localStorage.setItem(draftsKey, JSON.stringify(drafts));
  } catch {
    saved = false;
  }
  $('draft-state').textContent = original ? 'Original example' : saved ? 'Draft saved on this device' : 'Unsaved draft';
}

/** Only repository-authored lesson HTML is inserted as markup. */
function showLesson(lesson) {
  currentLesson = lesson;
  const section = sections.find((item) => item.id === lesson.section);
  $('title').textContent = lesson.title;
  $('section-label').textContent = section.title;
  $('summary').textContent = lesson.summary;
  $('lesson').innerHTML = lesson.body;
  $('lesson').querySelectorAll('code').forEach(highlightCode);
  const steps = $('lesson-examples');
  steps.replaceChildren();
  steps.hidden = lesson.examples.length < 2;
  if (!steps.hidden) {
    const list = node('ol');
    for (const id of lesson.examples) {
      const item = node('li');
      const example = examples.find((entry) => entry.id === id);
      item.append(link(example.title, `#lesson/${lesson.id}/${id}`));
      list.append(item);
    }
    steps.append(node('p', 'Examples in this lesson'), list);
  }
  $('exercise').textContent = lesson.exercise;
  document.title = `${lesson.title} · VexFlow Guide`;
  $('reading').replaceChildren();
  for (const [heading, items] of [
    [
      'Keep learning',
      lesson.related.map((id) => {
        const item = lessons.find((value) => value.id === id);
        return [item.title, id === 'playground' ? '#playground/first-notes' : `#lesson/${id}`];
      }),
    ],
    [
      'Sources and API details',
      lesson.sources.map((source) =>
        source.startsWith('repo:')
          ? [source.slice(5), sourceRoot + source.slice(5)]
          : [source.includes('wiki') ? 'Original EasyScore wiki' : 'Original VexFlow tutorial', source]
      ),
    ],
  ]) {
    if (!items.length) continue;
    const list = node('ul');
    for (const [text, href] of items) {
      const item = node('li');
      item.append(link(text, href));
      list.append(item);
    }
    $('reading').append(node('h2', heading), list);
  }
  const index = lessons.indexOf(lesson);
  for (const [id, item, prefix] of [
    ['previous', lessons[index - 1], '← '],
    ['next', lessons[index + 1], 'Next: '],
  ]) {
    $(id).hidden = !item;
    if (item) {
      $(id).textContent = prefix + item.title;
      $(id).href = item.id === 'playground' ? '#playground/first-notes' : `#lesson/${item.id}`;
    }
  }
  navigation();
}

/** Build parameter controls from the example metadata. */
function renderControls() {
  $('controls').replaceChildren();
  for (const control of currentExample.controls) {
    const wrap = node('div', undefined, 'control');
    const label = node('label', control.label);
    label.htmlFor = `control-${control.key}`;
    const input = node(control.choices ? 'select' : 'input');
    input.id = label.htmlFor;
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
      const output = node('output', String(params[control.key]));
      output.htmlFor = input.id;
      label.append(output);
    } else input.type = 'text';
    input.value = params[control.key];
    input.addEventListener('input', () => {
      params[control.key] = typeof control.value === 'number' ? Number(input.value) : input.value;
      const output = label.querySelector('output');
      if (output) output.value = input.value;
      environment();
      saveDraft();
      run();
    });
    wrap.append(label, input);
    $('controls').append(wrap);
  }
  environment();
}
/** Show the exact parameter object supplied to the snippet. */
function environment() {
  $('params-code').textContent = `const params = ${JSON.stringify(params, null, 2)};`;
  highlightCode($('params-code'));
}

/** Reuse the loaded library and fonts; the shared runtime cleans each example's effects. */
function showExample(example) {
  clearTimeout(timer);
  currentExample = example;
  const saved = Object.hasOwn(drafts, example.id) ? drafts[example.id] : undefined;
  params = { ...defaults(example), ...(saved?.params && typeof saved.params === 'object' ? saved.params : {}) };
  editor.setCode(typeof saved?.code === 'string' ? saved.code : example.code);
  $('example-title').textContent = example.title;
  $('example-description').textContent = example.description;
  $('example-select').value = example.id;
  $('open-playground').href = `#playground/${example.id}`;
  $('api-links').replaceChildren();
  for (const api of example.api) $('api-links').append(link(api, sourceRoot + example.apiFiles[api]));
  renderControls();
  saveDraft();
  run();
}

/** Unknown or malformed fragment links recover to the first lesson. */
function route({ focus = false } = {}) {
  let path;
  try {
    path = decodeURIComponent(location.hash.slice(1)).split('/');
  } catch {
    path = [];
  }
  const playground = path[0] === 'playground' || (path[0] === 'lesson' && path[1] === 'playground');
  const lesson = playground
    ? lessons.find((item) => item.id === 'playground')
    : (lessons.find((item) => item.id === path[1]) ?? lessons[0]);
  const changingLesson = lesson !== currentLesson;
  if (changingLesson) showLesson(lesson);
  $('example-picker').hidden = $('example-description').hidden = !playground;
  $('open-playground').hidden = playground;
  const step = lesson.examples.includes(path[2]) ? path[2] : lesson.examples[0];
  const selected = playground && path[0] === 'playground' ? path[1] : step;
  const example =
    examples.find((item) => item.id === selected) ?? examples.find((item) => item.id === lesson.examples[0]);
  for (const anchor of $('lesson-examples').querySelectorAll('a')) {
    if (anchor.hash === `#lesson/${lesson.id}/${step}`) anchor.setAttribute('aria-current', 'step');
    else anchor.removeAttribute('aria-current');
  }
  showExample(example);
  document.querySelector('.sidebar').classList.remove('open');
  $('menu').setAttribute('aria-expanded', 'false');
  if (focus && (changingLesson || playground)) {
    $('main').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}

/** The viewport width stays independent of oversized scores, which scroll horizontally. */
function run() {
  if (!currentExample) return;
  clearTimeout(timer);
  lastSVG = '';
  pending = true;
  renderedCode = editor.getCode();
  $('save-svg').disabled = true;
  $('render-error').hidden = true;
  $('render-error').textContent = '';
  $('render-status').textContent = 'Rendering…';
  $('logs').textContent = '';
  $('inspection').textContent = 'No element selected.';
  $('frame-host').style.width = '';
  const width = Math.max(320, Math.round($('frame-host').clientWidth / 0.8));
  preview.run({
    code: renderedCode,
    params,
    width,
    height: 245,
    ink: '#263a32',
    font: $('font').value,
    inspect: true,
    bounds: $('bounds').checked,
    grid: false,
  });
}
/** Debounce live rendering only when the reader opts in. */
function schedule() {
  clearTimeout(timer);
  if ($('auto-run').checked) timer = setTimeout(run, 450);
}

/** Accept only messages validated by the shared Preview instance. */
function receive(message) {
  if (message.type === 'error') {
    pending = false;
    renderedCode = '';
    $('render-status').textContent = 'Render failed';
    $('render-error').textContent =
      `${message.name ?? 'Error'}${message.line ? ` · line ${message.line}` : ''}\n${message.message}`;
    $('render-error').hidden = false;
    lastSVG = '';
    $('save-svg').disabled = true;
  } else if (message.type === 'rendered') {
    pending = false;
    lastSVG = message.svg;
    $('save-svg').disabled = false;
    $('render-status').textContent = `Rendered · ${message.elements.length} elements · ${message.duration} ms`;
    $('logs').textContent = message.logs.join('\n') || 'No console output.';
    $('frame-host').style.width = `${message.width * 0.8}px`;
  } else if (message.type === 'inspect') {
    $('inspection').textContent = message.element ? JSON.stringify(message.element, null, 2) : 'No element selected.';
    // A pinned click may select exact source; hover and stale previews never move the cursor.
    if (message.pinned && !pending && editor.getCode() === renderedCode) {
      const range = findNotationRange(renderedCode, message.element?.source, Prism);
      if (range) editor.selectRange(range.start, range.end);
    }
  }
}

/** Downloads stay local and include the exact draft and parameter values. */
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = link('', url);
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** Embed the selected music/text faces so exports need no network. */
function fontCSS() {
  const family = $('font').value;
  return [family, family === 'Petaluma' ? 'Petaluma Script' : 'Academico']
    .map((name) => `@font-face{font-family:'${name}';src:url(data:font/otf;base64,${fonts[name]}) format('opentype');}`)
    .join('\n');
}
/** Keep an edited closing-script string from ending the export wrapper. */
function scriptSafe(text) {
  return text.replace(/<\/script/gi, '<\\/script');
}
/** Clipboard restrictions should leave file export available. */
async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied to clipboard.');
  } catch {
    toast('Clipboard unavailable. Use Save JS or select and copy the code.');
  }
}
$('save-svg').onclick = () => {
  if (!lastSVG) return;
  const documentSVG = new DOMParser().parseFromString(lastSVG, 'image/svg+xml');
  const style = documentSVG.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = fontCSS();
  documentSVG.documentElement.prepend(style);
  download(`${currentExample.id}.svg`, new XMLSerializer().serializeToString(documentSVG), 'image/svg+xml');
};
$('save-js').onclick = () =>
  download(
    `${currentExample.id}.js`,
    `// Supply VF, a #score container, and loaded fonts (see the VexFlow guide).\nconst width = 800, height = 245, ink = '#263a32';\nconst params = ${JSON.stringify(params, null, 2)};\n\n${editor.getCode()}\n`,
    'text/javascript'
  );
$('save-html').onclick = async () => {
  $('save-html').disabled = true;
  try {
    const library = await fetch(new URL('./runtime/vexflow.js', import.meta.url)).then((response) => {
      if (!response.ok) throw new Error('Library download failed');
      return response.text();
    });
    const font = $('font').value;
    const init = `const VF = VexFlow;\nVF.setFonts(${JSON.stringify(font)}, ${JSON.stringify(font === 'Petaluma' ? 'Petaluma Script' : 'Academico')});\nawait Promise.all([${JSON.stringify(font)}, ${JSON.stringify(font === 'Petaluma' ? 'Petaluma Script' : 'Academico')}].map(name => document.fonts.load('16px "' + name + '"')));\nconst width = 800, height = 245, ink = '#263a32';\nconst params = ${JSON.stringify(params)};\n${editor.getCode()}`;
    download(
      `${currentExample.id}.html`,
      `<!doctype html>\n<html lang="en"><meta charset="utf-8"><title>VexFlow example</title><style>${fontCSS()}body{background:white;color:#263a32}</style><div id="score"></div><script>${scriptSafe(library)}</script><script>(async () => {\n${scriptSafe(init)}\n})();</script></html>`,
      'text/html'
    );
    toast('Saved a standalone HTML page with VexFlow and fonts.');
  } catch (error) {
    toast(error.message);
  } finally {
    $('save-html').disabled = false;
  }
};
$('copy-code').onclick = () => copy(editor.getCode());
$('copy-link').onclick = () => copy(new URL(`#playground/${currentExample.id}`, location.href).href);
$('run').onclick = run;
$('reset').onclick = () => {
  delete drafts[currentExample.id];
  editor.setCode(currentExample.code);
  params = defaults(currentExample);
  preview.reset();
  renderControls();
  saveDraft();
  run();
};
$('auto-run').onchange = schedule;
$('font').onchange = run;
$('bounds').onchange = () => preview.post({ type: 'options', inspect: true, bounds: $('bounds').checked, grid: false });
// Worked examples in the article jump directly to their shared, keyboard-accessible preview.
$('lesson').addEventListener('click', (event) => {
  if (!event.target.closest('a[data-show-example]') || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return;
  $('example-title').focus({ preventScroll: true });
  $('lesson-examples').scrollIntoView({ block: 'start' });
});
$('search').oninput = navigation;
$('example-select').onchange = () => {
  location.hash = `playground/${$('example-select').value}`;
};
$('menu').onclick = () => {
  const open = document.querySelector('.sidebar').classList.toggle('open');
  $('menu').setAttribute('aria-expanded', String(open));
};
$('editor').addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    run();
  }
});
window.addEventListener('hashchange', () => route({ focus: true }));
for (const group of [...new Set(examples.map((example) => example.group))]) {
  const options = node('optgroup');
  options.label = group;
  for (const example of examples.filter((item) => item.group === group)) {
    const option = node('option', example.title);
    option.value = example.id;
    options.append(option);
  }
  $('example-select').append(options);
}
new ResizeObserver((entries) => {
  const width = Math.round(entries[0].contentRect.width);
  if (observedWidth !== undefined && width !== observedWidth) {
    clearTimeout(timer);
    timer = setTimeout(run, 200);
  }
  observedWidth = width;
}).observe(document.querySelector('.score-scroll'));
route();
