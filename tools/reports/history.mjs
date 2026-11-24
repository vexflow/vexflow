// Gather comparable measurements for tagged releases on the measured commit's first-parent history.
import { execFileSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const archive = 'https://vexflow.com/reports/';

/** A small machine-readable header lets publishers merge the static archive without scraping tables. */
export function readEntries(html) {
  const raw = /<script type="application\/json" id="report-entries">([^<]*)<\/script>/.exec(html)?.[1];
  if (!raw) throw Error('Missing quality report metadata.');
  const entries = JSON.parse(raw);
  const count = (n) => Number.isSafeInteger(n) && n >= 0;
  const valid = (e) =>
    e &&
    /^[0-9a-f]{40}$/.test(e.commit) &&
    ['generated', 'committed'].every((k) => typeof e[k] === 'string' && Number.isFinite(Date.parse(e[k]))) &&
    ['branch', 'subject', 'version'].every((k) => typeof e[k] === 'string') &&
    (e.releaseTag === undefined || e.releaseTag === e.version || e.releaseTag === 'v' + e.version) &&
    count(e.core) &&
    count(e.loc) &&
    count(e.lines?.total) &&
    count(e.lines?.hit) &&
    e.lines.hit <= e.lines.total;
  if (!Array.isArray(entries) || !entries.every(valid) || new Set(entries.map((e) => e.commit)).size !== entries.length)
    throw Error('Invalid quality report metadata.');
  return entries;
}

/** Read the original measurement payload embedded in a standalone commit page. */
export function readReport(html) {
  const raw = /<script type="application\/json" id="report-data">([^<]*)<\/script>/.exec(html)?.[1];
  if (!raw || !html.trimEnd().endsWith('</html>')) throw Error('Incomplete commit report.');
  return JSON.parse(raw);
}

/** Coverage uses its measured denominator; an unmeasured rate stays missing. */
export function measurements(report) {
  const { lines } = report.coverage.total;
  return {
    loc: report.source.files.reduce((n, f) => n + f.code, 0),
    coverage: lines.total ? (100 * lines.hit) / lines.total : null,
    complexity: report.source.complexity.filter((f) => f.score > 10).length,
    tests: report.coverage.tests.passed,
    core: report.bundles.find((b) => b.name === 'vexflow-core.js').gzip,
    dead: report.source.dead.length,
    dependencies: report.dependencies.unique,
  };
}

/** Prefer the immutable published measurements. A local report also supports unpublished and offline work. */
async function priorReport(directory, tag, published, fetcher) {
  let html;
  if (published.has(tag.commit)) {
    const response = await fetcher(archive + tag.commit + '/index.html', { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw Error('Unable to read published report for ' + tag.version + ': ' + response.status);
    html = await response.text();
  } else {
    try {
      html = await readFile(join(directory, tag.commit, 'index.html'), 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
  }
  const report = readReport(html);
  if (report.schema !== 1 || report.commit !== tag.commit || report.version !== tag.version)
    throw Error('Mismatched release measurements for ' + tag.version);
  return measurements(report);
}

/** The staged release archive exists before GitHub publication. HEAD retrieves older asset sizes without downloading them. */
async function packageBytes(root, tag, online, fetcher) {
  const version = tag.replace(/^v/, '');
  if (online) {
    const response = await fetcher(
      'https://github.com/vexflow/vexflow/releases/download/' + tag + '/vexflow-' + version + '.tgz',
      {
        method: 'HEAD',
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!response.ok && response.status !== 404)
      throw Error('Unable to read release tarball size for ' + version + ': ' + response.status);
    const size = Number(response.headers.get('content-length'));
    if (response.ok && Number.isSafeInteger(size) && size > 0) return size;
  }
  try {
    return (await stat(join(root, 'releases', version, 'vexflow-' + version + '.tgz'))).size;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return null;
}

/** Keep gaps in the series, including an immediate predecessor without a quality report. */
export async function releaseHistory(root, directory, report, fetcher = fetch) {
  const log = execFileSync(
    'git',
    ['log', '--first-parent', '--decorate=full', '--decorate-refs=refs/tags/*', '--format=%H%x09%D', report.commit],
    { cwd: root, encoding: 'utf8' }
  );
  const tags = [];
  for (const line of log.split('\n')) {
    const [commit, refs] = line.split('\t');
    if (!refs || commit === report.commit) continue;
    const candidates = refs
      .split(', ')
      .filter((ref) => /^tag: refs\/tags\/v?\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/.test(ref));
    if (!candidates.length) continue;
    // The package version identifies the release if more than one tag points to this commit.
    let version = candidates[0].slice('tag: refs/tags/'.length).replace(/^v/, '');
    if (candidates.length > 1)
      version = JSON.parse(
        execFileSync('git', ['show', commit + ':package.json'], { cwd: root, encoding: 'utf8' })
      ).version;
    const tag = candidates
      .map((ref) => ref.slice('tag: refs/tags/'.length))
      .find((tag) => tag.replace(/^v/, '') === version);
    if (tag && (report.version.includes('-') || !version.includes('-'))) tags.push({ commit, version, tag });
  }
  let published = new Set();
  let response;
  try {
    response = await fetcher(archive + 'index.html', { signal: AbortSignal.timeout(8000) });
  } catch {
    console.warn('Published report archive unavailable. Using locally saved measurements.');
  }
  if (response) {
    if (!response.ok) throw Error('Unable to read report archive: ' + response.status);
    published = new Set(readEntries(await response.text()).map((e) => e.commit));
  }
  const history = [];
  for (const tag of tags) {
    const values = await priorReport(directory, tag, published, fetcher);
    if (values) values.package = await packageBytes(root, tag.tag, Boolean(response), fetcher);
    history.push({ ...tag, values: values ?? null });
  }
  // Drop unmeasured releases before reporting began, but retain the true comparison baseline.
  while (history.length > 1 && !history.at(-1).values) history.pop();
  return { prior: history.reverse(), package: await packageBytes(root, report.releaseTag, Boolean(response), fetcher) };
}
