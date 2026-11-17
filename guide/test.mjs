// Browser regressions for lessons, shared previews, local editing, exports, and static uploads.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { chmod, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import puppeteer from 'puppeteer';

import { validate } from '../tools/static-site-upload.mjs';
import { build, output, serve, upload } from './cli.mjs';
import { examples, lessons } from './content.mjs';

await build();
const server = serve({ port: 0 });
await once(server, 'listening');
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({
  headless: true,
  args: process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
});
const artifacts = await mkdtemp(join(tmpdir(), 'vexflow-guide-test-'));
let context, page;
const errors = [];
const failures = [];

test.beforeEach(async () => {
  context = await browser.createBrowserContext();
  page = await context.newPage();
  errors.length = failures.length = 0;
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = request.url();
    if (/^(data:|blob:|about:)/.test(url) || url.startsWith(origin) || url.startsWith('file:')) request.continue();
    else {
      failures.push(url);
      request.abort();
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) failures.push(response.url());
  });
  await page.setViewport({ width: 1440, height: 1000 });
});
test.afterEach(async () => {
  await context.close();
});

/** Wait for a terminal render so errors fail immediately instead of looking like timeouts. */
async function rendered(label) {
  await page.waitForFunction(
    () => /^(Rendered|Render failed)/.test(document.querySelector('#render-status')?.textContent),
    { timeout: 15000 }
  );
  assert.equal(await page.$eval('#render-error', (element) => (element.hidden ? '' : element.textContent)), '', label);
  const frame = page.frames().find((frame) => frame.url() === 'about:srcdoc');
  assert.ok(frame && (await frame.$('#score svg')), `${label}: SVG exists`);
}
async function visit(hash) {
  await page.goto(`${origin}/guide/#${hash}`);
  await rendered(hash);
}
async function edit(code) {
  await page.$eval(
    '#editor',
    (element, code) => {
      element.textContent = code;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      document.getElementById('run').click();
    },
    code
  );
}

