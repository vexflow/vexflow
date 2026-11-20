// Build, preview, and upload the guide with its editable examples and local notation runtime.
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { externalFonts, linkAssets, linkPage, writeAssets } from '../tools/site-assets.mjs';
import { siteTheme } from '../tools/site-theme.mjs';
import prettier from 'prettier';

import { collectRuntime } from './runtime-assets.mjs';
import { upload as uploadSite, validate } from '../tools/static-site-upload.mjs';
import { examples, lessons, sections } from './content.mjs';

const source = dirname(fileURLToPath(import.meta.url));
const root = resolve(source, '..');
export const output = join(root, 'build/guide');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Build a portable guide using independently fingerprinted modules, fonts and code examples. */
export async function build() {
  const { assets, library } = await collectRuntime();
  // Retain font licenses alongside the embedded OTF data.
  for (const family of ['bravura', 'petaluma', 'gonville', 'academico', 'petalumascript']) {
    const directory = join(root, 'node_modules/@vexflow-fonts', family);
    for (const file of await readdir(directory)) {
      if (/^(license|ofl|copyright)(\.|$)/i.test(file))
        assets.set(`licenses/${family}/${file}`, await readFile(join(directory, file)));
    }
  }
  assets.set('app.mjs', await readFile(join(source, 'app.mjs')));
  assets.set(
    'style.css',
    Buffer.from(externalFonts(siteTheme + (await readFile(join(source, 'style.css'), 'utf8')), assets))
  );
  // Public class names occasionally differ from their source module names.
  const moduleNames = {
    Barline: 'stavebarline',
    Volta: 'stavevolta',
    Repetition: 'staverepetition',
    Stroke: 'strokes',
    FrettedInstrument: 'instrumentprofile',
  };
  const formatted = await Promise.all(
    examples.map(async (example) => {
      const apiFiles = {};
      for (const api of example.api) {
        // Some examples also tag methods. Link those to the example's primary class.
        const owner = /^[a-z]/.test(api) ? example.api[0] : api;
        const file = `src/${moduleNames[owner] ?? owner.toLowerCase()}.ts`;
        await stat(join(root, file));
        apiFiles[api] = file;
      }
      return {
        ...example,
        apiFiles,
        code: (await prettier.format(example.code, { parser: 'babel', singleQuote: true, printWidth: 88 })).trimEnd(),
      };
    })
  );
  const ids = new Set();
  for (const example of formatted) {
    if (ids.has(example.id)) throw new Error(`Duplicate example: ${example.id}`);
    ids.add(example.id);
  }
  for (const lesson of lessons) {
    for (const id of lesson.examples) {
      if (!ids.has(id)) throw new Error(`Missing example ${id} for lesson ${lesson.id}`);
    }
  }
  assets.set(
    'content.mjs',
    Buffer.from(
      `// Generated from guide/content.mjs.\nexport const sections = ${JSON.stringify(sections)};\nexport const lessons = ${JSON.stringify(lessons)};\nexport const examples = ${JSON.stringify(formatted)};\n`
    )
  );
  const { VERSION: version, ID: commit } = createRequire(import.meta.url)(library).BUILD;
  assets.set('version.json', Buffer.from(JSON.stringify({ version, commit })));
  const graph = linkAssets(assets);
  const staging = await mkdtemp(join(root, 'build/guide-staging-'));
  try {
    const manifest = await writeAssets(staging, graph);
    const html = linkPage(await readFile(join(source, 'index.html'), 'utf8'), graph.paths)
      .replaceAll('__GUIDE_VERSION__', version)
      .replaceAll('__GUIDE_COMMIT__', commit);
    await writeFile(join(staging, 'index.html'), html);
    manifest.files['index.html'] = hash(html);
    await writeFile(join(staging, 'manifest.json'), JSON.stringify(manifest, null, 2));
    await validate(staging);
    await rm(output, { recursive: true, force: true });
    await rename(staging, output);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
  console.log(`Guide built: ${output}`);
  return output;
}

/** Serve only the frozen guide; hash routes work on ordinary static hosting. */
export function serve({ port = 5174, host = '127.0.0.1' } = {}) {
  const types = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.json': 'application/json',
  };
  const server = createServer(async (req, res) => {
    try {
      let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (path === '/guide') {
        res.writeHead(302, { Location: '/guide/' });
        res.end();
        return;
      }
      if (path.startsWith('/guide/')) path = path.slice('/guide'.length);
      if (path.endsWith('/')) path += 'index.html';
      const file = resolve(output, `.${path}`);
      if (!file.startsWith(output + sep)) throw new Error('Invalid path');
      const bytes = await readFile(file);
      res.writeHead(200, {
        'Content-Type': `${types[extname(file)] ?? 'application/octet-stream'}; charset=utf-8`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  server.listen(port, host, () => console.log(`VexFlow Guide → http://${host}:${server.address().port}/guide/`));
  return server;
}

/** Verify the guide and publish its immutable assets before the entry page. */
export function upload({ destination = 'gs://vexflow.com/guide/', directory = output, ...options } = {}) {
  return uploadSite({
    destination,
    directory,
    publicURL: destination === 'gs://vexflow.com/guide/' ? 'https://vexflow.com/guide/' : undefined,
    ...options,
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [command = 'serve', ...args] = process.argv.slice(2);
    const allowed =
      command === 'serve' ? /^--port=\d+$/ : command === 'upload' ? /^(--dry-run|--destination=.+)$/ : /$^/;
    if (!['build', 'serve', 'upload'].includes(command) || args.some((arg) => !allowed.test(arg)))
      throw new Error(
        'Usage: cli.mjs build | serve [--port=5174] | upload [--dry-run] [--destination=gs://bucket/prefix/]'
      );
    const port = Number(args.find((arg) => arg.startsWith('--port='))?.slice(7) ?? 5174);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port must be between 1 and 65535.');
    await build();
    if (command === 'serve')
      serve({ port }).on('error', (error) => {
        console.error(error.message);
        process.exitCode = 1;
      });
    if (command === 'upload')
      await upload({
        dryRun: args.includes('--dry-run'),
        destination: args.find((arg) => arg.startsWith('--destination='))?.slice(14),
      });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
