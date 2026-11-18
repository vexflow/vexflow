# Security policy

Report suspected vulnerabilities privately with [GitHub's vulnerability reporting form](https://github.com/vexflow/vexflow/security/advisories/new). Include the affected version, the impact, and enough detail for a maintainer to investigate.

We aim to keep the published library small, validate inputs at public API boundaries, and isolate editable examples from the host page. We also review the tools that build, test, and publish VexFlow. CI installs locked dependencies and checks advisories at every severity. An exception needs a documented scope, a reason, and a date for review.

## Known Issues

**2026-11-18 · picomatch · development tooling only.** A crafted glob can stall a Node.js process. Grunt, ts-loader, TypeScript ESLint, and release-it bring in picomatch to match file paths. The published library has no dependency on it. Keep patterns passed to these tools under repository or maintainer control. [Upstream advisory GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf)

The advisory lists no patched release. CI temporarily accepts this single finding for the locked development copies (2.3.2 and 4.0.5) and findings caused solely by them. The exception expires on 2026-12-18 UTC. When a patched release is available, update the lockfile, verify that plain `npm audit` passes, remove the exception, and delete this entry.
