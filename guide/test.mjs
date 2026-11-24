// Browser regressions for lessons, shared previews, local editing, exports, and static uploads.
import { memoryStore } from '../tools/site-storage.fixture.mjs';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { chmod, copyFile, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import puppeteer from 'puppeteer';
import Prism from 'prismjs';
import { findNotationRange } from './runtime/source.mjs';

import { validate } from '../tools/static-site-upload.mjs';
import { build, output, serve, upload } from './cli.mjs';
import { sections as featureCatalog } from '../tools/features/catalog.mjs';
import { examples, lessons, tutorial } from './content.mjs';

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
  page.on('pageerror', (error) => errors.push(String(error)));
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
  await test('notation source matching excludes ambiguous, escaped, and non-literal input', () => {
    const input = 'C4/q, D4';
    const source = { input, start: 6, end: 8 };
    for (const quote of ["'", '"', '`']) {
      const code = `const melody = ${quote}${input}${quote};`;
      const range = findNotationRange(code, source, Prism);
      assert.equal(code.slice(range.start, range.end), 'D4');
    }
    for (const code of [
      `// '${input}'`,
      `/* "${input}" */`,
      `const a = '${input}', b = '${input}';`,
      "const a = 'C4/q, ' + 'D4';",
      'const a = `C4/q, ${pitch}`;',
      "const a = /'C4\\/q, D4'/;",
    ])
      assert.equal(findNotationRange(code, source, Prism), undefined, code);
    assert.equal(
      findNotationRange('const a = "C4/q,\\n D4";', { input: 'C4/q,\n D4', start: 7, end: 9 }, Prism),
      undefined
    );
  });

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
      if (request.url().startsWith(origin) && request.url() !== `${origin}/favicon.ico`) requests.push(request.url());
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

  await test('a new run clears previous effects and uses the latest queued edit', async () => {
    const notes = examples.find((e) => e.id === 'notes');
    await visit('playground/' + notes.id);
    const frame = page.frames().find((f) => f.url() === 'about:srcdoc');
    await edit(`${notes.code}
window.effectCount = 0;
setTimeout(() => { window.effectCount++; }, 1000);
setInterval(() => { window.effectCount++; }, 1000);
function animate() { window.effectCount++; requestAnimationFrame(animate); }
requestAnimationFrame(animate);
window.addEventListener('probe', () => { window.effectCount++; });
document.addEventListener('probe', () => { window.effectCount++; });`);
    await rendered('effects registered');
    await edit(notes.code);
    await rendered('effects removed');
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
    await rendered('latest queued edit');
    assert.deepEqual(await frame.evaluate(() => window.executionOrder), ['slow', 'latest']);
    assert.equal(
      page.frames().find((f) => f.url() === 'about:srcdoc'),
      frame
    );
  });

  await test('a stalled async run is discarded before the latest queued edit executes', async () => {
    const notes = examples.find((e) => e.id === 'notes');
    await visit('playground/' + notes.id);
    const frame = page.frames().find((f) => f.url() === 'about:srcdoc');
    await edit('window.stalled = true; await new Promise(() => {});');
    await frame.waitForFunction(() => window.stalled);
    await edit(notes.code);
    await rendered('queued edit after watchdog');
    assert.notEqual(
      page.frames().find((f) => f.url() === 'about:srcdoc'),
      frame
    );
  });

  await test('setup highlights copyable source and its standalone HTML draws the first note', async () => {
    await visit('lesson/setup');
    const frame = page.frames().find((frame) => frame.url() === 'about:srcdoc');
    const build = await frame.evaluate(() => ({ version: VexFlow.BUILD.VERSION, revision: VexFlow.BUILD.ID }));
    assert.equal(await page.$eval('header #version', (link) => link.textContent), `v${build.version}`);
    assert.ok((await page.$eval('#version', (link) => link.href)).endsWith(`/commit/${build.revision}`));
    for (const selector of [
      'pre .language-markup .token.tag',
      'pre .language-markup .token.keyword',
      'pre .language-bash .token.comment',
      'pre .language-typescript .token.keyword',
      'p .language-markup .token.tag',
      '#params-code .token.keyword',
      '#editor .token.comment',
    ])
      assert.ok(await page.$(selector), selector);
    const html = await page.$eval('#lesson pre .language-markup', (element) => element.textContent);
    // Use the published package layout, using the guide runtime as the fixture. The package test executes the actual production scripts.
    const manifest = await validate(output);
    const packageDir = join(artifacts, 'node_modules/vexflow/build/cjs');
    await mkdir(packageDir, { recursive: true });
    await copyFile(join(output, manifest.paths['runtime/vexflow.js']), join(packageDir, 'vexflow-bravura.js'));
    const standalone = join(artifacts, 'setup.html');
    await writeFile(standalone, html);
    await page.goto(pathToFileURL(standalone).href);
    await page.waitForSelector('#score svg .vf-stavenote');
    assert.equal(await page.$$eval('.vf-stavenote', (items) => items.length), 1);
    assert.deepEqual(errors, []);
    assert.deepEqual(failures, []);
  });

  await test('the cover leads into the tutorial and simultaneous examples edit independently', async () => {
    await page.goto(origin + '/guide/');
    await page.waitForSelector('.start-reading');
    assert.equal(await page.$eval('#tutorial-index h1', (el) => el.textContent), 'The VexFlow Tutorial');
    assert.equal(await page.$$eval('#chapter-directory ol li', (els) => els.length), tutorial.length);
    assert.equal(await page.$('iframe'), null);
    await page.click('.start-reading');
    await rendered('first tutorial step');
    await page.click('#next');
    await page.waitForSelector('#lesson [data-example="held-note"] iframe');
    assert.equal(await page.$eval('#title', (el) => el.textContent), 'EasyScore, VexTab, and the native API');
    assert.equal(await page.$eval('#next', (el) => el.hash), '#lesson/notation');
    await page.click('#next');
    await page.waitForSelector('[data-example="rhythm-basics"] iframe');
    const scores = '[data-example]';
    assert.deepEqual(await page.$$eval(scores, (els) => els.map((el) => el.dataset.example)), [
      'held-note',
      'two-pitches',
      'chord-and-answer',
      'rhythm-basics',
    ]);
    const chord = '[data-example="chord-and-answer"]';
    const original = await page.$eval(chord + ' .editor', (el) => el.textContent);
    const firstCode = await page.$eval('#editor', (el) => el.textContent);
    await page.$eval(chord + ' .editor', (el) => {
      el.textContent += '\nconsole.log("edited chord");';
      el.dispatchEvent(new Event('input'));
    });
    await page.waitForFunction(() =>
      document
        .querySelector('[data-example="chord-and-answer"] [data-part="logs"]')
        .textContent.includes('edited chord')
    );
    assert.equal(await page.$eval('#editor', (el) => el.textContent), firstCode);
    await page.goto(origin + '/guide/#lesson/notation/chord-and-answer');
    await page.waitForFunction(
      () => document.activeElement.closest('[data-example]')?.dataset.example === 'chord-and-answer'
    );
    assert.match(await page.$eval(chord + ' .editor', (el) => el.textContent), /edited chord/);
    await page.click(chord + ' [data-part="reset"]');
    assert.equal(await page.$eval(chord + ' .editor', (el) => el.textContent), original);
    assert.equal(await page.$$eval('[id]', (els) => new Set(els.map((e) => e.id)).size === els.length), true);
    await page.goto(origin + '/guide/#tutorial');
    await page.waitForSelector('.start-reading', { visible: true });
    await page.goBack();
    await page.waitForFunction(
      () => document.activeElement.closest('[data-example]')?.dataset.example === 'chord-and-answer'
    );
    assert.deepEqual(errors, []);
  });

  await test('the tutorial includes every EasyScore lesson and illustrated feature and ends at the native guide', async () => {
    assert.deepEqual(
      tutorial.toSorted(),
      lessons
        .filter((lesson) => lesson.section === 'tutorial')
        .map((lesson) => lesson.id)
        .sort()
    );
    assert.equal(
      lessons.some((lesson) => lesson.section === 'easyscore'),
      false
    );
    assert.equal(tutorial[1], 'choose-api');
    assert.equal(tutorial.at(-1), 'native-handoff');
    const illustrated = lessons
      .filter((lesson) => lesson.section === 'tutorial')
      .flatMap((lesson) => lesson.features.map((item) => item.id));
    assert.deepEqual(new Set(illustrated), new Set(featureCatalog.flatMap((s) => s.entries.map(([id]) => id))));
    await visit('lesson/choose-api');
    assert.equal(await page.$eval('.language-vextab .keyword', (element) => element.textContent), 'staff');
    await visit('lesson/native-handoff');
    await page.click('#next');
    await page.waitForFunction(() => document.querySelector('#title').textContent === 'Renderer and drawing lifecycle');
    assert.equal(new URL(page.url()).hash, '#lesson/native-lifecycle');
    assert.equal(await page.$eval('.site-header [aria-current=page]', (link) => link.textContent), 'Native API');
  });

  await test('all lesson routes render and all local source references exist', async () => {
    const ids = new Set(lessons.map((lesson) => lesson.id));
    assert.equal(ids.size, lessons.length);
    for (const lesson of lessons) {
      for (const related of lesson.related) assert.ok(ids.has(related), `${lesson.id}: ${related}`);
      for (const source of lesson.sources.filter((value) => value.startsWith('repo:')))
        await stat(resolve(source.slice(5)));
      await visit(`lesson/${lesson.id}`);
      assert.equal(await page.$eval('#title', (element) => element.textContent), lesson.title);
      assert.equal(await page.$$eval('#navigation [aria-current=page]', (elements) => elements.length), 1);
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(failures, []);
  });

  await test('every teaching and playground example renders with all three bundled music fonts', async () => {
    for (const example of examples) {
      await visit(`playground/${example.id}`);
      for (const control of example.controls) {
        const variants = control.choices ?? (control.min === undefined ? [] : [control.min, control.max]);
        for (const value of new Set([...variants, control.value])) {
          await page.$eval(
            '#control-' + control.key,
            (input, value) => {
              input.value = String(value);
              input.dispatchEvent(new Event('input', { bubbles: true }));
            },
            value
          );
          await rendered(example.id + ': ' + control.key + '=' + value);
        }
      }
      for (const font of ['Bravura', 'Petaluma', 'Gonville']) {
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

  await test('the print lesson starts its second page on the specified measure', async () => {
    await visit('playground/paper-edition');
    const source = await page.$eval('#editor', (editor) => editor.textContent);
    const frame = page.frames().find((item) => item.url() === 'about:srcdoc');
    const readPage = () => frame.$eval('#score svg metadata', (data) => JSON.parse(data.textContent));
    assert.deepEqual((await readPage()).measures, [1]);

    // Follow the lesson's two edits and inspect the same metadata that travels with the printed SVG.
    const secondPage = source.replace('const pageNumber = 1', 'const pageNumber = 2');
    await edit(secondPage);
    await rendered('page two before moving the turn');
    assert.deepEqual((await readPage()).measures, [2, 3, 4]);

    await edit(secondPage.replace('pageBreaks: [2]', 'pageBreaks: [4]'));
    await rendered('turn after measure three');
    assert.deepEqual((await readPage()).measures, [4]);
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
    for (const fragment of ['unknown/not-found', '%E0%A4%A']) {
      await page.goto(origin + '/guide/#' + fragment);
      await page.waitForSelector('.start-reading', { visible: true });
      assert.equal(await page.$('iframe'), null);
    }
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
    assert.ok(
      await page.$eval('header #version', (element) => {
        const { x, y, width, height } = element.getBoundingClientRect();
        return x >= 0 && y >= 0 && width > 0 && height > 0 && x + width <= innerWidth;
      }),
      'version visible in the mobile header'
    );
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
    assert.ok(Object.keys(manifest.files).some((file) => file.endsWith('runtime/editor.mjs')));
    const log = join(artifacts, 'upload.jsonl');
    const published = join(artifacts, 'published.html');
    const store = memoryStore('gs://vexflow.com/guide/');
    const command = join(artifacts, 'gcloud');
    await writeFile(
      command,
      `#!${process.execPath}\nconst fs=require('node:fs');const args=process.argv.slice(2);fs.appendFileSync(${JSON.stringify(log)},JSON.stringify(args)+'\\n');if(args[1]==='cp')fs.copyFileSync(args[2],${JSON.stringify(published)});if(args[1]==='cat')process.stdout.write(fs.readFileSync(${JSON.stringify(published)}));`
    );
    await chmod(command, 0o755);
    await upload({ command, store });
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
    const asset = join(output, manifest.paths['style.css']);
    const original = await readFile(asset);
    try {
      await writeFile(asset, 'changed');
      await assert.rejects(upload({ command, store }), /Build changed/);
    } finally {
      await writeFile(asset, original);
    }
    assert.equal((await readFile(log, 'utf8')).trim().split('\n').length, 3);
  });

  if (process.env.GUIDE_SCREENSHOTS) {
    await test('capture representative guide pages on white backgrounds', async () => {
      for (const [id, name] of [
        ['welcome', 'guide-quickstart'],
        ['notation', 'guide-notation'],
        ['setup', 'guide-setup'],
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
