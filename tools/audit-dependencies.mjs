// Apply the temporary development-only exception in SECURITY.md to npm's full audit report.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const advisory = 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf';
const reviewedVersions = new Set(['2.3.2', '4.0.5']);
const expires = Date.parse('2026-12-18T00:00:00Z');

/** Accept only reviewed lockfile nodes and dependency chains explained entirely by this advisory. */
export function isExcepted(report, packages, now = Date.now()) {
  const findings = Object.entries(report?.vulnerabilities ?? {});
  if (now >= expires || report.auditReportVersion !== 2 || report.error || !findings.length) return false;
  if (report.metadata?.vulnerabilities?.total !== findings.length) return false;

  const accepted = new Set();
  for (const [name, finding] of findings) {
    if (!finding.nodes?.length || !finding.nodes.every((path) => packages[path]?.dev === true)) return false;
    if (name === 'picomatch') {
      if (finding.isDirect || finding.fixAvailable === true) return false;
      if (!finding.nodes.every((path) => reviewedVersions.has(packages[path].version))) return false;
      if (finding.via?.length !== 1 || finding.via[0]?.url !== advisory) return false;
      accepted.add(name);
    }
  }

  // npm represents an inherited finding by listing its affected dependencies as strings in via.
  // A second advisory, missing dependency, or unexplained cycle stays outside the accepted set.
  let previousSize;
  do {
    previousSize = accepted.size;
    for (const [name, { via }] of findings) {
      if (via?.length && via.every((cause) => accepted.has(cause))) accepted.add(name);
    }
  } while (accepted.size > previousSize);
  return accepted.size === findings.length;
}

/** Preserve npm failures and the raw report unless every finding qualifies for the exception. */
function main() {
  const result = spawnSync(
    process.execPath,
    [process.env.npm_execpath, 'audit', '--include=dev', '--audit-level=low', '--json'],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    }
  );
  if (result.error) throw result.error;
  if (result.status === 0) {
    console.log('npm audit passed.');
    return;
  }
  console.log(result.stdout);
  if (result.status === 1) {
    const report = JSON.parse(result.stdout);
    const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
    if (isExcepted(report, lock.packages)) {
      console.log('Accepted the development-only picomatch advisory through 2026-12-17 UTC. See SECURITY.md.');
      return;
    }
  }
  process.exitCode = result.status ?? 1;
}

if (import.meta.main) main();
