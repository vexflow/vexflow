# VexFlow code review

**Date:** November 15, 2026

**Result:** 22 findings: 5 P1, 16 P2, and 1 P3.

**Tracking status (November 15, 2026):** R03 (#348) is fixed. The other four P1 issues remain open. All five have `bug` and `ai_review` labels. P2 and P3 findings have not been filed as part of this review.

## Scope and baseline

- **Reviewed branch:** `main` at `07da2f1313e3b8c439fff25b2957ed9345d770d8`, matching `origin/main` and GitHub main at verification time.
- The first draft used an older local main. The checkout has since been fast-forwarded, the incoming source changes reviewed, and compilation, all 20 focused probes, the ESM import check, and the dependency audit repeated against current main.
- Reviewed parsing, timing, accidentals, formatting, registry state, rendering, geometry, fonts, build tools, tests, and dependencies.
- The review combines source inspection, focused runtime probes, build checks, and fresh dependency audits. It is not a proof that every engraving case is correct.
- The initial review made no source code or dependency fixes. Follow-up fixes are tracked under each finding.

### Merged fixes included in this review

These fixes are present in the reviewed checkout and are **excluded from the open findings**:

| Issue | Merged fix |
| --- | --- |
| Critical DOMPurify and shell-quote vulnerabilities | [PR #344](https://github.com/vexflow/vexflow/pull/344) |
| Articulations move on repeated draws | [PR #340](https://github.com/vexflow/vexflow/pull/340) |
| Missing curve bounding boxes | [PR #339](https://github.com/vexflow/vexflow/pull/339) |
| Incorrect grace-note group bounding boxes | [PR #338](https://github.com/vexflow/vexflow/pull/338) |

Current main also contains dependency updates for fast-uri, ip-address, and zod. The findings below account for those changes. Source references use this revision's line numbers.

## Priorities

| Priority | Meaning | Main concerns |
| --- | --- | --- |
| **P1** | Fix before the next release. | Broken ESM imports, shared-object pollution, wrong accidentals, process stalls. |
| **P2** | Address in the next maintenance cycle. | Unreliable validation, dependency risks, editing and rendering defects. |
| **P3** | Lower-impact correction. | Incorrect fraction display. |

## P1 — Fix before the next release

### R01. The ESM build rewrites a package name into a nonexistent package

- **Status:** Open — [#346](https://github.com/vexflow/vexflow/issues/346). Fix not started.
- **Location:** `tools/fix-esm-imports.mjs:49–65`; `src/util.ts:4`.
- **Problem:** The rewrite adds `.js` to bare package imports and re-exports. This breaks the package's ESM entry points.
- **Evidence:** Building ESM and running the rewrite changes `structured-clone-es` to `structured-clone-es.js`. Importing `entry/vexflow-core.js` then fails with `ERR_MODULE_NOT_FOUND`.
- **Fix:** Rewrite only relative file specifiers. Add an ESM import smoke test against the built package. Current CI tests the debug CommonJS build and misses this failure.

### R02. Registry class names can write to Object.prototype

- **Status:** Open — [#347](https://github.com/vexflow/vexflow/issues/347). Fix not started.
- **Location:** `src/registry.ts:27–34,72–88`; `src/element.ts:262–271`.
- **Problem:** Indexes use ordinary objects and trust inherited properties. An untrusted class name can change shared object state across the application.
- **Evidence:** Register an element with ID `reviewProbe`, then call `element.addClass('__proto__')`. A fresh `{}` now exposes that element as `.reviewProbe`. The probe removed the property afterward.
- **Fix:** Use `Map` or null-prototype dictionaries at every index level. Validate index names and test `__proto__`, `constructor`, and `toString` as values and IDs.

### R03. Automatic accidentals are processed out of musical order

- **Status:** Fixed — [#348](https://github.com/vexflow/vexflow/issues/348).
- **Location:** `src/accidental.ts:408–437`.
- **Problem:** Tick positions are collected one voice at a time and never sorted. A later note can change accidental state before an earlier note is processed.
- **Evidence:** Voice A contains half notes C4, C#4. Voice B contains G4 quarter, C#4 quarter, G4 half. In C major, B's C# gets no sharp. Reversing the voice array makes the sharp appear.
- **Fix applied:** Sort tick positions numerically before applying accidentals. Simultaneous notes stay grouped.
- **Validation:** Added regression tests for both voice orders, natural cancellation, and simultaneous sharps. Both tests failed before the fix and pass afterward. TypeScript compilation and changed-file lint pass. All 1,874 headless browser tests pass with Node 24.

### R04. Malformed duration and meter strings can stall the process

- **Status:** Open — [#349](https://github.com/vexflow/vexflow/issues/349). Fix not started.
- **Location:** `src/note.ts:166–171`; `src/voice.ts:68–74`; `src/tuning.ts:46`.
- **Problem:** Unanchored or overlapping regular expressions repeatedly retry long input. Applications that accept score text can freeze the browser or a server worker.
- **Evidence:** Duration parsing with 10,000 digits followed by `X` exceeded a 750 ms child-process limit. A meter string containing 100,000 digits also exceeded it. The tuning whitespace split has the same retry risk by inspection.
- **Fix:** Use anchored, unambiguous parsing and reasonable input limits. Split tuning strings on commas, then trim each field. Add bounded tests for long invalid input.

### R05. Invalid meter values can enter an infinite GCD loop

- **Status:** Open — [#350](https://github.com/vexflow/vexflow/issues/350). Fix not started.
- **Location:** `src/voice.ts:68–90,175–179`; `src/fraction.ts:24–35`.
- **Problem:** Meter values are not checked for finiteness or a positive denominator. GCD rejects `NaN` at entry but accepts infinity. Its remainder calculation then becomes `NaN`, and the loop never ends.
- **Evidence:** `new Voice('4/0').isComplete()` timed out. An overflowing numerator and `Fraction.GCD(Infinity, 1)` did too.
- **Fix:** Validate meter values before creating fractions. Reject non-finite GCD inputs. Define and enforce valid fraction denominators.

## P2 — Next maintenance cycle

### R06. Build helpers discard failures

- **Location:** `Gruntfile.js:182–185,479–516,862–876`.
- **Problem:** `runCommand()` ignores child exit codes, signals, and launch errors. The TypeScript helper logs diagnostics but may return success when files were emitted. Its callers also ignore its return value.
- **Evidence:** Calling the actual `runCommand()` helper with a child that exits with code 7 returns normally. Source inspection confirms that ESM and declaration tasks do not reject the compiler result.
- **Fix:** Fail Grunt tasks on subprocess errors and TypeScript error diagnostics. Test a failed child, a missing executable, and an intentional type error.

### R07. Visual regression checks can report success despite failures

- **Location:** `tools/visual_regression.sh:141–160,174–198,224–230`.
- **Problem:** Different images produce a failure message but exit code 0. The script copies a diff image that it never creates. It also iterates only current images, so deleted output is not treated as a failure.
- **Evidence:** Two different 1-pixel PNGs produced “1 fail(s)” and exit code 0. Removing an image from current output produced “Success - No differences!” after a count warning. ImageMagick's availability check was stubbed; the script never invokes a comparator.
- **Fix:** Restore pixel comparison and diff generation. Check both file sets. Return nonzero for differences, missing images, and comparison errors. R06 must also propagate that exit code.

### R08. The Undici override still pins a vulnerable version

- **Location:** `package.json:140–142`; `package-lock.json`, including remote main's lockfile.
- **Problem:** The override fixes Undici at `6.23.0`, preventing normal dependency resolution from selecting patched versions. This affects development tooling; production exploitability was not established.
- **Evidence:** A fresh audit of remote main reports 23 affected packages: 15 high, 6 moderate, 2 low, and **0 critical**. Undici remains affected by issues including a [TLS validation bypass](https://github.com/advisories/GHSA-2m5v-pch6-74hx), fixed in `6.29.1`. These counts include parent packages affected through dependencies.
- **Fix:** Update or remove the override after compatibility checks. Re-audit the entire tree. Root zod is updated, but `grunt-contrib-qunit/node_modules/zod` remains affected. Avoid blindly applying `npm audit fix --force`.

### R09. Changing a tuplet note's duration corrupts its intrinsic ticks

- **Location:** `src/tickable.ts:370–381`.
- **Problem:** `setDuration()` saves the already-scaled tick value as the intrinsic duration. Later tuplet operations apply or remove multipliers against the wrong base.
- **Evidence:** Set a note in a 3:2 tuplet to `new Fraction(1, 4)`, then detach the tuplet. The note retains about 2730.67 ticks instead of 4096.
- **Fix:** Store the unscaled duration in `intrinsicTicks`. Derive `ticks` from that value and the current multiplier. Test duration edits with nested tuplets too.

### R10. Tuplet labels move on the second draw

- **Location:** `src/tuplet.ts:388–399`; `src/element.ts:605–614`.
- **Problem:** Drawing passes absolute coordinates to `renderText()`, then stores those coordinates on the child element. The next draw adds the stored coordinates again.
- **Evidence:** In a recorded draw, the label moved from approximately `(125.91, 90.5)` to `(251.81, 181)`. The notes and layout did not change. The suffix follows the same code pattern.
- **Fix:** Store the child position and render at `(0, 0)`, or keep the child position zero and pass absolute coordinates. Test repeated drawing with and without a suffix.

### R11. SVG resize and restore do not preserve scale correctly

- **Location:** `src/svgcontext.ts:260–295,574–588`.
- **Problem:** `resize()` multiplies by the existing scale again. `restore()` restores scale fields without restoring the SVG viewBox.
- **Evidence:** A 400×200 SVG at 2× scale has viewBox `0 0 200 100`. Resizing to the same dimensions changes it to `0 0 100 50`. Separately, save → scale → restore leaves the scaled viewBox active.
- **Fix:** Separate scale mutation from viewBox recalculation. Recalculate from saved state during resize and restore. Test repeated resize and nested save/restore.

### R12. Changing an element ID leaves stale registry entries

- **Location:** `src/registry.ts:82–88`; `src/element.ts:328–334`.
- **Problem:** An ID change updates the ID index but leaves type and class buckets keyed by the old ID. Later updates use the new ID and cannot remove old entries.
- **Evidence:** Register an element, add class `selected`, change its ID, then remove that class. `hasClass('selected')` is false, but `getElementsByClass('selected')` still returns the element.
- **Fix:** Rekey every secondary index when an ID changes. Test class and type changes after renaming an element.

### R13. Removing one class also removes later classes

- **Location:** `src/element.ts:276–287`.
- **Problem:** `splice()` is called without a delete count. It removes the requested class and every class after it. Registry notifications cover only the requested class.
- **Evidence:** Add `a`, `b`, and `c`, then remove `b`. The element's class string becomes `a`, instead of `a c`.
- **Fix:** Remove exactly one entry. Add a test that removes the middle class and checks both the element and registry.

### R14. Resetting notes retains obsolete noteheads

- **Location:** `src/stavenote.ts:429–435,464–524`; `src/element.ts:174–178`.
- **Problem:** Reset rebuilds noteheads and appends them to `children`. Old noteheads stay attached. Repeated editing grows memory use and makes recursive style changes more expensive.
- **Evidence:** A three-note chord had 7 children after construction. After 100 calls to `reset()`, it had 307 children.
- **Fix:** Remove or replace obsolete children when rebuilding noteheads. Preserve the stem and other live children. Test that child counts remain stable across resets.

### R15. The formatter's cached minimum width loses padding

- **Location:** `src/formatter.ts:440–485`.
- **Problem:** The first call returns base width plus calculated padding. Later calls return only the cached base width. Layout results depend on how many times the estimate was requested.
- **Evidence:** For half, quarter, eighth, and eighth notes, consecutive calls returned approximately 146.90 and 122.40 pixels.
- **Fix:** Cache the final estimate, or cache base width and padding separately. Repeated calls for unchanged voices must return the same value.

### R16. Explicit major keys are parsed as minor

- **Location:** `src/music.ts:251–268`.
- **Problem:** The entire key string is lowercased before distinguishing `M` from `m`. An explicit major suffix becomes minor.
- **Evidence:** `getKeyParts('CM')` returns type `m`. `createScaleMap('CM')` produces E-flat, A-flat, and B-flat; `createScaleMap('C')` does not.
- **Fix:** Normalize the root separately and preserve the mode suffix. Test `C`, `CM`, `Cm`, and accidental roots.

### R17. Fraction comparisons ignore the denominator's sign

- **Location:** `src/fraction.ts:139–161`.
- **Problem:** Comparisons inspect only the numerator after subtraction. Negative denominators reverse the result.
- **Evidence:** `new Fraction(1, -2).value()` is `-0.5`, but `.greaterThan(0)` returns true.
- **Fix:** Normalize denominator signs or compare normalized fractions. Cover all four comparison methods with negative denominators.

### R18. Invalid dash patterns can hang rendering

- **Location:** `src/renderer.ts:86–98`.
- **Problem:** The drawing loop assumes each dash pattern makes forward progress. All-zero, empty, negative, or non-finite patterns can violate that assumption.
- **Evidence:** Drawing a nonzero-length line with `[0, 0]` exceeded the child-process timeout. Neither coordinate advances.
- **Fix:** Validate a nonempty pattern with finite, nonnegative entries and a positive total length. Keep valid patterns such as `[3, 0]` working.

### R19. Repeating a rule that consumes no text hangs the parser

- **Location:** `src/parser.ts:178–192`.
- **Problem:** Repetition checks success but not input progress. A custom grammar with an empty match loops forever and keeps accumulating results.
- **Evidence:** A `zeroOrMore` rule containing token `a*` hangs when parsing `b`. This requires a custom grammar; it was not demonstrated through the built-in EasyScore grammar.
- **Fix:** Detect a successful iteration that leaves the position unchanged. Reject the grammar or stop according to a documented rule.

### R20. The font demo inserts font metadata as HTML

- **Location:** `demos/opentype/load.html:113–120`.
- **Problem:** The family name from a user-selected font is interpolated into `innerHTML`. Malicious metadata can become active markup in the demo's origin.
- **Evidence:** Source tracing shows `font.names.fontFamily.en` reaching the HTML sink without escaping. An end-to-end malicious font file was not constructed.
- **Fix:** Build the labels as DOM nodes and insert metadata with `textContent`. Test a family name containing HTML characters.

### R21. Release-download commands interpolate paths and versions into a shell

- **Location:** `tools/get_releases.mjs:25–26,94–97,137–142`.
- **Problem:** Unquoted paths break when the checkout directory contains spaces. Shell metacharacters in a version or path can also be interpreted as commands.
- **Evidence:** Source inspection confirms direct interpolation into `execSync()`. `parseFloat()` classifies versions but does not validate their full contents. Exploitation requires control of local CLI input or the checkout path.
- **Fix:** Use `execFileSync()` with argument arrays. Validate release identifiers before creating directories or invoking tools. Test a checkout path containing spaces.

## P3 — Lower-impact correction

### R22. Mixed fraction strings include the whole fraction twice

- **Location:** `src/fraction.ts:207–227`.
- **Problem:** The method appends the original fraction after the integer part, rather than appending its remainder.
- **Evidence:** `new Fraction(5, 2).toMixedString()` returns `2 5/2`, instead of `2 1/2`.
- **Fix:** Format the remainder after extracting the whole part. Add exact-integer, zero, positive, and negative cases.

## Validation and limits

| Check | Result |
| --- | --- |
| TypeScript compilation of source, entry points, and tests | Repeated on current main and passed with the installed toolchain. Output went to a temporary directory. |
| Focused runtime probes | All 20 probes reproduced the recorded behaviors on current main. Potential hangs ran in child processes with 750 ms limits. |
| ESM build and import | Repeated on current main. Build completed; import failed as described in R01. |
| Grunt subprocess failure probe | Confirmed that a child exit code of 7 is discarded. |
| Visual regression shell fixtures | Confirmed exit code 0 for different pixels and missing current output. Comparator availability was stubbed. |
| Current-main lockfile audit | 23 affected packages: 0 critical, 15 high, 6 moderate, 2 low. The obsolete local-lockfile counts have been removed. |
| Full suite under jsdom and node-canvas | Earlier attempts could not complete because the installed native canvas module crashed under Node 26 and Node 24. A full-suite pass on current main is not claimed. |
| Full browser and visual appearance checks | Not completed in this review. Focused SVG checks inspected DOM state; tuplet checks recorded drawing coordinates. |

The installed dependencies were not refreshed. In particular, local `canvas` is 3.1.0, while the lockfile specifies a newer version. The native crash is a validation limitation, not a confirmed VexFlow source defect.

## Suggested work order

1. Fix R01–R05 and add regressions for each reproduction.
2. Repair failure propagation and visual comparison in R06–R07.
3. Update vulnerable development dependencies with compatibility checks.
4. Fix the editing, redraw, and state-consistency bugs in R09–R17.
5. Harden the remaining input and tooling paths, then correct fraction display.

Before release, run a clean locked install, the browser suite, a working visual comparison, and import tests for every declared package entry point.
