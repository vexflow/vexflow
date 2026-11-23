// Collect original issue attachments, printed score pages and readable Git evidence for the offline report.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { git, repo } from './history.mjs';

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** A cold build downloads reviewed PNGs. Rebuilds use the verified local bytes, including offline. */
async function attachment(image, cache, staging) {
  const { asset, sha256 } = image;
  assert.match(asset, /^[a-f\d-]{36}$/);
  const file = asset + '.png';
  let bytes;
  try {
    bytes = await readFile(join(cache, file));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (!bytes || digest(bytes) !== sha256) {
    const response = await fetch('https://github.com/user-attachments/assets/' + asset);
    if (!response.ok) throw Error('Issue attachment ' + asset + ': HTTP ' + response.status);
    bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(digest(bytes), sha256, 'Issue screenshot changed: ' + asset);
    await writeFile(join(cache, file), bytes);
  }
  assert.ok(bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')));
  const path = 'assets/issue-' + file;
  await writeFile(join(staging, path), bytes);
  return { path, size: [bytes.readUInt32BE(16), bytes.readUInt32BE(20)] };
}

/** Keep before and after pictures paired only where the original issue identifies both sides. */
export async function collectIssueEvidence(staging, work) {
  const records = JSON.parse(await readFile(new URL('./issue-evidence.json', import.meta.url), 'utf8'));
  const cache = join(work, 'issue-images');
  await mkdir(cache, { recursive: true });
  const figures = [];
  for (const { topic, source, images } of records) {
    const issue = /^https:\/\/github\.com\/vexflow\/vexflow\/issues\/(\d+)#issuecomment-\d+$/.exec(source)?.[1];
    assert.ok(issue && [1, 2].includes(images.length), 'Invalid issue evidence: ' + source);
    const paths = await Promise.all(images.map((image) => attachment(image, cache, staging)));
    const paired = images.length === 2;
    figures.push({
      id: 'issue-' + issue + '-' + images.at(-1).asset,
      topic,
      name: topic,
      module: 'Issue #' + issue,
      status: 'Issue evidence',
      source,
      description: paired ? topic : images[0].caption,
      ...(paired && {
        left: paths[0].path,
        leftSize: paths[0].size,
        leftLabel: 'Before',
        leftCaption: images[0].caption,
      }),
      right: paths.at(-1).path,
      rightSize: paths.at(-1).size,
      rightLabel: paired ? 'After' : 'Issue screenshot',
      rightCaption: images.at(-1).caption,
    });
  }
  return figures;
}

/** Use each PDF edition's actual print renderer and capture every complete Letter page. */
export async function printFigures(browser, staging, head) {
  const figures = [];
  for (const [edition, title, pages] of [
    ['minuet', 'Minuet in G major', 2],
    ['fugue', 'Fugue No. 6 in D minor', 2],
    ['ballade', 'Ballade No. 3', 1],
  ]) {
    const page = await browser.newPage();
    try {
      await page.setContent('<style>body{margin:0;background:white}main>svg{display:block}</style><main></main>');
      await page.addScriptTag({ path: 'build/cjs/vexflow-debug.js' });
      if (edition !== 'minuet') await page.addScriptTag({ path: 'tests/scores/' + edition + '.js' });
      await page.addScriptTag({ path: 'demos/pdf/' + edition + '.js' });
      await page.evaluate(async (name) => {
        await Promise.all([...document.fonts].map((f) => f.load()));
        window['render' + name[0].toUpperCase() + name.slice(1)](VexFlow, document.querySelector('main'));
        await document.fonts.ready;
      }, edition);
      const scores = page.locator('main > svg');
      assert.equal(await scores.count(), pages, title);
      for (let n = 1; n <= pages; n++) {
        const id = 'print-' + edition + '-' + n,
          right = 'assets/' + id + '.png';
        await scores.nth(n - 1).screenshot({ path: join(staging, right) });
        figures.push({
          id,
          name: title + ' · page ' + n,
          module: 'Print editions',
          status: 'Print page',
          right,
          rightLabel: 'US Letter',
          source: repo + '/blob/' + head + '/demos/pdf/' + edition + '.js',
        });
      }
    } finally {
      await page.close();
    }
  }
  return figures;
}

// For changes without a visible score, select the actual implementation, tests, or design record.
const references = {
  'SVG attribute filtering': ['src/svgcontext.ts', 'function isUnsafeAttributeName'],
  'Modules and older Safari': ['src/util.ts', 'structured-clone-es'],
  'Registry keys': ['src/registry.ts', 'this.id = Object.create'],
  'Bounded notation parsing': ['src/fraction.ts', 'Invalid numbers'],
  'Release and font tools': ['docs/dependencies.md', 'Security regression checks'],
  'Dependency advisories': ['docs/dependencies.md', 'Security overrides'],
  'Locked tools and audit policy': ['SECURITY.md', 'Known Issues'],
  'Persistence design': ['docs/vf6/requirements/score-persistence.md', '## '],
  'Regression comparison': ['docs/vf6/m0.md', '5.2.0'],
  'Browser and importer qualification': ['docs/vf6/m7.md', 'OSMD'],
  'Performance studies': ['docs/benchmarks.md', '| Study'],
  'Text measurement and rendering work': ['src/textmetricscache.ts', 'class TextMetricsCache'],
  'Demo migration': ['demos/README.md', 'Build the library'],
  'Headless and package workflows': ['docs/jsdom.md', '## Application setup'],
  'Build and release instructions': ['docs/build.md', '### Tag and publish'],
  'VF6 acceptance baseline': ['docs/vf6/requirements/README.md', '## '],
};

/** Typeset a real source excerpt. Insert repository contents as text, never as HTML. */
async function captureExcerpt(page, staging, id, title, path, lines, label) {
  await page.evaluate(
    ({ title, path, lines, label }) => {
      document.querySelector('small').textContent = label;
      document.querySelector('h1').textContent = title;
      document.querySelector('p').textContent = path;
      document.querySelector('pre').replaceChildren(
        ...lines.map((text) => {
          const span = document.createElement('span');
          span.textContent = text.length > 160 ? text.slice(0, 157) + '…' : text;
          span.className = text.startsWith('+') ? 'add' : text.startsWith('-') ? 'del' : '';
          return span;
        })
      );
    },
    { title, path, lines, label }
  );
  const right = 'assets/' + id + '.png';
  await page.locator('main').screenshot({ path: join(staging, right) });
  return right;
}

/** Select a first-parent hunk from handwritten source, or the changed paths for a binary-only commit. */
function commitExcerpt(c) {
  const textPaths = c.paths.filter(
    (p) =>
      /\.(ts|js|mjs|md|ya?ml|css|html|json)$/.test(p) &&
      !/^(build\/|src\/fonts\/)|package-lock\.json$|\.min\.js$/.test(p)
  );
  const path = textPaths.find((p) => p.startsWith('src/')) ?? textPaths[0];
  let lines = [];
  if (path) {
    const diff = git('diff', '--no-ext-diff', '--no-textconv', '--unified=2', c.hash + '^1', c.hash, '--', path).split(
      '\n'
    );
    const start = diff.findIndex((l) => l.startsWith('@@'));
    if (start >= 0) lines = diff.slice(start, start + 16);
  }
  const label = lines.length ? 'Git diff excerpt' : 'Git file inventory';
  if (!lines.length) lines = c.paths.filter(Boolean).slice(0, 16);
  return { path: label === 'Git diff excerpt' ? path : 'Changed paths', lines, label };
}

/** Keep the issue-independent technical evidence available in the downloaded report. */
export async function sourceFigures(browser, staging, head, commits) {
  const page = await browser.newPage({ viewport: { width: 900, height: 800 } });
  const figures = [];
  try {
    await page.setContent(`<style>
      * { box-sizing: border-box }
      body { margin: 0; background: white; color: #24382d; font: 16px system-ui }
      main { padding: 22px 26px }
      h1 { font-size: 21px; margin: 5px 0 }
      p { margin: 0 0 12px }
      small { color: #51655a }
      pre { font: 14px/1.45 monospace; white-space: pre-wrap; overflow-wrap: anywhere; margin: 0; background: #f5f6f2 }
      pre span { display: block; padding: 0 7px; min-height: 1.45em }
      .add { background: #e0f2e3 }
      .del { background: #fae7e4 }
    </style><main><small></small><h1></h1><p></p><pre></pre></main>`);
    for (const [topic, [path, needle]] of Object.entries(references)) {
      const lines = git('show', head + ':' + path).split('\n');
      const start = lines.findIndex((l) => l.toLowerCase().includes(needle.toLowerCase()));
      assert.ok(start >= 0, 'Missing source excerpt: ' + topic);
      const id = 'reference-' + digest(topic).slice(0, 12);
      const right = await captureExcerpt(
        page,
        staging,
        id,
        topic,
        path,
        lines.slice(start, start + 15),
        'Source at ' + head.slice(0, 8) + ' · line ' + (start + 1)
      );
      figures.push({
        id,
        topic,
        name: topic,
        module: 'Source and documentation',
        status: 'Source excerpt',
        right,
        rightLabel: 'Source excerpt',
        source: repo + '/blob/' + head + '/' + path + '#L' + (start + 1),
      });
    }
    for (const c of commits) {
      const id = 'commit-' + c.hash;
      const { path, lines, label } = commitExcerpt(c);
      const right = await captureExcerpt(
        page,
        staging,
        id,
        c.subject,
        path,
        lines,
        label + ' · ' + c.date + ' · ' + c.hash.slice(0, 8)
      );
      figures.push({
        id,
        name: c.subject,
        module: 'Commit history',
        status: label,
        right,
        rightLabel: label,
        source: repo + '/commit/' + c.hash,
      });
      c.figure = id;
    }
  } finally {
    await page.close();
  }
  return figures;
}
