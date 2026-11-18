# VF6 requirement 001 · Save a score or an excerpt

**Draft 1 · 2026-11-18 · Decision owner: VexFlow maintainer (@0xfe) · M1 design review.** Parent gap [VF-013](../vexflow-gaps.md). The observable behavior below is the proposal. The file format and public API are open.

## Acceptance passage

Use two staves, treble and bass, in 4/4. Times below are fractions of a whole note measured from the start of the bar. Give both staves a whole note per measure, except for two half notes in the final upper voice.

| Bar ID | Upper voice | Lower voice | Context and marks                                                                                                                                                               |
| ------ | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| m1     | G4          | C3          | C major on both staves.                                                                                                                                                         |
| m2     | F♯4         | D3          | Change to G major. Start pedal p1 on the lower staff at 0.                                                                                                                      |
| m3     | A4, G4      | G2          | Rehearsal B at the measure start, displayed above the upper staff. Release p1 at 1/2. Attach _p_ to upper event u3b at 1/2 with an authored downward offset of one staff space. |

1. Save and reload the full score. Compare ordered IDs, voices, pitch spellings, rational onsets and durations, effective key and meter, mark ownership and both pedal endpoints. Preserve one logical rehearsal mark.
2. Save m3 alone and load it in a fresh process. It opens in G major and 4/4. Preserve the start-of-excerpt pedal state and the release at 1/2, or explicitly report the unresolved incoming span. M1 must select the supported behavior. Silent loss fails.
3. Render at widths that fit three bars on one row and force a break before m3. The second layout retains event IDs, staff ownership, the logical pedal and the authored one-space offset. Recompute automatic positions and fragments. Widening again restores the first layout.
4. Insert a bar before m3. The rehearsal mark, dynamic and pedal release follow m3. Try a dangling anchor and a live custom tickable without an encoder. Return a diagnostic identifying the offending object before producing an apparently complete portable file.

## What VF5 establishes

EasyScore resolves local IDs, accepts notation strings and live objects, inherits measure context, and supports explicit policies for spans across measures. Its native relationships also validate Factory ownership. These are constraints on a compatible VF5 adapter. The tests exercise composition and ownership. Saving this passage, slicing it and reconstructing it in a new process are M1 tests. [Composition](../../../src/easyscore/composition.ts) · [Executable contracts](../../../tests/node/easyscore-tests.mjs)

## M1 decision record

| Choice to test                                      | Evidence needed for a decision                                                                                                                                          |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Versioned serializable subset of EasyScore input    | Show what can be decoded without a live Factory. Identify how native extensions opt in and where decoding errors point.                                                 |
| Independent score representation with a VF5 adapter | Run the identical full-score and excerpt checks. Measure what the adapter must synthesize and whether stable IDs survive conversion in both directions.                 |
| Context and relationship ownership                  | Compare an initial context snapshot with referencing changes outside the excerpt. Specify how a partial pedal is represented and pasted into another score.             |
| Manual placement and compatibility                  | Specify sign, unit, origin and precedence of the authored offset. Preserve current VF5 native positioning and default cross-measure behavior in any VF5 implementation. |

At M1 review record the chosen option, rejected alternatives, evidence, affected callers, migration and date here. Link the implementing fixture or prototype from this record and the parent gap. Until then, either implementation can run against the same requirements.
