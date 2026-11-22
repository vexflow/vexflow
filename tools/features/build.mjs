// Build the standalone feature catalog from reviewed score screenshots, then optionally publish it.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from 'canvas';
import { sections, highlights } from './catalog.mjs';
import { page } from './page.mjs';
import { digest, externalFonts, linkAssets, writeAssets } from '../site-assets.mjs';
import { siteTheme } from '../site-theme.mjs';
import { upload, validate } from '../static-site-upload.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const output = join(here, '../../build/features');
const sources = JSON.parse(await readFile(join(here, 'sources.json'), 'utf8'));

// Select a musical passage from full pages and comparison sheets. Values are fractions of the original.
const passages = {
  'grand-staff': [0.015, 0.103, 0.97, 0.163],
  pdf: [0.07, 0.12, 0.9, 0.215],
  'lead-sheets': [0, 0, 1, 0.46],
  'guitar-tab': [0, 0, 1, 0.56],
  'guitar-chords': [0, 0, 1, 0.48],
  'cross-staff': [0.02, 0.175, 0.955, 0.74],
  rasgueado: [0, 0.16, 1, 0.6],
  condense: [0.04, 0.237, 0.94, 0.32],
  polymeter: [0.015, 0.095, 0.963, 0.27],
  'figured-bass': [0.025, 0.22, 0.49, 0.27],
  harp: [0.015, 0.235, 0.96, 0.32],
  accordion: [0.012, 0.23, 0.96, 0.31],
  lute: [0.015, 0.265, 0.95, 0.3],
  chant: [0.018, 0.213, 0.56, 0.15],
};

/** Trim only background around an excerpt. The enlarged view always retains the entire original. */
function preview(image, region = [0, 0, 1, 1]) {
  const [x, y, w, h] = region.map((n, i) => Math.round(n * (i % 2 ? image.height : image.width)));
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(image, x, y, w, h, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  let left = w,
    right = -1,
    top = h,
    bottom = -1;
  for (let row = 0; row < h; row++) {
    for (let column = 0; column < w; column++) {
      if (data[(row * w + column) * 4] > 205) continue;
      left = Math.min(left, column);
      right = Math.max(right, column);
      top = Math.min(top, row);
      bottom = Math.max(bottom, row);
    }
  }
  assert.ok(right >= left && bottom >= top, 'Empty score excerpt');
  const width = right - left + 1,
    height = bottom - top + 1;
  const scale = Math.min(1, 1000 / width, 450 / height);
  const out = createCanvas(Math.ceil(width * scale) + 20, Math.ceil(height * scale) + 20);
  const dest = out.getContext('2d');
  dest.fillStyle = 'white';
  dest.fillRect(0, 0, out.width, out.height);
  dest.drawImage(canvas, left, top, width, height, 10, 10, width * scale, height * scale);
  return out.toBuffer('image/png');
}

/** Validate the inventory, hash all files, and publish the new local index only after its assets exist. */
async function build() {
  const inputs = new Map();
  const css = siteTheme + (await readFile(join(here, 'features.css'), 'utf8'));
  inputs.set('features.css', Buffer.from(externalFonts(css, inputs, 'features.css')));
  inputs.set('features.js', await readFile(join(here, 'features.js')));
  const features = [];
  for (const [category, section] of sections.entries()) {
    for (const [id, title, description, exhibit, keywords] of section.entries) {
      assert.match(id, /^[a-z][a-z0-9-]*$/);
      const { url, label, availability = '' } = sources[exhibit];
      const full = await readFile(join(here, 'images', exhibit + '.png'));
      const image = await loadImage(full);
      inputs.set(id + '.png', full);
      inputs.set(id + '-preview.png', preview(image, passages[id]));
      features.push({ id, title, description, keywords, category, availability, url, label });
    }
  }
  const ids = new Set(features.map((f) => f.id));
  assert.equal(ids.size, features.length, 'Feature IDs must be unique');
  assert.equal(new Set(highlights).size, 15);
  assert.ok(highlights.every((id) => ids.has(id)));
  const graph = linkAssets(inputs);
  await mkdir(dirname(output), { recursive: true });
  const stage = await mkdtemp(join(dirname(output), 'features-stage-'));
  try {
    const manifest = await writeAssets(stage, graph);
    const html = page(features, graph.paths);
    await writeFile(join(stage, 'index.html'), html);
    manifest.files['index.html'] = digest(html);
    await writeFile(join(stage, 'manifest.json'), JSON.stringify(manifest));
    await validate(stage);
    // Keep prior versioned files available for a reader with an older local page open.
    await mkdir(output, { recursive: true });
    await writeAssets(output, graph);
    await rename(join(stage, 'manifest.json'), join(output, 'manifest.json'));
    await rename(join(stage, 'index.html'), join(output, 'index.html'));
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
  console.log('Built ' + features.length + ' illustrated features in ' + output);
}

const args = process.argv.slice(2);
if (!['build', 'upload'].includes(args[0]) || args.slice(1).some((a) => args[0] !== 'upload' || a !== '--dry-run'))
  throw Error('Usage: build.mjs build | upload [--dry-run]');
await build();
if (args[0] === 'upload')
  await upload({
    directory: output,
    destination: 'gs://vexflow.com/features/',
    publicURL: 'https://vexflow.com/features/',
    dryRun: args.includes('--dry-run'),
  });
