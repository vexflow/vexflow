// Publish the reviewed illustrated report under its permanent website URL.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { externalFonts, linkAssets, writeAssets } from '../site-assets.mjs';
import { upload } from '../static-site-upload.mjs';

const jsonFiles = ['changes.json', 'render-inventory.json'];
const destination = 'gs://vexflow.com/reports/whatsnew/';
const publicURL = 'https://vexflow.com/reports/whatsnew/';
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Include only the report's own resources and the score images named by its inventory. */
function reportAssets(figures, html) {
  const paths = new Set(['assets/report.css', 'assets/app.js']);
  // Older offline reports still use their bundled Academico face and link its license.
  if (html.includes('href="assets/font-license.txt"')) {
    paths.add('assets/academico.woff2');
    paths.add('assets/font-license.txt');
  }
  for (const figure of figures) {
    for (const path of figure.left ? [figure.left, figure.right] : [figure.right]) {
      if (typeof path !== 'string' || !/^assets\/[\w-]+\.png$/.test(path))
        throw new Error(`Invalid image path: ${path}`);
      paths.add(path);
    }
  }
  return [...paths].sort();
}

/** Rewrite the static links and interactive gallery using the exact HTML that was reviewed. */
function publishHTML(html, relocate, figures) {
  const dataScript = /(<script type="application\/json" id="report-data">)([^<]*)(<\/script>)/;
  if (!dataScript.test(html)) throw new Error('Missing embedded report data.');
  return html
    .replace(
      /\b(src|href)="((?:\.\/)?assets\/[^"]+)"/g,
      (_, attr, path) => `${attr}="${relocate(path.replace(/^\.\//, ''))}"`
    )
    .replace(dataScript, (_, start, json, end) => {
      const data = JSON.parse(json);
      // Catch a partially copied report before exposing mismatched exhibits and downloads.
      if (JSON.stringify(data.figures) !== JSON.stringify(figures)) throw new Error('HTML and JSON exhibits differ.');
      data.figures = publishedFigures(figures, relocate);
      return start + JSON.stringify(data).replaceAll('<', '\\u003c') + end;
    });
}

/** Preserve exhibit metadata while pointing both sides of each comparison at the frozen assets. */
function publishedFigures(figures, relocate) {
  return figures.map((figure) => ({
    ...figure,
    ...(figure.left ? { left: relocate(figure.left) } : {}),
    right: relocate(figure.right),
  }));
}

/** Freeze the asset set and build the checksum manifest consumed by the shared website publisher. */
export async function stageReport(source, staging) {
  const data = JSON.parse(await readFile(join(source, 'changes.json'), 'utf8'));
  const page = await readFile(join(source, 'index.html'), 'utf8');
  const assets = new Map();
  for (const path of reportAssets(data.figures, page)) assets.set(path, await readFile(join(source, path)));
  const inputs = new Map([...assets].map(([path, bytes]) => [basename(path), bytes]));
  inputs.set('report.css', Buffer.from(externalFonts(inputs.get('report.css').toString(), inputs)));
  const graph = linkAssets(inputs);
  const manifest = await writeAssets(staging, graph);
  const files = manifest.files;
  const relocate = (path) => {
    if (!assets.has(path)) throw new Error('Unknown report asset: ' + path);
    return './' + graph.paths[basename(path)];
  };
  const html = publishHTML(page, relocate, data.figures);
  data.figures = publishedFigures(data.figures, relocate);
  const inventory = await readFile(join(source, 'render-inventory.json'));
  JSON.parse(inventory); // Check the second download before touching the bucket.
  for (const [path, bytes] of [
    ['index.html', html],
    ['changes.json', JSON.stringify(data, null, 2)],
    ['render-inventory.json', inventory],
  ]) {
    await writeFile(join(staging, path), bytes);
    files[path] = digest(bytes);
  }
  await writeFile(join(staging, 'manifest.json'), JSON.stringify(manifest));
}

/** Stage in isolation so a dry run or failed upload never modifies the offline bundle. */
export async function publishReport(source, { dryRun = false, command = 'gcloud', store } = {}) {
  const staging = await mkdtemp(join(tmpdir(), 'vexflow-whatsnew-'));
  try {
    await stageReport(source, staging);
    await upload({ directory: staging, destination, publicURL, jsonFiles, dryRun, command, store });
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

/** Reuse an existing review build, or generate and browser-check a fresh report on demand. */
async function main(args) {
  if (args.some((arg) => !['--dry-run', '--rebuild'].includes(arg)))
    throw new Error('Usage: npm run whatsnew:upload -- [--dry-run] [--rebuild]');
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const source = join(root, 'build/whatsnew');
  if (args.includes('--rebuild') || !existsSync(join(source, 'index.html'))) {
    for (const script of ['build', 'verify']) {
      execFileSync(process.execPath, [`tools/whatsnew/${script}.mjs`], { cwd: root, stdio: 'inherit' });
    }
  }
  await publishReport(source, { dryRun: args.includes('--dry-run') });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main(process.argv.slice(2));
