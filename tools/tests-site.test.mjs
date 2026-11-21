// Verify the deployed test gallery loads only its bundled assets and publishes with the shared cache policy.
import { memoryStore } from './site-storage.fixture.mjs';
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
    '.webp': 'image/webp',
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
        window.QUnit?.done((result) => {
          window.testResult = result;
        })
      );
    });
    // Opening the index needs only HTML and the featured score, even on a cold cache.
    await page.goto(`${origin}/tests/`);
    assert.ok(await page.$eval('figure img', (img) => img.complete && img.naturalWidth > 0));
    // The standalone gallery carries the same display fonts as the guide, even on a cold visit.
    const displayFonts = await page.evaluate(async () => {
      await document.fonts.ready;
      return ['header strong', 'h1'].map((selector) => {
        const family = getComputedStyle(document.querySelector(selector)).fontFamily.split(',')[0];
        return [...document.fonts].find((face) => face.family === family && face.status === 'loaded')?.family;
      });
    });
    assert.deepEqual(displayFonts, ['Tangerine', 'Academico']);
    const manifest = await validate(output);
    const initial = requests.filter((url) => !url.endsWith('/favicon.ico')).map((url) => new URL(url).pathname);
    const permitted = new Set([
      '/tests/',
      ...Object.entries(manifest.paths)
        .filter(([name]) => name === 'demos/ballade.webp' || name === 'site-theme.css' || name.startsWith('typefaces/'))
        .map(([, path]) => '/tests/' + path),
    ]);
    assert.ok(
      initial.every((path) => permitted.has(path)),
      initial.join(', ')
    );
    // Native buttons remain focused while slides change. Each score and its source
    // must be present in the deployed asset graph; the runner loads only on navigation.
    const featured = [
      'ballade',
      'petzold',
      'saints',
      'greensleeves',
      'prelude',
      'fugue',
      'kesh',
      'joy',
      'electric',
      'drums',
      'quartertones',
      'falseta',
      'sumer',
    ];
    const editions = new Map();
    await page.focus('#next');
    for (const [index, piece] of featured.entries()) {
      if (index) await page.keyboard.press('Enter');
      assert.equal(await page.$eval('#score-slide figure', (figure) => figure.dataset.piece), piece);
      assert.ok(
        await page.$eval('#score-slide img', async (img) => {
          await img.decode();
          return img.naturalWidth > 0;
        })
      );
      assert.ok(await page.$eval('.sheet-image', (link) => link.href === link.querySelector('img').currentSrc));
      const source = await page.$eval('#score-slide a[href$=".txt"], #score-slide a[href$=".js"]', (link) => link.href);
      assert.ok((await fetch(source)).ok, `source for ${piece}`);
      const open = await page.$eval('#score-slide', (el) => el.querySelector('a[href*="?piece="]')?.href);
      if (open) editions.set(piece, open);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'next');
    }
    await page.click('#next');
    assert.equal(await page.$eval('#score-slide figure', (figure) => figure.dataset.piece), featured[0]);
    await page.click('#previous');
    assert.equal(await page.$eval('#score-slide figure', (figure) => figure.dataset.piece), featured.at(-1));
    assert.ok(requests.every((url) => !url.includes('vexflow-debug-with-tests')));
    const indexed = await page.$$eval('#modules li a', (links) =>
      links.map((link) => new URL(link.href).searchParams.get('module')).sort()
    );
    await page.setViewport({ width: 375, height: 800 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.setViewport({ width: 1280, height: 900 });

    // Exercise the published score URLs with their real runtime and a cold, local-only network.
    for (const [piece, url] of editions) {
      await page.goto(url);
      await page.waitForSelector('#tools:not([hidden])');
      assert.ok(await page.$('#score svg'), piece);
      if (piece === 'kesh') {
        const chords = await page.$$eval('#score .vf-chordsymbol', (marks) => marks.map((mark) => mark.textContent));
        assert.ok(
          ['G', 'D', 'Am', 'C'].every((chord) => chords.includes(chord)),
          'printed fiddle harmony'
        );
        await page.select('#edition', 'Flute part');
        assert.equal(await page.$$eval('#score svg', (svgs) => svgs.length), 1);
        assert.match(await page.$eval('#score', (el) => el.textContent), /Fiddle cue/);
        const part = await page.$eval('#score metadata', (el) => JSON.parse(el.textContent));
        assert.deepEqual(part.staves, ['fl']);
        assert.ok(await page.$('#score .vf-chordsymbol'), 'the fiddle cue retains its source decorations');
        assert.ok(part.events.filter((e) => e.measure <= 9).every((e) => e.rest));
        assert.ok(part.events.some((e) => e.measure === 10 && !e.rest));
        assert.ok(
          await page.$$eval('#score [data-system="1"] .vf-stave', (staves) => staves.length < 9),
          'the opening rests share a counted bar before the cue'
        );
        await page.evaluate(() => {
          window.print = () => {
            window.didPrint = true;
          };
        });
        await page.click('#print');
        assert.ok(await page.evaluate(() => window.didPrint));
        continue;
      }
      if (piece === 'drums') {
        const rowSizes = await page.$$eval('#score .vf-stave', (staves) => {
          const rows = new Map();
          for (const stave of staves) {
            const y = Math.round(stave.getBoundingClientRect().top);
            rows.set(y, (rows.get(y) ?? 0) + 1);
          }
          return [...rows.values()];
        });
        assert.deepEqual(rowSizes, [3, 3], 'six-bar groove at page width');
        assert.match(await page.$eval('#score', (el) => el.textContent), /In the pocket/);
      }
      if (piece === 'prelude') await page.select('#events', 'arp-3-7');
      const original = await page.$eval('#events', (s) => s.value);
      await page.select('#width', 'Narrow');
      assert.equal(await page.$eval('#events', (s) => s.value), original, piece + ' retained selection on reflow');
      if (piece === 'saints') {
        const lyrics = await page.$$eval('#score text', (texts) =>
          texts.filter((el) => el.textContent === 'in').map((el) => getComputedStyle(el).font)
        );
        assert.ok(
          lyrics.length > 1 && lyrics.every((font) => font.includes('16px Academico')),
          '12 pt sung and held syllables'
        );
        await page.select('#edition', 'Traditional');
        assert.equal(await page.$eval('#events', (s) => s.value), 'v6-0');
      } else if (piece === 'electric' || piece === 'drums') {
        if (piece === 'electric') {
          // The selected bend lists several techniques in the event menu.
          const viewport = page.viewport();
          await page.setViewport({ ...viewport, width: 390 });
          assert.ok(await page.$eval('#events', (menu) => menu.getBoundingClientRect().right <= window.innerWidth));
          await page.setViewport(viewport);
          const marks = await page.$$eval('#score text', (texts) =>
            texts
              .filter((el) => ['T', 'full'].includes(el.textContent))
              .map((el) => [el.textContent, getComputedStyle(el).fontFamily.split(',')[0]])
          );
          assert.deepEqual(marks.sort(), [
            ['T', 'Academico'],
            ['T', 'Arial'],
            ['full', 'Academico'],
          ]);
        }
        const label = await page.$eval('#events', (s) => s.selectedOptions[0].text);
        assert.match(label, piece === 'drums' ? /Snare drum.*hi-hat/i : /string 3.*bend 2 semitones/i);
      } else if (piece === 'sumer') {
        await page.select('#edition', 'Full ensemble');
        await page.select('#width', 'Page width');
        // The opening two measures belong to one singer. Their different stems share one lyric baseline.
        const baselines = await page.$$eval(
          '#vf-part0-0-0 .vf-annotation text, #vf-part0-1-0 .vf-annotation text',
          (els) => els.filter((el) => ['Su-', 'cum-'].includes(el.textContent)).map((el) => el.getAttribute('y'))
        );
        assert.equal(baselines.length, 2);
        assert.equal(baselines[0], baselines[1]);
        const labels = await page.$$eval('#events option', (opts) => opts.map((o) => o.text).join(' '));
        for (const part of ['Singer 4', 'Pes 1', 'Pes 2']) assert.ok(labels.includes(part));
        await page.select('#edition', 'Singer 2');
        assert.doesNotMatch(await page.$eval('#events', (s) => s.textContent), /Singer 1/);
      } else if (piece === 'falseta') {
        await page.select('#edition', 'Hand direction');
        assert.match(await page.$eval('#legend', (el) => el.textContent), /↓ bass to treble/);
      }
      // No ink may be clipped when an indivisible measure exceeds a phone-width line.
      assert.ok(
        await page.$eval('#score svg', (svg) => {
          const b = svg.getBBox(),
            v = svg.viewBox.baseVal;
          return (
            b.x >= v.x - 1 &&
            b.y >= v.y - 1 &&
            b.x + b.width <= v.x + v.width + 1 &&
            b.y + b.height <= v.y + v.height + 1
          );
        }),
        piece + ' ink bounds'
      );
    }
    assert.equal(editions.size, 8);

    await page.goto(origin + '/tests/');

    // Use the public links just as a reader or headless client would.
    const result = async () => {
      await page.waitForFunction(() => window.testResult, { timeout: 120000 });
      const summary = await page.evaluate(() => window.testResult);
      assert.equal(summary.failed, 0, JSON.stringify(summary));
      assert.ok(await page.$('.testcanvas svg'), 'SVG examples rendered');
      assert.ok(await page.$('.testcanvas canvas'), 'Canvas examples rendered');
      return summary.total;
    };
    await page.click('#modules a[href$="module=StaveNote"]');
    const filtered = await result();
    assert.ok(filtered > 0);
    assert.ok(
      await page.$$eval('.testcanvas .name', (names) => names.every((n) => n.textContent.startsWith('StaveNote ›')))
    );
    await Promise.all([page.waitForNavigation(), page.click('#gallery-link')]);
    await page.click('#modules a[href$="/all.html"]');
    const total = await result();
    assert.ok(total > filtered);
    // The session charts should inherit the selected text face on every chord, including slash basses.
    for (const [piece, chord] of [
      ['Greensleeves', 'Dm/F'],
      ['The_Kesh_Jig', 'Am'],
    ]) {
      const selector = `[id="svg_Demo___${piece}.${piece}.Bravura"] + div .vf-chordsymbol text`;
      const marks = await page.$$eval(selector, (texts) =>
        texts.map((text) => ({ chord: text.textContent, family: getComputedStyle(text).fontFamily }))
      );
      assert.ok(
        marks.some((mark) => mark.chord === chord),
        piece
      );
      assert.ok(
        marks.every((mark) => mark.family.split(',')[0] === 'Academico'),
        piece
      );
    }
    const registered = await page.evaluate(() =>
      QUnit.config.modules
        .map((module) => module.name)
        .filter(Boolean)
        .sort()
    );
    assert.deepEqual(indexed, registered, 'the index links every registered module exactly once');

    // Old links retain their filters and the hosted runner always uses its bundled source.
    await page.goto(`${origin}/tests/?module=StaveNote&ver=unpkg@4.2.3&esm=true`);
    assert.equal(await result(), filtered);
    await page.goto(`${origin}/tests/#module=StaveNote`);
    assert.equal(await result(), filtered);
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
    const store = memoryStore('gs://vexflow.com/tests/');
    await writeFile(
      command,
      `#!${process.execPath}\nconst fs=require('node:fs');const args=process.argv.slice(2);fs.appendFileSync(${JSON.stringify(log)},JSON.stringify(args)+'\\n');if(args[1]==='cp')fs.copyFileSync(args[2],${JSON.stringify(published)});if(args[1]==='cat')process.stdout.write(fs.readFileSync(${JSON.stringify(published)}));`
    );
    await chmod(command, 0o755);
    await upload({ command, store });
    const calls = (await readFile(log, 'utf8')).trim().split('\n').map(JSON.parse);
    assert.deepEqual(
      calls.map((args) => args[1]),
      ['rsync', 'cp', 'cat', 'cp', 'cat']
    );
    assert.ok(calls[0].includes('gs://vexflow.com/tests/assets/'));
    assert.ok(calls[0].includes('--cache-control=public,max-age=31536000,immutable'));
    assert.ok(calls[1].includes('gs://vexflow.com/tests/all.html'));
    assert.ok(calls[3].includes('gs://vexflow.com/tests/index.html'));
    assert.ok(calls[1].includes('--cache-control=public,max-age=60,must-revalidate'));
    assert.ok(!calls.flat().some((arg) => arg.includes('delete')));
    await writeFile(log, '');
    await upload({ command, dryRun: true });
    assert.equal(await readFile(log, 'utf8'), '', 'dry run executes no cloud commands');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
