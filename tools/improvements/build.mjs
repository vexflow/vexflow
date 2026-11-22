// Build a relocatable illustrated history from a tagged release, the current checkout and its real browser outputs.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, copyFile, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { siteTheme } from '../site-theme.mjs';
import { captureScores } from './scores.mjs';
import { captureExamples, captureTools } from './screens.mjs';
import { apiChanges, base, git, history, repo } from './history.mjs';
import { collectIssueEvidence, printFigures, sourceFigures } from './evidence.mjs';
import { topics } from './topics.mjs';
import { renderReport } from './page.mjs';

process.chdir(fileURLToPath(new URL('../../', import.meta.url)));
const output = resolve('build/improvements'),
  work = resolve('build/improvements-work');
await mkdir(work, { recursive: true });
const head = git('rev-parse', 'HEAD');
const before = git('rev-parse', base + '^{commit}');
const exists = async (path) =>
  access(path).then(
    () => true,
    () => false
  );
const run = (name, ...args) => execFileSync(name, args, { stdio: 'inherit' });
const tagged = (path) => execFileSync('git', ['show', base + ':' + path], { maxBuffer: 48e6 });
const json = async (path) => JSON.parse(await readFile(path, 'utf8'));
const sha = (b) => createHash('sha256').update(b).digest('hex');
const web = createRequire(new URL('../../tests/web/package.json', import.meta.url));
const quality = 'build/reports/' + head + '/index.html';
const staging = await mkdtemp('build/improvements-staging-');
const assets = join(staging, 'assets');
await mkdir(assets);
const manifest = await json('tests/engraving/manifest.json');
const cases = Object.fromEntries(manifest.groups.flatMap((g) => Object.entries(g.cases).map(([id]) => [id, g])));

async function exhibit(directory, row, prefix) {
  const path = 'assets/' + prefix + '-' + row.id + '.png';
  await copyFile(join(directory, row.id + '.png'), join(staging, path));
  return path;
}

/** Retain all visible suite differences and all new examples. Explicitly label unmatched fixture output. */
async function compare(oldRows, newRows, directories, keepAll = false, intermediate = new Map()) {
  const old = new Map(oldRows.map((r) => [r.id, r]));
  const result = [];
  for (const row of newRows) {
    const control = old.get(row.id);
    const laterControl = !control?.hash && intermediate.get(row.id);
    const intermediatePair = laterControl && laterControl.hash !== row.hash;
    const paired = Boolean(control?.hash);
    const same = paired && control.hash === row.hash;
    if (same && !keepAll && !cases[row.id]) continue;
    const source = cases[row.id]?.source;
    result.push({
      id: row.id,
      name: row.name,
      module: row.module,
      description:
        row.description ??
        cases[row.id]?.review ??
        'The ' + row.module + ' suite renders this passage to exercise ' + row.name + '.',
      status: same ? 'Control' : paired || intermediatePair ? 'Comparison' : 'Current example',
      width: row.width,
      height: row.height,
      left:
        paired && !same
          ? await exhibit(directories[0], row, 'release')
          : intermediatePair
            ? await exhibit(join(work, 'intermediate'), row, 'intermediate')
            : undefined,
      right: await exhibit(directories[1], row, 'current'),
      leftLabel: intermediatePair ? '5.2.0 · native control' : base,
      rightLabel: 'Current',
      source: source
        ? repo + '/blob/' + head + '/' + source
        : repo + '/tree/' + head + (row.id.startsWith('example-') ? '/guide' : '/tests'),
    });
  }
  return result;
}

/** Reuse the original two-font evidence saved in Git before the project moved it to issues. */
async function historicalPairs() {
  const ref = 'b930f4b6^';
  const names = git('ls-tree', '-r', '--name-only', ref, 'docs/images')
    .split('\n')
    .filter((p) => p.endsWith('-after.png'));
  const subjects = {
    71: 'Portable SVG export',
    152: 'Text and music font order',
    177: 'Shared lyric baseline',
    182: 'Tie length with lyrics',
    203: 'Rest clearance across voices',
    206: 'Pedal clears bottom annotations',
    253: 'Grace group bounding box',
    255: 'Grace TAB fret sizing',
  };
  const pairs = [];
  for (const path of names) {
    const stem = basename(path, '-after.png'),
      issue = Number(stem.split('-')[0]) || 71;
    const id = 'archive-' + stem;
    const target = (side) => 'assets/' + id + '-' + side + '.png';
    for (const side of ['before', 'after'])
      await writeFile(
        join(staging, target(side)),
        execFileSync('git', ['show', ref + ':' + path.replace('-after.png', '-' + side + '.png')])
      );
    pairs.push({
      id,
      name: subjects[issue],
      module: 'Issue ' + issue,
      status: 'Issue evidence',
      description:
        'Original ' +
        (/petaluma/i.test(stem) ? 'Petaluma' : 'Bravura') +
        ' comparison recorded during the fix for issue #' +
        issue +
        '.',
      leftLabel: 'Before fix',
      rightLabel: 'After fix',
      left: target('before'),
      right: target('after'),
      source: repo + '/issues/' + issue,
    });
  }
  return pairs;
}

/** Retrieve the pinned intermediate control for roadmap scores whose inputs postdate 5.0.0. */
async function intermediateBundle() {
  const file = 'package/build/cjs/vexflow-debug-with-tests.js';
  let path = join('build/m0-release', file);
  if (!(await exists(path))) {
    path = join(work, file);
    if (!(await exists(path))) {
      run('npm', 'pack', 'vexflow@5.2.0', '--ignore-scripts', '--silent', '--pack-destination', work);
      run('tar', '-xzf', join(work, 'vexflow-5.2.0.tgz'), '-C', work, file);
    }
  }
  const bytes = await readFile(path);
  assert.equal(sha(bytes), manifest.historicalRelease.bundleSHA256);
  return bytes;
}

