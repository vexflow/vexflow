// Run the M0 manifest against two VF5 builds and publish a local engraving review report.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import puppeteer from 'puppeteer';
import { analyzeLayout } from './render-metrics.mjs';
import { registerStudies } from '../tests/engraving/studies.mjs';
import { compareDirectories } from './visual-regression.mjs';

const release = process.argv[2];
if (!release) throw new Error('Pass the released vexflow-debug-with-tests.js bundle as the first argument.');
const current = 'build/cjs/vexflow-debug-with-tests.js';
const manifest = JSON.parse(await readFile('tests/engraving/manifest.json', 'utf8'));
const cases = manifest.groups.flatMap(({ module, gaps, review, cases }) =>
  Object.entries(cases).map(([id, name]) => ({ id, name, module, gaps, review }))
);
assert.equal(new Set(cases.map((c) => c.id)).size, cases.length);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
await mkdir('build/engraving', { recursive: true });
const output = await mkdtemp('build/engraving/run-');
const browser = await puppeteer.launch({
  headless: true,
  args: ['--disable-gpu', ...(process.env.CI ? ['--no-sandbox'] : [])],
});

/** Select the first SVG registration (Bravura) for each exact module/test pair. Keep QUnit assertions live. */
function selectCases(cases) {
  const qunitModule = QUnit.module;
  const qunitTest = QUnit.test;
  const selected = new Set();
  let module;
  QUnit.module = (name, ...rest) => {
    module = name;
    return qunitModule(name, ...rest);
  };
  QUnit.test = (name, callback) => {
    const entry = cases.find((c) => c.module === module && c.name === name);
    if (!entry || selected.has(entry.id)) return;
    selected.add(entry.id);
    qunitTest(name, callback);
  };
  VexFlow.Test.RUN_CANVAS_TESTS = false;
  VexFlow.Test.run();
}

/** Read actual SVG glyph geometry in document order. Element IDs vary between builds. */
function measure(element) {
  const title = element.previousElementSibling.id;
  if (!title.endsWith('.Bravura')) throw new Error('Unexpected font: ' + title);
  const boxes = [...element.querySelectorAll('svg path, svg text, svg rect, svg line, svg polygon')].map((shape) => {
    const { x, y, width, height } = shape.getBBox();
    const matrix = shape.getCTM();
    return [shape.tagName, x, y, width, height, matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f];
  });
  if (!boxes.length || boxes.some((box) => !box.slice(1).every(Number.isFinite))) {
    throw new Error('Missing or nonfinite geometry for ' + title);
  }
  return { boxes, study: JSON.parse(element.dataset.measurement ?? 'null') };
}

/** A fresh page per pass isolates global metrics, font load, registry and QUnit state. */
async function capture(label, bundle) {
  const directory = join(output, label);
  await mkdir(directory);
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1500, height: 900, deviceScaleFactor: 1 });
    await page.setContent(
      '<style>body{margin:0;background:white}.vex-tabdiv{width:max-content;background:white}svg{display:block}</style><div id="qunit-tests"></div>'
    );
    await page.evaluate(() => {
      window.QUnit = { config: { autostart: false, reorder: false } };
    });
    await page.addScriptTag({ path: resolve('tests/qunit/qunit.js') });
    await page.addScriptTag({ path: resolve(bundle) });
    await page.evaluate(async () => {
      await Promise.all([...document.fonts].map((face) => face.load()));
      for (const family of ['Bravura', 'Academico']) {
        if (![...document.fonts].some((face) => face.family.includes(family) && face.status === 'loaded')) {
          throw new Error('Missing loaded face ' + family);
        }
      }
    });
    await page.evaluate(selectCases, cases);
    await page.evaluate(registerStudies);
    const results = await page.evaluate(
      () =>
        new Promise((done) => {
          const results = [];
          QUnit.on('testEnd', (test) => {
            results.push({
              name: test.name,
              module: test.suiteName,
              status: test.status,
              assertions: test.assertions.length,
              errors: test.errors.map((error) => error.message),
            });
          });
          QUnit.on('runEnd', () => done(results));
          QUnit.start();
        })
    );
    const failures = results.filter((r) => r.status !== 'passed');
    assert.deepEqual(failures, [], 'QUnit failures: ' + JSON.stringify(failures));
    const records = {};
    for (const { id, module, name } of cases) {
      const result = results.find((test) => test.module === module && test.name === name);
      assert.equal(result?.status, 'passed', id + ' ' + JSON.stringify(result));
      const sanitize = (value) => value.replace(/[^a-zA-Z0-9]/g, '_');
      const title = 'svg_' + sanitize(module) + '.' + sanitize(name) + '.Bravura';
      const element = await page.$('[id="' + title + '"] + .vex-tabdiv');
      assert.ok(element, 'Missing SVG case ' + id);
      // Capture each example at the same integer origin, independently of gallery scroll and raster tiles.
      await element.evaluate((el) => {
        document.getElementById('qunit-tests').style.display = 'none';
        document.body.append(el.parentElement);
        el.previousElementSibling.style.display = 'none';
      });
      const { boxes, study } = await element.evaluate(measure);
      if (study?.lyrics) checkTextControls(study.lyrics);
      records[id] = {
        assertions: result.assertions,
        shapes: boxes.length,
        geometry: hash(JSON.stringify(boxes)),
        study,
      };
      await element.screenshot({ path: join(directory, id + '.png') });
      await element.evaluate((el) => el.parentElement.remove());
    }
    console.log(label, Object.keys(records).length, 'examples');
    return { bundleSHA256: hash(await readFile(bundle)), records };
  } finally {
    await page.close();
  }
}

