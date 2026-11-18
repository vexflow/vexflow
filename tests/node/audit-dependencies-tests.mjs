// Guard the boundaries of the temporary picomatch exception using npm audit v2 report shapes.
import assert from 'node:assert/strict';
import test from 'node:test';

import { isExcepted } from '../../tools/audit-dependencies.mjs';

/** A development tool inherits the one reviewed advisory from its dependency. */
function fixture() {
  const report = {
    auditReportVersion: 2,
    metadata: { vulnerabilities: { total: 2 } },
    vulnerabilities: {
      tool: { nodes: ['node_modules/tool'], via: ['picomatch'] },
      picomatch: {
        nodes: ['node_modules/picomatch'],
        via: [{ url: 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf' }],
      },
    },
  };
  const packages = {
    'node_modules/tool': { dev: true },
    'node_modules/picomatch': { dev: true, version: '4.0.5' },
  };
  return { report, packages };
}

const reviewDate = Date.UTC(2026, 10, 18);

test('accepts the reviewed advisory and its inherited findings only during the review period', () => {
  const { report, packages } = fixture();
  assert.ok(isExcepted(report, packages, reviewDate));
  assert.equal(isExcepted(report, packages, Date.UTC(2026, 11, 18)), false);
});

test('rejects changes in scope, new advisories, and incomplete audit results', () => {
  for (const change of [
    ({ packages }) => delete packages['node_modules/picomatch'].dev,
    ({ packages }) => (packages['node_modules/picomatch'].version = '4.0.6'),
    ({ report }) => (report.vulnerabilities.picomatch.fixAvailable = true),
    ({ report }) => report.vulnerabilities.picomatch.via.push({ url: 'another advisory' }),
    ({ report }) => report.vulnerabilities.tool.via.push({ url: 'another advisory' }),
    ({ report }) => (report.vulnerabilities.tool.via = ['missing']),
    ({ report }) => (report.error = { summary: 'audit unavailable' }),
  ]) {
    const data = fixture();
    change(data);
    assert.equal(isExcepted(data.report, data.packages, reviewDate), false);
  }
});
