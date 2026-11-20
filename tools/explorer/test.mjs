// Check that old bookmarks land on a self-contained notice and publication transfers only that page.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { build } from './cli.mjs';
import { validate } from './upload.mjs';

await test('publish only the notice and link to the user guide', async () => {
  const output = await build();
  const manifest = await validate(output);
  assert.deepEqual(Object.keys(manifest.files), ['index.html']);
  assert.deepEqual((await readdir(output)).sort(), ['index.html', 'manifest.json']);
  const html = await readFile(join(output, 'index.html'), 'utf8');
  assert.match(html, /Explorer is deprecated/);
  assert.match(html, /href="https:\/\/vexflow\.com\/guide\/"/);
  assert.doesNotMatch(html, /<(?:script|link|img)\b/i);
  const preview = execFileSync(process.execPath, ['tools/explorer/upload.mjs', '--dry-run'], { encoding: 'utf8' });
  assert.match(preview, /storage cp .*gs:\/\/vexflow\.com\/explorer\/index\.html/);
  assert.doesNotMatch(preview, /rsync|webpack|immutable/);
});