try {
  run(process.execPath, 'node_modules/grunt/bin/grunt', 'clean:webpack_cache', 'webpack:debug', 'build:types');
  run(process.execPath, 'guide/cli.mjs', 'build');
  run(process.execPath, 'tools/tests-site.mjs', 'build');
  if (!(await exists(quality))) run(process.execPath, 'tools/reports/cli.mjs', 'build');
  const browser = await web('playwright').chromium.launch();
  const revision = history(head);
  let figures, stats, version;
  try {
    version = browser.version();
    const directories = [join(work, 'before'), join(work, 'after')];
    const packs = [
      tagged('build/cjs/vexflow-debug-with-tests.js'),
      await readFile('build/cjs/vexflow-debug-with-tests.js'),
    ];
    const plain = [tagged('build/cjs/vexflow-debug.js'), await readFile('build/cjs/vexflow-debug.js')];
    const results = await Promise.all(
      directories.map(async (dir, i) => {
        const scores = await captureScores(browser, packs[i], dir);
        const examples = await captureExamples(browser, plain[i], dir, i === 0);
        await writeFile(join(dir, 'examples.json'), JSON.stringify(examples));
        return { scores, examples };
      })
    );
    assert.equal(results[0].scores.build.VERSION, base);
    assert.equal(results[1].scores.build.ID, head);
    assert.deepEqual(results[1].scores.missing, []);
    assert.ok(results[1].scores.images.every((r) => r.status === 'passed'));
    const [old, now] = results;
    const lateScores = await captureScores(
      browser,
      await intermediateBundle(),
      join(work, 'intermediate'),
      new Set(manifest.groups.flatMap((g) => Object.values(g.cases)))
    );
    const secondary = new Map(lateScores.images.map((r) => [r.id, r]));
    const toolDir = join(work, 'interfaces');
    const tools = await captureTools(browser, toolDir, head);
    figures = [
      ...(await compare(old.scores.images, now.scores.images, directories, false, secondary)),
      ...(await compare(old.examples, now.examples, directories, true)),
      ...(await historicalPairs()),
    ];
    for (const tool of tools)
      figures.push({
        ...tool,
        status: 'New tool',
        rightLabel: 'Current',
        right: await exhibit(toolDir, tool, 'current'),
      });
    figures.push(...(await printFigures(browser, staging, head)));
    figures.push(...(await collectIssueEvidence(staging, work)));
    figures.push(...(await sourceFigures(browser, staging, head, revision.commits)));
    stats = {
      old: old.scores.images.length,
      current: now.scores.images.length,
      examples: now.examples.length,
      oldBundle: sha(packs[0]),
      newBundle: sha(packs[1]),
    };
    // The inventory also records controls omitted from the visual gallery and historical construction failures.
    await writeFile(
      join(staging, 'render-inventory.json'),
      JSON.stringify({ release: old, current: now, intermediate: lateScores }, null, 2)
    );
  } finally {
    await browser.close();
  }
  const data = {
    base,
    before,
    head,
    date: git('show', '-s', '--format=%as', 'HEAD'),
    version,
    stats,
    topics,
    figures,
    ...revision,
    api: await apiChanges(work),
  };
  const ids = new Set(figures.map((r) => r.id));
  assert.equal(ids.size, figures.length, 'Duplicate exhibit IDs');
  const byTopic = Map.groupBy(
    figures.filter((f) => f.topic),
    (f) => f.topic
  );
  const titles = new Set(topics.flatMap(([, , items]) => items.map(([title]) => title)));
  for (const title of byTopic.keys()) assert.ok(titles.has(title), 'Unassigned evidence: ' + title);
  data.topics = topics.map(([category, group, items]) => [
    category,
    group,
    items.map(([title, body, path, ...examples]) => {
      const originals = byTopic.get(title) ?? [];
      for (const figure of originals) figure.description = body;
      const evidence = [...originals.map((f) => f.id), ...examples];
      assert.ok(evidence.length, 'Missing visual or source evidence: ' + title);
      for (const id of evidence) assert.ok(ids.has(id), 'Missing figure for ' + title + ': ' + id);
      return [title, body, path, ...evidence];
    }),
  ]);
  for (const [, , items] of topics)
    for (const [, , link] of items) if (!/^(commit|issues)\//.test(link)) await access(link);
  await writeFile(join(assets, 'report.css'), siteTheme + (await readFile('tools/improvements/report.css', 'utf8')));
  await copyFile('tools/improvements/app.js', join(assets, 'app.js'));
  await writeFile(join(staging, 'changes.json'), JSON.stringify(data, null, 2));
  await writeFile(join(staging, 'index.html'), renderReport(data));
  // Only replace a directory previously produced by this generator.
  if (await exists(output)) {
    const previous = await json(join(output, 'changes.json'));
    assert.equal(previous.base, base, 'Unexpected existing report directory');
    const backup = join(work, 'previous-' + Date.now());
    await rename(output, backup);
    try {
      await rename(staging, output);
    } catch (e) {
      await rename(backup, output);
      throw e;
    }
    await rm(backup, { recursive: true, force: true });
  } else await rename(staging, output);
  console.log(
    output + '/index.html',
    data.commits.length + ' commits, ' + data.api.length + ' declaration changes, ' + figures.length + ' exhibits'
  );
} finally {
  await rm(staging, { recursive: true, force: true });
}
