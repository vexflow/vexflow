// Collect the guide's editor, sandbox, notation library, and fonts for offline use.
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

/** Use the same built library for the preview, standalone downloads, and version label. */
export async function collectRuntime() {
  execFileSync(process.execPath, [join(root, 'node_modules/grunt/bin/grunt'), 'webpack:debugLibrary'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, VF_WEBSITE_BUILD: '1' },
  });
  const library = join(root, 'build/website-cjs/vexflow-debug.js');
  const assets = new Map();
  for (const name of ['editor.mjs', 'preview.mjs', 'runner.mjs', 'source.mjs']) {
    assets.set('runtime/' + name, await readFile(join(root, 'guide/runtime', name)));
  }
  const js = await readFile(library, 'utf8');
  assets.set(
    'runtime/vexflow.js',
    Buffer.from(js.replace('//# sourceMappingURL=vexflow-debug.js.map', '//# sourceMappingURL=vexflow.js.map'))
  );
  assets.set('runtime/vexflow.js.map', await readFile(library + '.map'));
  for (const [name, path] of Object.entries({
    'codejar.js': 'codejar/dist/codejar.js',
    'codejar.js.map': 'codejar/dist/codejar.js.map',
    'codejar.LICENSE': 'codejar/LICENSE',
    'prism.LICENSE': 'prismjs/LICENSE',
  })) {
    assets.set('runtime/vendor/' + name, await readFile(join(root, 'node_modules', path)));
  }

  // Load markup before JavaScript so HTML examples can highlight embedded scripts.
  const languages = ['core', 'markup', 'clike', 'javascript', 'bash', 'typescript'];
  const grammars = await Promise.all(
    languages.map((name) => readFile(join(root, 'node_modules/prismjs/components/prism-' + name + '.min.js'), 'utf8'))
  );
  assets.set('runtime/vendor/prism.js', Buffer.from('window.Prism = { manual: true };\n' + grammars.join('\n')));
  const fonts = {};
  for (const [name, pkg] of Object.entries({
    Bravura: 'bravura',
    Petaluma: 'petaluma',
    Gonville: 'gonville',
    Academico: 'academico',
    'Petaluma Script': 'petalumascript',
  })) {
    fonts[name] = await readFile(join(root, 'node_modules/@vexflow-fonts', pkg, pkg + '.otf'), 'base64');
  }
  assets.set('runtime/font-data.json', Buffer.from(JSON.stringify(fonts)));
  return { assets, library };
}
