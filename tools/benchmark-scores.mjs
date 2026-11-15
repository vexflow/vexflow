// Measure construction, layout, and drawing after fonts load. Save JSON, SVG, and PNG output.
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer';

import { renderScore } from './score-fixtures.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map((arg) => arg.replace(/^--/, '').split('=')));
const output = resolve(args.output ?? 'build/benchmarks');
const repetitions = Number(args.runs ?? 5);
const systems = Number(args.systems ?? 4);
if (![repetitions, systems].every((n) => Number.isInteger(n) && n > 0 && n <= 100))
  throw new Error('runs and systems must be integers from 1 to 100');
mkdirSync(output, { recursive: true });
const browser = await puppeteer.launch({
  headless: true,
  args: process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1120, height: 850, deviceScaleFactor: 1 });
  await page.setContent('<div id="score"></div>');
  await page.addScriptTag({ path: resolve(args.bundle ?? join(root, 'build/cjs/vexflow-debug.js')) });
  await page.evaluate(async () => {
    await document.fonts.ready;
    VexFlow.setFonts('Bravura', 'Academico');
  });
  const results = [];
  for (const kind of ['chorale', 'piano', 'chamber']) {
    await page.evaluate(renderScore, { kind, systems }); // Warm up the same score before measuring.
    const samples = [];
    for (let run = 0; run < repetitions; run++) {
      const result = await page.evaluate(renderScore, { kind, systems });
      const { svg, ...timing } = result;
      samples.push(timing);
      if (run === repetitions - 1) {
        writeFileSync(join(output, kind + '.svg'), svg);
        await page.screenshot({ path: join(output, kind + '.png'), fullPage: true });
      }
    }
    const median = (key) => samples.map((s) => s[key]).sort((a, b) => a - b)[Math.floor(samples.length / 2)];
    const summary = { kind, systems, staves: samples[0].staves, notes: samples[0].notes };
    for (const key of ['constructionMs', 'layoutMs', 'drawMs', 'totalMs']) summary[key] = median(key);
    results.push({ ...summary, samples });
    console.log(JSON.stringify(summary));
  }
  const report = {
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    bundle: resolve(args.bundle ?? join(root, 'build/cjs/vexflow-debug.js')),
    bundleSHA256: createHash('sha256')
      .update(readFileSync(resolve(args.bundle ?? join(root, 'build/cjs/vexflow-debug.js'))))
      .digest('hex'),
    workingTreeChanged: spawnSync('git', ['diff', '--quiet'], { cwd: root }).status !== 0,
    node: process.version,
    chromium: await browser.version(),
    platform: process.platform,
    arch: process.arch,
    repetitions,
    results,
  };
  writeFileSync(join(output, 'results.json'), JSON.stringify(report, null, 2) + '\n');
} finally {
  await browser.close();
}
