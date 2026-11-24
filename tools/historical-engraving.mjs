// Retrieve the original 5.2.0 visual control from its GitHub release. New npm packages contain production code only.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = new URL('../', import.meta.url);
const { historicalRelease } = JSON.parse(await readFile(new URL('tests/engraving/manifest.json', root), 'utf8'));
const member = 'package/build/cjs/vexflow-debug-with-tests.js';
const cached = join('build/m0-release', member);
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Preserve the exact historical bytes used by the gallery, including for offline rebuilds. */
export async function historicalEngravingBundle() {
  try {
    const bytes = await readFile(cached);
    assert.equal(digest(bytes), historicalRelease.bundleSHA256, 'Unexpected cached engraving reference');
    return bytes;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const tag = historicalRelease.tag;
  const url = `https://github.com/vexflow/vexflow/releases/download/${tag}/vexflow-${tag}.tgz`;
  const response = await fetch(url);
  if (!response.ok) throw Error(`Could not fetch historical release: HTTP ${response.status} from ${url}`);
  const archive = Buffer.from(await response.arrayBuffer());
  assert.equal(digest(archive), historicalRelease.archiveSHA256, 'Unexpected historical release archive');
  const bytes = execFileSync('tar', ['-xzOf', '-', member], { input: archive, maxBuffer: 16 * 1024 * 1024 });
  assert.equal(digest(bytes), historicalRelease.bundleSHA256, 'Unexpected historical engraving reference');

  await mkdir(dirname(cached), { recursive: true });
  const staging = await mkdtemp(join(dirname(cached), 'download-'));
  try {
    const file = join(staging, 'bundle.js');
    await writeFile(file, bytes);
    await rename(file, cached);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
  return bytes;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await historicalEngravingBundle();
  console.log(cached);
}
