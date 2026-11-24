# Code quality reports

```sh
npm ci
npm run report
```

Open `build/reports/index.html` or the printed commit page in a browser. Both work locally as files.
Expand the tables for per-module coverage, individual functions and dependencies. Use **Download report JSON** for the complete dataset.

The command measures the committed **HEAD** in a temporary local clone. It builds fresh production bundles and ES modules there using the checkout’s installed dependencies. Uncommitted edits and earlier build products are excluded. Use the project's pinned Node version and run `npm ci` after changing branches or lockfiles. Chrome is required for browser coverage. To use an installed Chrome, set `PUPPETEER_EXECUTABLE_PATH` as described in [local setup](build.md#local-setup).

## Publish

With the [website bucket credentials](build.md#upload-static-sites), run:

```sh
npm run report:upload -- --dry-run
npm run report:upload
```

The default commit page is `https://vexflow.com/reports/<full-commit-sha>/`. The [archive](https://vexflow.com/reports/) lists each commit’s branch, subject, version, report date, code lines, browser line coverage and compressed core bundle size. For detached HEAD builds, the report uses the matching GitHub Actions ref if available.

The upload uses the saved report for HEAD. Select an earlier local report with `--commit=<full-commit-sha>` or another bucket prefix with `--destination=gs://your-bucket/reports/`. A dry run validates the page locally. A live upload creates the commit page once, verifies it, then merges its metadata with the current remote index using a generation precondition. A retry after interruption finishes indexing the first published measurement. Existing reports from other branches and checkouts stay in the archive.

Local reports live under the normal build directory. Commands such as `npm test` can clean this directory. Published reports persist in the bucket.

## Release reports

A tagged report opens with a table comparing its measurements with the preceding release on the same first-parent Git history. Counts and sizes show their absolute and relative changes. Coverage changes use percentage points, so a move from 80% to 82% reads as an increase of two points. The comparison links to the source changes between the two commits.

Six charts track the npm tarball, gzipped core browser bundle, authored code lines, browser line coverage, functions with complexity above 10, and passing browser tests. Hover over a point to see its version and value, or expand **Measurements for every release** to read every value in a table. The charts and comparison are embedded in the report and work offline.

The build reads the published measurements for earlier tagged commits and uses local reports for unpublished commits or offline builds. Stable releases compare with previous stable releases. Prereleases also include earlier prereleases. A missing report leaves a gap, and a previous value of zero allows an absolute change only. The npm size comes from the release tarball on GitHub or the staged tarball in `releases/<version>/`.

Each new release also publishes its report at `https://vexflow.com/reports/<version>/`. Use this permalink in the changelog before the release commit exists.

`npm run release:github -- <tag>` publishes the tagged report before creating the GitHub release. The legacy Grunt release path calls the same report publisher. See [cutting a release](build.md#release-a-version) for tag and artifact preparation.

To publish the report for an existing release, run `npm run report:release -- <tag>`. Append `--dry-run` to build and preview locally. The command measures the commit the tag identifies, including prereleases, and verifies its package version. The archive puts tagged releases first with an explicit **Release** label beside the version. Republishing a version can update its comparisons while preserving the original measurements at the immutable commit URL. When a previously reported commit becomes a release, its existing measurements stay at the same URL and its archive entry gains the release label.

## What the numbers mean

| Metric                | Measurement                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lines of code         | ESLint parser tokens classify tracked JS, MJS, CJS and TS lines into code, comment-only and blank. A multiline token counts across the lines it occupies. Mixed lines count as code. Tables separate the library, tests, demos, guide and tools.                                                                                                                                                                                                       |
| Browser coverage      | Istanbul instruments first-party `src/` ES modules in memory. Chrome runs the full QUnit notation suite with its usual fonts and rendering backends. The report gives hit and total counts for statements, lines, branches and functions. A line counts if any statement starting on that compiled line ran. Unloaded modules retain zero counts. Links identify the corresponding TS module. Separate Node regression suites are outside this metric. |
| Cyclomatic complexity | ESLint’s classic complexity rule measures individual functions and implicit functions such as class field initializers in `src/` and `entry/`. The summary counts scores above 10. Each result links to its source line.                                                                                                                                                                                                                               |
| Dead-code candidates  | TypeScript checks unused locals, private declarations, parameters, imports and unreachable code in the library and entry points. These are review candidates. External consumers may use exported APIs.                                                                                                                                                                                                                                                |
| Bundle sizes          | The three production browser bundles are rebuilt from the measured commit. Sizes cover raw JS bytes, gzip level 9 and Brotli, excluding external source maps.                                                                                                                                                                                                                                                                                          |
| Dependencies          | The root npm manifest and lockfile supply direct ranges, resolved versions, licenses, distinct names, install locations, production locations and packages locked at multiple versions. This is an inventory, independent of the advisory checks in `npm run audit:ci`.                                                                                                                                                                                |

Generated font data, glyph tables and vendored QUnit are excluded from authored-source analysis. Embedded fonts are included in the appropriate bundle sizes. A build or test failure stops generation before a new local report is installed.

Run `npm run report:test` for reporting and publication regression tests.
