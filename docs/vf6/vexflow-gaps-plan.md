# VexFlow notation quality: strategy and milestone plan

Created: **2026-11-16**

Last reviewed: **2026-11-18**

**Primary status reference** · [M7 on upstream main at 97a8669d](https://github.com/vexflow/vexflow/commit/97a8669d). Compare the branch to freshly fetched main at every milestone review and after merges. Keep 5.2.0 as the historical release reference. [Latest fixture comparison](m0.md#latest-comparison)

Status: **M0 through M7 are complete on main. The maintainer approved the VF6 score representation and the M1 beam, M2 local engraving, M3 phrase, M4 continuous-score, M5 print and M6 instrument studies. The maintainer also approved the M7 keyboard and screen-reader walkthrough. The M8.0 reference scores are ready for performer review on the roadmap branch.**

Source of scope: [Notation gap register](vexflow-gaps.md)

## Recommendation

Pursue two tracks in parallel. Improve VexFlow 5 in small steps while using the same scores and engraving experience to design VexFlow 6. The maintainer plans to prototype a requirements repository for contributors and coding agents. The V6 architecture and its compatibility boundary are open design decisions. [Maintainer’s follow-up on #358](https://github.com/vexflow/vexflow/issues/358#issuecomment-6960644745)

| Track                             | First work                                                                                                                                                                                                        | Evidence to keep                                                                                                                                                                           |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| VexFlow 5 implementation          | Pick a reproducible defect from M0. Make the smallest correction that preserves current API contracts and musical semantics. Start with the coincident heads in the M0 altered-unison study.                      | A failing fixture, the reviewed correction, compatibility checks, and the commit or release that contains it.                                                                              |
| VexFlow 6 requirements and design | Start in M0. Specify how a score or excerpt carries inherited state, anchors a modifier and preserves an authored placement. Compare a fresh V6 design with the existing composition adapter on the same passage. | A short, versioned requirement, an executable example or proposed acceptance test, the alternatives considered, and the maintainer decision. Link the prototype repository when available. |

Triage each slice separately. If a public API or foundational behavior would have to change, capture the current and desired interpretation of one score, the affected callers and a migration option. For example, V5 composition rejects cross-measure spans by default. A V5 candidate must preserve that contract for existing callers. The V6 design can independently evaluate making a logical span survive every system break by default.

At milestone review, link any shipped V5 fixture or unresolved constraint back to the V6 requirement. Contributors can review the musical examples and decisions in ordinary versioned documents. This adopts the traceability discussed in the issue while leaving the choice of specification tools open.

## Starting point on main

EasyScore and the guide are on main and shipped in 5.2.0. VF-044 and VF-049 are complete for their original scope. New features can use the existing typed helpers, composition tests, runnable guide examples and CI. [EasyScore contracts](../easyscore-contracts.md) · [Guide authoring and testing](../guide.md)

| Work                                                  | State on November 17                       | Use in this plan                                                                                                                                  |
| ----------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#354](https://github.com/vexflow/vexflow/issues/354) | Closed and merged in `3f548efd`            | Extend `score.compose()` for new score-layout use cases. Preserve its supported native inputs, exact musical timing and explicit layout policies. |
| [#356](https://github.com/vexflow/vexflow/issues/356) | Closed. Guide PR #357 merged in `78eb6e6c` | Add recipes to the existing guide and run its browser checks as each engraving feature ships.                                                     |
| [#355](https://github.com/vexflow/vexflow/issues/355) | Open                                       | Link verified legacy reproductions to this tracker.                                                                                               |

## Product boundaries

### Core library

Own notation primitives, rational time, geometry, font metrics, deterministic formatting, renderer contracts and extension hooks. Retain low-level positioning and custom subclasses. Keep runtime dependencies small; do not add an importer, solver framework or font engine merely to implement a narrow local function.

### Optional score layout

Own measure/staff context, automatic systems and pages, logical spans, repeat boundaries, lyric rows and layout views. Accept native VexFlow objects or a small adapter contract. It should not require a canonical editor document, playback engine, or MusicXML document tree.

`System` currently represents a measure-sized collection in Sheet usage, while a printed system is a row of several measures. Name and document these concepts distinctly in new types without casually renaming the existing public class.

### Optional domain and integration modules

Instrument catalogs, duration spelling, transposition, part extraction, diagrams and import/export adapters can sit above the core. Full orchestral condensing, historical notation and experimental notation require separate charters. Support an extension path from the first milestone so specialist notation does not force invasive core changes.

[OSMD already provides MusicXML rendering over VexFlow](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay). Reuse that ecosystem where practical. Evaluate adapter contributions before committing to a second complete importer. [Verovio's documented input behavior](https://book.verovio.org/toolkit-reference/input-formats.html) also shows why unsupported-data reporting must be explicit.

## Candidate architecture and experiments

These experiments can run on V5 where its contracts permit. For V6, evaluate their musical outcomes against the same fixtures and record which interfaces to retain, change or replace.

### 1. Musical anchors and minimal score context

For the V5 experiment, build on the existing `EasyScoreCompositionSpec`, which already describes staves, measures, voices, inline context changes and forward note references. Proposed additions should preserve these musical details across layout and save/load. [Current input types](../../src/easyscore/composition.ts)

- Stable IDs for part, staff, voice, measure, event and logical relationship.
- Rational onset and duration; grace ordering distinct from metrical time.
- Staff assignment distinct from voice ownership, including per-head assignment when supported.
- Pitch spelling and displayed accidentals distinct from sounding pitch.
- Clef/key/meter changes, barline positions, instrument labels and repeat regions.
- Spans anchored to a notehead, stem, beat, barline or explicit staff position.
- Explicit overrides, source provenance and supported layout policies.

Do not infer all of this from rendered SVG or mutable pixel coordinates. Do not duplicate the application's entire musical model. Define adapters and preserve source IDs so importers and editors can remain authoritative.

A relationship has one logical identity even if it has several visual fragments. A tie between specific chord heads is different from a phrase slur; a timed pedal event is different from a label attached to the nearest note. These distinctions should be reflected in types and validation.

#### M1 decision on score serialization

The [first VF6 requirement](requirements/score-persistence.md) records the acceptance passage, both tested representations and the approved design direction.

Use one original three-measure, two-staff passage for the decision. Change key in measure two, start a pedal there and release it in measure three. Give measure three a rehearsal mark and a dynamic with an explicit staff-relative offset.

1. Encode the passage with the serializable subset of EasyScore input and compare it with an independent score adapter. Specify versioning, stable references and how to report a live native tickable or unsupported extension.
2. Save the full passage and an excerpt starting at measure three. Recover its effective key and meter. Define whether the excerpt carries an incoming pedal continuation or reports its missing start anchor.
3. Record the rehearsal mark once at its musical location, define its display on the chosen staves, and attach the pedal to its staff and time range. Specify how those objects follow edits to their measures.
4. Reload and render at two widths. Compare event IDs, rational onsets, effective context and endpoints. The manual dynamic offset should survive. Automatic breaks and collision displacements should be recomputed from the new width.

Both representations passed these checks. On 2026-11-18, @0xfe approved a versioned, measure-based document for portable VF6 scores and excerpts. An adapter constructs VF5 notation through EasyScore. The prototype files establish the tested behavior. The production schema still needs broader notation coverage.

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

Start with conservative boxes and piecewise vertical envelopes. Add contour/curve refinement only where false positives affect quality. Existing [render metrics](../testing.md) remain useful diagnostics, but rectangle intersections are not themselves proof of musical collisions.

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

Use the three-voice example from M0 to compare automatic clearance with an authored displacement. Record which relationships the collision pass must preserve.

Record whether a position is automatic, preferred, or fixed. A fixed override that causes an overlap should be honored and reported. Reflow must not erase user intent or accumulate old offsets.

### 6. Incremental layout after correctness

First establish deterministic full layout. Then cache intrinsic metrics and measure constraints separately from final positions. Invalidation keys should include fonts, policy, note content, modifiers, staff scale and context changes.

A lyric edit may affect one measure's minimum width and downstream line breaks. A key change can affect many later measures. A changed staff gap can affect every cross-staff relationship in that system. Encode these dependencies before attempting viewport-only rendering or worker execution.

Compare incremental output to a clean full layout after randomized edits. Only introduce workers if profiles show worthwhile main-thread savings after serialization and font-measurement constraints are included.

## Milestone overview

M0–M8 group the problems and their dependencies. Individual compatible fixes can ship during V5, and V6 specification work begins in M0. The effort figures apply to the original staged engineering proposal. A new V6 implementation needs its own estimate after design review.

All estimates below are **rough engineering effort**, not calendar promises. They assume one engineer familiar with the code, access to an engraving reviewer, and bounded initial repertoire. They exclude the completed EasyScore and guide work, a complete importer, full orchestral condensing and M8 specialist work.

M0–M7 total **44–75 engineer-weeks before contingency**. Reserve roughly 25% for discoveries and integration: **55–94 engineer-weeks**. Parallel staffing can reduce elapsed time, but the geometry → collision → system → page path is sequential. Re-estimate after M0 and after each architecture spike; do not commit a release date from these ranges.

| Milestone | Outcome                               | Hard entry dependencies                       | Rough effort         | Status   |
| --------- | ------------------------------------- | --------------------------------------------- | -------------------- | -------- |
| M0        | Auditable corpus and baseline         | None                                          | 2–3 weeks            | Complete |
| M1        | Geometry, policy and anchor contracts | M0 seed cases                                 | 5–8 weeks            | Complete on main |
| M2        | Reliable local engraving              | M1 contracts for affected classes             | 6–10 weeks           | Complete on main |
| M3        | Collision-aware phrases and lyrics    | M1; relevant M2 placement                     | 7–12 weeks           | Complete on main |
| M4        | Complete continuous scores            | M2/M3, minimal context from M1                | 7–12 weeks           | Complete on main |
| M5        | Pages and basic part layouts          | M4, stable vertical envelopes                 | 4–7 weeks            | Complete on main |
| M6        | Mainstream instrument profiles        | M2–M4; parts use M5                           | 8–14 weeks           | Complete on main. [M6 approval](m6.md#engraving-review) |
| M7        | Web/integration quality release       | M0–M5 and P1 scope of M6                      | 5–9 weeks            | Complete on main. Screen-reader walkthrough approved. [M7 evidence](m7.md) |
| M8        | Specialist expansion                  | Reference scores and performer review | Estimate per increment | [M8.0 controls ready for review](m8-reference-scores.md) |

Web compatibility, performance measurement, API parity, and documentation run throughout; M7 is their final integration gate. M6 P2 items may be delivered after the first quality release if explicitly deferred. P1 percussion support is part of the core repertoire target. M5 basic parts do not imply automatic condensing.

## M0 — Establish evidence and acceptance

**Gaps:** VF-001, VF-048, and initial work on VF-042 and VF-047.

[M0 results, reproduction commands and review queue](m0.md) · [Draft VF6 requirement](requirements/score-persistence.md)

**Work packages**

1. Inventory exported notation families and map existing tests to the register. Reuse `easyscore-coverage.json` for facade coverage without treating it as an engraving-quality score.
2. Build a proposed `tests/engraving/` corpus manifest. Each case records ID, rule, gap, input builder, musical assertions, geometry assertions, reference revision/license, supported fonts/backends, expected outcome and review status.
3. Start with approximately 60 small cases across spacing, beams, polyphony, accidentals, spans, lyrics and boundaries. This is a planning target; coverage of each selected rule matters more than the count.
4. Adapt representative cases from the register's LilyPond crosswalk using original short music. Keep source/reference provenance even when no source is copied.
5. Reproduce legacy candidates on the checkout and a pinned upstream main build. Record the 5.2.0 release comparison separately. Classify as current defect, already fixed, API misuse, documentation gap, duplicate, or unsupported feature. Coordinate applicable reports with #355.
6. Capture existing chorale, piano and chamber benchmarks; add planned lead-sheet, percussion and tab workloads. Record build mode, fonts, browser, hardware and input size.
7. Extend the existing visual report with fixture IDs and review outcomes. Make sure negative controls detect deliberate clipping, wrong accidentals, invalid span endpoints and text collisions.

**Exit gate**

- Each P0/P1 gap has at least one concrete acceptance case or an explicit reproduction task.
- Seed cases are classified as passing, expected failing, or unverified; none are silently skipped.
- A repeat run reproduces geometry and reference images on the pinned environment, excluding documented nondeterministic metadata.
- Existing tools are used successfully; measured performance baselines and reviewer availability are recorded.
- Priority and effort estimates are revised from evidence. No notation fixes are required to complete M0's baseline.

**V6 design output.** Draft the first score-persistence requirement with the M1 passage and a decision owner. Record which expectations V5 already satisfies and which need design review. Link the record from VF-013 and later from the prototype requirements repository.

**Review artifact:** browsable report with white-background examples, manifest and a short list of confirmed defects. Issue-specific material belongs in `issues/` only when needed; generated images stay under `build/` or temporary storage.

## M1 — Make layout measurable and policies explicit

**2026-11-18 · M1 complete on main.** [Implementation, geometry audit and reproduction](m1.md) · [Approved VF6 representation and remaining scope](requirements/score-persistence.md#m1-decision-record)

**Gaps:** VF-002, VF-013, VF-037, VF-038, initial VF-046.

**Work packages**

1. Audit every core participant's pre-draw geometry. Start with stems, heads, flags, beams, articulations, grace groups and curves; record whether bounds include child marks and strokes.
2. Add geometry interfaces and adapter implementations incrementally. Move placement calculations out of draw methods where necessary; retain compatibility adapters for native callers.
3. Define immutable score-local engraving settings, unit conversions and override precedence. Resolve existing global font/metrics behavior without changing unrelated low-level defaults.
4. Prototype SMuFL metadata loading for one font, then a second contrasting font. Validate metadata and provide known fallback anchors for absent fields.
5. Run the score and excerpt serialization study above. Compare the EasyScore input types with the adapter. Record how context changes, measure and staff ownership, manual overrides and unsupported inputs round-trip.
6. Define diagnostics with stable codes, source IDs, severity and phase. Include unsupported geometry participation for custom elements.

**Exit gate**

- Core seed fixtures can be measured without drawing; all bounds and anchors are finite and expressed in documented coordinates.
- Repeated measure/format/draw does not accumulate offsets. Wide → narrow → wide produces the same final geometry as a fresh wide layout.
- Two simultaneous scores can use different policies/fonts without contamination in the new layout path.
- Metadata-present and metadata-absent fonts have tested behavior; invalid metadata cannot create NaN geometry.
- The M1 passage and excerpt pass the save/load checks at both widths. Record the chosen representation, exclusions and fixture IDs. Native subclasses retain their existing Factory/EasyScore ownership.

**Decision gate:** accept the geometry interfaces only after beam, lyric and cross-staff prototypes can consume them. Avoid abstracting every class before testing the difficult consumers.

## M2 — Stabilize local engraving

**2026-11-18 · M2 complete on main. The maintainer approved all seven engraving examples.** [Engineering and compatibility](m2.md) · [Side-by-side examples on issue #358](https://github.com/vexflow/vexflow/issues/358) · [Requirements for VF6](requirements/local-engraving.md)

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

**2026-11-18 · Complete on main.** [Engineering evidence and approved examples](m3.md) · [Proposed VF6 requirements](requirements/phrase-layout.md)

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

**2026-11-18 · Complete on main. All seven engraving studies approved.** [VF5 guide and review cases](m4.md) · [Proposed VF6 requirements](requirements/continuous-scores.md)

**Gaps:** VF-014–VF-017, VF-019, VF-021, VF-026, VF-028; complete continuation portions of VF-007/008/009/022/024.

**Work packages**

1. Use the clef/key/meter context that composition already carries. Extend it with the boundary and instrument state required by break candidates.
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

**2026-11-18 · Complete on main. All four print editions approved.** [VF5 print guide and review cases](m5.md) · [Proposed VF6 requirements](requirements/publication-layout.md)

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

[M6 coverage and review scores](m6.md) · [VF6 instrument requirements](requirements/instrument-notation.md)

Deliver profiles independently. Do not hold a percussion fix behind an unrelated transposition or tab project.

| Slice                       | Required examples                                                                                                 | Key dependencies                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Percussion, P1              | Drum kit with mixed heads/chords, one-line staff, rolls/sticking, several voices and a legend                     | M2 polyphony; M1 anchors; 5.2.0 typed percussion heads |
| Lead sheet                  | Dense chord alterations/slash bass, lyrics, repeats/endings, rehearsal marks and rhythm slashes                   | M3 text spacing; M4 navigation                         |
| Guitar/tab                  | Paired notation/tab, alternate tuning, capo, prebend/hold/release, slides and grace notes; separate fret diagrams | M1 timing/anchors; M4 spans                            |
| Keyboard/strings/winds/harp | Alternating tremolos, harmonics, bowing, fingerings, breaths, pedal and technique changes                         | M2/M3 geometry; M4 cross-staff handling                |
| Pitch and rhythm helpers    | Pickup, syncopation, tied cross-bar durations, transposing instrument change and enharmonic alternatives          | M1 score context; M2 accidental/timing contracts       |
| Microtonal                  | Two selected conventions, arbitrary ordered signatures and cautionary/cancellation behavior                       | M1 fonts; M2 accidental policy                         |
| Independent meter spike     | Different barline positions on two staves, shared onsets, unequal spans and a cadenza                             | M1 time model; M4 breaks                               |

**Exit gate**

- Each delivered profile has a scope table, expert-reviewed original score, native/EasyScore construction path, and interaction tests.
- Techniques retain semantic identity for accessibility and adapters; a glyph-only substitute is labeled as such.
- Optional rhythm spelling/transposition never rewrites explicit user notation unless requested.
- Two-note tremolo tests distinguish notated duration from the strokes' performance meaning.
- Independent-meter spike ends with a compatibility decision, implementation estimate and bounded support contract. Full generalized polymeter is not hidden inside the milestone estimate.

**Release rule:** complete P1 percussion for M7. P2 profiles may ship independently; list every deferred profile in release coverage instead of implying universal instrument support.

## M7 — Validate web delivery and ecosystem integration

[M7 qualification and reviewer walkthrough](m7.md) · [VF6 web requirements](requirements/web-delivery.md)

**Gaps:** VF-039–VF-043 and VF-045–VF-047. Finalize VF-023. Use the completed VF-044 and VF-049 checks for API and guide regressions.

**Work packages**

1. Add a declared Chromium/Firefox/WebKit matrix, with representative mobile/device checks. Cover Canvas/SVG, font load failure/delay, DPR changes, CSS transforms, resize, redraw and export.
2. Expose semantic reading order, note/rest/measure labels and navigation hooks. Provide host examples for keyboard focus, highlighted selections and a Canvas semantic fallback. Include assistive-technology users in review.
3. Unify logical IDs with visual fragments, hit regions and source provenance. Ensure zoom and reflow do not invalidate selection identities.
4. Profile full and incremental layout on short, medium and long scores. Measure memory and repeated create/reset cycles; gate cache/worker changes on equivalence to clean layout.
5. Pilot integration with OSMD or another maintained adapter. Run a selected MusicXML regression subset and independent native equivalents; classify importer loss separately from engraving defects.
6. Expand curated CI image/geometry gates and publish artifacts. Add examples and limitations to the guide. Check new public helpers against the EasyScore contracts and package tests.
7. Finish text/export comparisons for declared language support, with explicit limitations for shaping paths that cannot match the browser.

**Exit gate**

- All P0/P1 acceptance cases in the release profile pass; no unreviewed geometry/image changes or unclassified failures remain.
- Cross-browser differences are understood and documented; assertions concern geometry/meaning, not identical raster antialiasing.
- Accessibility review verifies meaningful navigation and descriptions, not merely an SVG title or ARIA label.
- Font loading, missing glyphs, unsupported input and overflow have actionable diagnostics.
- Integration fixtures separate parsing, layout and rendering failures. No claim of lossless MusicXML/MEI round trips without evidence.
- Measured performance meets budgets set after M0 on recorded hardware; incremental and clean layouts agree.
- Existing native use, supported package entry points and custom extensions have regression coverage. The guide and packaged EasyScore consumer checks pass for the new release.

**Deliverable:** a quality release with a precise repertoire/support statement, reviewed samples, migration notes and known exclusions.

## M8 — Expand specialist notation deliberately

**Proposed scope.** Contemporary notation (VF-035), advanced ensemble layout (VF-020 and VF-034), and contemporary guitar TAB (VF-030). The detailed plan names the reference excerpts, existing VF5 capabilities, implementation order, review criteria and VF6 decisions. [M8 delivery plan](m8.md)

Start with three guitar idioms, a contemporary passage and a two-player score. Review playable examples before expanding to free-time layout or automatic condensing. Historical notation (VF-036) and specialist instrument diagrams (VF-050) remain deferred.

## Validation strategy

### Complementary evidence

| Layer                   | What it verifies                                                                                  | What it does not establish              |
| ----------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Semantic assertions     | Exact durations, voice totals, pitch/accidental choices, relationship endpoints and context state | Attractive engraving                    |
| Geometry assertions     | Finite bounds, minimum distances, alignment, viewport/page containment and continuation anchors   | Optical balance in every font           |
| Raster/SVG comparison   | Unexpected changes under a pinned rendering environment                                           | Whether an intentional change is better |
| Human engraving review  | Legibility, convention, balance and sensible exceptions                                           | Runtime correctness across all inputs   |
| Integration/performance | Browser behavior, adapters, memory and response costs                                             | Universal repertoire coverage           |

Retain existing QUnit, Node, Explorer, visual-diff and benchmark tools. [Current testing guidance](../testing.md) already documents negative controls and image-diff failure behavior; [benchmarks](../benchmarks.md) separate construction, layout and drawing. Extend these rather than introducing a parallel test framework without a demonstrated need.

### Corpus design

Use three scales:

1. **Atomic:** one rule, a clear expected outcome, and the nearest counterexample.
2. **Interactions:** pair and triple combinations such as accidental + displaced head + dot; tuplet + beam + slur; lyric + tie + system break; pedal + dynamics + low notes.
3. **Scores:** original short studies for chorale, dense piano, chamber ensemble, lead sheet, percussion and tab, plus longer generated workloads for scale.

Vary stem direction, staff position, duration, voice count, grace/cue size, fonts, renderer, width and boundary placement. Use pairwise coverage for broad matrices and exhaustive combinations only around high-risk algorithms. Always include the shortest and longest supported span and empty/oversized inputs.

[LilyPond's regression index](https://lilypond.org/doc/v2.24/input/regression/collated-files.html) supplies named interaction cases; its [MusicXML tests](https://lilypond.org/doc/v2.24/Documentation/contributor/musicxml-tests) supply adapter candidates. Use pinned revisions, check licenses, and author original minimal fixtures when possible. Book-derived rules require edition/page confirmation by a reviewer; the research limitations are documented in the register.

### Proposed numeric gates

The [M0 baseline](m0.md) establishes deterministic single-browser comparisons and initial draw costs. The following targets apply to later release qualification:

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
| Score persistence duplicates editor or EasyScore data        | Joint contract review; accept adapters and stable IDs; keep editor/playback data out of the minimum model.                                       |
| Default spacing change breaks downstream layouts             | Opt-in evaluation, existing snapshots, consumer canaries and explicit migration notes before promotion.                                          |
| Dense text produces excessive whitespace                     | Distinguish ink and layout bounds; inspect optical balance and allow named style policies.                                                       |
| Font/script support becomes an unbounded text-engine project | Declare supported scripts and fonts, use proven shaping libraries when needed, keep heavy export adapters optional.                              |
| License issues block reuse of reference material             | Record provenance/license at corpus intake; prefer original examples and behavioral specifications.                                              |
| Full score features absorb all effort                        | Ship M2/M3 quality improvements separately; require profile-level scope for parts, polymeter and specialist notation.                            |
| Guide and API fall behind new notation                       | Update the API inventory and a runnable guide example in the feature PR.                                                                         |

## Execution and maintenance

Open each milestone with a short bulleted comment on [the roadmap issue](https://github.com/vexflow/vexflow/issues/358). Include the current behavior on main, the planned changes and the examples or tests that will determine acceptance. After pushing, post a bulleted summary of the changes and verification, with representative white-background screenshots for engraving review. Record approval and merge status separately.

### After the M0 baseline

1. Use the [M0 closure record](m0.md#m0-closure) and its five regression cases as the VF5 starting point.
2. Use the three-spelling chord as the first compatible VF5 repair candidate. Preserve explicit accidental spelling and the passing two-head control.
3. Prototype pre-draw geometry for the collision in the three-voice fixture, an articulation stack and a lyric row.
4. Compare the two persistence designs against the [score and excerpt requirement](requirements/score-persistence.md). Record the M1 decision independently of the VF5 repair.
5. Re-estimate M1–M4 when those prototypes establish the cost of the shared contracts.

### Work-item template

```text
Gap ID(s):
Milestone / owner:
Priority and confirmed impact:
Current behavior on upstream main / main SHA / checkout SHA:
Remaining branch differences / 5.2.0 historical differences:
Target behavior and explicit exclusions:
Reference rule / source revision:
Dependencies, EasyScore contract and guide example:
V5 slice / current API and musical semantics / release:
V6 requirement / competing designs / migration implications:
Fixture IDs and semantic / geometry assertions:
Visual review cases, fonts and browsers:
Compatibility and performance checks:
Issue / PR / merged commit / released version:
Last reviewed / next action:
```

Include the requirement revision and fixture IDs in each implementation record so a later contributor can trace why a behavior changed.

At milestone start, freeze its acceptance scope and record remaining assumptions. At review, update both documents, preserve completed records and split newly discovered work into linked children. `In progress` requires an owner and active issue/PR; `Verified` requires the register's evidence, not just a completed checklist.

Review progress by **supported use case and unresolved severity**. Report confirmed defects, reviewed acceptance cases, outstanding constraints, compatibility changes and effort remaining. Do not present a percentage based on the number of features or glyphs.

## Milestone decision log

| Date       | Decision                                                                                              | Status / follow-up                                                                                                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-16 | Preserve native VexFlow; add optional score layout around shared geometry and anchors.                | Proposed; validate with M1 prototypes.                                                                                                                                             |
| 2026-11-16 | Use existing tests, visual tools and benchmarks as the foundation.                                    | Proposed; M0 measures coverage and reproducibility.                                                                                                                                |
| 2026-11-16 | Treat #354 and #356 as parallel efforts already in progress.                                          | Confirmed by maintainer; integrate new capabilities without duplicating those plans.                                                                                               |
| 2026-11-16 | Defer specialist profiles, full condensing and generalized polymeter commitments.                     | Revisit after core evidence and a scoped sponsor request.                                                                                                                          |
| 2026-11-17 | Use the merged 5.2.0 API and guide as the baseline. Add the score/excerpt persistence decision to M1. | VF-044/049 verified. VF-013 design remains open.                                                                                                                                   |
| 2026-11-17 | Split compatible V5 delivery from parallel V6 requirements and design.                                | Proposed by the maintainer. The planned prototype repository will carry V6 requirements. [Issue discussion](https://github.com/vexflow/vexflow/issues/358#issuecomment-6960644745) |
| 2026-11-18 | Record M0 and start a branch-local VF6 requirements directory.                                        | [Evidence, priority and revised effort](m0.md). Seven cases have [engraving feedback](m0.md#maintainer-engraving-review).                                                          |
| 2026-11-18 | Complete M0 with the five reviewed VF5 engraving fixes.                                               | Both unison fixtures are expected. [Closure evidence](m0.md#m0-closure).                                                                                                           |
| 2026-11-18 | Implement M1 on VF5 and exercise both VF6 persistence options. | [Engineering gates and review items](m1.md). Both prototypes passed the acceptance passage. |
| 2026-11-18 | Use upstream main to judge outstanding branch changes. Keep a second comparison against 5.2.0 for release history. | [Current results and refresh procedure](m0.md#latest-comparison). |
| 2026-11-18 | Implement M2 on VF5. | [Local engraving checks, branch comparison and review](m2.md). |
| 2026-11-18 | Approve the representation for portable VF6 scores and excerpts. | M1 complete on the branch. [Decision and study limits](requirements/score-persistence.md#m1-decision-record). |
| 2026-11-18 | Implement opt-in, single-system phrase layout on VF5. | [Choir and piano review, three-way comparison and remaining scope](m3.md). |
| 2026-11-18 | Merged M3 into main after engraving approval. | [Approved examples](m3.md) · [Post-merge comparison](m0.md#latest-comparison). |
| 2026-11-18 | Completed M4 on the roadmap branch. @0xfe approved all seven engraving studies. | [M4 evidence](m4.md) · [VF6 requirements](requirements/continuous-scores.md). |
| 2026-11-18 | Merged the approved M4 continuous-score layout into main. | [M4 engraving review](m4.md#engraving-review) · [Post-merge comparison](m0.md#latest-comparison). |
| 2026-11-18 | Implemented M5 publication layout on the roadmap branch. Engraving review pending. | [M5 evidence](m5.md) · [VF6 requirements](requirements/publication-layout.md). |
| 2026-11-18 | Merged the four approved M5 print editions into main. | [M5 review](m5.md#engraving-review) · [Post-merge comparison](m0.md#latest-comparison). |
| 2026-11-18 | Implemented the M6 instrument profiles and bounded independent-meter experiment on the roadmap branch. Engraving review pending. | [M6 evidence](m6.md) · [VF6 requirements](requirements/instrument-notation.md). |
| 2026-11-18 | Merged all eight approved M6 studies into main. P1 percussion is verified. | [Engraving approval](m6.md#engraving-review) · [Post-merge comparison](m0.md#latest-comparison). |
| 2026-11-18 | Implemented M7 web qualification on the roadmap branch. Human assistive-technology review pending. | [M7 evidence](m7.md) · [VF6 requirements](requirements/web-delivery.md). |
| 2026-11-18 | Merged M7 into main after @0xfe approved the keyboard and screen-reader walkthrough. | [Review record](m7.md#assistive-technology-review) · [Post-merge comparison](m0.md#latest-comparison). |
| 2026-11-18 | Added the five M8.0 native controls on the roadmap branch. Performer review pending. | [Reference scores](m8-reference-scores.md) · [M8 delivery plan](m8.md). |
