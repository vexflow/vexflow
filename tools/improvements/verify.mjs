// Verify the static bundle offline and under its requested deployment prefix, including keyboard and mobile navigation.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep, join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const root = resolve('build/improvements'),
  evidence = resolve('build/improvements-work/verification');
await mkdir(evidence, { recursive: true });
const data = JSON.parse(await readFile(join(root, 'changes.json'), 'utf8'));
const figures = new Map(data.figures.map((x) => [x.id, x]));
assert.equal(figures.size, data.figures.length);
for (const [, , items] of data.topics) {
  for (const [title, , , ...ids] of items) {
    assert.ok(ids.length && ids.every((id) => figures.has(id)), 'Missing evidence for ' + title);
  }
}
assert.ok(data.commits.every((c) => figures.get(c.figure)?.source.endsWith('/commit/' + c.hash)));
const issue = data.topics.flatMap((t) => t[2]).find(([title]) => title === 'Chord clearance across barlines');
assert.match(figures.get(issue[3]).source, /issues\/375#issuecomment-/);
assert.ok(figures.get(issue[3]).left);

for (const figure of figures.values()) {
  for (const file of [figure.left, figure.right].filter(Boolean)) {
    assert.ok(resolve(root, file).startsWith(root + sep));
    const bytes = await readFile(join(root, file));
    assert.equal(bytes.toString('ascii', 1, 4), 'PNG');
    assert.ok(bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0);
  }
}
const browser = await createRequire(new URL('../../tests/web/package.json', import.meta.url))(
  'playwright'
).chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [],
    network = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const prefix = '/reports/ai2026/';
  await page.route('**/*', async (route) => {
    const u = new URL(route.request().url());
    if (u.protocol === 'file:') return route.continue();
    if (u.hostname !== 'verify.test' || !u.pathname.startsWith(prefix)) {
      network.push(u.href);
      return route.abort();
    }
    const name = decodeURIComponent(u.pathname.slice(prefix.length)) || 'index.html';
    const file = resolve(root, name);
    assert.ok(file.startsWith(root + sep));
    const mime = {
      '.woff2': 'font/woff2',
      '.html': 'text/html',
      '.png': 'image/png',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
    };
    await route.fulfill({ body: await readFile(file), contentType: mime[extname(file)] ?? 'text/plain' });
  });
  for (const url of [pathToFileURL(join(root, 'index.html')).href, 'https://verify.test' + prefix]) {
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.title(), 'VexFlow · Changes since 5.0.0');
    assert.equal(await page.locator('.tiles img').count(), 24);
    const before = await page.locator('.change:visible').count();
    await page.locator('#search').fill('rasgueado');
    assert.ok((await page.locator('.change:visible').count()) < before);
    await page.locator('.change:visible [data-plate]').first().click();
    assert.equal(await page.locator('dialog').isVisible(), true);
    await page.keyboard.press('Escape');
    await page.locator('dialog').waitFor({ state: 'hidden' });
    await page.locator('#search').fill('');
    // A change's pictures follow editorial order, then continue into the next change.
    const changes = await page
      .locator('.change')
      .evaluateAll((rows) => rows.flatMap((el) => el.dataset.exhibits.split(' ')));
    await page.locator('.change [data-plate]').first().click();
    assert.equal(await page.locator('#previous-plate').isDisabled(), true);
    await page.getByRole('button', { name: 'Next exhibit' }).click();
    assert.equal(new URL(page.url()).hash, '#plate-' + changes[1]);
    await page.keyboard.press('ArrowLeft');
    assert.equal(new URL(page.url()).hash, '#plate-' + changes[0]);
    await page.locator('#close').click();
    await page.locator('dialog').waitFor({ state: 'hidden' });
    assert.equal(
      await page
        .locator('.change [data-plate]')
        .first()
        .evaluate((el) => el === document.activeElement),
      true
    );

    // The lightbox follows all matching results, even those beyond the first page of tiles.
    await page.locator('#figure-type').selectOption('Comparison');
    const comparisons = data.figures.filter((f) => f.status === 'Comparison');
    await page.locator('#figures a').nth(23).click();
    assert.equal(await page.locator('#plates figure').count(), 2);
    await page.keyboard.press('ArrowRight');
    assert.equal(new URL(page.url()).hash, '#plate-' + comparisons[24].id);
    assert.equal(await page.locator('#plate-position').innerText(), '25 of ' + comparisons.length);
    await page.goBack();
    await page.locator('dialog').waitFor({ state: 'hidden' });
    await page.goForward();
    await page.locator('dialog[open]').waitFor();
    assert.equal(new URL(page.url()).hash, '#plate-' + comparisons[24].id);
    await page.keyboard.press('Escape');
    await page.locator('dialog').waitFor({ state: 'hidden' });
    await page.locator('#api-query').fill('rasgueado');
    await page.locator('#api-list summary').first().click();
    assert.match(await page.locator('#api-list pre').first().textContent(), /rasgueado/i);
    await page.locator('#commit-query').fill('release vexflow 5.2.0');
    assert.ok((await page.locator('#commit-list details').count()) > 0);
    await page.goto(url + '#plate-example-string-mute-bend');
    await page.locator('dialog[open] img').first().waitFor();
    assert.ok(
      await page
        .locator('dialog[open] img')
        .first()
        .evaluate((im) => im.decode().then(() => im.naturalWidth > 0))
    );
  }
  await page.goto('https://verify.test' + prefix);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(evidence, 'desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: join(evidence, 'mobile.png') });
  await page.locator('.change [data-plate]').first().click();
  await page.locator('#next-plate').click();
  assert.ok(await page.locator('#previous-plate').isVisible());
  assert.equal(await page.locator('dialog').evaluate((el) => el.scrollWidth <= el.clientWidth), true);
  await page.locator('#plates img').evaluateAll((imgs) => Promise.all(imgs.map((im) => im.decode())));
  await page.screenshot({ path: join(evidence, 'viewer-mobile.png') });
  assert.deepEqual(errors, []);
  assert.deepEqual(network, []);
  console.log('Verified file and prefixed HTTP navigation, images, keyboard, inventories and mobile layout.');
} finally {
  await browser.close();
}
