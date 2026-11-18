# VF6 requirement 001 · Save a score or an excerpt

**Revision 3 · 2026-11-18 · VF6 representation approved by @0xfe.** Parent gap [VF-013](../vexflow-gaps.md). The passage below is executable. The wire formats are study artifacts.

## Acceptance passage

Use two staves, treble and bass, in 4/4. Times below are fractions of a whole note measured from the start of the bar. Give both staves a whole note per measure, except for two half notes in the final upper voice.

| Bar ID | Upper voice | Lower voice | Context and marks                                                                                                                                                               |
| ------ | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| m1     | G4          | C3          | C major on both staves.                                                                                                                                                         |
| m2     | F♯4         | D3          | Change to G major. Start pedal p1 on the lower staff at 0.                                                                                                                      |
| m3     | A4, G4      | G2          | Rehearsal B at the measure start, displayed above the upper staff. Release p1 at 1/2. Attach _p_ to upper event u3b at 1/2 with an authored downward offset of one staff space. |

1. Save and reload the full score. Compare ordered IDs, voices, pitch spellings, rational onsets and durations, effective key and meter, mark ownership and both pedal endpoints. Preserve one logical rehearsal mark.
2. Save m3 alone and load it in a fresh process. It opens in G major and 4/4. Carry the incoming pedal as a continuation and preserve its release at 1/2.
3. Render at widths that fit three bars on one row and force a break before m3. The second layout retains event IDs, staff ownership, the logical pedal and the authored one-space offset. Recompute automatic positions and fragments. Widening again restores the first layout.
4. Insert a bar before m3. The rehearsal mark, dynamic and pedal release follow m3. Try a dangling anchor and a live custom tickable without an encoder. Return a diagnostic identifying the offending object before producing an apparently complete portable file.

## What VF5 establishes

EasyScore resolves local IDs, accepts notation strings and live objects, inherits measure context, and supports explicit policies for spans across measures. Its native relationships also validate Factory ownership. These are constraints on a compatible VF5 adapter. The tests exercise composition and ownership. Saving this passage, slicing it and reconstructing it in a new process are M1 tests. [Composition](../../../src/easyscore/composition.ts) · [Executable contracts](../../../tests/node/easyscore-tests.mjs)

## M1 decision record

**2026-11-18 · Representation approved by @0xfe.** Use a versioned, measure-based representation for portable VF6 scores and excerpts. Use an adapter to construct VF5 notation through EasyScore. Keep live Factory-owned objects as supported VF5 inputs. Portability is an explicit operation. [Codecs](../../../tests/engraving/score-persistence.mjs) · [Native rendering adapter](../../../tests/engraving/score-layout.mjs) · [Tests](../../../tests/node/engraving-layout-tests.mjs)

| Question | Finding on the acceptance passage | Decision |
| --- | --- | --- |
| What must travel with the notes? | The EasyScore subset recreates native notes with stable IDs and derives onsets from durations. It also needs a sidecar for ordered measure IDs, voice IDs, rehearsal ownership, the dynamic offset and pedal endpoints. The measure-based file stores shared measures once and gives each event an explicit rational onset. | Use EasyScore composition as the compatible VF5 construction path. Prefer the measure-based file for VF6 edits and excerpts. Both candidates passed the identical tests. |
| What happens at the left edge of an excerpt? | Bar 3 opens by itself in G major and 4/4. The pedal starts the excerpt already depressed and releases halfway through the bar. Rendering draws a continuation with an open left edge. | Materialize effective staff context at the boundary. Clip the logical span to the excerpt with an explicit continuation flag. A pasted excerpt carries its own incoming state. Reconnecting it to a destination pedal requires an explicit editing decision. |
| Who owns marks? | One rehearsal mark belongs to m3 and is displayed on the upper staff. The pedal belongs to the lower staff. Its release uses the aligned half-bar attack even though the lower voice holds a whole note. The dynamic belongs to event u3b. All follow an insertion before m3. | Keep measure, staff, event and span IDs separate from physical staves and row fragments. Store the dynamic offset in staff spaces, positive downward from its automatically placed baseline. Recompute the baseline and then apply the offset once. |
| What is saved across reflow? | Both encodings produced the same logical passage, two pedal fragments when wrapped, one when widened, and identical Canvas pixels on returning to the original width. The browser SVG contains one B and one dynamic at both widths. | Serialize authored music and overrides. Derive automatic positions, row breaks and fragment geometry at load or reflow. |
| How do extensions migrate? | Encoding a live subclass or a dangling anchor fails with the offending source ID before a file is emitted. Native ownership checks continue to run when constructing a composition. | VF5 callers can keep native objects. A future portable extension must supply a versioned codec and stable references. Importers can project supported EasyScore data and provide missing measure and voice identity. |

**Study limits.** Version 1 supports one pitched voice per staff, aligned 4/4 measures, boundary key changes, and canonical rational times on the sixteenth-note grid. It handles the three authored mark types in this passage. The VF5 adapter resolves a timed pedal from an aligned attack or bar boundary. Arbitrary unvoiced times, tuplets, grace ordering, transposition, opaque extension payloads and editorial paste reconciliation need additional fixtures. This study adds no public VF5 save/load API.

**Review history.** M0 drafted the passage on 2026-11-18. M1 implemented and compared both encodings on the same date. @0xfe approved the versioned, measure-based direction for VF6 and the EasyScore adapter for VF5 on 2026-11-18.
