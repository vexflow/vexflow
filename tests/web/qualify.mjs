// Run the same musical and interaction contracts in the three browser engines. Artifacts stay under build/.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { arch, cpus, platform, release } from 'node:os';
import { chromium, firefox, webkit } from 'playwright';
import { guitarStudies } from './guitar.mjs';
import { adapterPilot } from './adapter.mjs';
import { makeInstrumentStudy } from '../engraving/instrument-studies.mjs';
import { navigationContracts, diagnosticsContracts } from './navigation.mjs';
import { benchmark } from './performance.mjs';

const output = 'build/m7';
await mkdir(output, { recursive: true });
const reference = process.env.VF_WEB_REFERENCE ?? 'build/engraving-main/build/cjs/vexflow-debug.js';
const current = 'build/cjs/vexflow-debug.js';
const reviewed = 'f1d3973fec27f6888b8b6eeb5626d3bdce946462';
const html = await readFile('demos/ui/score-reader.html', 'utf8');
const app = await readFile('demos/ui/score-reader.js', 'utf8');
const bundle = await readFile(current, 'utf8');
const face = await readFile('node_modules/@vexflow-fonts/academico/academico.otf');
const selfContained = html.replace(
  /<script src="[^"]+"><\/script>/g,
  (tag) =>
    '<script>' + (tag.includes('vexflow-debug') ? bundle : app).replace(/<\/script/gi, '<\\/script') + '</script>'
);
await writeFile(output + '/score-reader.html', selfContained);

const files = new Map([
  ['/reader', [html, 'text/html']],
  [
    '/empty',
    [
      '<!doctype html><meta charset="utf-8"><style>body{margin:0;background:white}svg{display:block}</style><div id="music"></div>',
      'text/html',
    ],
  ],
  ['/build/cjs/vexflow-debug.js', [bundle, 'text/javascript']],
  ['/score-reader.js', [app, 'text/javascript']],
]);
const digest = (buffer) => createHash('sha256').update(buffer).digest('hex');

/** Serve only the fixed fixture assets, without network, a CDN or a shared web server. */
async function contextFor(browser, options = {}) {
  const context = await browser.newContext({ viewport: { width: 980, height: 910 }, locale: 'en-US', ...options });
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    const asset = files.get(url.pathname);
    if (url.hostname === 'score.test' && asset) return route.fulfill({ body: asset[0], contentType: asset[1] });
    return route.abort();
  });
  return context;
}

async function ready(page) {
  await page.goto('http://score.test/reader');
  await page.waitForFunction(() => window.scoreReader?.snapshot || document.querySelector('#error')?.textContent);
  assert.equal(await page.locator('#error').textContent(), '');
}
const state = (page) =>
  page.evaluate(() => {
    const { index, width, height } = scoreReader.snapshot;
    return {
      labels: index.events,
      regions: index.regions,
      diagnostics: index.diagnostics,
      width,
      height,
      selected: document.querySelector('#events').value,
      options: document.querySelector('#events').options.length,
    };
  });

/** Read via actual native keyboard and pointer input, retain the selection through logical and CSS resizes. */
async function interaction(page, engine) {
  await ready(page);
  const list = page.getByRole('listbox', { name: 'Score events' });
  const initial = await state(page);
  assert.equal(initial.options, 24);
  assert.deepEqual(initial.diagnostics, []);
  assert.deepEqual(
    initial.labels.slice(0, 4).map((e) => [e.id, e.onset, e.duration]),
    [
      ['fl-1-1', '0/1', '1/4'],
      ['kit-1-1', '0/1', '1/4'],
      ['fl-1-2', '1/4', '1/4'],
      ['kit-1-2', '1/4', '1/4'],
    ]
  );
  assert.match(initial.labels[3].label, /rest/);
  assert.match(initial.labels[5].label, /Snare drum, Closed hi-hat/);
  assert.equal(initial.labels[5].source, 'kit/measure/1/event/3');
  const accessibility = await list.ariaSnapshot();
  assert.match(accessibility, /Measure 1, Flute, voice 1, C 5/);
  await list.focus();
  await page.keyboard.press('ArrowDown');
  assert.equal(await list.inputValue(), 'kit-1-1');
  await page.locator('#layout').selectOption('Narrow');
  const narrow = await state(page);
  assert.equal(narrow.selected, 'kit-1-1');
  assert.deepEqual(narrow.labels, initial.labels);
  assert.ok(narrow.regions.filter((r) => r.id === 'phrase').length > 1, 'A wrapped slur maps back to its authored ID');
  await page.locator('#layout').selectOption('Fit width');
  assert.deepEqual((await state(page)).regions, initial.regions);
  await page.locator('#backend').selectOption('Canvas');
  const canvas = await state(page);
  assert.equal(canvas.selected, 'kit-1-1');
  assert.deepEqual(canvas.labels, initial.labels);
  await page.locator('#frame').evaluate((el) => {
    el.style.transformOrigin = 'top left';
    el.style.transform = 'scale(.8)';
  });
  const point = await page.evaluate(() => {
    const { index, width, height } = scoreReader.snapshot;
    const r = index.regions.find((r) => r.id === 'kit-1-3');
    const frame = document.querySelector('#frame').getBoundingClientRect();
    return {
      x: frame.x + ((r.x + r.w / 2) * frame.width) / width,
      y: frame.y + ((r.y + r.h / 2) * frame.height) / height,
    };
  });
  await page.mouse.click(point.x, point.y);
  assert.equal(await list.inputValue(), 'kit-1-3');
  await list.press('ArrowDown');
  assert.equal(await list.inputValue(), 'fl-2-1');
  await page.locator('#frame').evaluate((el) => (el.style.transform = ''));
  await page.locator('#backend').selectOption('SVG');
  await list.focus();
  await page.screenshot({ path: output + '/' + engine + '-reader.png', fullPage: true });
  await writeFile(output + '/' + engine + '-reading.txt', accessibility);
  return { events: initial.options, narrowSlurFragments: narrow.regions.filter((r) => r.id === 'phrase').length };
}

