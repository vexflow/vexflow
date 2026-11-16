// End-to-end coverage for every example, the editor/inspector, and safe static publication.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { chmod, cp, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import puppeteer from 'puppeteer';

import { defaults, examples } from './catalog.mjs';
import { build, output, serve } from './cli.mjs';
import { upload, validate } from './upload.mjs';

await build();
const server = serve({ port: 0 });
await once(server, 'listening');
const testOrigin = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({
  headless: true,
  args: process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
});
let context, page;
const errors = [];

// A failed test must not leak drafts, editor options, or held keys into the next one.
test.beforeEach(async () => {
  context = await browser.createBrowserContext();
  page = await context.newPage();
  errors.length = 0;
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.setViewport({ width: 1440, height: 1000 });
});
test.afterEach(async () => context?.close());
const waitRender = () =>
  page.waitForFunction(
    () =>
      document.querySelector('#render-status').textContent.includes('elements') ||
      !document.querySelector('#render-error').hidden,
    { timeout: 15000 }
  );
const assertRendered = async (label) => {
  await waitRender();
  const error = await page.$eval('#render-error', (el) => (el.hidden ? '' : el.textContent));
  assert.equal(error, '', label);
};
async function visit(example) {
  await page.goto(`${testOrigin}/explorer/#example/${example.id}`);
  await page.waitForFunction((title) => document.querySelector('#title').textContent === title, {}, example.title);
  await page.select('#font', 'Bravura');
  await assertRendered(example.id);
}

/** Run immediately so assertions cannot mistake the previous result for a new render. */
async function edit(code) {
  await page.$eval(
    '#editor',
    (el, code) => {
      el.textContent = code;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('#run').click();
    },
    code
  );
}

