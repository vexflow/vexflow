// Package the visual test gallery with local scripts/fonts, then publish it as an immutable static site.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { upload as uploadSite, validate } from './static-site-upload.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const output = join(root, 'build/tests-site');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Copy only font files referenced by the stylesheet, plus their package licenses. */
async function bundleFonts(assets) {
  let css = await readFile(join(root, 'tests/fonts.css'), 'utf8');
  const packages = new Set();
  for (const match of css.matchAll(/url\(\.\.\/node_modules\/@vexflow-fonts\/([^()]+)\)/g)) {
    const file = match[1];
    if (!/^[a-z0-9-]+\/[a-z0-9.-]+\.(woff2?|otf|ttf)$/.test(file)) throw new Error(`Unsafe font path: ${file}`);
    assets.set(`fonts/${file}`, await readFile(join(root, 'node_modules/@vexflow-fonts', file)));
    packages.add(file.split('/')[0]);
  }
  // Deployed renders use the shipped fonts, not potentially different locally installed versions.
  css = css.replace(/local\('[^']+'\),\s*/g, '');
  css = css.replaceAll('../node_modules/@vexflow-fonts/', './fonts/');
  css = css.replace(/(url\([^()]+\.otf\)) format\('woff2'\)/g, "$1 format('opentype')");
  if (/\.\.\/|https?:/.test(css)) throw new Error('Font stylesheet has an external dependency.');
  assets.set('fonts.css', Buffer.from(css));
  for (const name of packages) {
    const directory = join(root, 'node_modules/@vexflow-fonts', name);
    for (const file of await readdir(directory)) {
      if (/^(license|ofl|copyright)(\.|$)/i.test(file))
        assets.set(`fonts/${name}/${file}`, await readFile(join(directory, file)));
    }
  }
}

/** Build current source, fingerprint every asset, and atomically replace the local publication directory. */
export async function build() {
  const result = spawnSync(process.execPath, [join(root, 'node_modules/.bin/grunt'), 'webpack:debug'], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('VexFlow test bundle build failed.');
  const assets = new Map();
  for (const file of ['vexflow-debug-with-tests.js', 'vexflow-debug-with-tests.js.map'])
    assets.set(file, await readFile(join(root, 'build/cjs', file)));
  for (const file of ['qunit.js', 'qunit.css'])
    assets.set(`qunit/${file}`, await readFile(join(root, 'tests/qunit', file)));
  assets.set('minuet.webp', await readFile(join(root, 'tests/minuet.webp')));
  assets.set('demo_petzold_tests.txt', await readFile(join(root, 'tests/demo_petzold_tests.ts')));
  // Include the same examples readers run, plus a readable copy of each source file.
  for (const file of await readdir(join(root, 'tests/demos'))) {
    if (/\.(ts|webp)$/.test(file))
      assets.set('demos/' + file.replace(/\.ts$/, '.txt'), await readFile(join(root, 'tests/demos', file)));
  }
  await bundleFonts(assets);
  const digest = hash(
    Buffer.concat([...assets.entries()].sort().flatMap(([name, bytes]) => [Buffer.from(name), bytes]))
  );
  const assetPath = `assets/${digest.slice(0, 16)}`;
  const staging = await mkdtemp(join(root, 'build/tests-site-staging-'));
  try {
    const manifest = { assetPath, files: {} };
    for (const [name, bytes] of assets) {
      const file = `${assetPath}/${name}`;
      await mkdir(dirname(join(staging, file)), { recursive: true });
      await writeFile(join(staging, file), bytes);
      manifest.files[file] = hash(bytes);
    }
    const runner = (await readFile(join(root, 'tests/all.html'), 'utf8'))
      .replace(
        '<head>',
        `<head>\n    <meta name="vexflow-test-bundle" content="./${assetPath}/vexflow-debug-with-tests.js" />`
      )
      .replace('href="flow.html"', 'href="index.html"')
      .replace('href="fonts.css"', `href="./${assetPath}/fonts.css"`)
      .replace('href="qunit/qunit.css"', `href="./${assetPath}/qunit/qunit.css"`)
      .replace('src="qunit/qunit.js"', `src="./${assetPath}/qunit/qunit.js"`);
    await writeFile(join(staging, 'all.html'), runner);
    manifest.files['all.html'] = hash(runner);
    const html = (await readFile(join(root, 'tests/flow.html'), 'utf8')).replace(
      /(src|href)="(minuet\.webp|demo_petzold_tests\.ts|demos\/[a-z]+\.(?:webp|ts))"/g,
      (_, attr, file) => `${attr}="./${assetPath}/${file.replace(/\.ts$/, '.txt')}"`
    );
    await writeFile(join(staging, 'index.html'), html);
    manifest.files['index.html'] = hash(html);
    await writeFile(join(staging, 'manifest.json'), JSON.stringify(manifest, null, 2));
    await validate(staging);
    await rm(output, { recursive: true, force: true });
    await rename(staging, output);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
  console.log(`Test gallery built: ${output}`);
  return output;
}

/** The test site shares the Explorer's upload ordering, integrity checks, and cache policy. */
export function upload({ destination = 'gs://vexflow.com/tests/', directory = output, ...options } = {}) {
  return uploadSite({
    destination,
    directory,
    publicURL: destination === 'gs://vexflow.com/tests/' ? 'https://vexflow.com/tests/' : undefined,
    ...options,
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [command, ...args] = process.argv.slice(2);
    if (
      !['build', 'upload'].includes(command) ||
      args.some((arg) => arg !== '--dry-run' && !arg.startsWith('--destination='))
    )
      throw new Error(
        'Usage: npm run tests:build | npm run tests:upload -- [--dry-run] [--destination=gs://bucket/prefix/]'
      );
    await build();
    if (command === 'upload')
      await upload({
        dryRun: args.includes('--dry-run'),
        destination: args.find((arg) => arg.startsWith('--destination='))?.slice(14) ?? 'gs://vexflow.com/tests/',
      });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