try {
  await test('lesson and playground navigation reuse the runtime without asset requests', async () => {
    // Disable HTTP caching so this also protects remotely served guides with a cold cache.
    await page.setCacheEnabled(false);
    await visit('lesson/welcome');
    const frame = page.frames().find((frame) => frame.url() === 'about:srcdoc');
    await frame.evaluate(() => {
      window.originalLibrary = VexFlow;
      window.originalFonts = [...document.fonts];
    });
    const requests = [];
    const record = (request) => {
      // Chromium may refresh the tab icon during fragment navigation.
      if (request.url() !== `${origin}/favicon.ico`) requests.push(request.url());
    };
    page.on('request', record);
    try {
      for (const hash of [
        ...lessons.filter((lesson) => lesson.id !== 'welcome').map((lesson) => `lesson/${lesson.id}`),
        ...examples.map((example) => `playground/${example.id}`),
        'lesson/welcome',
      ]) {
        // Clear the previous result before navigating so the wait cannot accept a stale render.
        await page.evaluate((hash) => {
          document.getElementById('render-status').textContent = 'Navigating…';
          location.hash = hash;
        }, hash);
        await rendered(hash);
        assert.equal(
          page.frames().find((frame) => frame.url() === 'about:srcdoc'),
          frame,
          hash
        );
        assert.equal(await frame.$$eval('#score > svg', (nodes) => nodes.length), 1, hash);
      }
      for (const font of ['Petaluma', 'Gonville', 'Bravura']) {
        await page.select('#font', font);
        await rendered(font);
      }
      assert.ok(
        await frame.evaluate(
          () =>
            VexFlow === window.originalLibrary &&
            document.fonts.size === window.originalFonts.length &&
            [...document.fonts].every((font, i) => font === window.originalFonts[i])
        ),
        'library and font objects survive navigation'
      );
      assert.deepEqual(requests, [], 'navigation and font switches make no application requests');
      assert.deepEqual(errors, []);
      assert.deepEqual(failures, []);
    } finally {
      page.off('request', record);
    }
    // Explicit Reset must still discard global mutations and recreate the sandbox.
    await page.click('#reset');
    await rendered('explicit reset');
    assert.notEqual(
      page.frames().find((frame) => frame.url() === 'about:srcdoc'),
      frame
    );
  });

  await test('all lesson routes render and all local source references exist', async () => {
    const ids = new Set(lessons.map((lesson) => lesson.id));
    assert.equal(ids.size, lessons.length);
    for (const lesson of lessons) {
      for (const related of lesson.related) assert.ok(ids.has(related), `${lesson.id}: ${related}`);
      for (const source of lesson.sources.filter((value) => value.startsWith('repo:')))
        await stat(resolve(source.slice(5)));
      await visit(`lesson/${lesson.id}`);
      assert.equal(await page.$eval('h1', (element) => element.textContent), lesson.title);
      assert.equal(await page.$$eval('#navigation [aria-current=page]', (elements) => elements.length), 1);
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(failures, []);
  });

  await test('every teaching and Explorer example renders with all three bundled music fonts', async () => {
    for (const example of examples) {
      await visit(`playground/${example.id}`);
      for (const font of ['Petaluma', 'Gonville']) {
        await page.select('#font', font);
        await rendered(`${example.id}: ${font}`);
      }
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(failures, []);
  });

  await test('EasyScore family controls render every notation choice in all fonts', async () => {
    for (const id of ['easyscore-families', 'easyscore-rhythm', 'easyscore-structure']) {
      const example = examples.find((item) => item.id === id);
      await visit(`playground/${id}`);
      for (const font of ['Bravura', 'Petaluma', 'Gonville']) {
        await page.select('#font', font);
        await rendered(`${id}: ${font}`);
        for (const choice of example.controls.find((control) => control.key === 'family').choices) {
          await page.select('#control-family', choice);
          await rendered(`${id}: ${font}: ${choice}`);
        }
      }
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(failures, []);
  });

  await test('composition lessons reflow and preserve explicit pitch spelling', async () => {
    await visit('lesson/structured-composition');
    const original = await page.$eval('#editor', (element) => element.textContent);
    await edit(
      original +
        "\nconsole.log('before:', result.sheet.getRows().length);\nresult.sheet.setWidth(320).format();\nscore.factory.getContext().resize(width, result.sheet.getHeight() + 35);\nscore.factory.getContext().clear();\nscore.draw({ retain: true });\nconsole.log('after:', result.sheet.getRows().length);"
    );
    await rendered('retained composition reflow');
    const log = await page.$eval('#logs', (element) => element.textContent);
    const before = Number(log.match(/before: (\d+)/)[1]);
    const after = Number(log.match(/after: (\d+)/)[1]);
    assert.ok(after > before, log);
    await edit(original.replace("span: '1/4'", "span: '2/4'"));
    await page.waitForFunction(() => !document.querySelector('#render-error').hidden);
    await page.click('#reset');
    await rendered('pickup restored');
    await visit('lesson/composition-policies');
    const policyCode = await page.$eval('#editor', (element) => element.textContent);
    const inspect =
      "\nconsole.log('policy:', JSON.stringify(result.notes.flat(3).filter(note => note instanceof VF.StaveNote).map(note => ({ keys: note.getKeys(), accidentals: note.getModifiers().filter(modifier => modifier instanceof VF.Accidental).map(modifier => modifier.type) }))));";
    const readPolicy = async () =>
      JSON.parse((await page.$eval('#logs', (element) => element.textContent)).split('policy: ')[1]);
    await edit(policyCode + inspect);
    await rendered('key-aware accidentals');
    const keyAware = await readPolicy();
    assert.deepEqual(
      keyAware.slice(0, 4).map((note) => note.accidentals),
      [[], [], ['n'], []]
    );
    await edit(policyCode.replace("accidentals: 'key-aware'", "accidentals: 'literal'") + inspect);
    await rendered('literal accidentals');
    const literal = await readPolicy();
    assert.deepEqual(
      literal.slice(0, 4).map((note) => note.accidentals),
      [['#'], ['#'], [], []]
    );
    assert.deepEqual(
      literal.map((note) => note.keys),
      keyAware.map((note) => note.keys)
    );
    assert.deepEqual(errors, []);
  });

  await test('clicking parsed notes selects source while hover and stale edits leave selection alone', async () => {
    await visit('lesson/references');
    const frame = page.frames().find((frame) => frame.url() === 'about:srcdoc');
    // The preview iframe is scaled; convert child coordinates to displayed page coordinates.
    const point = async () => {
      await page.$eval('#frame-host', (element) => element.scrollIntoView({ block: 'center' }));
      const local = await frame.$eval('#vf-start', (element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, width: innerWidth, height: innerHeight };
      });
      const box = await (await frame.frameElement()).boundingBox();
      return { x: box.x + (local.x * box.width) / local.width, y: box.y + (local.y * box.height) / local.height };
    };
    const status = await page.$eval('#render-status', (element) => element.textContent);
    let location = await point();
    await page.mouse.move(location.x, location.y);
    await page.waitForFunction(() => document.querySelector('#inspection').textContent.includes('"source"'));
    assert.equal(await page.evaluate(() => String(window.getSelection())), '');
    await page.mouse.click(location.x, location.y);
    await page.waitForFunction(() => String(window.getSelection()).includes('id="start"'));
    assert.equal(await page.evaluate(() => String(window.getSelection())), 'C5/h[id="start"]');
    assert.equal(await page.$eval('#render-status', (element) => element.textContent), status);
    await page.$eval('#editor', (element) => {
      element.textContent = '// Unrendered edit\n' + element.textContent;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      window.getSelection().removeAllRanges();
      document.getElementById('inspection').textContent = '';
    });
    location = await point();
    // Unpin, then pin the same note again after an unrendered edit.
    await page.mouse.click(location.x, location.y);
    await page.mouse.click(location.x, location.y);
    await page.waitForFunction(() => document.querySelector('#inspection').textContent.includes('"source"'));
    assert.equal(await page.evaluate(() => String(window.getSelection())), '');
    assert.equal(await page.$eval('#render-status', (element) => element.textContent), status);
    assert.deepEqual(errors, []);
  });

  await test('navigation, search, deep links, and unknown fragments recover predictably', async () => {
    await visit('lesson/welcome');
    await page.type('#search', 'tablature');
    assert.ok(await page.$('#navigation a[href="#lesson/tab"]'));
    await page.click('#navigation a[href="#lesson/tab"]');
    await page.waitForFunction(
      () => document.querySelector('#title').textContent === 'Tablature and string techniques'
    );
    await rendered('tab navigation');
    await page.goBack();
    await page.waitForFunction(() => document.querySelector('#title').textContent === 'Make your first score');
    await visit('unknown/not-found');
    assert.equal(await page.$eval('#title', (element) => element.textContent), 'Make your first score');
    await visit('%E0%A4%A');
    assert.equal(await page.$eval('#title', (element) => element.textContent), 'Make your first score');
    assert.deepEqual(errors, []);
  });

  await test('drafts survive navigation and reload; errors recover; reset restores code and controls', async () => {
    await visit('playground/first-notes');
    const original = await page.$eval('#editor', (element) => element.textContent);
    await edit(original.replace('C5/q', 'F5/q'));
    await rendered('edited notes');
    await page.reload();
    await rendered('reloaded draft');
    assert.match(await page.$eval('#editor', (element) => element.textContent), /F5\/q/);
    await edit('throw new Error("Guide regression");');
    await page.waitForFunction(() => !document.querySelector('#render-error').hidden);
    assert.match(await page.$eval('#render-error', (element) => element.textContent), /Guide regression/);
    await page.click('#reset');
    await rendered('reset after error');
    assert.equal(await page.$eval('#editor', (element) => element.textContent), original);
    await visit('playground/notes');
    await page.$eval('#control-phrase', (element) => {
      element.value = 'C5/w';
      element.dispatchEvent(new Event('input'));
    });
    await rendered('parameter change');
    await page.reload();
    await rendered('saved parameters');
    assert.equal(await page.$eval('#control-phrase', (element) => element.value), 'C5/w');
    await page.click('#reset');
    await rendered('parameter reset');
    assert.notEqual(await page.$eval('#control-phrase', (element) => element.value), 'C5/w');
    assert.deepEqual(errors, []);
  });

  await test('editor handles literal markup, live edits, keyboard execution, and keyboard escape', async () => {
    await visit('playground/first-notes');
    const original = await page.$eval('#editor', (element) => element.textContent);
    const code = '// <script>literal markup</script>\n' + original;
    await edit(code);
    await rendered('literal code');
    await page.waitForSelector('#editor .token.keyword');
    assert.equal(await page.$('#editor script'), null);
    assert.equal(await page.$eval('#editor', (element) => element.textContent), code);
    await page.click('#auto-run');
    await page.$eval(
      '#editor',
      (element, code) => {
        element.textContent = code;
        element.dispatchEvent(new Event('input'));
      },
      original.replace('C5/q', 'A5/q') + '\nconsole.log("live edit complete");'
    );
    await page.waitForFunction(() => document.querySelector('#logs').textContent.includes('live edit complete'));
    await rendered('live edit');
    await page.click('#editor');
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.down(modifier);
    try {
      await page.keyboard.press('Enter');
    } finally {
      await page.keyboard.up(modifier);
    }
    await rendered('keyboard run');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Tab');
    assert.equal(await page.$eval('#editor', (element) => element === document.activeElement), false);
    assert.deepEqual(errors, []);
  });

  await test('mobile layout stays within the viewport and the contents menu works', async () => {
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    for (const id of [
      'welcome',
      'setup',
      'polyphony',
      'measures',
      'composition',
      'typed-notes',
      'structured-composition',
      'composition-policies',
      'easy-families',
      'spacing',
      'troubleshooting',
    ]) {
      await visit(`lesson/${id}`);
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${id}: no page overflow`
      );
    }
    await page.click('#menu');
    assert.equal(await page.$eval('#menu', (element) => element.getAttribute('aria-expanded')), 'true');
    await page.click('#navigation a[href="#lesson/welcome"]');
    await page.waitForFunction(() => document.querySelector('#menu').getAttribute('aria-expanded') === 'false');
    await rendered('mobile menu navigation');
    if (process.env.GUIDE_SCREENSHOTS) {
      await page.$eval('.workbench', (element) => element.scrollIntoView());
      const frame = page.frames().find((frame) => frame.url() === 'about:srcdoc');
      await frame.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.screenshot({ path: join(artifacts, 'guide-mobile.png'), fullPage: true });
    }
    assert.deepEqual(errors, []);
  });

  await test('downloaded SVG and HTML render independently with fonts and edited parameters', async () => {
    await visit('playground/notes');
    await page.select('#font', 'Petaluma');
    await rendered('export font');
    await page.$eval('#control-phrase', (element) => {
      element.value = 'D5/w';
      element.dispatchEvent(new Event('input'));
    });
    await rendered('export parameter');
    const client = await page.createCDPSession();
    await client.send('Browser.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: artifacts,
      browserContextId: context.id,
    });
    await page.click('#save-svg');
    await page.click('#save-html');
    await page.click('#save-js');
    // Poll only local download completion; no arbitrary delay in the application.
    for (let attempt = 0; attempt < 100; attempt++) {
      if ((await readdir(artifacts)).includes('notes.html')) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const svg = await readFile(join(artifacts, 'notes.svg'), 'utf8');
    assert.match(svg, /font-family:'Petaluma'/);
    assert.match(svg, /data:font\/otf;base64,/);
    const html = await readFile(join(artifacts, 'notes.html'), 'utf8');
    assert.match(html, /D5\/w/);
    const js = await readFile(join(artifacts, 'notes.js'), 'utf8');
    assert.match(js, /D5\/w/);
    await page.goto(pathToFileURL(join(artifacts, 'notes.html')).href);
    await page.waitForSelector('#score svg');
    await page.evaluate(() => document.fonts.ready);
    assert.ok(await page.$('svg .vf-stavenote'));
    await page.goto(pathToFileURL(join(artifacts, 'notes.svg')).href);
    await page.waitForSelector('svg');
    assert.deepEqual(errors, []);
    assert.deepEqual(failures, []);
  });

  await test('read-only storage does not stop editing and the preview stays sandboxed', async () => {
    await page.evaluateOnNewDocument(() => {
      Storage.prototype.setItem = () => {
        throw new Error('Storage unavailable');
      };
    });
    await visit('lesson/welcome');
    assert.equal(await page.$eval('iframe', (element) => element.getAttribute('sandbox')), 'allow-scripts');
    const code = await page.$eval('#editor', (element) => element.textContent);
    await edit(code + '\nconsole.log("draft works");');
    await rendered('storage fallback');
    assert.equal(await page.$eval('#draft-state', (element) => element.textContent), 'Unsaved draft');
    assert.deepEqual(errors, []);
  });

  await test('upload validates bytes and uses the guide prefix with assets before HTML', async () => {
    const manifest = await validate(output);
    assert.ok(Object.keys(manifest.files).some((file) => file.endsWith('explorer/editor.mjs')));
    const log = join(artifacts, 'upload.jsonl');
    const published = join(artifacts, 'published.html');
    const command = join(artifacts, 'gcloud');
    await writeFile(
      command,
      `#!${process.execPath}\nconst fs=require('node:fs');const args=process.argv.slice(2);fs.appendFileSync(${JSON.stringify(log)},JSON.stringify(args)+'\\n');if(args[1]==='cp')fs.copyFileSync(args[2],${JSON.stringify(published)});if(args[1]==='cat')process.stdout.write(fs.readFileSync(${JSON.stringify(published)}));`
    );
    await chmod(command, 0o755);
    await upload({ command });
    const calls = (await readFile(log, 'utf8')).trim().split('\n').map(JSON.parse);
    assert.equal(calls[0][1], 'rsync');
    assert.ok(calls[0].includes('gs://vexflow.com/guide/assets/'));
    assert.ok(calls[0].includes('--cache-control=public,max-age=31536000,immutable'));
    assert.equal(calls[1][1], 'cp');
    assert.ok(calls[1].includes('gs://vexflow.com/guide/index.html'));
    assert.ok(calls[1].includes('--cache-control=public,max-age=60,must-revalidate'));
    assert.equal(calls[2][1], 'cat');
    await upload({ dryRun: true, command: '/missing/should-not-run' });
    await assert.rejects(upload({ destination: 'gs://vexflow.com/', command }), /nonempty prefix/);
    // A changed member must fail before a cloud command can run.
    const asset = join(output, manifest.assetPath, 'style.css');
    const original = await readFile(asset);
    try {
      await writeFile(asset, 'changed');
      await assert.rejects(upload({ command }), /Build changed/);
    } finally {
      await writeFile(asset, original);
    }
    assert.equal((await readFile(log, 'utf8')).trim().split('\n').length, 3);
  });

  if (process.env.GUIDE_SCREENSHOTS) {
    await test('capture representative guide pages on white backgrounds', async () => {
      for (const [id, name] of [
        ['welcome', 'guide-quickstart'],
        ['composition', 'guide-easyscore'],
        ['structured-composition', 'guide-composition'],
        ['typed-notes', 'guide-typed-notes'],
      ]) {
        await visit(`lesson/${id}`);
        await page.$eval('#frame-host', (element) => element.scrollIntoView({ block: 'center' }));
        const frame = page.frames().find((frame) => frame.url() === 'about:srcdoc');
        await frame.evaluate(
          () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        );
        await page.screenshot({ path: join(artifacts, `${name}.png`), fullPage: true });
      }
      await visit('playground/tablature');
      await page.screenshot({ path: join(artifacts, 'guide-playground.png'), fullPage: true });
    });
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  if (process.env.GUIDE_SCREENSHOTS) console.log(`Screenshots and exports: ${artifacts}`);
  else await rm(artifacts, { recursive: true, force: true });
}