try {
  await test('highlighted editor preserves literal code, indentation, and isolated undo history', async () => {
    await visit(examples[0]);
    await page.click('#auto-run');
    const code = 'const markup = "<script>example</script>";\n// End';
    await edit(code);
    await page.waitForSelector('#editor .token.keyword');
    assert.equal(await page.$eval('#editor', (el) => el.textContent), code);
    assert.equal(await page.$('#editor script'), null, 'source HTML remains literal text');
    await page.$eval('#editor', (el) => {
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });
    await page.keyboard.press('Tab');
    assert.equal(await page.$eval('#editor', (el) => el.textContent), code + '  ');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Tab');
    assert.equal(await page.$eval('#editor', (el) => document.activeElement === el), false);
    await page.click('#reset');
    await assertRendered('editor reset');
    const restored = await page.$eval('#editor', (el) => el.textContent);
    await page.click('#editor');
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.down(modifier);
    try {
      await page.keyboard.press('z');
    } finally {
      await page.keyboard.up(modifier);
    }
    assert.equal(await page.$eval('#editor', (el) => el.textContent), restored, 'reset discards old undo history');
    await page.click('#auto-run');
  });

  await test('all curated examples and every select/range endpoint render', async () => {
    for (const example of examples) {
      await visit(example);
      for (const control of example.controls) {
        const variants = control.choices ?? (control.min !== undefined ? [control.min, control.max] : []);
        for (const value of variants) {
          await page.$eval(
            `#control-${control.key}`,
            (el, value) => {
              el.value = String(value);
              el.dispatchEvent(new Event('input', { bubbles: true }));
            },
            value
          );
          await page.click('#run');
          await assertRendered(`${example.id}: ${control.key}=${value}`);
        }
        await page.$eval(
          `#control-${control.key}`,
          (el, value) => {
            el.value = String(value);
            el.dispatchEvent(new Event('input', { bubbles: true }));
          },
          control.value
        );
      }
      // A distinct font catches glyph/metric assumptions in every example.
      await page.select('#font', 'Petaluma');
      await assertRendered(`${example.id}: Petaluma`);
      await page.click('#reset');
      await assertRendered(`${example.id}: reset`);
    }
    assert.deepEqual(errors, []);
  });

  await test('live edits, errors, recovery, drafts, navigation, and SVG export', async () => {
    await visit(examples[0]);
    await page.$eval('#editor', (el) => {
      el.textContent += '\nthrow new Error("A useful error");';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForFunction(() => !document.querySelector('#render-error').hidden);
    assert.match(await page.$eval('#error-message', (el) => el.textContent), /A useful error/);
    await page.click('#recover');
    await assertRendered('recovery');
    for (const code of [
      'setTimeout(() => { throw new Error("Delayed example error"); }, 20);',
      'Promise.reject(new Error("Delayed example error"));',
    ]) {
      await page.$eval(
        '#editor',
        (el, code) => {
          el.textContent += '\n' + code;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        },
        code
      );
      await page.waitForFunction(() =>
        document.querySelector('#error-message').textContent.includes('Delayed example error')
      );
      await page.click('#recover');
      await assertRendered('asynchronous error recovery');
    }

    await page.$eval('#editor', (el) => {
      el.textContent += '\n// saved draft';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForFunction(() => document.querySelector('#draft-state').textContent.includes('Saved'));
    await page.reload();
    await assertRendered('draft reload');
    assert.match(await page.$eval('#editor', (el) => el.textContent), /saved draft/);
    await page.click('#reset');
    await assertRendered('reset');
    await page.type('#search', 'pedal');
    assert.equal(await page.$$eval('.nav-item', (els) => els.length), 1);
    await page.click('.nav-item');
    await page.waitForFunction(() => document.querySelector('#title').textContent === 'Pedal markings');
    await assertRendered('search navigation');
    assert.equal(await page.$eval('.repo-link', (el) => el.href), 'https://github.com/vexflow/vexflow');
    const frame = page.frames().find((frame) => frame.url() === 'about:srcdoc');
    const isolation = await frame.evaluate(() => {
      try {
        return parent.document.body.tagName;
      } catch {
        return 'isolated';
      }
    });
    assert.equal(isolation, 'isolated');
    const download = await page.target().createCDPSession();
    const directory = await mkdtemp(join(tmpdir(), 'vexflow-explorer-svg-'));
    try {
      await download.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: directory });
      await page.click('#download');
      for (let i = 0; i < 50; i++) {
        if ((await readdir(directory)).some((name) => name.endsWith('.svg'))) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      const file = (await readdir(directory)).find((name) => name.endsWith('.svg'));
      assert.ok(file, 'SVG download completes');
      const svg = await readFile(join(directory, file), 'utf8');
      assert.match(svg, /@font-face/);
      assert.match(svg, /<svg/);
      assert.ok(!svg.includes('data-explorer-overlay'));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  await test('warm edits and all example switches reuse the library and font objects without requests', async () => {
    const notes = examples.find((e) => e.id === 'notes');
    await visit(notes);
    const frame = page.frames().find((frame) => frame.url() === 'about:srcdoc');
    await frame.evaluate(() => {
      window.originalLibrary = VexFlow;
      window.originalFonts = [...document.fonts];
    });
    const requests = [];
    const record = (request) => requests.push(request.url());
    page.on('request', record);
    try {
      for (let i = 0; i < 4; i++) {
        await edit(`${notes.code}\n// edit ${i}`);
        await assertRendered('warm edit');
        assert.equal(await frame.$$eval('#score > svg', (nodes) => nodes.length), 1);
      }
      for (const example of examples) {
        await page.evaluate((id) => {
          location.hash = `#example/${id}`;
        }, example.id);
        await page.waitForFunction(
          (title) => document.querySelector('#title').textContent === title,
          {},
          example.title
        );
        await assertRendered(`warm ${example.id}`);
      }
      for (const font of ['Petaluma', 'Gonville', 'Bravura']) {
        await page.select('#font', font);
        await assertRendered(`warm ${font}`);
      }
      assert.equal(
        page.frames().find((f) => f.url() === 'about:srcdoc'),
        frame
      );
      assert.ok(
        await frame.evaluate(
          () =>
            VexFlow === window.originalLibrary &&
            [...document.fonts].every((font, i) => font === window.originalFonts[i])
        )
      );
      assert.deepEqual(requests, [], 'warm interaction makes no resource requests, even cache hits');
      assert.match(await page.$eval('#render-status', (el) => el.textContent), /ms total .* ms render/);
    } finally {
      page.off('request', record);
    }
  });

  await test('run cleanup, latest-edit queueing, and explicit runtime reset', async () => {
    const notes = examples.find((e) => e.id === 'notes');
    await visit(notes);
    const frame = page.frames().find((f) => f.url() === 'about:srcdoc');
    await edit(`${notes.code}
window.effectCount = 0;
setTimeout(() => { window.effectCount++; }, 1000);
setInterval(() => { window.effectCount++; }, 1000);
function animate() { window.effectCount++; requestAnimationFrame(animate); }
requestAnimationFrame(animate);
window.addEventListener('probe', () => { window.effectCount++; });
document.addEventListener('probe', () => { window.effectCount++; });`);
    await assertRendered('effects registered');
    await edit(notes.code);
    await assertRendered('effects removed');
    const count = await frame.evaluate(() => window.effectCount);
    await frame.evaluate(async () => {
      window.dispatchEvent(new Event('probe'));
      document.dispatchEvent(new Event('probe'));
      await new Promise((resolve) => setTimeout(resolve, 1100));
    });
    assert.equal(
      await frame.evaluate(() => window.effectCount),
      count,
      'old timers, animation frames, and listeners stop'
    );
    assert.equal(await frame.evaluate(() => VexFlow.Registry.getDefaultRegistry()), undefined);

    await edit(`window.executionOrder = ['slow'];
await new Promise(resolve => { window.releaseProbe = resolve; });
throw new Error('Superseded error');`);
    await frame.waitForFunction(() => typeof window.releaseProbe === 'function');
    await edit("window.executionOrder.push('intermediate'); throw new Error('Skipped edit');");
    await edit(`${notes.code}\nwindow.executionOrder.push('latest');`);
    await frame.evaluate(() => window.releaseProbe());
    await assertRendered('latest queued edit');
    assert.deepEqual(await frame.evaluate(() => window.executionOrder), ['slow', 'latest']);
    assert.equal(
      page.frames().find((f) => f.url() === 'about:srcdoc'),
      frame
    );

    const draft = await page.$eval('#editor', (el) => el.textContent);
    // This global mutation intentionally persists until the user asks for a full reset.
    await frame.evaluate(() => {
      VexFlow.explorerMutation = true;
    });
    // Keep the draft valid in a fresh runtime too.
    await edit(draft.replace("window.executionOrder.push('latest');", '// keep this draft'));
    await assertRendered('reset draft');
    const preserved = await page.$eval('#editor', (el) => el.textContent);
    await page.click('#reset-runtime');
    await assertRendered('runtime reset');
    const replacement = page.frames().find((f) => f.url() === 'about:srcdoc');
    assert.notEqual(replacement, frame);
    assert.equal(await replacement.evaluate(() => VexFlow.explorerMutation), undefined);
    assert.equal(await page.$eval('#editor', (el) => el.textContent), preserved);
    await page.click('#reset');
    await assertRendered('restore original');
  });

  await test('a stalled async run is discarded before the latest queued edit executes', async () => {
    const notes = examples.find((e) => e.id === 'notes');
    await visit(notes);
    const frame = page.frames().find((f) => f.url() === 'about:srcdoc');
    await edit('window.stalled = true; await new Promise(() => {});');
    await frame.waitForFunction(() => window.stalled);
    await edit(notes.code);
    await assertRendered('queued edit after watchdog');
    assert.notEqual(
      page.frames().find((f) => f.url() === 'about:srcdoc'),
      frame
    );
  });

  await test('hover, click, bounds, related elements, and theme controls', async () => {
    await visit(examples[0]);
    const frame = page.frames().find((frame) => frame.url() === 'about:srcdoc');
    const note = await frame.$('g.vf-stavenote');
    assert.ok(note);
    const rect = await note.boundingBox();
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.waitForFunction(() => !document.querySelector('#inspection').hidden);
    await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.waitForFunction(() => document.querySelector('#inspection').textContent.includes('Unpin'));
    assert.match(await page.$eval('#inspection', (el) => el.textContent), /Layout bounds/);
    await page.click('#bounds-toggle');
    assert.ok(await frame.$('[data-explorer-overlay] rect'));
    await page.click('#paper-toggle');
    await assertRendered('dark paper');
    assert.equal(await page.$eval('#preview', (el) => el.classList.contains('dark')), true);
    await page.select('#font', 'Gonville');
    await assertRendered('Gonville');
  });

  await test('glyph search, Unicode, font coverage, and paging', async () => {
    await page.goto(`${testOrigin}/explorer/#glyphs`);
    await page.waitForSelector('.glyph-cell');
    await page.type('#glyph-search', 'U+E050');
    assert.equal(await page.$$eval('.glyph-cell', (els) => els.length), 1);
    await page.click('.glyph-cell');
    assert.match(await page.$eval('#glyph-detail', (el) => el.textContent), /gClef/);
    await page.$eval('#glyph-search', (el) => {
      el.value = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.select('#glyph-group', 'all');
    assert.equal(await page.$$eval('.glyph-cell', (els) => els.length), 72);
    await page.click('#more-glyphs');
    assert.equal(await page.$$eval('.glyph-cell', (els) => els.length), 144);
    await page.select('#glyph-font', 'Petaluma');
    assert.match(await page.$eval('#glyph-detail', (el) => el.textContent), /Petaluma/);
  });

  await test('mobile menu, usable editor, and no horizontal page overflow', async () => {
    await page.setViewport({ width: 390, height: 844 });
    await visit(examples[0]);
    await page.click('#menu');
    assert.equal(await page.$eval('#menu', (el) => el.getAttribute('aria-expanded')), 'true');
    await page.$eval('#search', (el) => {
      el.value = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.type('#search', 'beam');
    await page.click('.nav-item');
    await page.waitForFunction(() => document.querySelector('#title').textContent === 'Beams');
    await assertRendered('mobile beams');
    assert.equal(await page.$eval('#menu', (el) => el.getAttribute('aria-expanded')), 'false');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.$eval('#editor', (el) => el.scrollIntoView());
    assert.ok(await (await page.$('#editor')).isIntersectingViewport());
    await page.evaluate(async () => {
      window.scrollTo(0, 0);
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    });
    await page.screenshot({ path: join(tmpdir(), 'vexflow-explorer-mobile.png'), fullPage: true });
    await page.setViewport({ width: 1440, height: 1080 });
    await visit(examples[0]);
    await page.screenshot({ path: join(tmpdir(), 'vexflow-explorer-desktop.png'), fullPage: true });
    assert.deepEqual(errors, []);
  });

  await test('upload order, immutable paths, readback, and failure containment', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'vexflow-upload-test-'));
    const log = join(directory, 'calls.jsonl');
    const command = join(directory, 'gcloud');
    const script = `#!${process.execPath}\nimport fs from 'node:fs';\nconst args=process.argv.slice(2);fs.appendFileSync(${JSON.stringify(log)},JSON.stringify(args)+'\\n');\nif(args[1]==='rsync'&&fs.existsSync(${JSON.stringify(join(directory, 'fail'))}))process.exit(7);\nif(args[1]==='cp')fs.copyFileSync(args[2],${JSON.stringify(join(directory, 'published.html'))});\nif(args[1]==='cat')process.stdout.write(fs.readFileSync(${JSON.stringify(join(directory, 'published.html'))}));\n`;
    await writeFile(join(directory, 'package.json'), ' {"type":"module"} ');
    await writeFile(command, script);
    await chmod(command, 0o755);
    try {
      await upload({ command });
      const calls = (await readFile(log, 'utf8')).trim().split('\n').map(JSON.parse);
      assert.deepEqual(
        calls.map((args) => args[1]),
        ['rsync', 'cp', 'cat']
      );
      assert.ok(calls[0].includes('gs://vexflow.com/explorer/assets/'));
      assert.ok(!calls[0].some((arg) => arg.includes('delete')));
      assert.ok(calls[0].some((arg) => arg.includes('max-age=31536000,immutable')));
      assert.ok(calls[1].includes('--cache-control=public,max-age=60,must-revalidate'));
      await writeFile(log, '');
      await writeFile(join(directory, 'fail'), '');
      await assert.rejects(upload({ command }), /gcloud failed/);
      assert.equal((await readFile(log, 'utf8')).trim().split('\n').length, 1, 'HTML untouched after failed assets');
      await assert.rejects(upload({ destination: 'gs://vexflow.com/' }), /nonempty prefix/);
      const broken = join(directory, 'broken');
      await cp(output, broken, { recursive: true });
      await writeFile(join(broken, 'index.html'), 'changed');
      await assert.rejects(validate(broken), /Build changed/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
