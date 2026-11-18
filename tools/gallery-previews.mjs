// Export gallery artwork from the real Canvas fixtures. Run after building the debug test bundle.
import { writeFile } from 'node:fs/promises';
import puppeteer from 'puppeteer';

const pieces = [
  ['saints', 'When the Saints Go Marching In'],
  ['greensleeves', 'Greensleeves'],
  ['prelude', 'Prelude in C major'],
  ['kesh', 'The Kesh Jig'],
  ['joy', 'Ode to Joy'],
  ['electric', 'High Wire'],
  ['drums', 'Pocket Change'],
  ['quartertones', 'Narrow Steps'],
];

/** Composite on paper white so transparent notation remains legible on any background. */
function exportScore(canvas) {
  const paper = document.createElement('canvas');
  paper.width = canvas.width;
  paper.height = canvas.height;
  const ctx = paper.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, paper.width, paper.height);
  ctx.drawImage(canvas, 0, 0);
  return paper.toDataURL('image/webp', 0.97).split(',')[1];
}

const browser = await puppeteer.launch();
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 800, deviceScaleFactor: 2 });
  await page.evaluateOnNewDocument(() => {
    document.addEventListener('DOMContentLoaded', () =>
      QUnit.done((result) => {
        window.galleryResult = result;
      })
    );
  });
  for (const [id, title] of pieces) {
    const url = new URL('../tests/all.html', import.meta.url);
    url.searchParams.set('module', 'Demo - ' + title);
    await page.goto(url.href);
    await page.waitForFunction(() => window.galleryResult);
    const error = await page.evaluate(
      () => window.galleryResult.failed && document.querySelector('#qunit-tests .fail')?.textContent
    );
    if (error !== 0) throw new Error(title + ': ' + error);
    const image = await page.$eval('canvas.vex-tabdiv', exportScore);
    await writeFile(new URL(`../tests/demos/${id}.webp`, import.meta.url), Buffer.from(image, 'base64'));
    console.log(`Exported ${title}`);
  }
} finally {
  await browser.close();
}