/** Replay approved M6 builders against an independently built, pinned main revision in the same engine. */
async function engraving(context, engine) {
  const results = {};
  for (const [label, path] of [
    ['main', reference],
    ['branch', current],
  ]) {
    const page = await context.newPage();
    try {
      await page.goto('http://score.test/empty');
      await page.addScriptTag({ path });
      await page.evaluate(async () => {
        await Promise.all([...document.fonts].map((f) => f.load()));
      });
      const id = await page.evaluate(() => VexFlow.BUILD.ID);
      if (label === 'main') assert.equal(id, reviewed, 'Rebuild the independent reference at ' + reviewed);
      await page.addScriptTag({ content: 'window.makeStudy=' + makeInstrumentStudy });
      for (const [kind, height] of [
        ['kit', 305],
        ['guitar', 303],
        ['micro', 280],
        ['techniques', 307],
      ]) {
        const geometry = await page.evaluate(
          ({ kind, height }) => {
            const VF = VexFlow,
              target = document.querySelector('#music');
            target.replaceChildren();
            target.style.cssText = 'width:710px;background:white;color:black';
            const factory = new VF.Factory({
              renderer: { elementId: 'music', width: 710, height, backend: VF.Renderer.Backends.SVG },
            });
            const study = makeStudy(VF, factory, kind);
            return {
              notes: study.notes.map((n) => [n.getTicks().toString(), n.getAbsoluteX(), n.getYs()]),
              glyphs: target.querySelectorAll('svg path,svg text').length,
            };
          },
          { kind, height }
        );
        assert.ok(geometry.glyphs > 0);
        const pixels = await page
          .locator('#music')
          .screenshot({ path: output + '/' + engine + '-' + kind + '-' + label + '.png' });
        const capture = { geometry, image: digest(pixels) };
        if (label === 'main') results[kind] = capture;
        else
          assert.deepEqual(
            capture,
            results[kind],
            engine + ' ' + kind + ' changed from reviewed main; inspect the images before updating the reference'
          );
      }
    } finally {
      await page.close();
    }
  }
  return results;
}

async function mobile(browser, engine) {
  const context = await contextFor(browser, {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    ...(engine !== 'firefox' && { isMobile: true }),
  });
  try {
    const page = await context.newPage();
    await ready(page);
    await page.locator('#backend').selectOption('Canvas');
    const first = await state(page);
    assert.equal(await page.evaluate(() => document.querySelector('#surface canvas').width), first.width * 2);
    const r = first.regions.find((r) => r.id === 'fl-1-2');
    const rect = await page.locator('#frame').boundingBox();
    await page.touchscreen.tap(rect.x + r.x + r.w / 2, rect.y + r.y + r.h / 2);
    assert.equal(await page.locator('#events').inputValue(), 'fl-1-2');
    await page.screenshot({ path: output + '/' + engine + '-mobile.png' });
    await page.setViewportSize({ width: 620, height: 420 });
    await page.waitForFunction((w) => scoreReader.snapshot.width > w, first.width);
    assert.deepEqual((await state(page)).labels, first.labels);
    return { dpr: 2, portrait: first.width, landscape: (await state(page)).width };
  } finally {
    await context.close();
  }
}

