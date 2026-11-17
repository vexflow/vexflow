# VexFlow notation quality: strategy and milestone plan

Created: **2026-11-16**

Last reviewed: **2026-11-16**

Baseline: **`a7585866c176401d76c2a3ca66217454abb5c685`**, package version `5.1.2`

Status: **Proposed plan; implementation not started by this task**

Source of scope: [Notation gap register](vexflow-gaps.md)

## Recommendation

Build a dependable engraving pipeline around the existing notation classes, then add an optional layer for complete scores. Keep native VexFlow useful for developers who draw one exercise or manage their own score model.

The central investment is shared geometry and layout contracts. Today, local fixes can improve one object while leaving its neighbors unaware of its final position. Better bounds, explicit phases, musical anchors and collision priorities make later features cheaper and easier to verify.

Deliver in vertical slices: a real score, a small set of new capabilities, measurable acceptance cases, and editable examples. Avoid a wholesale formatter rewrite or a requirement that every application adopt a new score model.

The register is the authority for gap status and priority. This document defines execution, dependencies and acceptance. All new API names, file locations, performance targets and effort estimates below are proposals unless explicitly identified as existing.

## Coordinate with existing work

| Work                                                                               | Current status                                     | Relationship to this plan                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#354: EasyScore coverage](https://github.com/vexflow/vexflow/issues/354)          | In progress, confirmed by maintainer on 2026-11-16 | Continue its [existing plan](../easyscore-plan.md). The current checkout contains early implemented slices. Share types, ownership, references and composition design; do not start a second facade effort. |
| [#356: interactive guide](https://github.com/vexflow/vexflow/issues/356)           | In progress, confirmed by maintainer on 2026-11-16 | Supply accepted examples, capability limits and new layout recipes. Let the guide own navigation, presentation and publishing. Do not duplicate its deliverables.                                           |
| [#355: legacy issue reconciliation](https://github.com/vexflow/vexflow/issues/355) | Existing tracker; execution status not established | Feed reproduction results into that effort. Avoid duplicate migrated issues and blanket closure of old reports.                                                                                             |

Engraving work must not block the completion of #354's existing native-feature scope. Conversely, closing #354 does not close engine gaps such as automatic pagination. A new engraving capability is complete when its native API, applicable EasyScore path, example and regression checks agree.

Before parallel changes touch `Factory`, `EasyScore`, `System`, `Sheet`, or `Element`, agree on ownership and integration points. Use small dependency PRs and integration fixtures, not long-lived competing rewrites. No GitHub comments, labels or issue changes are part of this documentation task.

## Product boundaries

### Core library

Own notation primitives, rational time, geometry, font metrics, deterministic formatting, renderer contracts and extension hooks. Retain low-level positioning and custom subclasses. Keep runtime dependencies small; do not add an importer, solver framework or font engine merely to implement a narrow local function.

### Optional score layout

Own measure/staff context, automatic systems and pages, logical spans, repeat boundaries, lyric rows and layout views. Accept native VexFlow objects or a small adapter contract. It should not require a canonical editor document, playback engine, or MusicXML document tree.

`System` currently represents a measure-sized collection in Sheet usage, while a printed system is a row of several measures. Name and document these concepts distinctly in new types without casually renaming the existing public class.

### Optional domain and integration modules

Instrument catalogs, duration spelling, transposition, part extraction, diagrams and import/export adapters can sit above the core. Full orchestral condensing, historical notation and experimental notation require separate charters. Support an extension path from the first milestone so specialist notation does not force invasive core changes.

[OSMD already provides MusicXML rendering over VexFlow](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay). Reuse that ecosystem where practical. Evaluate adapter contributions before committing to a second complete importer. [Verovio's documented input behavior](https://book.verovio.org/toolkit-reference/input-formats.html) also shows why unsupported-data reporting must be explicit.

## Architecture to converge on

### 1. Musical anchors and minimal score context

Introduce an optional layout input contract, jointly designed with #354's structured composition work. Minimum information:

- Stable IDs for part, staff, voice, measure, event and logical relationship.
- Rational onset and duration; grace ordering distinct from metrical time.
- Staff assignment distinct from voice ownership, including per-head assignment when supported.
- Pitch spelling and displayed accidentals distinct from sounding pitch.
- Clef/key/meter changes, barline positions, instrument labels and repeat regions.
- Spans anchored to a notehead, stem, beat, barline or explicit staff position.
- Explicit overrides, source provenance and supported layout policies.

Do not infer all of this from rendered SVG or mutable pixel coordinates. Do not duplicate the application's entire musical model. Define adapters and preserve source IDs so importers and editors can remain authoritative.

A relationship has one logical identity even if it has several visual fragments. A tie between specific chord heads is different from a phrase slur; a timed pedal event is different from a label attached to the nearest note. These distinctions should be reflected in types and validation.

### 2. Geometry available before drawing

Separate these concepts:

| Geometry                | Purpose                                                                       |
| ----------------------- | ----------------------------------------------------------------------------- |
| Ink bounds              | Enclose visible marks, including stroke thickness and curve extrema.          |
| Layout bounds           | Reserve clearance, including intentional whitespace and text padding.         |
| Attachment anchors      | Define stems, ties, articulations, chord heads, baselines and span endpoints. |
| Collision shape/profile | Describe occupied regions more precisely than a whole bounding rectangle.     |
| Hit region              | Support selection without forcing the ink or spacing bounds to be large.      |

Use staff spaces for engraving policy and convert at the renderer boundary. Preserve existing pixel/point APIs through documented conversion. Obtain font anchors/defaults from optional validated SMuFL metadata, with tested fallbacks. [SMuFL defines attachment anchors](https://smufl.formats.music/latest/specification/glyphswithanchors.html) and [engraving defaults in staff spaces](https://smufl.formats.music/latest/specification/engravingdefaults.html).

Start with conservative boxes and piecewise vertical envelopes. Add contour/curve refinement only where false positives affect quality. Existing [render metrics](testing.md) remain useful diagnostics, but rectangle intersections are not themselves proof of musical collisions.

### 3. Explicit layout phases

Target pipeline:

```text
validate inputs and musical context
  -> resolve policy, fonts and intrinsic metrics
  -> resolve local heads, accidentals, rests and rhythmic groups
  -> measure candidate measures and boundary symbols
  -> choose system breaks and horizontal positions
  -> fit beams, ties, slurs and local marks
  -> split logical spans at chosen boundaries
  -> place lyrics, dynamics and other outside-staff objects
  -> solve staff/system distances and pages
  -> bounded reconciliation of affected constraints
  -> emit final geometry, diagnostics and render operations
```

This is a dependency graph, not a claim that all layout is one-pass. Cross-staff beams depend on staff distance; page packing depends on final envelopes; system breaks affect courtesy signatures and span fragments. Recompute affected measures/systems after those decisions, with a bounded iteration count and deterministic ordering.

If constraints remain unsatisfied, preserve valid musical timing and explicit user intent, return an overflow/collision diagnostic, and retain a reproducible layout. Do not loop indefinitely, silently clip music, or silently shrink staff size to make a page fit. Exact proportional mode may reject insufficient width as it already does.

Measurement must not draw. Drawing should consume final geometry without changing rhythmic anchors or advancing layout state. Native compatibility paths may transition class by class; the new score-layout mode should require explicit geometry participation from custom elements.

### 4. Constrained spacing and system breaking

Build on `Formatter` and `ProportionalFormatter` rather than replacing both immediately.

For engraving mode, compare the current softmax-based distribution with a small constrained spacing model:

- Hard lower bounds from noteheads, accidentals, dots, grace clusters and text.
- Preferred distances from rhythmic relationships, with optical corrections.
- Stretch/compression costs that preserve rhythmic hierarchy and readable density.
- Shared time anchors across staves, without forcing every voice to carry every event.
- Explicit exclusions for intentional overlap and user-supplied placement.

For system breaking, evaluate feasible contiguous measure ranges using their minimum/preferred widths, boundary material and break constraints. Use dynamic programming or a bounded candidate search to minimize a documented cost: compression/stretch, uneven density, awkward span breaks, isolated bars, and user penalties. Stable tie-breaking must produce repeatable results.

Keep greedy Sheet packing as a fast compatibility mode. Prototype against the same corpus before selecting a replacement default. Treat line and page costs separately at first; add page-turn-aware optimization only after row heights and span continuations are dependable. [LilyPond documents several page-breaking policies](https://lilypond.org/doc/v2.26/Documentation/notation/page-breaking), illustrating why one objective is insufficient for every score.

### 5. Collision priorities and alignment

Use a staged solver, with explicit priorities and alignment groups:

1. Resolve local notehead/stem/rest/accidental conflicts.
2. Fit beams and inner notation while respecting fixed rhythmic anchors.
3. Route ties/slurs and place articulations/ornaments.
4. Place lyric verses, dynamics/hairpins, pedals, chord labels and directions.
5. Derive staff and system envelopes and required separation.

Positioning rules need exceptions: some articulations belong within the staff; lyrics usually expand horizontal space instead of floating into different verse rows; a whole dynamic phrase should align even when only one note creates an obstacle. [MuseScore's positioning documentation](https://handbook.musescore.org/formatting/positioning-of-elements) offers a useful comparison for horizontal versus vertical avoidance and overrides.

Record whether a position is automatic, preferred, or fixed. A fixed override that causes an overlap should be honored and reported. Reflow must not erase user intent or accumulate old offsets.

### 6. Incremental layout after correctness

First establish deterministic full layout. Then cache intrinsic metrics and measure constraints separately from final positions. Invalidation keys should include fonts, policy, note content, modifiers, staff scale and context changes.

A lyric edit may affect one measure's minimum width and downstream line breaks. A key change can affect many later measures. A changed staff gap can affect every cross-staff relationship in that system. Encode these dependencies before attempting viewport-only rendering or worker execution.

Compare incremental output to a clean full layout after randomized edits. Only introduce workers if profiles show worthwhile main-thread savings after serialization and font-measurement constraints are included.

## Milestone overview

All estimates below are **rough engineering effort**, not calendar promises. They assume one engineer familiar with the code, access to an engraving reviewer, and bounded initial repertoire. They exclude the already-running #354/#356 projects, a complete importer, full orchestral condensing and M8 specialist work.

M0–M7 total **44–75 engineer-weeks before contingency**. Reserve roughly 25% for discoveries and integration: **55–94 engineer-weeks**. Parallel staffing can reduce elapsed time, but the geometry → collision → system → page path is sequential. Re-estimate after M0 and after each architecture spike; do not commit a release date from these ranges.

| Milestone | Outcome                               | Hard entry dependencies                       | Rough effort         | Status   |
| --------- | ------------------------------------- | --------------------------------------------- | -------------------- | -------- |
| M0        | Auditable corpus and baseline         | None                                          | 2–3 weeks            | Proposed |
| M1        | Geometry, policy and anchor contracts | M0 seed cases                                 | 5–8 weeks            | Proposed |
| M2        | Reliable local engraving              | M1 contracts for affected classes             | 6–10 weeks           | Proposed |
| M3        | Collision-aware phrases and lyrics    | M1; relevant M2 placement                     | 7–12 weeks           | Proposed |
| M4        | Complete continuous scores            | M2/M3, minimal context from M1                | 7–12 weeks           | Proposed |
| M5        | Pages and basic part layouts          | M4, stable vertical envelopes                 | 4–7 weeks            | Proposed |
| M6        | Mainstream instrument profiles        | M2–M4; parts use M5                           | 8–14 weeks           | Proposed |
| M7        | Web/integration quality release       | M0–M5 and P1 scope of M6                      | 5–9 weeks            | Proposed |
| M8        | Specialist expansion                  | Explicit profile charter; required core gates | Estimate per profile | Deferred |

Web compatibility, performance measurement, API parity, and documentation run throughout; M7 is their final integration gate. M6 P2 items may be delivered after the first quality release if explicitly deferred. P1 percussion support is part of the core repertoire target. M5 basic parts do not imply automatic condensing.

## M0 — Establish evidence and acceptance

**Gaps:** VF-001, VF-048; initial VF-042 and VF-047.

**Work packages**

1. Inventory exported notation families and map existing tests to the register. Reuse `easyscore-coverage.json` for facade coverage without treating it as an engraving-quality score.
2. Build a proposed `tests/engraving/` corpus manifest. Each case records ID, rule, gap, input builder, musical assertions, geometry assertions, reference revision/license, supported fonts/backends, expected outcome and review status.
3. Start with approximately 60 small cases across spacing, beams, polyphony, accidentals, spans, lyrics and boundaries. This is a planning target; coverage of each selected rule matters more than the count.
4. Adapt representative cases from the register's LilyPond crosswalk using original short music. Keep source/reference provenance even when no source is copied.
5. Reproduce the legacy candidates on the checkout and current released package. Classify as current defect, already fixed, API misuse, documentation gap, duplicate, or unsupported feature. Coordinate applicable reports with #355.
6. Capture existing chorale, piano and chamber benchmarks; add planned lead-sheet, percussion and tab workloads. Record build mode, fonts, browser, hardware and input size.
7. Extend the existing visual report with fixture IDs and review outcomes. Make sure negative controls detect deliberate clipping, wrong accidentals, invalid span endpoints and text collisions.

**Exit gate**

- Each P0/P1 gap has at least one concrete acceptance case or an explicit reproduction task.
- Seed cases are classified as passing, expected failing, or unverified; none are silently skipped.
- A repeat run reproduces geometry and reference images on the pinned environment, excluding documented nondeterministic metadata.
- Existing tools are used successfully; measured performance baselines and reviewer availability are recorded.
- Priority and effort estimates are revised from evidence. No notation fixes are required to complete M0's baseline.

**Review artifact:** browsable report with white-background examples, manifest and a short list of confirmed defects. Issue-specific material belongs in `issues/` only when needed; generated images stay under `build/` or temporary storage.

## M1 — Make layout measurable and policies explicit

**Gaps:** VF-002, VF-013, VF-037, VF-038, initial VF-046.

**Work packages**

1. Audit every core participant's pre-draw geometry. Start with stems, heads, flags, beams, articulations, grace groups and curves; record whether bounds include child marks and strokes.
2. Add geometry interfaces and adapter implementations incrementally. Move placement calculations out of draw methods where necessary; retain compatibility adapters for native callers.
3. Define immutable score-local engraving settings, unit conversions and override precedence. Resolve existing global font/metrics behavior without changing unrelated low-level defaults.
4. Prototype SMuFL metadata loading for one font, then a second contrasting font. Validate metadata and provide known fallback anchors for absent fields.
5. Jointly specify minimal score context and span anchors with #354. Demonstrate the same measure built through native objects, EasyScore and a small external adapter.
6. Define diagnostics with stable codes, source IDs, severity and phase. Include unsupported geometry participation for custom elements.

**Exit gate**

- Core seed fixtures can be measured without drawing; all bounds and anchors are finite and expressed in documented coordinates.
- Repeated measure/format/draw does not accumulate offsets. Wide → narrow → wide produces the same final geometry as a fresh wide layout.
- Two simultaneous scores can use different policies/fonts without contamination in the new layout path.
- Metadata-present and metadata-absent fonts have tested behavior; invalid metadata cannot create NaN geometry.
- Native subclasses and existing Factory/EasyScore ownership remain usable. No second competing composition API is introduced.

**Decision gate:** accept the geometry interfaces only after beam, lyric and cross-staff prototypes can consume them. Avoid abstracting every class before testing the difficult consumers.

## M2 — Stabilize local engraving

**Gaps:** VF-004–VF-007, VF-009–VF-012. Boundary-dependent accidental behavior completes in M4.

**Order within the milestone**

1. Resolve confirmed timing, accidental or attachment errors first; these change what the music means.
2. Fix head/rest/dot/accidental interactions in two voices, then three/four voices and unequal onsets.
3. Compare spacing approaches behind an opt-in policy. Include grace clusters, inline clefs, lyrics/chord widths, dense accidentals and very short final durations.
4. Refine beam grouping, slope cost, minimum stems, beamlets and staff-line contact. Test mixed tuplets, rests, concave contours and extreme spacing before adjusting default constants.
5. Complete tuplets/grace/articulation local geometry and policy. Cross-element collision work continues in M3.

**Exit gate**

- Exact duration and onset assertions pass for all selected nested/irregular tuplet cases; no rounding drift.
- Automatic accidental results match expected arrays for every specified case, including voice permutation and grace ordering. Policy alternatives are explicit.
- No unapproved overlap in the local polyphony corpus. Width insufficiency is reported consistently.
- Beam tests assert grouping and endpoints, then receive visual review for slope, staff contact and balance.
- Bravura/Academico and Petaluma/Petaluma Script pass both SVG and Canvas cases at normal/cue/grace scales; a third font exercises fallback/metadata differences.
- Every default change has a reviewed visual diff and compatibility note. Proportional mode keeps exact rhythmic anchors.

**Deliverable:** a reliable single-measure/multi-staff engraving release candidate, still usable through existing APIs.

## M3 — Solve interactions across phrases

**Gaps:** VF-003, VF-008, VF-017, VF-022, VF-023 initial text scope, VF-024; finish VF-011 interactions.

**Work packages**

1. Introduce obstacle profiles and placement priorities; start with cross-tick rests, articulation stacks, pedal/dynamics/lyrics and adjacent staves.
2. Implement tie and slur routing separately. Use fixed musical endpoints plus candidate control curves; penalize collisions, excess height and awkward curvature. Preserve user control points.
3. Add lyric syllable/verse objects and hyphen/melisma relationships. Feed text widths into horizontal constraints and verse extents into vertical layout.
4. Align dynamic/hairpin phrases and place pedals, ottava and other outside-staff marks according to policy.
5. Compute complete staff envelopes and minimum distances. Prototype bounded reconciliation with cross-staff beams before enabling automatic spacing generally.
6. Define initial language/shaping support and unsupported-script diagnostics. Complex export shaping can remain a declared M7 integration task.

**Exit gate**

- Choir fixtures with multiple verses and piano fixtures with simultaneous pedal, hairpins, slurs and articulations need no arbitrary per-note offsets in the accepted cases.
- Pinned overrides survive reflow; conflicting fixed positions produce a specific diagnostic.
- Collision tests exclude legitimate stem/head joins and kerned text overlap; negative controls demonstrate detection of actual collisions.
- Curves have deterministic endpoint/shape choices and finite bounds; nested and crossing cases are either supported or explicitly rejected/documented.
- Iteration limits are tested with adversarial constraints; unresolved layouts terminate with evidence rather than silently drifting.

**Deliverable:** automatic placement for bounded, unbroken phrases. Multi-row continuation is deliberately accepted in M4, not inferred from this milestone.

## M4 — Lay out complete continuous scores

**Gaps:** VF-014–VF-017, VF-019, VF-021, VF-026, VF-028; complete continuation portions of VF-007/008/009/022/024.

**Work packages**

1. Extend optional score context with measure boundaries and persistent clef/key/meter/instrument state.
2. Generate candidate start/end material before choosing breaks. Measure courtesy signatures, repeat barlines, names and brackets as part of each candidate row.
3. Implement deterministic cost-based system breaking with hard break/keep constraints. Retain the existing greedy mode and document when the new mode is preferable.
4. Build one generic logical-span fragmentation mechanism, then per-family rules. A generic clipping operation is insufficient: ties, slurs, hairpins, pedals, lyrics and voltas have different continuation conventions.
5. Add system names/groups, empty-staff policies, multi-measure rest grouping and measure-number/rehearsal placement.
6. Resolve cross-staff chord/beam/span interactions using the final staff mapping and bounded vertical reconciliation.

**Exit gate**

- A span across three or more systems has correct first, middle and last fragments, and restores to one continuous span at a wider width.
- One measure moving to another system updates signatures, cancellation, accidentals, barlines, names and span fragments together.
- Forced breaks, forbidden breaks and impossible widths have deterministic, documented outcomes.
- Rest compression preserves measure identity and interrupts correctly for structural events.
- Grand-staff and ensemble fixtures remain aligned with hidden/reappearing staves and changing staff distances.
- Proposed break choices are reviewed against greedy results on the same scores; increased algorithm complexity must produce a documented improvement.

**Deliverable:** responsive continuous scores, including vocal, keyboard and small-ensemble examples. A narrow viewport may require explicit overflow rather than illegibly compressed notation.

## M5 — Add publication layout

**Gaps:** VF-018, VF-020 basic layout views, page portion of VF-039.

**Work packages**

1. Add optional page settings: physical dimensions, staff size, margins, first-page title blocks, running headers/footers and page numbers.
2. Pack systems using final envelopes and controlled vertical justification. Respect forced page/system breaks and a short-last-page policy.
3. Add page-turn penalties for part layouts, with explicit preferred/forbidden locations. Do not infer playable rests solely from visual whitespace.
4. Support shared musical IDs with independent layout views, cue/ossia regions and local overrides. Keep automatic orchestral condensing out of this milestone.
5. Export page geometry through existing SVG facilities and optional print/PDF adapters. Include clear behavior for oversized content and fonts.

**Exit gate**

- A4 and Letter fixtures produce correct page counts, margins and no unintended clipping at specified staff sizes.
- Headers, footers and title blocks reserve space and never collide with music.
- Each part can change breaks without mutating the full score's notation or layout overrides.
- Page-turn constraints are honored when feasible; infeasible requests identify the conflicting region.
- Exported pages match on-screen geometry; outlined SVG has a retained semantic/text companion where needed.

**Deliverable:** print-ready pages for the initial repertoire, with reviewed examples of score and part layouts.

## M6 — Complete mainstream instrument workflows

**Gaps:** VF-025, VF-027, VF-029–VF-034, VF-051/052. Specialist diagrams remain M8.

Deliver profiles independently. Do not hold a percussion fix behind an unrelated transposition or tab project.

| Slice                       | Required examples                                                                                                 | Key dependencies                                 |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Percussion, P1              | Drum kit with mixed heads/chords, one-line staff, rolls/sticking, several voices and a legend                     | M2 polyphony; M1 anchors; #354 typed heads       |
| Lead sheet                  | Dense chord alterations/slash bass, lyrics, repeats/endings, rehearsal marks and rhythm slashes                   | M3 text spacing; M4 navigation                   |
| Guitar/tab                  | Paired notation/tab, alternate tuning, capo, prebend/hold/release, slides and grace notes; separate fret diagrams | M1 timing/anchors; M4 spans                      |
| Keyboard/strings/winds/harp | Alternating tremolos, harmonics, bowing, fingerings, breaths, pedal and technique changes                         | M2/M3 geometry; M4 cross-staff handling          |
| Pitch and rhythm helpers    | Pickup, syncopation, tied cross-bar durations, transposing instrument change and enharmonic alternatives          | M1 score context; M2 accidental/timing contracts |
| Microtonal                  | Two selected conventions, arbitrary ordered signatures and cautionary/cancellation behavior                       | M1 fonts; M2 accidental policy                   |
| Independent meter spike     | Different barline positions on two staves, shared onsets, unequal spans and a cadenza                             | M1 time model; M4 breaks                         |

**Exit gate**

- Each delivered profile has a scope table, expert-reviewed original score, native/EasyScore construction path, and interaction tests.
- Techniques retain semantic identity for accessibility and adapters; a glyph-only substitute is labeled as such.
- Optional rhythm spelling/transposition never rewrites explicit user notation unless requested.
- Two-note tremolo tests distinguish notated duration from the strokes' performance meaning.
- Independent-meter spike ends with a compatibility decision, implementation estimate and bounded support contract. Full generalized polymeter is not hidden inside the milestone estimate.

**Release rule:** complete P1 percussion for M7. P2 profiles may ship independently; list every deferred profile in release coverage instead of implying universal instrument support.

## M7 — Validate web delivery and ecosystem integration

**Gaps:** VF-039–VF-047, VF-049; finalize VF-023. VF-044 and VF-049 are integration with existing #354/#356, not newly owned projects.

**Work packages**

1. Add a declared Chromium/Firefox/WebKit matrix, with representative mobile/device checks. Cover Canvas/SVG, font load failure/delay, DPR changes, CSS transforms, resize, redraw and export.
2. Expose semantic reading order, note/rest/measure labels and navigation hooks. Provide host examples for keyboard focus, highlighted selections and a Canvas semantic fallback. Include assistive-technology users in review.
3. Unify logical IDs with visual fragments, hit regions and source provenance. Ensure zoom and reflow do not invalidate selection identities.
4. Profile full and incremental layout on short, medium and long scores. Measure memory and repeated create/reset cycles; gate cache/worker changes on equivalence to clean layout.
5. Pilot integration with OSMD or another maintained adapter. Run a selected MusicXML regression subset and independent native equivalents; classify importer loss separately from engraving defects.
6. Expand curated CI image/geometry gates and publish artifacts. Integrate new examples and limitations into #356; reconcile feature/option coverage with #354.
7. Finish text/export comparisons for declared language support, with explicit limitations for shaping paths that cannot match the browser.

**Exit gate**

- All P0/P1 acceptance cases in the release profile pass; no unreviewed geometry/image changes or unclassified failures remain.
- Cross-browser differences are understood and documented; assertions concern geometry/meaning, not identical raster antialiasing.
- Accessibility review verifies meaningful navigation and descriptions, not merely an SVG title or ARIA label.
- Font loading, missing glyphs, unsupported input and overflow have actionable diagnostics.
- Integration fixtures separate parsing, layout and rendering failures. No claim of lossless MusicXML/MEI round trips without evidence.
- Measured performance meets budgets set after M0 on recorded hardware; incremental and clean layouts agree.
- Existing native use, supported package entry points and custom extensions have regression coverage. API and guide work is coordinated with the owners of #354/#356.

**Deliverable:** a quality release with a precise repertoire/support statement, reviewed samples, migration notes and known exclusions.

## M8 — Expand specialist notation deliberately

**Gaps:** VF-035, VF-036, VF-050; advanced VF-020 and deferred portions of VF-034.

Require a short charter for each profile: requesting users, notation tradition, reference editions, expert reviewer, candidate corpus, model changes, performance implications and acceptance criteria.

Possible tracks include contemporary spatial notation, feathered beams/clusters, historical chant/mensural notation, figured bass, harp/wind diagrams, and advanced orchestral condensing. Research whether a specialized renderer or integration is more appropriate before extending the core.

Keep the register honest: specialist features remain `Deferred` until scheduled, even when their glyphs are present. A sponsor-approved scope and estimate are prerequisites, not an open-ended promise of every notation system.

## Validation strategy

### Complementary evidence

| Layer                   | What it verifies                                                                                  | What it does not establish              |
| ----------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Semantic assertions     | Exact durations, voice totals, pitch/accidental choices, relationship endpoints and context state | Attractive engraving                    |
| Geometry assertions     | Finite bounds, minimum distances, alignment, viewport/page containment and continuation anchors   | Optical balance in every font           |
| Raster/SVG comparison   | Unexpected changes under a pinned rendering environment                                           | Whether an intentional change is better |
| Human engraving review  | Legibility, convention, balance and sensible exceptions                                           | Runtime correctness across all inputs   |
| Integration/performance | Browser behavior, adapters, memory and response costs                                             | Universal repertoire coverage           |

Retain existing QUnit, Node, Explorer, visual-diff and benchmark tools. [Current testing guidance](testing.md) already documents negative controls and image-diff failure behavior; [benchmarks](benchmarks.md) separate construction, layout and drawing. Extend these rather than introducing a parallel test framework without a demonstrated need.

### Corpus design

Use three scales:

1. **Atomic:** one rule, a clear expected outcome, and the nearest counterexample.
2. **Interactions:** pair and triple combinations such as accidental + displaced head + dot; tuplet + beam + slur; lyric + tie + system break; pedal + dynamics + low notes.
3. **Scores:** original short studies for chorale, dense piano, chamber ensemble, lead sheet, percussion and tab, plus longer generated workloads for scale.

Vary stem direction, staff position, duration, voice count, grace/cue size, fonts, renderer, width and boundary placement. Use pairwise coverage for broad matrices and exhaustive combinations only around high-risk algorithms. Always include the shortest and longest supported span and empty/oversized inputs.

[LilyPond's regression index](https://lilypond.org/doc/v2.24/input/regression/collated-files.html) supplies named interaction cases; its [MusicXML tests](https://lilypond.org/doc/v2.24/Documentation/contributor/musicxml-tests) supply adapter candidates. Use pinned revisions, check licenses, and author original minimal fixtures when possible. Book-derived rules require edition/page confirmation by a reviewer; the research limitations are documented in the register.

### Proposed numeric gates

These are **targets to validate at M0**, not measured current results:

- 100% of selected P0/P1 acceptance cases have automated assertions and reviewed output where visual judgment is needed.
- Zero unexpected timing/semantic changes, non-finite coordinates, crashes, unreported overflows or unresolved high-severity collisions in release fixtures.
- Zero unexplained changes in pinned reference images. Approved aesthetic improvements update references with a reviewer and reason.
- Wide → narrow → wide and incremental → full comparisons agree within documented geometric tolerance; initially use the existing half-pixel diagnostic tolerance where applicable, then express policy distances in staff spaces.
- On a named reference machine, aim for p95 reflow under 100 ms for the agreed small interactive score. Measure larger scores before setting separate budgets; do not promise this for every score or device.
- Treat a reproducible median layout/draw regression above 10% on identical workloads as a review trigger, not an automatic noisy shared-CI failure. Record memory trends and algorithmic growth as score size increases.

Fixture counts should grow with closed gaps. Do not choose arbitrary pass percentages that permit a wrong accidental or lost tie in a supported case.

### CI tiers

- **Every PR:** types/lint, existing semantic tests, focused geometry checks, a small deterministic visual corpus, and any changed documentation examples.
- **Scheduled/mainline:** broader fonts/browsers/repertoire, long-score smoke tests, performance trends and repeated lifecycle checks.
- **Release:** full supported matrix, human score review, accessibility/user checks, downstream adapter canary, exports and migration verification.

Pin browser/font/build inputs for reference images. Require an explicit baseline review; never regenerate references solely to make CI green. Store reports as CI artifacts rather than committing issue screenshots. Follow the repository's issue workflow and attach white-background before/after examples when implementation later addresses a GitHub issue.

## Compatibility and rollout

1. Introduce geometry and diagnostic contracts additively where possible. Fix definite correctness bugs with focused regressions.
2. Offer experimental spacing/score-layout policies without changing legacy defaults. Document output differences and limitations.
3. Test existing native fixtures, custom subclasses, EasyScore parity and downstream consumers against each stage.
4. Promote a policy only after its corpus, performance and migration gates pass. Decide versioning from observable API/output effects, not the number of changed lines.
5. Keep a documented compatibility path during the transition. Avoid indefinite flags for every historical bug; retire them through normal deprecation with release notes.

Separate implementation completion from merge, release and deployment. A feature is not available in a published package just because it is present on this checkout.

## Risks and decision points

| Risk                                                         | Mitigation / decision                                                                                                                            |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shared geometry becomes a large rewrite                      | Start with difficult consumers and adapters; accept a class migration only with unchanged native behavior or an intentional reviewed difference. |
| Solver interactions oscillate                                | Stable ordering, bounded iterations, fixed/preferred constraints, diagnostics and conservative fallback layouts. Test cross-staff cycles early.  |
| Better-looking examples hide semantic regressions            | Assert pitch, time and relationships independently of screenshots.                                                                               |
| New score model duplicates #354 or downstream models         | Joint contract review; accept adapters and stable IDs; keep editor/playback data out of the minimum model.                                       |
| Default spacing change breaks downstream layouts             | Opt-in evaluation, existing snapshots, consumer canaries and explicit migration notes before promotion.                                          |
| Dense text produces excessive whitespace                     | Distinguish ink and layout bounds; inspect optical balance and allow named style policies.                                                       |
| Font/script support becomes an unbounded text-engine project | Declare supported scripts and fonts, use proven shaping libraries when needed, keep heavy export adapters optional.                              |
| License issues block reuse of reference material             | Record provenance/license at corpus intake; prefer original examples and behavioral specifications.                                              |
| Full score features absorb all effort                        | Ship M2/M3 quality improvements separately; require profile-level scope for parts, polymeter and specialist notation.                            |
| API/guide plans drift while work runs in parallel            | Share accepted types and fixture IDs with #354/#356 at each milestone; update one authoritative coverage record for each concern.                |

## Execution and maintenance

### First implementation iteration, when authorized

The current task produces documents only. The first later implementation iteration should:

1. Confirm supported repertoire, reviewer and ownership; refresh the baseline against merged #354/#356 work.
2. Finish M0's seed manifest and select representative existing fixtures without changing their engraving.
3. Reproduce three high-value candidates: altered-unison accidentals, mixed-subdivision beaming and cross-tick/three-voice collision.
4. Prototype pre-draw geometry for a beam, articulation stack and lyric row. Use that evidence to settle M1 interfaces.
5. Re-estimate M1–M4 and open small, linked implementation issues only when their scope and acceptance cases are concrete.

### Work-item template

```text
Gap ID(s):
Milestone / owner:
Priority and confirmed impact:
Current behavior and baseline commit:
Target behavior and explicit exclusions:
Reference rule / source revision:
Dependencies and integration with #354 / #356:
Proposed native API / EasyScore exposure:
Fixture IDs and semantic / geometry assertions:
Visual review cases, fonts and browsers:
Compatibility and performance checks:
Issue / PR / merged commit / released version:
Last reviewed / next action:
```

At milestone start, freeze its acceptance scope and record remaining assumptions. At review, update both documents, preserve completed records and split newly discovered work into linked children. `In progress` requires an owner and active issue/PR; `Verified` requires the register's evidence, not just a completed checklist.

Review progress by **supported use case and unresolved severity**. Report confirmed defects, reviewed acceptance cases, outstanding constraints, compatibility changes and effort remaining. Do not present a percentage based on the number of features or glyphs.

## Milestone decision log

| Date       | Decision                                                                               | Status / follow-up                                                                   |
| ---------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 2026-11-16 | Preserve native VexFlow; add optional score layout around shared geometry and anchors. | Proposed; validate with M1 prototypes.                                               |
| 2026-11-16 | Use existing tests, visual tools and benchmarks as the foundation.                     | Proposed; M0 measures coverage and reproducibility.                                  |
| 2026-11-16 | Treat #354 and #356 as parallel efforts already in progress.                           | Confirmed by maintainer; integrate new capabilities without duplicating those plans. |
| 2026-11-16 | Defer specialist profiles, full condensing and generalized polymeter commitments.      | Revisit after core evidence and a scoped sponsor request.                            |
