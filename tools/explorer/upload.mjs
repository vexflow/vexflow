// Publish a frozen, verified build to a bucket prefix: immutable assets first, HTML last.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { build, output } from './cli.mjs';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Validate manifest paths and contents before any remote operation. */
export async function validate(directory) {
  const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
  if (!/^assets\/[a-f0-9]{16}$/.test(manifest.assetPath) || !manifest.files['index.html'])
    throw new Error('Invalid Explorer manifest.');
  for (const [file, digest] of Object.entries(manifest.files)) {
    if (file !== 'index.html' && (!file.startsWith(manifest.assetPath + '/') || file.split('/').includes('..')))
      throw new Error('Unsafe manifest path.');
    if (hash(await readFile(join(directory, file))) !== digest) throw new Error(`Build changed: ${file}`);
  }
  const html = await readFile(join(directory, 'index.html'), 'utf8');
  for (const match of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g))
    if (!manifest.files[match[1]]) throw new Error(`Missing page asset: ${match[1]}`);
  return manifest;
}
export async function upload({
  destination = 'gs://vexflow.com/explorer/',
  dryRun = false,
  directory = output,
  command = 'gcloud',
} = {}) {
  if (!/^gs:\/\/[a-z0-9][a-z0-9._-]+\/(?:[a-zA-Z0-9_-]+\/)+$/.test(destination))
    throw new Error('Use a bucket and nonempty prefix, such as gs://vexflow.com/explorer/.');
  const original = await validate(directory);
  const staging = await mkdtemp(join(tmpdir(), 'vexflow-explorer-upload-'));
  try {
    // Copy only manifest members. Extra local files must never become public assets.
    for (const file of [...Object.keys(original.files), 'manifest.json']) {
      await mkdir(dirname(join(staging, file)), { recursive: true });
      await copyFile(join(directory, file), join(staging, file));
    }
    const manifest = await validate(staging);
    const run = (args, capture = false) => {
      if (dryRun) {
        console.log([command, ...args].join(' '));
        return '';
      }
      const result = spawnSync(command, args, { encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit' });
      if (result.error) throw result.error;
      if (result.status !== 0)
        throw new Error(`gcloud failed (${result.status ?? result.signal}). HTML publication stopped.`);
      return result.stdout;
    };
    run([
      'storage',
      'rsync',
      join(staging, 'assets/'),
      `${destination}assets/`,
      '--recursive',
      '--checksums-only',
      '--predefined-acl=publicRead',
      '--cache-control=public,max-age=31536000,immutable',
    ]);
    run([
      'storage',
      'cp',
      join(staging, 'index.html'),
      `${destination}index.html`,
      '--predefined-acl=publicRead',
      '--cache-control=public,max-age=60,must-revalidate',
      '--content-type=text/html',
    ]);
    if (!dryRun) {
      const uploaded = run(['storage', 'cat', `${destination}index.html`], true);
      if (hash(uploaded) !== manifest.files['index.html'])
        throw new Error('Uploaded HTML differs from the build. Check for a concurrent upload.');
    }
    console.log(
      dryRun
        ? 'Dry run complete. No files uploaded.'
        : `Published ${destination}${destination === 'gs://vexflow.com/explorer/' ? ' → https://vexflow.com/explorer/' : ''}`
    );
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    if (args.some((arg) => arg !== '--dry-run' && !arg.startsWith('--destination=')))
      throw new Error('Usage: npm run explorer:upload -- [--dry-run] [--destination=gs://bucket/prefix/]');
    await build();
    await upload({
      dryRun: args.includes('--dry-run'),
      destination: args.find((arg) => arg.startsWith('--destination='))?.slice(14),
    });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
