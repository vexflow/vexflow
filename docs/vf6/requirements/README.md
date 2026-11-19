# VF6 requirements baseline

**2026-11-18 · Closeout of roadmap #358, M0–M8.1.** Build compatible notation features on VF5. Use its studies as acceptance fixtures for a future VF6 implementation. The maintainer approved the measure-based score direction, the milestone engraving examples and the M7 keyboard and screen-reader walkthrough. The three M8.1 approvals cover the screenshots. [Roadmap](../vexflow-gaps-plan.md) · [Gap register](../vexflow-gaps.md)

| Area | Requirement carried into VF6 | Acceptance evidence and remaining boundary |
| --- | --- | --- |
| [Portable score and excerpts](score-persistence.md) | Version a measure-based representation with stable identities for players, voices, measures, events, heads and relationships. Store rational score time, inherited musical state and authored offsets. Reconstruct VF5 through an adapter. | Save, load, slice a bar with a pedal already depressed, insert a measure, reflow, then compare. A dangling anchor or unencodable extension identifies its source. The prototype’s sixteenth-note grid and limited voices are fixture limits. |
| [Geometry and style](layout-measurement.md) | Expose pre-draw ink, reservations and anchors in declared units. Resolve font, score and element overrides predictably. Return a finite result and a source-specific diagnostic when an object lacks geometry. | Move an intervening note into and out of a beam. Resize twice and recover the original stem joins. Verify the same passage with a second font and scale. |
| [Local engraving](local-engraving.md) | Keep a written pitch and its accidental, head, dot and duration distinct from their painted columns. Preserve tuplet timing and separate display ratios, grace hosts, beam intent and optical versus exact spacing. | Reorder altered unisons and fit four voices. Request less than the measured minimum. Geometry and diagnostics must tell the client what fits. |
| [Phrases](phrase-layout.md) | Persist lyric syllables and connectors, tie and slur endpoints, side, explicit controls and locked lanes. Derive curves, lanes and collision results after layout. | Read two verses, refit a piano slur past a stem and another mark, then restore width. Preserve original Unicode and diagnose conflicting constraints. Complex-script shaping needs its own language fixtures. |
| [Continuous scores](continuous-scores.md) | Separate musical voice from displayed staff, including split chords. Anchor break constraints, navigation destinations, compressed rests and logical spans to the source. Fragments retain their owners across rows. | Wrap a choir phrase, hide and restore an ensemble staff, and check repeat destinations, wedge aperture and shared stems. General multi-staff joins and external excerpt destinations need further decisions. |
| [Pages and parts](publication-layout.md) | Give each output view physical units, its own overrides, turn constraints and scale. Keep cues and ossias linked to their source but separate from the performing voice. | Paginate the same chamber score and part on A4 and Letter. Measure headers, footers, systems and the turn. Extract a part and recover the source IDs from the page. |
| [Instrument notation](instrument-notation.md) | Encode percussion instruments, string positions, capo, tremolo time, signature spelling and staff-local meter explicitly. Keep sounding pitch, written pitch and display position distinct. | Check the one-line kit, alternating tremolo, microtonal signs, Drop D, three-against-two window and cadenza. Keep the accepted musical vocabulary extensible. |
| [Web delivery](web-delivery.md) | Provide logical reading order independently of renderer paint order. Support host-owned focus and named hit regions. Keep font readiness, fallback, export and input loss observable. | Run SVG and Canvas, reflow with an event selected, read a native keyboard control, export outlined text and compare fresh versus retained draws. M7 records the human review separately from automation. |
| [Specialist notation](specialist-notation.md) | Preserve physical finger action and target strings separately from arrow style. Represent independent muted attacks, inclusive mute spans and timed pitch envelopes. Preserve exact, bounded and free time as distinct musical intents. | Change the printed arrow, wrap the mute and bend one string of a dyad. Preserve both starting pitches and each rational endpoint. Existing contemporary and ensemble reference sheets establish targets for later prototypes. |

## Implementation and verification order

1. Build the score, validation and extension codec around the approved interchange passage. Release a migration fixture with explicit failures for unsupported content.
2. Build layout atop that score. Port the local, phrase and continuous studies, then the score and extracted parts. Require stable IDs, exact time and width reversibility before changing automatic defaults.
3. Connect renderer-independent reading and selection, font loading, export and import diagnostics. Compare against the reviewed main revision in the same browser. Retain the 5.2.0 series for historical engraving and the 5.0.0 report for release history.
4. Qualify each additional notation profile against a written passage and performer reading. Keep stable acceptance evidence and update the owning requirements document when a design choice changes.

## Work outside this closeout

| Follow-up | Decision and test needed |
| --- | --- |
| M8.2 · Measured contemporary notation | Give feathered groups a total span and author-selected inner timing. Give clusters written limits and membership. Reflow and verify the flute entry against the piano. |
| M8.3 · Ensemble meters and parts | Anchor cues to a shared rehearsal point while preserving local bar counts, continued notes, transposition and player IDs. Compare conductor and extracted part readings. |
| M8.4 · Spatial and indeterminate time | Represent a bounded repeat cell and synchronization cue without inventing exact onsets. Test player discretion and ensemble re-entry. |
| M8.5 · Condensing | Begin with authored player assignments. Preserve source IDs and separate parts at unisons, splits and conflicts. Require explicit fallbacks before automatic condensing. |
| Guitar conventions | Seek idiom-specific play-throughs before claiming performance validation. Extend the corpus for samba and seven-string choro. Decide independent gesture selection, tied bend envelopes and retuning identity. |

Update the dated decision, evidence and remaining boundary in the relevant linked document when a fixture, implementation or human review changes it.