/** Check the requested face, delayed readiness, a named load failure and bounded portable text support. */
async function fontsAndExport(page) {
  let unblock, requested;
  const started = new Promise((resolve) => {
    requested = resolve;
  });
  const wait = new Promise((resolve) => {
    unblock = resolve;
  });
  await page.route('**/delayed.otf', async (route) => {
    requested();
    await wait;
    await route.fulfill({ body: face, contentType: 'font/otf' });
  });
  const pending = page.evaluate(() => VexFlow.Font.load('Delayed Academico', '/delayed.otf').then((f) => f.status));
  await started;
  const loading = await page.evaluate(
    () => [...document.fonts].find((f) => f.family.includes('Delayed Academico')).status
  );
  unblock();
  assert.equal(await pending, 'loaded');
  assert.equal(loading, 'loading');
  await page.addScriptTag({ path: 'node_modules/opentype.js/dist/opentype.js' });
  const result = await page.evaluate(async (base64) => {
    let failure;
    try {
      await VexFlow.Font.load('Missing review face', '/absent.otf');
    } catch (e) {
      failure = { code: e.code, message: e.message };
    }
    const target = document.createElement('div');
    document.body.append(target);
    try {
      const ctx = new VexFlow.SVGContext(target);
      ctx.resize(300, 80);
      ctx.setFont('Delayed Academico', 16);
      ctx.fillText('Café', 10, 25);
      const font = opentype.parse(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer);
      const faces = [{ family: 'Delayed Academico', font }];
      const svg = ctx.toSVG(faces);
      const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
      const outlined = document.importNode(parsed.documentElement, true);
      target.append(outlined);
      const text = target.querySelector('text'),
        path = outlined.querySelector('path');
      const liveBox = text.getBBox(),
        ink = path.getBBox();
      const canvas = document.createElement('canvas').getContext('2d');
      const style = getComputedStyle(text);
      canvas.font = style.fontSize + ' ' + style.fontFamily;
      const actual = canvas.measureText(text.textContent);
      const composedWidth = ctx.measureText('Café').width,
        decomposedWidth = ctx.measureText('Cafe\u0301').width;
      ctx.fillText('Cafe\u0301', 10, 45);
      const preservesDecomposed = ctx.toSVG().includes('Cafe\u0301');
      ctx.clear();
      ctx.fillText('漢字', 10, 55);
      let missing;
      try {
        ctx.toSVG(faces);
      } catch (e) {
        missing = { code: e.code, message: e.message };
      }
      return {
        failure,
        missing,
        preservesDecomposed,
        plain: ctx.toSVG().includes('漢字'),
        liveWidth: liveBox.width,
        liveInk: actual.actualBoundingBoxLeft + actual.actualBoundingBoxRight,
        outlineWidth: ink.width,
        composedWidth,
        decomposedWidth,
        paths: outlined.querySelectorAll('path').length,
      };
    } finally {
      target.remove();
    }
  }, face.toString('base64'));
  assert.equal(result.failure.code, 'FontLoadFailed');
  assert.match(result.failure.message, /Could not load font "Missing review face"/);
  assert.equal(result.missing.code, 'MissingFont');
  assert.match(result.missing.message, /漢/);
  assert.equal(result.plain, true);
  assert.equal(result.paths, 1);
  assert.ok(
    Math.abs(result.liveInk - result.outlineWidth) < 3,
    'Latin ink vs portable outline: ' + JSON.stringify(result)
  );
  assert.equal(result.preservesDecomposed, true);
  assert.ok(result.decomposedWidth > 0 && result.composedWidth > 0);
  return result;
}

const engines = { chromium, firefox, webkit };
const requested = process.argv.slice(2);
for (const engine of requested.length ? requested : Object.keys(engines)) {
  const browser = await engines[engine].launch({ headless: true });
  const context = await contextFor(browser);
  const report = {
    engine,
    version: browser.version(),
    reference: reviewed,
    host: { platform: platform(), release: release(), arch: arch(), cpu: cpus()[0].model },
  };
  try {
    const page = await context.newPage();
    page.on('pageerror', (e) => console.error(engine, e.message));
    report.interaction = await interaction(page, engine);
    await navigationContracts(page);
    report.diagnostics = await diagnosticsContracts(page);
    report.fonts = await fontsAndExport(page);
    report.mobile = await mobile(browser, engine);
    report.engraving = await engraving(context, engine);
    report.guitar = await guitarStudies(context);
    report.adapter = await adapterPilot(page);
    if (engine === 'chromium') report.performance = await benchmark(page, context);
    console.log(engine, browser.version(), 'passed');
  } catch (error) {
    report.error = String(error.stack ?? error);
    console.error(engine, report.error);
    process.exitCode = 1;
  } finally {
    await writeFile(output + '/' + engine + '.json', JSON.stringify(report, null, 2));
    await browser.close();
  }
}
