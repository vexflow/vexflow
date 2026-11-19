# VF6 requirements · Specialist notation

**2026-11-18 · Proposed from the M8.0 reference scores.** Use these cases to decide how much musical information the score must retain across views. The M8.1 guitar screenshots were approved at closeout. Use the later specialist charters for additional performer evidence. [Reference scores and reading targets](../m8-reference-scores.md)

| Question | Evidence from M8.0 | Next increment |
| --- | --- | --- |
| What can a guitar gesture target? | The golpe shares an attack, the mute covers one string across a break, and only one member of a bent chord changes pitch. The bossa example uses ordinary polyphony and ties. Preserve those distinctions when defining gesture identity, offset and string scope. | M8.1 · [Existing instrument requirements](instrument-notation.md) |
| How much timing information did the author specify? | The two fanned groups have known entry and exit times. Their inner attacks have an order and a direction of change. The source can preserve that intent without assigning exact performed offsets. | M8.2, then M8.4 |
| Who owns bar numbers and re-entry cues? | The players reach the same cue after different counts of local bars. Both parts retain the original pitches and durations while choosing different breaks from the conductor score. The next prototype needs authored player and event IDs through reflow and extraction. | M8.3 · [Continuous-score requirements](continuous-scores.md) |

## Guitar evidence from M8.1 · 2026-11-18

| VF6 requirement | What the VF5 implementation establishes | Remaining decision |
| --- | --- | --- |
| Preserve physical action separately from its printed convention. | A measured stroke has an event ID, exact onset, finger and direction. An arrow change preserves the reading order. A simultaneous golpe consumes no additional time. A rolled chord leaves internal offsets open. | Decide whether a simultaneous action needs its own selectable ID within the parent attack. |
| Identify individual strings across views. | A muted strike has duration and a written placement. A palm mute covers an inclusive range of attacks and only the named strings. Its fragments preserve that scope after reflow and in the exported part. | Define stable string and head identities when a player changes tuning or an editor reorders a chord. |
| Preserve performed pitch changes relative to written time. | A bend targets one physical string and retains its semitone change and rational phase endpoints. The neighboring string stays at its written pitch. | Define pitch envelopes spanning several tied attacks, prebends already in progress, and playback interpolation. |

The screenshot approval and remaining idiom-specific playing questions are recorded in the [guitar review record](../m8-guitar.md#evidence-and-review-record).
