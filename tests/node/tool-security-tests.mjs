// Regression coverage for untrusted font metadata and release-tool process arguments.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = fileURLToPath(new URL('../../', import.meta.url));

test('release downloads reject paths, flags, and shell fragments before prompting', () => {
  for (const version of ['../outside', '--help', '4.0.0;echo injected', '4.0.0$(echo injected)', '4.0.0\n', 'latest']) {
    const result = spawnSync(process.execPath, ['tools/get_releases.mjs', version], {
      cwd: root,
      encoding: 'utf8',
      timeout: 3000,
    });
    assert.ifError(result.error);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Invalid release version/);
    assert.doesNotMatch(result.stdout, /Press any key/);
  }
});

test('release download commands preserve spaces and shell punctuation in checkout paths', () => {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), "release tools '$literal' ")));
  try {
    mkdirSync(join(directory, 'tools'));
    mkdirSync(join(directory, 'bin'));
    symlinkSync(join(root, 'node_modules'), join(directory, 'node_modules'), 'dir');
    copyFileSync(join(root, 'tools/get_releases.mjs'), join(directory, 'tools/get_releases.mjs'));
    // Supply deterministic local substitutes for the external download commands.
    // The real release script must invoke these with intact argument arrays.
    const command = `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const name = path.basename(process.argv[1]);
const args = process.argv.slice(2);
fs.appendFileSync(process.env.COMMAND_LOG, JSON.stringify({name,args}) + '\\n');
if (name === 'tar') {
  const build = path.join(args[args.indexOf('-C') + 1], 'package', 'build');
  fs.mkdirSync(build, {recursive:true});
  fs.writeFileSync(path.join(build, 'fixture.js'), 'release fixture');
}
`;
    for (const name of ['git', 'npm', 'tar']) writeFileSync(join(directory, 'bin', name), command, { mode: 0o755 });
    // A pipe has no raw terminal mode; retain the script's normal confirmation input.
    writeFileSync(join(directory, 'stdin.mjs'), 'process.stdin.setRawMode = () => {};');
    const log = join(directory, 'commands.jsonl');
    const result = spawnSync(process.execPath, ['--import', './stdin.mjs', 'tools/get_releases.mjs', '5.0.0-beta.1'], {
      cwd: directory,
      env: { ...process.env, PATH: `${join(directory, 'bin')}:${process.env.PATH}`, COMMAND_LOG: log },
      input: 'y',
      encoding: 'utf8',
      timeout: 5000,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(readFileSync(join(directory, 'releases/5.0.0-beta.1/fixture.js'), 'utf8'), 'release fixture');
    const calls = readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse);
    const pack = calls.find(({ name }) => name === 'npm').args;
    assert.equal(
      pack[pack.indexOf('--pack-destination') + 1],
      join(directory, 'releases/5.0.0-beta.1-delete-me-later')
    );
    assert.ok(pack.includes('--ignore-scripts'));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('font metadata stays literal text while labels retain their formatting', () => {
  const html = readFileSync(join(root, 'demos/opentype/load.html'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  try {
    const { window } = dom;
    window.console.log = () => {};
    const name = '<img src=x onerror="globalThis.injected = true"> & Test';
    window.opentype = { parse: () => ({ names: { fontFamily: { en: name } }, glyphs: { length: 12 } }) };
    window.eval(window.document.querySelector('script:not([src])').textContent);
    assert.equal(window.parseFont(new Uint8Array([0]), 'music'), name);
    const target = window.document.getElementById('musicFontInfo');
    assert.equal(target.querySelector('img'), null);
    assert.equal(window.injected, undefined);
    assert.ok(target.textContent.includes(name));
    assert.deepEqual(
      [...target.querySelectorAll('b')].map((node) => node.textContent),
      ['Font Family Name:', 'Num Glyphs:']
    );
    assert.equal(target.querySelectorAll('br').length, 2);
  } finally {
    dom.window.close();
  }
});
