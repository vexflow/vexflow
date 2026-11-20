// Instrument the compiled library in memory and run the repository's full browser QUnit suite.
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import istanbul from 'istanbul-lib-instrument';
import puppeteer from 'puppeteer';

const origin = 'http://vexflow.test';
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.otf': 'font/otf',
  '.webp': 'image/webp',
};

/** Include zero-hit modules. Istanbul defines a covered line by its highest statement hit count. */
export function summarizeFile(file, baseline, hits = baseline) {
  const lines = new Map();
  for (const [id, statement] of Object.entries(baseline.statementMap)) {
    const n = statement.start.line;
    lines.set(n, Math.max(lines.get(n) ?? 0, hits.s[id]));
  }
  function metric(values) {
    return { hit: values.filter((n) => n > 0).length, total: values.length };
  }
  return {
    file,
    lines: metric([...lines.values()]),
    statements: metric(Object.values(hits.s)),
    functions: metric(Object.values(hits.f)),
    branches: metric(Object.values(hits.b).flat()),
  };
}

/** Seed the denominator from every built module, including modules the tests never import. */
async function instrumentModules(checkout, files) {
  const scripts = new Map(),
    baselines = new Map();
  const instrumenter = istanbul.createInstrumenter({ esModules: true, compact: true, produceSourceMap: false });
  for (const file of files.filter((f) => f.startsWith('src/') && !f.endsWith('.d.ts'))) {
    const path = '/build/esm/' + file.replace(/\.ts$/, '.js');
    const code = await readFile(join(checkout, path), 'utf8');
    scripts.set(path, instrumenter.instrumentSync(code, file));
    baselines.set(file, instrumenter.lastFileCoverage());
  }
  return { scripts, baselines };
}

/** Adapt the regular ESM gallery runner at request time. The committed test files stay intact. */
function runnerAsset(path, body) {
  if (path === '/tests/all.html') {
    // The published ESM dependency uses a bare specifier. A browser needs its local import map.
    // The grace-note test imports ../src, emitted by this build as ../src.js.
    const importMap = {
      'structured-clone-es': '/node_modules/structured-clone-es/dist/index.mjs',
      '/build/esm/src.js': '/build/esm/src/index.js',
    };
    body = body
      .toString()
      .replace('<head>', `<head><script type="importmap">${JSON.stringify({ imports: importMap })}</script>`);
  }
  if (path === '/tests/qunit/qunit.js') {
    body =
      body.toString() +
      `\nQUnit.on('testEnd', t => { if(t.status==='failed') console.error(t.moduleName,t.name,t.errors.map(e=>e.message)); });
QUnit.on('runEnd', r => { window.reportQUnitFinished(r.testCounts); });`;
  }
  return body;
}

/** Supply a private browser origin with local ESM, fonts and QUnit; no listening server is needed. */
async function serveAssets(page, checkout, scripts) {
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    const url = new URL(request.url());
    if (url.protocol === 'data:' || url.protocol === 'blob:') return request.continue();
    if (url.origin === origin && url.pathname === '/favicon.ico') return request.respond({ status: 204 });
    const path = url.pathname;
    if (
      url.origin !== origin ||
      (path !== '/tools/site-theme.css' &&
        !/^\/(?:tests\/|build\/esm\/|node_modules\/(?:@vexflow-fonts\/|structured-clone-es\/))/.test(path))
    )
      return request.abort();
    try {
      const bytes = scripts.get(path) ?? (await readFile(join(checkout, path)));
      await request.respond({
        status: 200,
        contentType: mime[extname(path)] ?? 'application/octet-stream',
        body: runnerAsset(path, bytes),
      });
    } catch (err) {
      console.error(path, err.message);
      if (!request.isInterceptResolutionHandled()) await request.abort();
    }
  });
}

/** Abort immediately on loader or test-runner errors, and wait for QUnit's runEnd event on success. */
async function runSuite(page) {
  const complete = new Promise((resolve, reject) => {
    page.once('pageerror', reject);
    // Register before navigation so failures during module loading are reported promptly.
    page.on('requestfailed', (req) => reject(Error('Failed test asset: ' + req.url())));
    page
      .exposeFunction('reportQUnitFinished', resolve)
      .then(() => page.goto(origin + '/tests/all.html?esm=true', { waitUntil: 'domcontentloaded', timeout: 120000 }))
      .catch(reject);
  });
  let timer;
  try {
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(Error('QUnit did not finish in four minutes.')), 240000);
    });
    const tests = await Promise.race([complete, timeout]);
    if (tests.failed || !tests.passed) throw Error('Browser coverage failed: ' + JSON.stringify(tests));
    const hits = await page.evaluate(() =>
      Object.fromEntries(Object.entries(window.__coverage__).map(([file, { s, f, b }]) => [file, { s, f, b }]))
    );
    return { tests, hits };
  } finally {
    clearTimeout(timer);
  }
}

/** Aggregate counts before calculating percentages so large and small modules are weighted correctly. */
export async function browserCoverage(checkout, files) {
  const { scripts, baselines } = await instrumentModules(checkout, files);
  const browser = await puppeteer.launch({ headless: true, args: process.env.CI ? ['--no-sandbox'] : [] });
  try {
    const page = await browser.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.error(msg.text());
    });
    await serveAssets(page, checkout, scripts);
    const { tests, hits } = await runSuite(page);
    const rows = [...baselines].map(([file, base]) => summarizeFile(file, base, hits[file]));
    const total = {};
    for (const key of ['lines', 'statements', 'functions', 'branches']) {
      total[key] = rows.reduce((sum, row) => ({ hit: sum.hit + row[key].hit, total: sum.total + row[key].total }), {
        hit: 0,
        total: 0,
      });
    }
    if (!total.statements.hit) throw Error('Browser suite returned no library coverage.');
    return { tests, total, files: rows };
  } finally {
    await browser.close();
  }
}
