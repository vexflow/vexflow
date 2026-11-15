// Compare generated PNG suites and produce a compact, reviewable HTML/JSON report.
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { createCanvas, loadImage } from 'canvas';

import { comparePixels } from './render-metrics.mjs';

/** Decode a PNG into pixels using the same existing Canvas dependency as image generation. */
async function pixels(path) {
  const image = await loadImage(await readFile(path));
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);
  return { width: image.width, height: image.height, data: context.getImageData(0, 0, image.width, image.height).data };
}

/** Fail on empty suites, missing images, decode errors, size changes, or pixel changes. */
export async function compareDirectories(reference, current, output, prefix = '') {
  const list = async (directory) =>
    (await readdir(directory)).filter((name) => name.endsWith('.png') && name.startsWith(prefix));
  const before = await list(reference);
  const after = await list(current);
  if (!before.length || !after.length) throw new Error('Both image suites must contain matching PNG files.');
  await mkdir(output, { recursive: true });
  const results = [];
  for (const name of [...new Set([...before, ...after])].sort()) {
    const result = { name, status: 'passed' };
    if (!before.includes(name) || !after.includes(name)) {
      result.status = 'missing';
    } else {
      try {
        const a = await pixels(join(reference, name));
        const b = await pixels(join(current, name));
        if (a.width !== b.width || a.height !== b.height) {
          result.status = 'size changed';
        } else {
          const comparison = comparePixels(a.data, b.data);
          Object.assign(result, {
            changedPixels: comparison.changed,
            changedRatio: comparison.ratio,
            maxDelta: comparison.maxDelta,
          });
          if (comparison.changed) {
            result.status = 'changed';
            const canvas = createCanvas(a.width, a.height);
            const ctx = canvas.getContext('2d');
            const image = ctx.createImageData(a.width, a.height);
            image.data.set(comparison.diff);
            ctx.putImageData(image, 0, 0);
            await writeFile(join(output, `diff-${name}`), canvas.toBuffer('image/png'));
          }
        }
        if (result.status !== 'passed') {
          await copyFile(join(reference, name), join(output, `before-${name}`));
          await copyFile(join(current, name), join(output, `after-${name}`));
        }
      } catch (error) {
        result.status = 'error';
        result.error = error.message;
      }
    }
    results.push(result);
  }
  const failed = results.filter((result) => result.status !== 'passed');
  await writeFile(
    join(output, 'results.json'),
    JSON.stringify({ total: results.length, failed: failed.length, results }, null, 2)
  );
  await writeFile(join(output, 'results.txt'), failed.map((result) => `${result.name}: ${result.status}`).join('\n'));
  const escape = (text) =>
    String(text).replace(
      /[&<>"']/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]
    );
  const cards = failed
    .map(
      (result) =>
        `<article><h2>${escape(result.name)}</h2><p>${escape(result.status)} · ${result.changedPixels ?? 0} changed pixels · ${((result.changedRatio ?? 0) * 100).toFixed(3)}%</p>${[
          'before',
          'after',
          ...(result.status === 'changed' ? ['diff'] : []),
        ]
          .filter(() => !['missing', 'error'].includes(result.status))
          .map(
            (kind) =>
              `<figure><figcaption>${kind}</figcaption><img loading="lazy" src="${encodeURIComponent(`${kind}-${result.name}`)}"></figure>`
          )
          .join('')}</article>`
    )
    .join('');
  await writeFile(
    join(output, 'index.html'),
    `<!doctype html><meta charset="utf-8"><title>VexFlow visual comparison</title><style>body{font:15px system-ui;background:#f4f6f9;color:#17283c;margin:32px}article{background:white;padding:20px;margin:20px 0;border:1px solid #dce3ed;border-radius:10px}h2{font-size:17px}figure{display:inline-block;max-width:100%;margin:8px}img{max-width:100%;border:1px solid #ddd}figcaption{padding:6px;color:#52657c}</style><h1>Visual comparison</h1><p>${results.length} images · ${failed.length} need review</p>${cards}`
  );
  return { total: results.length, failed: failed.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [reference = 'reference', prefix = ''] = process.argv.slice(2);
  try {
    const result = await compareDirectories(
      `build/images/${reference}`,
      'build/images/current',
      'build/images/diff',
      prefix
    );
    console.log(`${result.total} images; ${result.failed} failures. Open build/images/diff/index.html`);
    process.exitCode = result.failed ? 1 : 0;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
