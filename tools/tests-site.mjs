// Package the visual test gallery with local scripts/fonts, then publish it as an immutable static site.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { siteTheme } from './site-theme.mjs';
import { externalFonts, linkAssets, linkPage, writeAssets } from './site-assets.mjs';
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
    env: { ...process.env, VF_WEBSITE_BUILD: '1' },
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('VexFlow test bundle build failed.');
  const assets = new Map();
  assets.set('site-theme.css', Buffer.from(externalFonts(siteTheme, assets)));
  assets.set('vexflow-debug.js.map', await readFile(join(root, 'build/website-cjs/vexflow-debug.js.map')));
  for (const file of ['vexflow-debug-with-tests.js', 'vexflow-debug-with-tests.js.map'])
    assets.set(file, await readFile(join(root, 'build/website-cjs', file)));
  for (const file of ['qunit.js', 'qunit.css'])
    assets.set(`qunit/${file}`, await readFile(join(root, 'tests/qunit', file)));
  assets.set('minuet.webp', await readFile(join(root, 'tests/minuet.webp')));
  assets.set('demo_petzold_tests.txt', await readFile(join(root, 'tests/demo_petzold_tests.ts')));
  // Include the same examples readers run, plus a readable copy of each source file.
  for (const file of await readdir(join(root, 'tests/demos'))) {
    if (/\.(ts|webp)$/.test(file))
      assets.set('demos/' + file.replace(/\.ts$/, '.txt'), await readFile(join(root, 'tests/demos', file)));
  }
  // The score reader uses the library bundle on demand. Its modules and previews are portable together.
  assets.set('vexflow-debug.js', await readFile(join(root, 'build/website-cjs/vexflow-debug.js')));
  for (const file of await readdir(join(root, 'tests/scores'))) {
    let bytes = await readFile(join(root, 'tests/scores', file));
    if (file === 'index.html')
      bytes = Buffer.from(
        bytes
          .toString()
          .replace('../../tools/site-theme.css', '../site-theme.css')
          .replace('../../build/cjs/vexflow-debug.js', '../vexflow-debug.js')
          .replace('../flow.html', '../../../index.html')
      );
    assets.set('scores/' + file, bytes);
  }
  await bundleFonts(assets);
  const graph = linkAssets(assets);
  const staging = await mkdtemp(join(root, 'build/tests-site-staging-'));
  try {
    const manifest = await writeAssets(staging, graph);
    const runner = (await readFile(join(root, 'tests/all.html'), 'utf8'))
      .replace('../tools/site-theme.css', './' + graph.paths['site-theme.css'])
      .replace(
        '<head>',
        `<head>\n    <meta name="vexflow-test-bundle" content="./${graph.paths['vexflow-debug-with-tests.js']}" />`
      )
      .replace('href="flow.html"', 'href="index.html"')
      .replace('href="fonts.css"', `href="./${graph.paths['fonts.css']}"`)
      .replace('href="qunit/qunit.css"', `href="./${graph.paths['qunit/qunit.css']}"`)
      .replace('src="qunit/qunit.js"', `src="./${graph.paths['qunit/qunit.js']}"`);
    await writeFile(join(staging, 'all.html'), runner);
    manifest.files['all.html'] = hash(runner);
    const html = linkPage(
      (await readFile(join(root, 'tests/flow.html'), 'utf8'))
        .replace('../tools/site-theme.css', './assets/site-theme.css')
        .replace(
          /(src|href)="(minuet\.webp|demo_petzold_tests\.ts|demos\/[a-z]+\.(?:webp|ts)|scores\/[a-z]+\.(?:html(?:\?piece=[a-z]+)?|js|webp))"/g,
          (_, attr, file) => `${attr}="./assets/${file.replace(/\.ts$/, '.txt')}"`
        ),
      graph.paths
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

/** The test site shares the guide’s upload ordering, integrity checks, and cache policy. */
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
