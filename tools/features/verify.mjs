// Exercise the generated site at its production prefix, including keyboard, mobile, deep links and every image.
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { sections, highlights } from './catalog.mjs';
const { chromium } = createRequire(new URL('../../tests/web/package.json', import.meta.url))('playwright');
const output = new URL('../../build/features/', import.meta.url);
const captures = new URL('../../build/features-verification/', import.meta.url);
const remote = process.argv.includes('--live');
const prefix = remote ? 'https://vexflow.com/features/' : 'https://features.test/features/';
const count = sections.reduce((sum, s) => sum + s.entries.length, 0);
await mkdir(captures, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  if (!remote)
    await page.route('https://features.test/features/**', async (route) => {
      const path = new URL(route.request().url()).pathname.slice('/features/'.length) || 'index.html';
      const types = {
        html: 'text/html',
        js: 'application/javascript',
        css: 'text/css',
        png: 'image/png',
        woff2: 'font/woff2',
        ttf: 'font/ttf',
      };
      await route.fulfill({ body: await readFile(new URL(path, output)), contentType: types[path.split('.').pop()] });
    });
  await page.goto(prefix);
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.title(), 'Features · VexFlow');
  assert.equal(await page.locator('.card:visible').count(), count);
  assert.equal(await page.locator('#rotate').textContent(), 'Play');
  // Decode both sizes, including cards below the lazy-loading threshold.
  await page.locator('.card').evaluateAll(async (cards) => {
    for (const card of cards) {
      for (const src of [card.querySelector('img').src, card.dataset.full]) {
        const image = new Image();
        image.src = src;
        await image.decode();
        if (!image.naturalWidth) throw Error(src);
      }
    }
  });
  await page.screenshot({ path: fileURLToPath(new URL('desktop.png', captures)) });
  const titles = new Set();
  for (const id of highlights) {
    assert.equal(await page.locator('#hero-open').getAttribute('href'), '#feature-' + id);
    titles.add(await page.locator('#slide-title').innerText());
    await page.locator('#slide-next').click();
  }
  assert.equal(titles.size, 15);
  await page.locator('#hero-open').click();
  assert.equal(await page.locator('#view-count').textContent(), '1 / 15');
  await page.keyboard.press('ArrowRight');
  assert.equal(new URL(page.url()).hash, '#feature-' + highlights[1]);
  await page.keyboard.press('Escape');
  await page.locator('dialog').waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(() => document.activeElement.id), 'hero-open');
  await page.locator('#query').fill('taorluath');
  assert.equal(await page.locator('.card:visible').count(), 1);
  await page.locator('.card:visible .open').click();
  assert.equal(await page.locator('#view-title').innerText(), 'Highland embellishments');
  const link = page.url();
  await page.goto(prefix);
  await page.goto(link);
  await page.locator('dialog[open]').waitFor();
  assert.equal(await page.locator('#view-count').innerText(), '1 / 1');
  await page.locator('#close').click();
  assert.equal(new URL(page.url()).searchParams.get('q'), 'taorluath');
  await page.locator('#query').fill('xyzq');
  assert.ok(await page.locator('#empty').isVisible());
  await page.locator('#reset').click();
  await page.locator('aside a[data-category="1"]').click();
  assert.equal(await page.locator('.card:visible').count(), sections[1].entries.length);
  await page.reload();
  assert.equal(await page.locator('.category:visible').count(), 1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(prefix);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: fileURLToPath(new URL('mobile.png', captures)) });
  await page.locator('#category-select').selectOption(String(sections.length - 1));
  await page.locator('.card:visible .open').first().click();
  assert.equal(await page.locator('#view-title').innerText(), 'Harp pedal diagrams');
  await page.locator('#view-img').evaluate((img) => img.decode());
  await page.screenshot({ path: fileURLToPath(new URL('viewer.png', captures)) });
  await page.locator('#close').click();
  // A reader who allows motion gets a timed advance and can stop it.
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.goto(prefix);
  await page.mouse.move(0, 0);
  await page.clock.runFor(8200);
  assert.equal(await page.locator('#hero-open').getAttribute('href'), '#feature-' + highlights[1]);
  await page.locator('#rotate').click();
  await page.locator('#query').focus();
  await page.mouse.move(0, 0);
  await page.clock.runFor(9000);
  assert.equal(await page.locator('#hero-open').getAttribute('href'), '#feature-' + highlights[1]);
  assert.deepEqual(errors, []);
  console.log(
    'Verified ' +
      count +
      ' features, 15 slides, image decoding, filters, keyboard, sharing and mobile layout at ' +
      prefix
  );
} finally {
  await browser.close();
}
