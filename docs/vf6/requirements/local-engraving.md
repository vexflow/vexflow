# VF6 requirements from local engraving

**2026-11-18 · Proposed from the M2 implementation on VF5.** Update each row when a score-model or layout decision settles it. The VF5 tests serve as migration fixtures. [M2 evidence](../m2.md)

| Requirement | Constraint or choice demonstrated by M2 | Open decision or next milestone |
| --- | --- | --- |
| Preserve pitch spelling and attachment identity | Several heads at one pitch line can have distinct spellings, signs and dot counts. Index the written head separately from its visual column. | The VF6 score representation must preserve head identity across chord edits and voice reordering. |
| Separate rhythmic time and displayed ratio | Nested tuplet multipliers compose exactly. A label such as 6:4 can accompany a played 3:2 ratio. | Persist both values when an author supplies the label. M4 owns continuation across a break. |
| Give grace groups explicit hosts and sides | The host supplies the stave and rhythmic onset. Ordered accidental state aligns before-groups at their end and after-groups at their beginning. Explicit cautionaries survive either convention. | Decide which genre profiles opt into this convention. M4 must define how ties and courtesy signs interact with it. |
| Make infeasible widths actionable | Hard reservations include inline prefixes and measured marks. Optical and exact spacing can require different widths for identical input. The client needs the minimum in renderer units before choosing a system break. | M4 should consume the selected policy’s minimum. Keep exact time anchors available for users synchronizing a score with playback. |
| Retain layout intent across resize | Beam contour, explicit beamlet side and flat-beam settings are independent. A delayed ornament must resolve its horizontal position from the current neighboring attack. | Review additional styles before selecting VF6 defaults. M3 should consume current ink bounds for attachments and spans. |
| Preserve font context and scale | A cue head, grace slash and full-size ledger chord must report positions that agree with the renderer. Missing anchor metadata needs a deterministic fallback. | Extend this matrix as additional fonts and supported element types enter the VF6 release corpus. |
