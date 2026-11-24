// Collect original issue attachments, printed score pages for the offline report.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { repo } from './history.mjs';

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
