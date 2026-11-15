// Render the same visual examples against a selected bundle for before/after review.
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import puppeteer from 'puppeteer';

import { renderExamples } from './p2-examples.mjs';

const bundle = resolve(process.argv[2] ?? 'build/cjs/vexflow-debug.js');
const label = process.argv[3] ?? 'after';
const output = resolve('build/p2-examples');
mkdirSync(output, { recursive: true });
const browser = await puppeteer.launch({
  headless: true,
  args: process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 780, height: 430, deviceScaleFactor: 1 });
  await page.setContent('<div id="score"></div>');
  await page.addScriptTag({ path: bundle });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  for (const issue of [152, 177, 182])
    for (const family of ['Bravura', 'Petaluma']) {
      await page.evaluate(renderExamples, { issue, family });
      await page.screenshot({ path: join(output, `${issue}-${family}-${label}.png`) });
    }
} finally {
  await browser.close();
}
