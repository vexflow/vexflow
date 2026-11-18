// Regression checks for metric denominators, escaped metadata and concurrent archive publication.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { releaseRevision } from './build.mjs';
import { summarizeFile } from './coverage.mjs';
import { archivePage, commitPage, readEntries } from './html.mjs';
import { dependencies, sourceMetrics } from './metrics.mjs';
import { verifyPublishedTag } from './release.mjs';
import { uploadReport } from './upload.mjs';

const destination = 'gs://test-bucket/reports/';
const entry = (digit) => ({
  commit: digit.repeat(40),
  branch: 'topic/<fix>',
  subject: '<script>alert("subject")</script>',
  version: '5',
  generated: '2026-01-02T00:00:00Z',
  committed: '2026-01-01T00:00:00Z',
  loc: 100,
  lines: { hit: 1, total: 2 },
  core: 300,
});

/** A small complete report exercises the production renderer and metadata checks during upload tests. */
function examplePage(e) {
  const metric = { hit: 1, total: 2 };
  return commitPage({
    ...e,
    schema: 1,
    node: 'v26',
    source: {
      files: [{ file: 'src/a.ts', group: 'Library', lines: 100, code: 100, comments: 0, blank: 0 }],
      complexity: [],
      dead: [],
    },
    coverage: {
      total: { lines: metric, functions: metric, branches: metric, statements: metric },
      tests: { passed: 1, skipped: 0, todo: 0 },
      files: [],
    },
    dependencies: { unique: 0, locations: 0, production: 0, direct: [], duplicates: [] },
    bundles: [{ name: 'vexflow-core.js', raw: 1000, gzip: e.core, brotli: 200 }],
  });
}

/** A fake object store enforces insert-only requests and generation-matched updates. */
function bucket() {
  const files = new Map();
  const error = (kind) => Object.assign(Error(kind), { kind });
  function storage(args, input) {
    if (args[0] === 'cp') {
      const url = args[2],
        expected = args.find((x) => x.startsWith('--if-generation-match=')).split('=')[1];
      if (String(files.get(url)?.generation ?? 0) !== expected) throw error('conflict');
      files.set(url, { generation: Number(expected) + 1, html: input });
      return '';
    }
    const [url, pinned] = (args[0] === 'cat' ? args[1] : args[2]).split('#');
    const data = files.get(url);
    if (!data || (pinned && pinned !== String(data.generation))) throw error('missing');
    return args[0] === 'cat' ? data.html : String(data.generation);
  }
  return { files, storage };
}

test('a line shared by several statements counts once; unvisited functions and branch arms count as misses', () => {
  const base = {
    statementMap: { 0: { start: { line: 1 } }, 1: { start: { line: 1 } }, 2: { start: { line: 3 } } },
    s: { 0: 0, 1: 0, 2: 0 },
    f: { 0: 0 },
    b: { 0: [0, 0] },
  };
  const row = summarizeFile('src/example.ts', base, { s: { 0: 0, 1: 1, 2: 0 }, f: { 0: 0 }, b: { 0: [0, 1] } });
  assert.deepEqual(row.lines, { hit: 1, total: 2 });
  assert.deepEqual(row.statements, { hit: 1, total: 3 });
  assert.deepEqual(row.branches, { hit: 1, total: 2 });
  assert.deepEqual(summarizeFile('unloaded', base).lines, { hit: 0, total: 2 });
});

test('source metrics use code tokens, classic complexity and TypeScript diagnostics', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'report-source-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'tsconfig.json'), '{}');
  await writeFile(
    join(root, 'src/demo.ts'),
    '// A comment.\n\nexport function choose(a: number) {\n  const unused = 3; // mixed line\n  return a ? 1 : 0;\n}\n'
  );
  const m = await sourceMetrics(root, ['src/demo.ts', 'src/glyphs.ts', 'tests/qunit/qunit.js']);
  assert.deepEqual(m.files, [{ file: 'src/demo.ts', group: 'Library', lines: 6, code: 4, comments: 1, blank: 1 }]);
  assert.equal(m.complexity[0].score, 2);
  assert.match(m.dead[0].message, /unused/);
  const d = dependencies(
    { dependencies: { a: '^2' } },
    {
      packages: {
        '': {},
        'node_modules/a': { version: '2' },
        'node_modules/b': { version: '3', dev: true },
        'node_modules/b/node_modules/a': { version: '1', dev: true },
      },
    }
  );
  assert.equal(d.production, 1);
  assert.equal(d.unique, 2);
  assert.deepEqual(d.duplicates, [{ name: 'a', versions: ['1', '2'] }]);
});

test('archive escapes Git text and rejects malformed metrics', () => {
  const e = entry('a'),
    html = archivePage([e]);
  assert.ok(!html.includes(e.subject));
  assert.deepEqual(readEntries(html), [e]);
  assert.throws(() => readEntries(html.replace('"loc":100', '"loc":"bad"')), /metadata/);
});

