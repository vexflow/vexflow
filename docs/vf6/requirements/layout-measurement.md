# VF6 requirement 002 · Measure a formatted passage before drawing

**Revision 1 · 2026-11-18 · Exercised on VF5 in M1 · Decision owner is @0xfe.** Parent gaps are VF-002, VF-037, VF-038 and VF-046. [VF5 evidence and participation audit](../m1.md)

## Observable behavior

1. Format a voice with a displaced chord, flagged note, multi-level beam, stacked articulation, slashed grace group and slur. Before emitting any draw commands, return the occupied regions, their union, the reserved layout bounds and the attachment points in a documented coordinate frame. Include visible children and stroked edges. A head center, the end of the rendered stem and the beam attachment are distinct points.
2. Place the same voice across two staves. An attachment uses its displayed staff position while the event retains its original voice. Move a lyric row below the occupied area. Measuring and placing that row again must reproduce the same baseline.
3. Fit a beam over a second voice whose attack lies between the beamed notes. Moving the intervening head into the beam must affect its clearance. A distant head supplies a passing control. Preserve the positions and times of both attacks. If a broader solver cannot meet all constraints, it must identify the affected owners.
4. Measure, draw, narrow, then widen. The final geometry must agree with a fresh layout at the original width. Recompute derived stem extensions and placement from the current inputs. Preserve authored settings.
5. Interleave two scores that use different music fonts and beam policies. A score may supply optional font metadata. Validate its family, units and coordinates before use. Missing or invalid fields must yield deterministic, finite fallback geometry. An element override takes precedence over the score policy, then font defaults, then library defaults.
6. A custom drawable may supply regions and anchors or declare itself empty. If it supplies neither, return a diagnostic with its source ID, phase, severity and stable code. A partially measured parent must remain distinguishable from a completely measured parent.

## Design decisions and open work

| Date | Decision or open question | Evidence required to revisit |
| --- | --- | --- |
| 2026-11-18 | The VF5 prototype uses renderer pixels for positioned geometry, staff spaces for engraving policy and upward-positive font coordinates converted at the glyph. Keep the coordinate frame explicit in VF6. | A second scale or backend must produce equivalent musical relationships. |
| 2026-11-18 | Consumers need individual occupied regions as well as an envelope. A single bounding box reserves empty space between a chord, a slash and a mark. | Compare tighter representations on curves and nested modifiers during M2/M3. |
| 2026-11-18 | The beam, lyric-row and cross-staff probes justify proceeding with the measured regions and anchors. An editor-wide geometry class hierarchy remains an open design choice. | Extend adapters when a concrete engraving consumer and a rendered-ink fixture exercise them. |
| 2026-11-18 | Font loading, optical fallback for every glyph, cache invalidation and a general collision solver have separate acceptance work. | Add unknown and unavailable font cases, a third contrasting font and conflicting multi-object constraints to the relevant gap. |

[Executable acceptance tests](../../../tests/node/engraving-layout-tests.mjs)
