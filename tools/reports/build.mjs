// Measure a committed snapshot in a temporary checkout so old build products cannot affect the report.
import { execFileSync } from 'node:child_process';
import { access, mkdir, mkdtemp, readdir, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { releaseHistory } from './history.mjs';
import { browserCoverage } from './coverage.mjs';
import { bundleSizes, dependencies, sourceMetrics } from './metrics.mjs';
import { archivePage, commitPage, readEntries } from './html.mjs';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const output = join(root, 'build/reports');
export const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trimEnd();

/** Write beside the destination so readers always see one complete version. */
async function save(path, html) {
  await mkdir(dirname(path), { recursive: true });
  const temp = path + '.' + randomUUID() + '.tmp';
  try {
    await writeFile(temp, html);
    await rename(temp, path);
  } finally {
    await rm(temp, { force: true });
  }
}

/** Read saved commit headers and include reports produced by overlapping local runs. */
export async function refreshArchive(directory) {
  async function completeCommits() {
    const ids = [];
    for (const name of await readdir(directory)) {
      if (!/^[0-9a-f]{40}$/.test(name)) continue;
      try {
        await access(join(directory, name, 'index.html'));
        ids.push(name);
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
    }
    return ids.sort();
  }
  for (;;) {
    const ids = await completeCommits();
    const entries = [];
    for (const id of ids) entries.push(...readEntries(await readFile(join(directory, id, 'index.html'), 'utf8')));
    await save(join(directory, 'index.html'), archivePage(entries));
    if (ids.join() === (await completeCommits()).join()) return;
  }
}

/** Resolve the exact release tag, including annotated tags, and check the package it identifies. */
export function releaseRevision(tag, directory = root) {
  if (typeof tag !== 'string' || !/^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(tag)) {
    throw Error('Supply a release tag such as 5.3.0 or 5.3.0-beta.1.');
  }
  const commit = git(directory, 'rev-parse', '--verify', `refs/tags/${tag}^{commit}`);
  const { version } = JSON.parse(git(directory, 'show', `${commit}:package.json`));
  if (tag.replace(/^v/, '') !== version) throw Error(`Tag ${tag} points to package version ${version}.`);
  return { commit, version, tag };
}

/** Clone only committed files; the normal build commands still see the correct Git revision. */
export async function buildReport(release) {
  const head = git(root, 'rev-parse', 'HEAD');
  const commit = release?.commit ?? head;
  const branch =
    (commit === head && git(root, 'branch', '--show-current')) ||
    (process.env.GITHUB_SHA === commit && process.env.GITHUB_REF_NAME) ||
    'detached HEAD';
  const checkout = await mkdtemp(join(tmpdir(), 'vexflow-quality-'));
  try {
    git(root, 'clone', '--quiet', '--local', '--shared', '--no-checkout', root, checkout);
    git(checkout, 'checkout', '--quiet', '--detach', commit);
    await symlink(join(root, 'node_modules'), join(checkout, 'node_modules'), 'dir');
    const pkg = JSON.parse(await readFile(join(checkout, 'package.json')));
    const lock = JSON.parse(await readFile(join(checkout, 'package-lock.json')));
    const tags = git(root, 'tag', '--points-at', commit).split('\n');
    const releaseTag = release?.tag ?? tags.find((tag) => tag === pkg.version || tag === 'v' + pkg.version);
    const metadata = {
      commit,
      branch,
      subject: git(checkout, 'log', '-1', '--format=%s'),
      committed: git(checkout, 'log', '-1', '--format=%cI'),
      version: pkg.version,
      ...(releaseTag && { releaseTag }),
      node: process.version,
    };
    console.log(`Measuring ${commit} (${branch}). Building production bundles and ES modules…`);
    execFileSync(process.execPath, [join(root, 'node_modules/grunt/bin/grunt'), 'webpack:prod', 'build:esm'], {
      cwd: checkout,
      stdio: 'inherit',
    });
    console.log('Measuring source, dependency versions and compressed sizes…');
    const source = await sourceMetrics(checkout, git(checkout, 'ls-files', '-z').split('\0').filter(Boolean));
    const bundles = await bundleSizes(checkout);
    console.log('Running the complete QUnit notation suite in Chrome…');
    const coverage = await browserCoverage(
      checkout,
      source.files.map((f) => f.file)
    );
    const report = {
      schema: 1,
      ...metadata,
      generated: new Date().toISOString(),
      source,
      coverage,
      bundles,
      dependencies: dependencies(pkg, lock),
    };
    if (releaseTag) report.releaseHistory = await releaseHistory(root, output, report);
    await save(join(output, commit, 'index.html'), commitPage(report));
    await refreshArchive(output);
    console.log(`Report: ${join(output, commit, 'index.html')}\nArchive: ${join(output, 'index.html')}`);
  } finally {
    await rm(checkout, { recursive: true, force: true });
  }
}