test('publication preserves remote-only reports, repairs retries, and merges competing updates', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'report-upload-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const { files, storage } = bucket(),
    old = entry('a'),
    current = entry('b'),
    other = entry('c');
  const index = destination + 'index.html',
    page = destination + current.commit + '/index.html';
  const options = { directory, destination, commit: current.commit, storage };
  await mkdir(join(directory, current.commit));
  await writeFile(join(directory, current.commit, 'index.html'), examplePage(current));
  await uploadReport({
    ...options,
    dryRun: true,
    storage() {
      throw Error('Unexpected remote call');
    },
  });
  files.set(index, { generation: 1, html: archivePage([old]) });
  await assert.rejects(
    uploadReport({
      ...options,
      storage(args, input) {
        if (args[0] === 'cp' && args[2] === index) throw Error('connection lost');
        return storage(args, input);
      },
    }),
    /connection lost/
  );
  assert.equal(files.get(page).generation, 1);
  let interrupt = true;
  await uploadReport({
    ...options,
    storage(args, input) {
      if (interrupt && args[0] === 'cp' && args[2] === index) {
        interrupt = false;
        files.set(index, { generation: 2, html: archivePage([old, other]) });
      }
      return storage(args, input);
    },
  });
  const saved = readEntries(files.get(index).html);
  assert.deepEqual(saved.map((e) => e.commit).sort(), [old.commit, current.commit, other.commit]);
  await uploadReport(options);
  assert.equal(files.get(page).generation, 1);
  assert.equal(files.get(index).generation, 3);
});

test('first publication creates the archive; unreadable history stops an update', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'report-new-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const { files, storage } = bucket(),
    e = entry('d');
  await mkdir(join(directory, e.commit));
  await writeFile(join(directory, e.commit, 'index.html'), examplePage(e));
  const options = { directory, destination, commit: e.commit, storage };
  await uploadReport(options);
  assert.deepEqual(readEntries(files.get(destination + 'index.html').html), [e]);
  files.set(destination + 'index.html', { generation: 2, html: 'invalid' });
  await assert.rejects(uploadReport(options), /metadata/);
  assert.equal(files.get(destination + 'index.html').html, 'invalid');
});

test('release reports resolve the tag even after HEAD moves and reject mismatched package versions', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'report-tag-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync(
      'git',
      [
        '-c',
        'user.name=Test',
        '-c',
        'user.email=test@example.org',
        '-c',
        'commit.gpgSign=false',
        '-c',
        'tag.gpgSign=false',
        ...args,
      ],
      { cwd: directory, encoding: 'utf8' }
    ).trim();
  git('init', '--quiet');
  const version = '6.0.0-beta.1';
  await writeFile(join(directory, 'package.json'), JSON.stringify({ version }));
  git('add', 'package.json');
  git('commit', '-qm', 'Prepare prerelease');
  const sha = git('rev-parse', 'HEAD');
  git('tag', '-a', version, '-m', 'Prerelease');
  git('tag', '6.0.0');
  git('commit', '--allow-empty', '-qm', 'Next change');
  const release = releaseRevision(version, directory);
  assert.deepEqual(release, { commit: sha, version, tag: version });
  verifyPublishedTag(release, directory);
  assert.throws(
    () => verifyPublishedTag({ ...release, commit: git('rev-parse', 'HEAD') }, directory),
    /Push release tag/
  );
  assert.throws(() => releaseRevision('6.0.0', directory), /points to package version/);
  assert.throws(() => releaseRevision('main', directory), /release tag/);
});

test('tagging an already published commit promotes its original measurements and survives ordinary retries', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'report-promotion-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const { storage, files } = bucket();
  const e = { ...entry('a'), version: '5.3.0' },
    tagged = { ...e, releaseTag: '5.3.0', generated: '2026-01-04T00:00:00Z' };
  const newer = { ...entry('b'), version: e.version, generated: '2026-01-05T00:00:00Z' };
  const index = destination + 'index.html',
    url = destination + e.commit + '/index.html';
  const options = { directory, destination, commit: e.commit, storage };
  await mkdir(join(directory, e.commit));
  const path = join(directory, e.commit, 'index.html');
  await writeFile(path, examplePage(e));
  files.set(index, { generation: 1, html: archivePage([newer]) });
  await uploadReport(options);
  const original = files.get(url).html;
  await writeFile(path, examplePage(tagged));
  await uploadReport(options);
  const archive = files.get(index).html;
  assert.deepEqual(readEntries(archive), [{ ...e, releaseTag: e.version }, newer]);
  assert.match(archive, /<strong class="release-label">Release<\/strong>/);
  assert.match(examplePage(tagged), /<h1>VexFlow 5.3.0 quality report<\/h1>/);
  assert.equal(files.get(url).html, original);
  await writeFile(path, original);
  await uploadReport(options);
  assert.equal(files.get(index).html, archive);
});
