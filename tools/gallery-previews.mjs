// Export gallery artwork from the Canvas fixtures and interactive score editions. Run after building the debug test bundle.
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
      window.QUnit?.done((result) => {
        window.galleryResult = result;
      })
    );
  });
  for (const [id, title] of process.argv.includes('--interactive') ? [] : pieces) {
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
  // Capture a complete group of systems from the actual viewer. Stop at the widest band
  // of white paper near the requested height so the preview never cuts through a stave.
  for (const id of ['saints', 'electric', 'prelude', 'quartertones', 'drums', 'falseta', 'sumer', 'kesh']) {
    await page.goto(new URL('../tests/scores/index.html?piece=' + id, import.meta.url).href);
    await page.waitForFunction(() => !document.getElementById('tools').hidden);
    await page.$eval('#highlight', (el) => {
      el.hidden = true;
    });
    const svg = await page.$('#score svg');
    const rect = await svg.boundingBox();
    // Show the final system of High Wire so the cover includes the tapped run and timed bend.
    if (id === 'electric') {
      // Include the bowing and legato marks above the high ledger notes.
      const upper = await svg.$eval('[id="vf-staff-7-0-1"]', (note) => note.getBoundingClientRect().top);
      const inset = Math.max(0, upper - rect.y - 46);
      rect.y += inset;
      rect.height -= inset;
    }
    // The opening four bars show both dynamic levels and both directions of hairpin.
    if (id === 'prelude') {
      const thirdSystem = await svg.$$eval('.vf-stave', (staves) => staves[8].getBoundingClientRect().top);
      rect.height = thirdSystem - rect.y - 32;
    }
    const top = await page.evaluate(() => scrollY);
    const bytes = await page.screenshot({
      type: 'png',
      clip: { x: rect.x, y: top + rect.y, width: rect.width, height: Math.min(900, rect.height) },
    });
    const image = await page.evaluate(
      async (data, fullExcerpt) => {
        const img = new Image();
        img.src = 'data:image/png;base64,' + data;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const pixels = ctx.getImageData(0, 0, img.width, img.height).data;
        let largest = 0,
          blank = 0,
          bottom = img.height;
        for (let y = Math.floor(img.width * 0.28); y < Math.min(img.height, img.width * 0.7); y++) {
          let white = true;
          for (let x = 5; x < img.width - 5; x++)
            if (pixels[(y * img.width + x) * 4] < 160) {
              white = false;
              break;
            }
          blank = white ? blank + 1 : 0;
          if (blank > largest) {
            largest = blank;
            bottom = y - Math.floor(blank / 2);
          }
        }
        if (!fullExcerpt && img.height > img.width * 0.53 && largest > 8) canvas.height = bottom;
        ctx.drawImage(img, 0, 0);
        return canvas.toDataURL('image/webp', 0.94).split(',')[1];
      },
      Buffer.from(bytes).toString('base64'),
      id === 'prelude' || id === 'drums'
    );
    await writeFile(new URL('../tests/scores/' + id + '.webp', import.meta.url), Buffer.from(image, 'base64'));
    console.log('Exported interactive ' + id);
  }
} finally {
  await browser.close();
}
