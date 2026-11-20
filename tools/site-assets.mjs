// Link portable static sites bottom-up: an asset changes URL only when its bytes or a dependency URL changes.
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, posix } from 'node:path';

export const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const safeName = /^[\w.-]+(?:\/[\w.-]+)*$/;

/** Generated sites keep their layout below a full content hash, even under a custom hosting prefix. */
export function isAsset(path, checksum) {
  if (typeof path !== 'string') return false;
  const [assets, hash, ...name] = path.split('/');
  return (
    assets === 'assets' &&
    /^[0-9a-f]{64}$/.test(hash) &&
    (checksum === undefined || checksum === hash) &&
    safeName.test(name.join('/')) &&
    name.every((part) => part !== '.' && part !== '..')
  );
}

/** Split embedded website typefaces out of uploadable artifacts. Standalone offline originals keep their data URLs. */
export function externalFonts(css, assets, from = 'style.css') {
  return css.replace(/url\('data:font\/(ttf|woff2);base64,([A-Za-z0-9+/=]+)'\)/g, (_, ext, data) => {
    const bytes = Buffer.from(data, 'base64');
    const name = 'typefaces/' + digest(bytes).slice(0, 16) + '.' + ext;
    assets.set(name, bytes);
    return 'url(' + posix.relative(posix.dirname(from), name) + ')';
  });
}

/** Rewrite only URL-bearing syntax in our templates, styles and modules. Leave example code and JSON data intact. */
function linkSource(name, bytes, resolve) {
  const ext = posix.extname(name);
  if (!['.js', '.mjs', '.css', '.html'].includes(ext)) return bytes;
  let text = bytes.toString();
  if (ext === '.html')
    text = text.replace(
      /\b(src|href)="([^"#?]+)([^"]*)"/g,
      (_, attr, path, suffix) => `${attr}="${resolve(path)}${suffix}"`
    );
  if (ext === '.css')
    text = text.replace(/(url\(['"]?)([\w./-]+)(['"]?\))/g, (_, before, path, after) => before + resolve(path) + after);
  if (ext === '.mjs' || ext === '.js') {
    text = text.replace(
      /(\b(?:from\s+|import\s+|import\(\s*|new URL\(|asset\())(['"])([\w./-]+)\2/g,
      (_, before, quote, path) => before + quote + resolve(path) + quote
    );
    text = text.replace(/(\/\/# sourceMappingURL=)([\w./-]+)/g, (_, prefix, path) => prefix + resolve(path));
  }
  return Buffer.from(text);
}

/** Resolve relative references before hashing parents. Cycles must be packaged together or removed explicitly. */
export function linkAssets(inputs) {
  const files = new Map(),
    paths = Object.create(null),
    visiting = new Set();
  function link(name) {
    if (paths[name]) return paths[name];
    if (!safeName.test(name) || name.split('/').some((s) => s === '.' || s === '..'))
      throw Error('Unsafe asset: ' + name);
    if (visiting.has(name)) throw Error('Cyclic website asset reference: ' + name);
    visiting.add(name);
    const parent = posix.dirname(name);
    const bytes = linkSource(name, inputs.get(name), (ref) => {
      const child = posix.join(parent, ref);
      if (!inputs.has(child)) return ref;
      return posix.relative(posix.join('assets/_', parent), link(child));
    });
    const path = 'assets/' + digest(bytes) + '/' + name;
    files.set(path, bytes);
    paths[name] = path;
    visiting.delete(name);
    return path;
  }
  for (const name of inputs.keys()) link(name);
  return { files, paths };
}

/** Persist the immutable graph; callers append their stable entry points to the manifest. */
export async function writeAssets(directory, graph) {
  const manifest = { paths: graph.paths, files: {} };
  for (const [path, bytes] of graph.files) {
    await mkdir(join(directory, posix.dirname(path)), { recursive: true });
    await writeFile(join(directory, path), bytes);
    manifest.files[path] = digest(bytes);
  }
  return manifest;
}

/** Resolve asset references in a root HTML template without adding a runtime manifest request. */
export function linkPage(html, paths) {
  return html.replace(/(src|href)="\.\/assets\/([^"#?]+)([^"]*)"/g, (_, attr, name, suffix) => {
    if (!paths[name]) throw Error('Missing website asset: ' + name);
    return `${attr}="./${paths[name]}${suffix}"`;
  });
}
