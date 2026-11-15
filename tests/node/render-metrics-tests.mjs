// Negative controls ensure rendering diagnostics fail for real defects, not just pass fixtures.
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { createCanvas } from 'canvas';

import { analyzeLayout, comparePixels } from '../../tools/render-metrics.mjs';
import { compareDirectories } from '../../tools/visual-regression.mjs';

test('layout diagnostics detect moved notes, clipping, and non-finite bounds', () => {
  const boxes = [
    { id: 'a', group: 'voice', x: 5, y: 5, width: 10, height: 10 },
    { id: 'b', group: 'voice', x: 20, y: 5, width: 10, height: 10 },
  ];
  const viewport = { width: 40, height: 30 };
  assert.deepEqual(analyzeLayout(boxes, viewport), { invalid: [], overflow: [], collisions: [] });
  boxes[1].x = 10;
  assert.equal(analyzeLayout(boxes, viewport).collisions[0].area, 50);
  boxes[1].x = 35;
  assert.equal(analyzeLayout(boxes, viewport).overflow[0].excess, 5);
  boxes[1].x = NaN;
  assert.deepEqual(analyzeLayout(boxes, viewport).invalid, ['b']);
  boxes[1] = { ...boxes[0], id: 'intentional overlap', group: 'other voice' };
  assert.deepEqual(analyzeLayout(boxes, viewport).collisions, []);
});

test('pixel metrics detect color and alpha changes', () => {
  const a = new Uint8Array([255, 255, 255, 255, 0, 0, 0, 255]);
  assert.equal(comparePixels(a, a).changed, 0);
  const b = a.slice();
  b[0] = 250;
  b[7] = 0;
  assert.equal(comparePixels(a, b).changed, 2);
  assert.equal(comparePixels(a, b, 5).changed, 1);
});

test('visual comparison reports changed, missing, resized, and corrupt images', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vexflow-visual-'));
  const before = join(root, 'before');
  const after = join(root, 'after');
  const output = join(root, 'report');
  try {
    await mkdir(before);
    await mkdir(after);
    await assert.rejects(compareDirectories(before, after, output), /must contain/);
    const canvas = createCanvas(20, 20);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 20, 20);
    const white = canvas.toBuffer('image/png');
    await writeFile(join(before, 'same.png'), white);
    await writeFile(join(after, 'same.png'), white);
    assert.deepEqual(await compareDirectories(before, after, output), { total: 1, failed: 0 });
    ctx.fillStyle = 'black';
    ctx.fillRect(5, 5, 2, 2);
    await writeFile(join(before, 'changed.png'), white);
    await writeFile(join(after, 'changed.png'), canvas.toBuffer('image/png'));
    await writeFile(join(before, 'missing.png'), white);
    await writeFile(join(after, 'new.png'), white);
    await writeFile(join(before, 'size.png'), white);
    await writeFile(join(after, 'size.png'), createCanvas(10, 10).toBuffer('image/png'));
    await writeFile(join(before, 'broken.png'), white);
    await writeFile(join(after, 'broken.png'), 'not a PNG');
    assert.deepEqual(await compareDirectories(before, after, output), { total: 6, failed: 5 });
    const report = JSON.parse(await readFile(join(output, 'results.json'), 'utf8'));
    assert.equal(report.results.find((r) => r.name === 'changed.png').changedPixels, 4);
    assert.ok((await readFile(join(output, 'index.html'), 'utf8')).includes('diff-changed.png'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
