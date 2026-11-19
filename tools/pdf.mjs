// Print standalone Letter scores with VexFlow's publication layout and Chromium's vector PDF printer.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'build/pdfs');
const editions = [
  {
    file: 'minuet',
    render: 'renderMinuet',
    title: 'Minuet in G major · Christian Petzold',
    bars: 32,
    pageEnds: [16, 32],
  },
  {
    file: 'fugue',
    source: 'tests/scores/fugue.js',
    render: 'renderFugue',
    title: 'Fugue No. 6 in D minor · Johann Sebastian Bach',
    bars: 44,
    pageEnds: [20, 44],
  },
  {
    file: 'ballade',
    source: 'tests/scores/ballade.js',
    render: 'renderBallade',
    title: 'Ballade No. 3 in A-flat major · Frédéric Chopin',
    bars: 24,
    pageEnds: [24],
    // The facsimile layout draws directly to a Letter SVG. Crop its first grand staff and ossia.
    previewBox: { x: 0.1, y: 0.12, width: 0.84, height: 0.15 },
  },
];

/** Each edition gets a fresh document so its fonts, paper size and score cannot leak into the next print. */
async function printEdition(browser, edition, staging) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 900, height: 1100, deviceScaleFactor: 1.5 });
    await page.setContent(`<!doctype html><meta charset="utf-8"><title>${edition.title}</title>
      <style>@page { size: Letter; margin: 0 } body { margin: 0 } main > svg { display: block; break-after: page }
      main > svg:last-child { break-after: auto }</style><main></main>`);
    await page.addScriptTag({ path: join(root, 'build/cjs/vexflow-debug.js') });
    if (edition.source) await page.addScriptTag({ path: join(root, edition.source) });
    await page.addScriptTag({ path: join(root, 'demos/pdf', edition.file + '.js') });
    await page.evaluate(async ({ render, title, bars, pageEnds }) => {
      await Promise.all(
        ['16px Bravura', '16px Academico', 'bold 16px Academico'].map((font) => document.fonts.load(font))
      );
      const score = window[render](VexFlow, document.querySelector('main'));
      const pages = score.pages.map((p) => p.systems.flatMap((s) => s.measures));
      const measures = pages.flat();
      if (
        measures.length !== bars ||
        measures.some((m, i) => m !== i + 1) ||
        (pageEnds && (pages.length !== pageEnds.length || pages.some((p, i) => p.at(-1) !== pageEnds[i])))
      )
        throw Error('Unexpected pagination for ' + title + ': ' + JSON.stringify(pages));
      const overflow = score.diagnostics.filter((d) => d.code.endsWith('Overflow'));
      if (overflow.length) throw Error(title + ' exceeded its print margins: ' + JSON.stringify(overflow));
    }, edition);
    await page.pdf({ path: join(staging, edition.file + '.pdf'), preferCSSPageSize: true, printBackground: true });
    // Capture the actual opening system, including the edition's own paper and markings.
    const system = await page.$(edition.previewBox ? 'main > svg' : 'main > svg [data-system="1"]');
    let box = await system.boundingBox();
    if (edition.previewBox) {
      const crop = edition.previewBox;
      box = {
        x: box.x + crop.x * box.width,
        y: box.y + crop.y * box.height,
        width: crop.width * box.width,
        height: crop.height * box.height,
      };
    }
    const preview = await page.screenshot({
      type: 'webp',
      quality: 88,
      encoding: 'base64',
      clip: { x: box.x - 5, y: box.y - 5, width: box.width + 10, height: box.height + 10 },
    });
    return 'data:image/webp;base64,' + preview;
  } finally {
    await page.close();
  }
}

await mkdir(output, { recursive: true });
const channel =
  process.env.PUPPETEER_EXECUTABLE_PATH || existsSync(await puppeteer.executablePath()) ? undefined : 'chrome';
const browser = await puppeteer.launch({
  channel,
  args: process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
});
try {
  const staging = await mkdtemp(join(output, '.print-'));
  try {
    let index = await readFile(join(root, 'demos/pdf/index.html'), 'utf8');
    const files = [];
    for (const edition of editions) {
      const preview = await printEdition(browser, edition, staging);
      index = index.replace('{{' + edition.file + 'Preview}}', preview);
      const layout = edition.file + '.js';
      await copyFile(join(root, 'demos/pdf', layout), join(staging, layout));
      files.push(edition.file + '.pdf', layout);
      if (edition.source) {
        const music = edition.file + '-music.js';
        await copyFile(join(root, edition.source), join(staging, music));
        files.push(music);
      }
    }
    await writeFile(join(staging, 'index.html'), index);
    for (const name of [...files, 'index.html']) {
      await rename(join(staging, name), join(output, name));
      console.log('Generated ' + join(output, name));
    }
    if (process.argv.includes('--upload')) {
      // Let Cloud Storage infer each MIME type from its extension. Publish the index after its links exist.
      const publish = (names) =>
        execFileSync(
          'gcloud',
          [
            'storage',
            'cp',
            ...names,
            'gs://vexflow.com/pdfs/',
            '--predefined-acl=publicRead',
            '--cache-control=public,max-age=60,must-revalidate',
          ],
          { cwd: output, stdio: 'inherit' }
        );
      publish(files);
      publish(['index.html']);
    }
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
} finally {
  await browser.close();
}
