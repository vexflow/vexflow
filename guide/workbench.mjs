// Independent guide workbenches share the downloaded library and save drafts by example ID.
import { createEditor, highlightCode } from './runtime/editor.mjs';
import { Preview, librarySource } from './runtime/preview.mjs';
import { findNotationRange } from './runtime/source.mjs';
const draftsKey = 'vexflow-guide-drafts-v1';
let fontData;
let toastTimer;
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
  document.getElementById('toast').textContent = text;
  document.getElementById('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    document.getElementById('toast').hidden = true;
  }, 3500);
}
/** Derive initial control values from catalog metadata. */
function defaults(example) {
  return Object.fromEntries(example.controls.map((control) => [control.key, control.value]));
}

/** Downloads stay local and include the exact draft and parameter values. */
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = link('', url);
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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

/** Clone the score-and-source panel and scope every control and label to this instance. */
export function mountExample(host, example, { sourceRoot, prefix = '', playground = false }) {
  const panel = document.getElementById('example-template').content.firstElementChild.cloneNode(true);
  const parts = new Map();
  for (const element of panel.querySelectorAll('[id]')) {
    const key = element.id;
    parts.set(key, element);
    element.dataset.part = key;
    element.id = prefix + key;
  }
  for (const label of panel.querySelectorAll('label[for]')) label.htmlFor = prefix + label.htmlFor;
  const $ = (key) => parts.get(key);
  host.append(panel);
  /** Keep the editor and sandbox warm when moving between chapters in supporting browsers. */
  function setMode(playground) {
    panel.classList.toggle('inline-example', !playground);
    $('open-playground').hidden = playground;
    $('auto-run').checked = !playground;
    panel.querySelector('.tools').open = playground;
    panel.querySelector('.export').open = playground;
  }
  setMode(playground);
  let currentExample, params, lastSVG, renderedCode, pending, timer, observedWidth;
  const preview = new Preview($('frame-host'), receive);
  const editor = createEditor($('editor'), () => {
    saveDraft();
    schedule();
  });
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
    $('draft-state').textContent = original
      ? 'Original example'
      : saved
        ? 'Draft saved on this device'
        : 'Unsaved draft';
  }

  /** Build parameter controls from the example metadata. */
  function renderControls() {
    $('controls').replaceChildren();
    for (const control of currentExample.controls) {
      const wrap = node('div', undefined, 'control');
      const label = node('label', control.label);
      label.htmlFor = `${prefix}control-${control.key}`;
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
    panel.setAttribute('aria-labelledby', $('example-title').id);
    $('editor').setAttribute('aria-label', example.title + ' JavaScript');
    panel.dataset.exampleId = example.id;
    $('open-playground').href = `#playground/${example.id}`;
    $('api-links').replaceChildren();
    for (const api of example.api) $('api-links').append(link(api, sourceRoot + example.apiFiles[api]));
    renderControls();
    saveDraft();
    run();
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

  /** Embed the selected music/text faces so exports need no network. */
  async function fontCSS(family) {
    fontData ??= fetch(new URL('./runtime/font-data.json', import.meta.url))
      .then((response) => response.json())
      .catch((error) => {
        fontData = undefined;
        throw error;
      });
    const fonts = await fontData;
    return [family, family === 'Petaluma' ? 'Petaluma Script' : 'Academico']
      .map(
        (name) => `@font-face{font-family:'${name}';src:url(data:font/otf;base64,${fonts[name]}) format('opentype');}`
      )
      .join('\n');
  }
  $('save-svg').onclick = async () => {
    if (!lastSVG) return;
    const name = currentExample.id;
    const family = $('font').value;
    try {
      const documentSVG = new DOMParser().parseFromString(lastSVG, 'image/svg+xml');
      const style = documentSVG.createElementNS('http://www.w3.org/2000/svg', 'style');
      style.textContent = await fontCSS(family);
      documentSVG.documentElement.prepend(style);
      download(`${name}.svg`, new XMLSerializer().serializeToString(documentSVG), 'image/svg+xml');
    } catch (error) {
      toast(error.message);
    }
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
      const name = currentExample.id;
      const font = $('font').value;
      const init = `const VF = VexFlow;\nVF.setFonts(${JSON.stringify(font)}, ${JSON.stringify(font === 'Petaluma' ? 'Petaluma Script' : 'Academico')});\nawait Promise.all([${JSON.stringify(font)}, ${JSON.stringify(font === 'Petaluma' ? 'Petaluma Script' : 'Academico')}].map(name => document.fonts.load('16px "' + name + '"')));\nconst width = 800, height = 245, ink = '#263a32';\nconst params = ${JSON.stringify(params)};\n${editor.getCode()}`;
      const [library, css] = await Promise.all([librarySource(), fontCSS(font)]);
      download(
        `${name}.html`,
        `<!doctype html>\n<html lang="en"><meta charset="utf-8"><title>VexFlow example</title><style>${css}body{background:white;color:#263a32}</style><div id="score"></div><script>${scriptSafe(library)}</script><script>(async () => {\n${scriptSafe(init)}\n})();</script></html>`,
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
  $('bounds').onchange = () =>
    preview.post({ type: 'options', inspect: true, bounds: $('bounds').checked, grid: false });
  $('editor').addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      run();
    }
  });
  const observer = new ResizeObserver((entries) => {
    const width = Math.round(entries[0].contentRect.width);
    if (observedWidth !== undefined && width !== observedWidth) {
      clearTimeout(timer);
      timer = setTimeout(run, 200);
    }
    observedWidth = width;
  });
  observer.observe(panel.querySelector('.score-scroll'));

  showExample(example);
  return {
    panel,
    setMode,
    showExample,
    dispose() {
      clearTimeout(timer);
      observer.disconnect();
      preview.dispose();
      editor.dispose();
      panel.remove();
    },
  };
}
