// Build and preview the static notice at the retired Explorer URL.
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { digest } from '../site-assets.mjs';

const source = dirname(fileURLToPath(import.meta.url));
const buildRoot = resolve(source, '../../build');
export const output = join(buildRoot, 'explorer');

/** Keep the old entry point and its deployment receipt without building any runtime assets. */
export async function build() {
  await mkdir(buildRoot, { recursive: true });
  const staging = await mkdtemp(join(buildRoot, 'explorer-staging-'));
  try {
    const html = await readFile(join(source, 'index.html'));
    await writeFile(join(staging, 'index.html'), html);
    await writeFile(join(staging, 'manifest.json'), JSON.stringify({ files: { 'index.html': digest(html) } }));
    await rm(output, { recursive: true, force: true });
    await rename(staging, output);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
  return output;
}

/** Serve only the built directory, including the production /explorer/ mount. */
export function serve({ port = 5173, host = '127.0.0.1' } = {}) {
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (!['/', '/index.html', '/explorer', '/explorer/', '/explorer/index.html'].includes(path)) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const bytes = await readFile(join(output, 'index.html'));
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
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
