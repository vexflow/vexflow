// Exercise report publication across two revisions and a failed download verification, using a local bucket.
import { memoryStore } from '../site-storage.fixture.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { publishReport } from './upload.mjs';

test('upload caches immutable assets, verifies stable downloads and switches the index last', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'vexflow-report-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, 'report');
  const bucket = join(root, 'bucket');
  await mkdir(join(source, 'assets'), { recursive: true });
  await mkdir(bucket);
  const figure = { left: 'assets/before.png', right: 'assets/after.png' };
  const data = JSON.stringify({ figures: [figure] });
  const html = `<img src="${figure.left}"><script type="application/json" id="report-data">${data}</script>`;
  await writeFile(join(source, 'index.html'), html);
  await writeFile(join(source, 'changes.json'), data);
  await writeFile(join(source, 'render-inventory.json'), '{}');
  for (const asset of ['report.css', 'app.js', 'before.png', 'after.png']) {
    await writeFile(join(source, 'assets', asset), asset);
  }
  const log = join(root, 'calls');
  const command = join(root, 'gcloud.cjs');
  const store = memoryStore('gs://vexflow.com/reports/ai2026/');
  store.bytes = (page) => readFileSync(join(bucket, page));
  await writeFile(
    command,
    `#!${process.execPath}
const fs = require('node:fs');
const [service, op, source, target, ...flags] = process.argv.slice(2);
const local = (url) => url.replace('gs://vexflow.com/reports/ai2026/', ${JSON.stringify(bucket + '/')});
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify({ op, source, target, flags }) + '\\n');
if (op === 'rsync') fs.cpSync(source, local(target), { recursive: true });
if (op === 'cp') fs.copyFileSync(source, local(target));
if (op === 'cat') process.stdout.write(fs.existsSync(${JSON.stringify(join(root, 'corrupt'))}) ? 'corrupt' : fs.readFileSync(local(source)));
`,
    { mode: 0o755 }
  );

  await publishReport(source, { command, dryRun: true });
  await assert.rejects(readFile(log), { code: 'ENOENT' });
  await publishReport(source, { command, store });
  const calls = (await readFile(log, 'utf8')).trim().split('\n').map(JSON.parse);
  assert.deepEqual(
    calls.map((c) => c.op),
    ['rsync', 'cp', 'cat', 'cp', 'cat', 'cp', 'cat']
  );
  assert.ok(calls[0].flags.includes('--cache-control=public,max-age=31536000,immutable'));
  const pages = calls.filter((c) => c.op === 'cp');
  assert.deepEqual(
    pages.map((c) => c.target.split('/').pop()),
    ['changes.json', 'render-inventory.json', 'index.html']
  );
  for (const page of pages) {
    assert.ok(page.flags.includes('--cache-control=public,max-age=60,must-revalidate'));
    assert.ok(
      page.flags.includes('--content-type=' + (page.target.endsWith('.html') ? 'text/html' : 'application/json'))
    );
  }
  const readGallery = async () => JSON.parse(await readFile(join(bucket, 'changes.json'))).figures[0];
  const first = await readGallery();
  assert.match(first.left, /^\.\/assets\/[a-f0-9]{64}\/before\.png$/);
  const deployed = await readFile(join(bucket, 'index.html'), 'utf8');
  assert.ok(deployed.includes(`src="${first.left}"`));
  assert.ok(deployed.includes(JSON.stringify(first)));
  assert.equal(await readFile(join(source, 'index.html'), 'utf8'), html);

  // A repeated publication compares immutable checksums and leaves all stable generations untouched.
  await publishReport(source, { command, store });
  const repeat = (await readFile(log, 'utf8')).trim().split('\n').map(JSON.parse).slice(calls.length);
  assert.deepEqual(
    repeat.map((call) => call.op),
    ['rsync']
  );
  assert.ok(repeat[0].flags.includes('--checksums-only'));

  await writeFile(join(source, 'assets/after.png'), 'revised');
  await writeFile(join(root, 'corrupt'), '');
  await assert.rejects(publishReport(source, { command, store }), /Uploaded file differs/);
  assert.equal(await readFile(join(bucket, 'index.html'), 'utf8'), deployed);
  await rm(join(root, 'corrupt'));
  await publishReport(source, { command, store });
  const second = await readGallery();
  assert.notEqual(first.right, second.right);
  assert.equal(first.left, second.left);
  assert.equal(await readFile(join(bucket, first.right), 'utf8'), 'after.png');
  assert.equal(await readFile(join(bucket, second.right), 'utf8'), 'revised');
});
