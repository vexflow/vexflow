// Publish a frozen, verified build to a bucket prefix: immutable assets first, HTML last.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Validate manifest paths and contents before any remote operation. */
export async function validate(directory) {
  const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
  if (!/^assets\/[a-f0-9]{16}$/.test(manifest.assetPath) || !manifest.files['index.html'])
    throw new Error('Invalid static-site manifest.');
  for (const [file, digest] of Object.entries(manifest.files)) {
    if (
      file !== 'index.html' &&
      file !== 'all.html' &&
      (!file.startsWith(manifest.assetPath + '/') || file.split('/').includes('..'))
    )
      throw new Error('Unsafe manifest path.');
    if (hash(await readFile(join(directory, file))) !== digest) throw new Error(`Build changed: ${file}`);
  }
  for (const page of ['index.html', 'all.html'].filter((name) => manifest.files[name])) {
    const html = await readFile(join(directory, page), 'utf8');
    for (const match of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g))
      if (!manifest.files[match[1]]) throw new Error(`Missing page asset: ${match[1]}`);
  }
  return manifest;
}
export async function upload({ destination, dryRun = false, directory, command = 'gcloud', publicURL } = {}) {
  if (!/^gs:\/\/[a-z0-9][a-z0-9._-]+\/(?:[a-zA-Z0-9_-]+\/)+$/.test(destination))
    throw new Error('Use a bucket and nonempty prefix, such as gs://vexflow.com/explorer/.');
  const original = await validate(directory);
  const staging = await mkdtemp(join(tmpdir(), 'vexflow-static-upload-'));
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
    // Publish the optional gallery runner before the index that links to it.
    for (const page of ['all.html', 'index.html'].filter((name) => manifest.files[name])) {
      run([
        'storage',
        'cp',
        join(staging, page),
        destination + page,
        '--predefined-acl=publicRead',
        '--cache-control=public,max-age=60,must-revalidate',
        '--content-type=text/html',
      ]);
      if (!dryRun && hash(run(['storage', 'cat', destination + page], true)) !== manifest.files[page])
        throw new Error(`Uploaded HTML differs from the build (${page}). Check for a concurrent upload.`);
    }
    console.log(
      dryRun ? 'Dry run complete. No files uploaded.' : `Published ${destination}${publicURL ? ` → ${publicURL}` : ''}`
    );
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