// Verify the same detector on measured text, then on deliberately colliding and clipped copies.
function checkTextControls(lyrics) {
  const viewport = { width: 360, height: 160 };
  const [first, second] = lyrics;
  assert.deepEqual(analyzeLayout(lyrics, viewport), { invalid: [], overflow: [], collisions: [] });
  assert.equal(analyzeLayout([first, { ...second, x: first.x }], viewport).collisions.length, 1);
  assert.equal(analyzeLayout([{ ...first, x: -5 }], viewport).overflow[0].id, first.id);
}

/** Link all samples, including unchanged images awaiting a musical judgment. */
function reviewPage(records) {
  const escape = (s) =>
    s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const flagged = Object.keys(manifest.outcomes)
    .map((id) => `<a href="#${id}">${id}</a>`)
    .join(' · ');
  const cards = cases.map(
    ({ id, module, name, review, gaps }) =>
      `<article id="${id}"><h2>${id} · ${escape(module)} · ${escape(name)}</h2><p>${gaps.join(', ')} · Engraving review: ${escape(manifest.reviews[id] ?? manifest.defaultReview)}</p><p>${escape(manifest.outcomes[id] ?? '')} ${escape(records[id].study?.quality ?? '')}</p><p>${escape(review)}</p><a href="current/${id}.png"><img loading="lazy" src="current/${id}.png" alt="${id}"></a></article>`
  );
  return `<!doctype html><meta charset="utf-8"><title>M0 engraving review</title><style>body{font:16px system-ui;margin:2rem;background:white}article{border-top:1px solid #aaa;padding:1rem 0}img{max-width:100%;height:auto}h2{font-size:1.15rem}</style><h1>M0 engraving review</h1><p>Bravura and Academico · SVG · ${cases.length} examples. Cite the case ID and the mark or beat that needs attention.</p><p>Start with ${flagged}.</p><a href="release-diff/index.html">Release comparison</a> · <a href="repeat-diff/index.html">Repeat comparison</a> · <a href="results.json">Measurements</a>${cards.join('')}`;
}

try {
  const baseline = await capture('release', release);
  const checkout = await capture('current', current);
  const repeat = await capture('repeat', current);
  const releaseDiff = await compareDirectories(
    join(output, 'release'),
    join(output, 'current'),
    join(output, 'release-diff')
  );
  const repeatDiff = await compareDirectories(
    join(output, 'current'),
    join(output, 'repeat'),
    join(output, 'repeat-diff')
  );
  const geometryChanges = cases
    .filter(({ id }) => checkout.records[id].geometry !== baseline.records[id].geometry)
    .map(({ id }) => id);
  await writeFile(
    join(output, 'results.json'),
    JSON.stringify(
      { chromium: await browser.version(), baseline, checkout, repeat, releaseDiff, repeatDiff, geometryChanges },
      null,
      2
    )
  );
  await writeFile(join(output, 'index.html'), reviewPage(checkout.records));
  console.log(output, { releaseDiff, repeatDiff, geometryChanges });
  assert.deepEqual(checkout, repeat, 'Repeat geometry or assertions changed');
  assert.equal(repeatDiff.failed, 0, 'Repeat images differ');
} finally {
  await browser.close();
}
