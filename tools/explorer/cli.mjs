// Build and serve a self-contained Explorer using Node's standard library and the repo toolchain.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { externalFonts, linkAssets, linkPage, writeAssets } from '../site-assets.mjs';
import { siteTheme } from '../site-theme.mjs';
import prettier from 'prettier';

import { examples } from './catalog.mjs';

const requireTool = createRequire(import.meta.url);
export const source = dirname(fileURLToPath(import.meta.url));
export const root = resolve(source, '../..');
export const output = join(root, 'build/explorer');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function filesIn(directory) {
  const result = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) result.push(...(await filesIn(path)));
    else result.push(path);
  }
  return result.sort();
}

// Webpack checks its input graph, including uncommitted edits and loader configuration.
async function buildLibrary() {
  const result = spawnSync(process.execPath, [join(root, 'node_modules/.bin/grunt'), 'webpack:debugLibrary'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, VF_WEBSITE_BUILD: '1' },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error('VexFlow website build failed.');
  return join(root, 'build/website-cjs/vexflow-debug.js');
}

/** Read the pinned Prism grammars locally, in dependency order, for an offline build. */
export async function bundlePrism(languages) {
  const prism = await Promise.all(
    languages.map((name) => readFile(join(root, `node_modules/prismjs/components/prism-${name}.min.js`), 'utf8'))
  );
  return Buffer.from('window.Prism = { manual: true };\n' + prism.join('\n'));
}

/** Collect unlinked modules, generated examples, licenses and fonts for the Explorer and guide. */
export async function collectAssets() {
  const library = await buildLibrary();
  const assets = new Map();
  for (const path of await filesIn(source)) {
    const name = path.slice(source.length + 1);
    if (name === 'index.html' || /^(cli|upload|test)\.mjs$/.test(name) || name.endsWith('.md')) continue;
    const bytes = await readFile(path);
    assets.set(name, name === 'style.css' ? Buffer.from(siteTheme + bytes.toString()) : bytes);
  }
  assets.set(
    'vexflow.js',
    Buffer.from(
      (await readFile(library, 'utf8')).replace(
        '//# sourceMappingURL=vexflow-debug.js.map',
        '//# sourceMappingURL=vexflow.js.map'
      )
    )
  );
  assets.set('vexflow.js.map', await readFile(library + '.map'));
  assets.set('render-metrics.mjs', await readFile(join(root, 'tools/render-metrics.mjs')));
  // Ship only the editor and JavaScript grammar, with licenses. No runtime CDN or bundler.
  for (const [name, packagePath] of Object.entries({
    'codejar.js': 'codejar/dist/codejar.js',
    'codejar.js.map': 'codejar/dist/codejar.js.map',
    'codejar.LICENSE': 'codejar/LICENSE',
    'prism.LICENSE': 'prismjs/LICENSE',
  })) {
    assets.set(`vendor/${name}`, await readFile(join(root, 'node_modules', packagePath)));
  }
  assets.set('vendor/prism.js', await bundlePrism(['core', 'clike', 'javascript']));
  // Format the assembled snippets at build time; Prettier never reaches the browser.
  const formatted = await Promise.all(
    examples.map(async (example) => ({
      ...example,
      code: (
        await prettier.format(example.code, {
          parser: 'babel',
          printWidth: 80,
          tabWidth: 2,
          singleQuote: true,
          trailingComma: 'es5',
        })
      ).trimEnd(),
    }))
  );
  assets.set(
    'catalog/entries.mjs',
    Buffer.from(
      '// Generated formatted examples. Edit tools/explorer/catalog/ source files.\n' +
        `export const entries = ${JSON.stringify(formatted)};\n`
    )
  );
  const fonts = {},
    coverage = {};
  const opentype = requireTool('opentype.js');
  for (const [family, file] of Object.entries({
    Bravura: 'bravura/bravura',
    Petaluma: 'petaluma/petaluma',
    Gonville: 'gonville/gonville',
    Academico: 'academico/academico',
    'Petaluma Script': 'petalumascript/petalumascript',
  })) {
    const bytes = await readFile(join(root, `node_modules/@vexflow-fonts/${file}.otf`));
    fonts[family] = bytes.toString('base64');
    const font = opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    coverage[family] = Object.keys(font.tables.cmap.glyphIndexMap).map(Number);
  }
  assets.set('font-data.json', Buffer.from(JSON.stringify(fonts)));
  assets.set('glyph-coverage.json', Buffer.from(JSON.stringify(coverage)));
  return assets;
}

/** Publish reviewed raw inputs under independently reusable addresses. */
export async function build(inputs) {
  const assets = new Map(inputs ?? (await collectAssets()));
  assets.set('style.css', Buffer.from(externalFonts(assets.get('style.css').toString(), assets)));
  const graph = linkAssets(assets);
  const staging = await mkdtemp(join(root, 'build/explorer-staging-'));
  const manifest = await writeAssets(staging, graph);
  const html = linkPage(await readFile(join(source, 'index.html'), 'utf8'), graph.paths);
  await writeFile(join(staging, 'index.html'), html);
  manifest.files['index.html'] = hash(html);
  await writeFile(join(staging, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await rm(output, { recursive: true, force: true });
  await rename(staging, output);
  console.log(`Explorer built: ${output}`);
  return output;
}

/** Serve only the built directory, including the production /explorer/ mount. */
export function serve({ port = 5173, host = '127.0.0.1' } = {}) {
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
  };
  const server = createServer(async (req, res) => {
    try {
      let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (path === '/explorer') {
        res.writeHead(302, { Location: '/explorer/' });
        res.end();
        return;
      }
      if (path.startsWith('/explorer/')) path = path.slice('/explorer'.length);
      if (path.endsWith('/')) path += 'index.html';
      const target = resolve(output, `.${path}`);
      if (!target.startsWith(output + sep)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      const bytes = await readFile(target);
      res.writeHead(200, {
        'Content-Type': types[extname(target)] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  server.listen(port, host, () => console.log(`VexFlow Explorer → http://${host}:${server.address().port}/explorer/`));
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const command = process.argv[2] ?? 'serve';
  try {
    if (!['serve', 'build'].includes(command)) throw new Error('Usage: cli.mjs [serve|build] [--port=5173]');
    await build();
    if (command === 'serve') {
      const port = Number(process.argv.find((arg) => arg.startsWith('--port='))?.split('=')[1] ?? 5173);
      if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port must be between 1 and 65535.');
      serve({ port }).on('error', (error) => {
        console.error(error.message);
        process.exitCode = 1;
      });
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
