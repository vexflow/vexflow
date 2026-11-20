// Publish a frozen, verified build to a bucket prefix: immutable assets first, HTML last.
import { cloudStore, publishDeployment } from './site-deployments.mjs';
import { isAsset } from './site-assets.mjs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Validate manifest paths and contents before any remote operation. */
export async function validate(directory, jsonFiles = []) {
  for (const file of jsonFiles) {
    if (!/^[a-z][a-z0-9-]*\.json$/.test(file) || file === 'manifest.json')
      throw new Error('Invalid JSON download name.');
  }
  const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
  if (!manifest.files['index.html']) throw new Error('Invalid static-site manifest.');
  for (const [file, digest] of Object.entries(manifest.files)) {
    if (!/^[a-f0-9]{64}$/.test(digest)) throw Error('Invalid manifest digest.');
    if (file !== 'index.html' && file !== 'all.html' && !jsonFiles.includes(file) && !isAsset(file, digest))
      throw new Error('Unsafe manifest path.');
    if (hash(await readFile(join(directory, file))) !== digest) throw new Error(`Build changed: ${file}`);
  }
  for (const page of ['index.html', 'all.html'].filter((name) => manifest.files[name])) {
    const html = await readFile(join(directory, page), 'utf8');
    for (const match of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g))
      if (!manifest.files[match[1].split('?')[0]]) throw new Error(`Missing page asset: ${match[1]}`);
  }
  return manifest;
}
/** Upload immutable assets, then short-lived downloads and pages. Verify each stable URL after writing it. */
export async function upload({
  destination,
  dryRun = false,
  directory,
  command = 'gcloud',
  publicURL,
  jsonFiles = [],
  store,
} = {}) {
  if (!/^gs:\/\/[a-z0-9][a-z0-9._-]+\/(?:[a-zA-Z0-9_-]+\/)+$/.test(destination))
    throw new Error('Use a bucket and nonempty prefix, such as gs://vexflow.com/guide/.');
  const original = await validate(directory, jsonFiles);
  const staging = await mkdtemp(join(tmpdir(), 'vexflow-static-upload-'));
  try {
    // Copy only manifest members. Extra local files must never become public assets.
    for (const file of [...Object.keys(original.files), 'manifest.json']) {
      await mkdir(dirname(join(staging, file)), { recursive: true });
      await copyFile(join(directory, file), join(staging, file));
    }
    const manifest = await validate(staging, jsonFiles);
    const run = (args, captureBytes = 0) => {
      if (dryRun) {
        console.log([command, ...args].join(' '));
        return '';
      }
      const result = spawnSync(command, args, {
        stdio: captureBytes ? 'pipe' : 'inherit',
        maxBuffer: Math.max(1024 * 1024, captureBytes),
      });
      if (result.error) throw result.error;
      if (result.status !== 0)
        throw new Error(`gcloud failed (${result.status ?? result.signal}). HTML publication stopped.`);
      return result.stdout;
    };
    const transfer = async (previousPages) => {
      if (Object.keys(manifest.files).some((file) => isAsset(file))) {
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
      }
      for (const page of [...jsonFiles, 'all.html', 'index.html'].filter((name) => manifest.files[name])) {
        const size = (await stat(join(staging, page))).size;
        if (previousPages[page] === manifest.files[page]) {
          const live = store.bytes(page, undefined, true);
          if (live && hash(live) === manifest.files[page]) continue;
        }
        run([
          'storage',
          'cp',
          join(staging, page),
          destination + page,
          '--predefined-acl=publicRead',
          '--cache-control=public,max-age=60,must-revalidate',
          page.endsWith('.json') ? '--content-type=application/json' : '--content-type=text/html',
        ]);
        if (!dryRun) {
          if (hash(run(['storage', 'cat', destination + page], size + 1)) !== manifest.files[page])
            throw new Error(`Uploaded file differs from the build (${page}). Check for a concurrent upload.`);
        }
      }
    };
    if (dryRun) await transfer({});
    else {
      store ??= cloudStore(destination, command);
      await publishDeployment(store, manifest.files, transfer);
    }
    console.log(
      dryRun ? 'Dry run complete. No files uploaded.' : `Published ${destination}${publicURL ? ` → ${publicURL}` : ''}`
    );
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
