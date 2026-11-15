# GitHub issue triage

**Date:** November 15, 2026

**Repository:** vexflow/vexflow

**Baseline:** `main` at `48c31b0afd42212dd55cc1e1c2496350dbbee3e0`.

## Current status

All five P1 issues have been fixed, pushed, and closed: #71, #346, #347, #349, and #350. The original triage below is retained for context.

- **P2 follow-up:** The first five P2 issues are fixed, pushed, and closed: #38, #102, #152, #177, and #182.
- **Second P2 batch:** #203, #206, #253, #255, and #268 are fixed, pushed, and closed in `344e7e76`. #218 was closed at the maintainer's request. See [usage and visual examples](docs/engraving-p2.md).
- **Remaining work:** GitHub has 15 open issues. The remaining P2 items are #311, #333, #334, #335, #336, and #341. Issues #221, #281, #292, and #337 were closed outside these batches.
- **Latest validation:** 1,874 browser tests and 35 regression tests pass locally. TypeScript and changed-file lint pass. The second P2 batch has before/after examples in both font families. [GitHub CI](https://github.com/vexflow/vexflow/actions/runs/43769502530) and all [CodeQL jobs](https://github.com/vexflow/vexflow/actions/runs/43769502702) passed for `344e7e76`.
- **Screenshot storage:** All 32 before/after images for #71, #152, #177, #182, #203, #206, #253, and #255 are attached directly to their issues. The fix comments and usage docs link to those attachments. Repository image copies were removed.
- **Next:** Clear resolved reports, then address the P2 validation and engraving defects.

## Original triage summary

Reviewed all **40 open issues**, including their comments. GitHub search and the paginated issue API returned the same set.

| Review priority | GitHub Priority field | Count | Meaning |
| --- | --- | ---: | --- |
| P0 | Urgent | 0 | Emergency. Immediate action for a verified widespread critical failure. |
| P1 | High | 5 | Address before the next release. |
| P2 | Medium | 17 | Next maintenance cycle, including focused investigation. |
| P3 | Low | 18 | Deferred work, small documentation tasks, or closure cleanup. |

Priority reflects the work remaining today. A fixed bug can therefore have P3 closure priority.

- **Recommend closing now:** [#72](https://github.com/vexflow/vexflow/issues/72), [#173](https://github.com/vexflow/vexflow/issues/173), [#186](https://github.com/vexflow/vexflow/issues/186), [#281](https://github.com/vexflow/vexflow/issues/281), [#328](https://github.com/vexflow/vexflow/issues/328), [#331](https://github.com/vexflow/vexflow/issues/331).
- **Verify before closing:** [#102](https://github.com/vexflow/vexflow/issues/102), [#218](https://github.com/vexflow/vexflow/issues/218).
- **Move coordination to Discussions, then close:** [#292](https://github.com/vexflow/vexflow/issues/292), [#337](https://github.com/vexflow/vexflow/issues/337).
- **Defer this cycle:** [#20](https://github.com/vexflow/vexflow/issues/20), [#26](https://github.com/vexflow/vexflow/issues/26), [#95](https://github.com/vexflow/vexflow/issues/95), [#158](https://github.com/vexflow/vexflow/issues/158), [#166](https://github.com/vexflow/vexflow/issues/166), [#221](https://github.com/vexflow/vexflow/issues/221), [#247](https://github.com/vexflow/vexflow/issues/247), [#313](https://github.com/vexflow/vexflow/issues/313).
- **Needs a basic description:** [#171](https://github.com/vexflow/vexflow/issues/171).
- **Investigate with a minimal reproduction:** [#203](https://github.com/vexflow/vexflow/issues/203), [#206](https://github.com/vexflow/vexflow/issues/206), [#268](https://github.com/vexflow/vexflow/issues/268), [#311](https://github.com/vexflow/vexflow/issues/311).
- **Address:** 17 issues, including the five P1s below.

No issues were closed during this pass. Closed issues, pull requests, and Dependabot alerts are outside this open-issue inventory. The already fixed #348 is excluded.

## Recommended plan

The P1 fixes and both P2 batches are complete. Continue with:

1. **Repair validation.** Address build-exit and visual-comparison weaknesses in `report.md` R06–R07. These are not yet separate issues.
2. **Finish focused rendering fixes.** Address SVG sizing in #341 and score theming in #333. Use #333 to narrow the broad #311 report.
3. **Measure performance improvements.** Use the #38 benchmark set for #335, #334, and #336. Check appearance and memory behavior.
4. **Clear small documentation items.** Review #328 and #331 for closure. Add the UTF-8 note for #140.
5. **Keep broad API proposals deferred.** Revisit #158 and #247 when a concrete use case and owner exist.

## GitHub tracking

All 40 issues have native GitHub **Type** and **Priority** fields populated and verified.

- **Types:** 21 Bug, 8 Feature, and 11 Task.
- **Type rules:** Defects use Bug. New capabilities use Feature. Documentation, testing, cleanup, and coordination use Task. For mixed requests such as #333, the primary defect determines the type.
- **Priority mapping:** P0 = Urgent, P1 = High, P2 = Medium, P3 = Low.
- **Labels removed from these issues:** `bug`, `feature`, `enhancement`, and P0–P3. The native fields now carry that information.
- **Labels retained:** Specific context such as `security`, `documentation`, `performance`, `testing`, `dependencies`, `question`, `needs-reproduction`, `ai_review`, and `triaged`.
- **Publication status:** Complete. GitHub readback confirms all fields and labels. The original triage comments remain. The original inventory had 40 open issues. All five P1 issues are closed. Each has a fix comment. The in progress label was removed. The P2 batch (#38, #102, #152, #177, #182) is also closed, with fix comments and relevant screenshots. The second P2 batch (#203, #206, #253, #255, #268) is closed with fix comments and screenshots. #218 is closed at the maintainer's request. Work labels were removed. GitHub readback confirms 15 open issues.

## P1

### [#71](https://github.com/vexflow/vexflow/issues/71) — Portable SVG export

**Status:** Fixed and closed. **Type:** Bug. **Priority:** High. **Labels:** `5.0`, `triaged`.

- **Fix:** Portable path export is available through `SVGContext.toSVG(fonts)`. It resolves inherited font attributes and keeps the live drawing unchanged. The image generator also embeds its local fonts.
- **Validation:** Two font families render in a fresh browser with fonts and styles blocked. SVG-as-image loading passes. The Clef generator produces 28 examples. See [usage and screenshots](docs/portable-svg.md).

### [#346](https://github.com/vexflow/vexflow/issues/346) — Broken ESM package imports

**Status:** Fixed and closed. **Type:** Bug. **Priority:** High. **Labels:** `ai_review`, `triaged`.

- **Fix:** The rewrite changes only relative module paths. It preserves bare packages, URLs, explicit extensions, strings, and comments.
- **Validation:** All three published ESM entries load. Rewrite fixtures and repeat-run checks pass.

### [#347](https://github.com/vexflow/vexflow/issues/347) — Registry prototype pollution

**Status:** Fixed and closed. **Type:** Bug. **Priority:** High. **Labels:** `ai_review`, `security`, `triaged`.

- **Fix:** Registry buckets use null-prototype dictionaries. Public methods reject unsupported index names.
- **Validation:** Prototype-related IDs and classes work without changing Object.prototype.

### [#349](https://github.com/vexflow/vexflow/issues/349) — Parser denial of service

**Status:** Fixed and closed. **Type:** Bug. **Priority:** High. **Labels:** `ai_review`, `security`, `triaged`.

- **Fix:** Duration and meter tokens use bounded, anchored parsing. Tuning splitting no longer retries long whitespace runs.
- **Validation:** Long malformed inputs fail promptly in isolated processes with hard timeouts. Valid durations and tunings still pass.

### [#350](https://github.com/vexflow/vexflow/issues/350) — Infinite loop on invalid meter

**Status:** Fixed and closed. **Type:** Bug. **Priority:** High. **Labels:** `ai_review`, `security`, `triaged`.

- **Fix:** Meters reject invalid values and tick overflow. Fractions reject non-finite values and zero denominators. GCD rejects infinity.
- **Validation:** The reported hangs now throw BadArgument. Zero numerators, finite fractions, and valid meters still work.

## P2

### [#38](https://github.com/vexflow/vexflow/issues/38) — Realistic score benchmarks

**Status:** Fixed and closed. **Type:** Task. **Priority:** Medium. **Labels:** `performance`, `testing`, `triaged`.

- **Fix:** Added three original score studies and a browser benchmark runner. Font loading and warmup are outside the measured work. The report separates construction, layout, and drawing.
- **Validation:** All workloads render in CI smoke tests. Five local samples per score and visual output are documented in [benchmarks.md](docs/benchmarks.md).

### [#102](https://github.com/vexflow/vexflow/issues/102) — jsdom support

**Status:** Fixed and closed. **Type:** Bug. **Priority:** Medium. **Labels:** `testing`, `triaged`.

- **Fix:** Pinned canvas 3.2.3 to avoid the reproduced native crash. Added a focused jsdom PNG/SVG test and a module filter for image generation.
- **Validation:** 450 Bravura PNGs generated successfully. The focused test covers font registration, seven Clef PNGs, and portable SVG serialization. See [jsdom.md](docs/jsdom.md).

### [#152](https://github.com/vexflow/vexflow/issues/152) — Text and music font ordering

**Status:** Fixed and closed. **Type:** Bug. **Priority:** Medium. **Labels:** `triaged`.

- **Fix:** Text elements use a text-first font stack. Music glyphs retain their stack. Custom text faces can be chosen through setTextFonts().
- **Validation:** Canvas widths match the text font. SVG examples cover Bravura and Petaluma. Class and element overrides still work. See [text-and-lyrics.md](docs/text-and-lyrics.md).

### [#177](https://github.com/vexflow/vexflow/issues/177) — Lyric layout and annotation positioning

**Status:** Fixed and closed. **Type:** Feature. **Priority:** Medium. **Labels:** `triaged`.

- **Fix:** Added computeX(), computeY(), and setTextBaseline(). Callers can align a lyric row or override one positioning axis before drawing.
- **Validation:** Tests cover all justifications, shared baselines, subclass overrides, and resetting automatic placement. Before/after examples are in [text-and-lyrics.md](docs/text-and-lyrics.md).

### [#182](https://github.com/vexflow/vexflow/issues/182) — Lyrics shorten ties

**Status:** Fixed and closed. **Type:** Bug. **Priority:** Medium. **Labels:** `triaged`.

- **Fix:** Tie anchors exclude spacing added only for annotations above or below a note. Nearby modifiers keep their clearance.
- **Validation:** Long lyrics no longer shorten ties. Tests cover dots, side string numbers, and inline annotations. Before/after examples are in [text-and-lyrics.md](docs/text-and-lyrics.md).

### [#203](https://github.com/vexflow/vexflow/issues/203) — Rest collisions across voices

**Status:** Fixed and closed. **Type:** Bug. **Priority:** Medium. **Labels:** `triaged`.

- **Fix:** Rests move by the clearance needed to avoid simultaneous chords and stems in a shared modifier context.
- **Validation:** Upper and lower rests clear the opposing voice in Bravura and Petaluma. Before/after examples are documented.

### [#206](https://github.com/vexflow/vexflow/issues/206) — Vertical annotation collisions

**Status:** Fixed and closed. **Type:** Bug. **Priority:** Medium. **Labels:** `triaged`.

- **Fix:** Pedal text, brackets, and change notches clear bottom annotations across the marked passage.
- **Validation:** Tests cover intermediate annotations, larger text, brackets, mixed pedal text, and two font families.

### [#218](https://github.com/vexflow/vexflow/issues/218) — Puppeteer image-generation crashes

**Status:** Closed. **Type:** Bug. **Priority:** Medium. **Labels:** `testing`, `triaged`.

- **Fix:** Closed at the maintainer's request. The reporter had confirmed that the Puppeteer upgrade stopped the crash.
- **Validation:** No new full concurrent-generator claim is made. Image-count and comparison-tooling work remains separate.

### [#253](https://github.com/vexflow/vexflow/issues/253) — Grace-note bounding boxes before drawing

**Status:** Fixed and closed. **Type:** Bug. **Priority:** Medium. **Labels:** `triaged`.

- **Fix:** Grace-note groups position their notes before measurement. Notehead, flag, and TextDynamics bounds use page coordinates.
- **Validation:** Bounds match before and after drawing, remain stable on repeated reads, and follow later layout changes.

### [#255](https://github.com/vexflow/vexflow/issues/255) — GraceTabNote font sizing

**Status:** Fixed and closed. **Type:** Bug. **Priority:** Medium. **Labels:** `triaged`.

- **Fix:** Fret text honors explicit font sizes and the grace-scale metric. Widths and vertical centering update together.
- **Validation:** Tests cover numeric and CSS sizes, ghost toggles, default reset, and custom class scale.

### [#268](https://github.com/vexflow/vexflow/issues/268) — Tuplet tick overflow

**Status:** Fixed and closed. **Type:** Bug. **Priority:** Medium. **Labels:** `triaged`.

- **Fix:** Voice timing caches refresh after tuplet edits. Duration edits preserve unscaled intrinsic ticks, also fixing report R09.
- **Validation:** Tests cover both construction orders, repeated attachment, nested tuplets, ratio edits, detach, clear, and strict overflow rejection.

### [#311](https://github.com/vexflow/vexflow/issues/311) — Style setters with no visible effect

**Recommendation:** Investigate. **Type:** Bug. **Priority:** Medium. **Labels:** `needs-reproduction`, `triaged`.

- **Finding:** The report is broad and the maintainer's request for an example remains unanswered. #333 supplies a related, more concrete theming case.
- **Next step:** Use #333 to start the style audit. Keep this open until specific unsupported setters are identified or all cases are covered there.
- **Evidence:** `src/element.ts; #333`.

### [#333](https://github.com/vexflow/vexflow/issues/333) — Consistent score theming

**Recommendation:** Address. **Type:** Bug. **Priority:** Medium. **Labels:** `triaged`.

- **Finding:** The report gives a concrete case where stave, ledger lines, voices, notes, and beams need separate style updates.
- **Next step:** Define style inheritance and a documented whole-score example. Cover Canvas and SVG, and use this as the concrete starting point for #311.
- **Evidence:** `src/element.ts; src/factory.ts; issue reproduction`.

### [#334](https://github.com/vexflow/vexflow/issues/334) — Metrics cloning overhead

**Recommendation:** Address. **Type:** Bug. **Priority:** Medium. **Labels:** `performance`, `triaged`.

- **Finding:** Metrics.getFontInfo and getStyle still clone cached objects on every call. The source confirms the hot path; the reported timing has not been re-benchmarked.
- **Next step:** Benchmark on #38 fixtures and use safe copies that preserve caller isolation. Add mutation-isolation coverage.
- **Evidence:** `src/metrics.ts:21`.

### [#335](https://github.com/vexflow/vexflow/issues/335) — Duplicate notehead and flag construction

**Recommendation:** Address. **Type:** Bug. **Priority:** Medium. **Labels:** `performance`, `triaged`.

- **Finding:** A current probe confirms two buildNoteHeads calls and two buildFlag calls for one eighth-note constructor.
- **Next step:** Build once while preserving stem setup and notehead styles. Check the child-retention problem in report.md R14 at the same time.
- **Evidence:** `src/stavenote.ts:418; focused probe`.

### [#336](https://github.com/vexflow/vexflow/issues/336) — Shared text-measurement cache

**Recommendation:** Address. **Type:** Task. **Priority:** Medium. **Labels:** `performance`, `triaged`.

- **Finding:** Elements cache their own valid metrics, but there is no shared font-and-text cache across elements. measureWidth also calls the canvas directly.
- **Next step:** Benchmark a bounded cache. Invalidate it when fonts or the measurement canvas change, and compare visual output.
- **Evidence:** `src/element.ts:618`.

### [#341](https://github.com/vexflow/vexflow/issues/341) — Invalid CSS lengths in SVG resize

**Recommendation:** Address. **Type:** Bug. **Priority:** Medium. **Labels:** `triaged`.

- **Finding:** SVGContext.resize still writes width.toString() and height.toString() to CSS properties without units.
- **Next step:** Define the fixed-size versus responsive contract and add Firefox/Chromium coverage. Coordinate with report.md R11 so scaling remains correct.
- **Evidence:** `src/svgcontext.ts:260`.

## P3

### [#20](https://github.com/vexflow/vexflow/issues/20) — Chord-symbol kerning

**Recommendation:** Defer. **Type:** Feature. **Priority:** Low. **Labels:** `triaged`.

- **Finding:** The thread proposes better spacing between text and music glyphs. There is no small agreed change or current failing fixture.
- **Next step:** Keep as a typography improvement. Add font-specific examples before changing layout.
- **Evidence:** `src/chordsymbol.ts`.

### [#26](https://github.com/vexflow/vexflow/issues/26) — Font loading convenience API

**Recommendation:** Defer. **Type:** Feature. **Priority:** Low. **Labels:** `triaged`.

- **Finding:** Font.load still takes one URL and descriptors. Multiple calls already load separate font styles; fallback URL lists remain an optional improvement.
- **Next step:** Defer until a concrete API and use case are agreed.
- **Evidence:** `src/font.ts:305`.

### [#72](https://github.com/vexflow/vexflow/issues/72) — Use a local Chrome installation

**Recommendation:** Close. **Type:** Task. **Priority:** Low. **Labels:** `documentation`, `triaged`.

- **Finding:** Puppeteer already accepts PUPPETEER_EXECUTABLE_PATH, and the reporter confirmed this works. No library change is needed.
- **Next step:** Recommend closing as answered. Document the current PUPPETEER_SKIP_DOWNLOAD setting alongside executablePath.
- **Evidence:** `node_modules/grunt-contrib-qunit/node_modules/puppeteer/lib/cjs/puppeteer/getConfiguration.js`.

### [#95](https://github.com/vexflow/vexflow/issues/95) — StringNumber cleanup

**Recommendation:** Defer. **Type:** Task. **Priority:** Low. **Labels:** `triaged`.

- **Finding:** StringNumber already inherits Element through Modifier. Its xOffset/yOffset fields are still used, and uncircled numbers are supported.
- **Next step:** Defer the offset cleanup unless it simplifies the API without breaking positioning.
- **Evidence:** `src/stringnumber.ts:170`.

### [#140](https://github.com/vexflow/vexflow/issues/140) — UTF-8 guidance

**Recommendation:** Address. **Type:** Task. **Priority:** Low. **Labels:** `documentation`, `triaged`.

- **Finding:** The live getting-started and tutorial examples include the UTF-8 declaration. README still lacks the explicit warning requested in the discussion.
- **Next step:** Add one clear README note, then close. Do not try to repair document encoding after JavaScript has loaded.
- **Evidence:** [Source](https://vexflow.github.io/vexflow-examples/guides/getting-started/).

### [#158](https://github.com/vexflow/vexflow/issues/158) — Sheet or score layout API

**Recommendation:** Defer. **Type:** Feature. **Priority:** Low. **Labels:** `triaged`.

- **Finding:** This is a broad new layout layer, with overlapping requests in #247. The thread has useful design discussion but no agreed API.
- **Next step:** Keep one design proposal for measure chaining and wrapping. Defer implementation until correctness fixes are complete.
- **Evidence:** `src/system.ts; related #247`.

### [#166](https://github.com/vexflow/vexflow/issues/166) — Restore dot convenience methods

**Recommendation:** Defer. **Type:** Feature. **Priority:** Low. **Labels:** `triaged`.

- **Finding:** Dot.buildAndAttach already supplies the core behavior. Restoring older convenience methods is optional API work.
- **Next step:** Defer. Keep duration semantics explicit and document the distinction exposed by #173.
- **Evidence:** `src/dot.ts; #173`.

### [#171](https://github.com/vexflow/vexflow/issues/171) — Spanner on a single note

**Recommendation:** Needs details. **Type:** Task. **Priority:** Low. **Labels:** `question`, `needs-reproduction`, `triaged`.

- **Finding:** This issue has no body or comments. It does not identify a class, example, or expected result.
- **Next step:** Needs a minimal example and expected rendering before it can be scheduled. Defer until those details exist.
- **Evidence:** `Issue body and discussion`.

### [#173](https://github.com/vexflow/vexflow/issues/173) — Dots and strict voice duration

**Recommendation:** Close. **Type:** Task. **Priority:** Low. **Labels:** `documentation`, `question`, `triaged`.

- **Finding:** The reporter confirmed the duration:'hd' answer. A fresh probe also shows hd plus q completes 4/4; adding a visual Dot to h does not change its duration.
- **Next step:** Recommend closing as answered. Keep the duration-versus-display explanation in the docs.
- **Evidence:** `src/dot.ts; src/note.ts; focused probe`.

### [#186](https://github.com/vexflow/vexflow/issues/186) — Bundled Gonville update

**Recommendation:** Close. **Type:** Task. **Priority:** Low. **Labels:** `dependencies`, `triaged`.

- **Finding:** Commit 573e5984 updated @vexflow-fonts/gonville to 1.0.0 and regenerated the bundled font. Current main retains that version.
- **Next step:** Recommend closing as completed by PR #195.
- **Evidence:** [Source](https://github.com/vexflow/vexflow/commit/573e598466744c94ff50d6dbe19756a249e93d0a).

### [#221](https://github.com/vexflow/vexflow/issues/221) — Default slur and tie colors

**Recommendation:** Defer. **Type:** Feature. **Priority:** Low. **Labels:** `triaged`.

- **Finding:** This is an aesthetic default change, not a demonstrated rendering defect. Existing style APIs can support application-specific choices.
- **Next step:** Defer default-color changes. Offer a styling example and coordinate with #333.
- **Evidence:** `src/curve.ts; src/stavetie.ts; src/element.ts`.

### [#247](https://github.com/vexflow/vexflow/issues/247) — Factory and EasyScore expansion

**Recommendation:** Defer. **Type:** Feature. **Priority:** Low. **Labels:** `triaged`.

- **Finding:** Measure chaining and wrapping overlap #158. Bar separators in EasyScore are a distinct parser feature.
- **Next step:** Consolidate the layout design with #158, preserving the parser request as a separate checklist item. Do not treat the entire issue as an exact duplicate.
- **Evidence:** `src/factory.ts; src/easyscore.ts; #158`.

### [#281](https://github.com/vexflow/vexflow/issues/281) — TypeScript declaration location

**Recommendation:** Close. **Type:** Task. **Priority:** Low. **Labels:** `documentation`, `question`, `triaged`.

- **Finding:** V5 ships its own declarations. package.json points to build/types/entry/vexflow.d.ts, and that file is available in the published 5.0.0 package.
- **Next step:** Recommend closing as answered. Use the bundled types rather than the removed DefinitelyTyped entry.
- **Evidence:** [Source](https://cdn.jsdelivr.net/npm/vexflow@5.0.0/build/types/entry/vexflow.d.ts).

### [#292](https://github.com/vexflow/vexflow/issues/292) — Community participation reminder

**Recommendation:** Move to Discussions. **Type:** Task. **Priority:** Low. **Labels:** `question`, `triaged`.

- **Finding:** This is a maintainer coordination reminder, not a code defect or a deliverable with a completion test.
- **Next step:** Move the reminder to Discussions or a maintainer checklist, then close the issue.
- **Evidence:** `Issue body and discussion`.

### [#313](https://github.com/vexflow/vexflow/issues/313) — Fixed width per beat

**Recommendation:** Defer. **Type:** Feature. **Priority:** Low. **Labels:** `question`, `triaged`.

- **Finding:** This requests strict proportional spacing. Current formatting also reserves room for glyphs and collisions, so tuning spacing is not the same guarantee.
- **Next step:** Provide a small example and define how fixed beats should handle crowded notes. Defer a new spacing mode until then.
- **Evidence:** `src/formatter.ts`.

### [#328](https://github.com/vexflow/vexflow/issues/328) — Broken tutorial link

**Recommendation:** Close. **Type:** Bug. **Priority:** Low. **Labels:** `documentation`, `triaged`.

- **Finding:** Commit a8b689c7 changed README to /guides/tutorial. The current destination loads successfully.
- **Next step:** Recommend closing as fixed. Add link checks when updating the docs pipeline.
- **Evidence:** [Source](https://vexflow.github.io/vexflow-examples/guides/tutorial/).

### [#331](https://github.com/vexflow/vexflow/issues/331) — Broken getting-started link

**Recommendation:** Close. **Type:** Bug. **Priority:** Low. **Labels:** `documentation`, `triaged`.

- **Finding:** Commit a8b689c7 changed README to /guides/getting-started/. The current destination loads; the live docs landing page no longer exposes the reported old link.
- **Next step:** Recommend closing the broken-link report. The sparse docs landing page is a separate documentation task.
- **Evidence:** [Source](https://vexflow.github.io/vexflow-examples/guides/getting-started/).

### [#337](https://github.com/vexflow/vexflow/issues/337) — Contributor coordination

**Recommendation:** Move to Discussions. **Type:** Task. **Priority:** Low. **Labels:** `question`, `triaged`.

- **Finding:** This is a welcome and work-planning thread. Fixes should remain tracked in their own issues; some proposed work has already merged.
- **Next step:** Move coordination to Discussions or a project board, preserve the useful links, and close this thread as an issue.
- **Evidence:** `Issue body and discussion`.

## Verification and limits

- Read all 40 issue bodies and all existing comments. Inspected the relevant current source, tests, and fix history.
- Checked the exact scope of merged PR #338. It guarantees grace-note bounds after drawing, not before drawing.
- Ran focused probes for #95, #173, #255, #268, and #335 against source compiled from this checkout.
- #255 reproduces the font propagation defect. #335 reproduces duplicate construction.
- #173 confirms the documented duration behavior. #268 confirms one valid construction sequence; it does not reproduce or disprove the reporter's full case.
- Verified the current [tutorial](https://vexflow.github.io/vexflow-examples/guides/tutorial/) and [getting-started](https://vexflow.github.io/vexflow-examples/guides/getting-started/) destinations.
- Retrieved the published V5 TypeScript declaration entry point. Verified the Gonville and README fixes are ancestors of current main.
- Rechecked source for the four open review P1s. Their runtime evidence is recorded in `report.md`; the timeout probes were not repeated during this triage.
- Did not rerun the full visual export pipeline, reproduce every historical screenshot, or benchmark the reported performance timings. Issues that need those checks remain open.
