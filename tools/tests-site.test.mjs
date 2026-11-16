// Verify the deployed test gallery loads only its bundled assets and publishes with the shared cache policy.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import test from 'node:test';

import puppeteer from 'puppeteer';

import { validate } from './static-site-upload.mjs';
import { build, output, upload } from './tests-site.mjs';

await build();

test('standalone gallery runs with local fonts/scripts and preserves QUnit filtering', async () => {
  const types = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.woff2': 'font/woff2',
    '.otf': 'font/otf',
  };
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (!path.startsWith('/tests/')) throw new Error('Outside mount');
      const file = resolve(output, path.slice('/tests/'.length) || 'index.html');
      if (!file.startsWith(output + sep)) throw new Error('Outside site');
      res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
    });
    const page = await browser.newPage();
    const failures = [],
      requests = [],
      errors = [];
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      if (url.startsWith('data:')) return request.continue();
      requests.push(url);
      if (!url.startsWith(`${origin}/tests/`)) {
        if (!url.endsWith('/favicon.ico')) failures.push(url);
        return request.abort();
      }
      return request.continue();
    });
    page.on('response', (response) => {
      if (response.status() >= 400) failures.push(response.url());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.evaluateOnNewDocument(() => {
      document.addEventListener('DOMContentLoaded', () =>
        QUnit.done((result) => {
          window.testResult = result;
        })
      );
    });
    const run = async (suffix = '') => {
      await page.goto(`${origin}/tests/${suffix}`);
      await page.waitForFunction(() => window.testResult, { timeout: 120000 });
      const result = await page.evaluate(() => window.testResult);
      assert.equal(result.failed, 0, JSON.stringify(result));
      assert.ok(await page.$('svg'), 'SVG examples rendered');
      assert.ok(await page.$('canvas'), 'Canvas examples rendered');
      return result.total;
    };
    const total = await run();
    // Deployment stays self-contained even if an old link requests a CDN or ESM build.
    const filtered = await run('?module=StaveNote&ver=unpkg@4.2.3&esm=true');
    assert.ok(filtered > 0 && filtered < total, 'module filtering selects a smaller suite');
    assert.ok(
      requests.some((url) => /\/fonts\/.*\.woff2$/.test(url)),
      'font files loaded from deployment'
    );
    assert.deepEqual(failures, []);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('test upload targets its own prefix and retains immutable assets and short-lived HTML', async () => {
  const manifest = await validate(output);
  assert.ok(Object.keys(manifest.files).some((file) => file.endsWith('vexflow-debug-with-tests.js')));
  const directory = await mkdtemp(join(tmpdir(), 'vexflow-tests-upload-'));
  try {
    const log = join(directory, 'calls.jsonl');
    const published = join(directory, 'published.html');
    const command = join(directory, 'gcloud');
    await writeFile(
      command,
      `#!${process.execPath}\nconst fs=require('node:fs');const args=process.argv.slice(2);fs.appendFileSync(${JSON.stringify(log)},JSON.stringify(args)+'\\n');if(args[1]==='cp')fs.copyFileSync(args[2],${JSON.stringify(published)});if(args[1]==='cat')process.stdout.write(fs.readFileSync(${JSON.stringify(published)}));`
    );
    await chmod(command, 0o755);
    await upload({ command });
    const calls = (await readFile(log, 'utf8')).trim().split('\n').map(JSON.parse);
    assert.deepEqual(
      calls.map((args) => args[1]),
      ['rsync', 'cp', 'cat']
    );
    assert.ok(calls[0].includes('gs://vexflow.com/tests/assets/'));
    assert.ok(calls[0].includes('--cache-control=public,max-age=31536000,immutable'));
    assert.ok(calls[1].includes('gs://vexflow.com/tests/index.html'));
    assert.ok(calls[1].includes('--cache-control=public,max-age=60,must-revalidate'));
    assert.ok(!calls.flat().some((arg) => arg.includes('delete')));
    await writeFile(log, '');
    await upload({ command, dryRun: true });
    assert.equal(await readFile(log, 'utf8'), '', 'dry run executes no cloud commands');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
