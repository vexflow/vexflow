# VF6 requirements · Publication layout

**2026-11-18 · Proposed from M5 on VF5.** These requirements build on the approved measure-based representation and M4's distinction between a source and its layout at one width. [M5 study and limits](../m5.md) · [Continuous score requirements](continuous-scores.md)

| ID | Requirement | Acceptance evidence |
| --- | --- | --- |
| PL-01 | Store physical paper dimensions, margins and staff sizes with explicit units. Separate page furniture from notation, with distinct first, running and final page policies. | Render the same 26 bars on A4 and Letter. Check the page boxes, first and last systems, and header and footer bounds. |
| PL-02 | Give each score or part view an identity and local layout overrides. Reference shared measure, staff, voice and event IDs. Keep declared musical state independent of selection and pagination. | Alter a cello break while the conductor score is visible. Its geometry and source remain intact. A note displayed across staves still belongs to its rhythmic voice. |
| PL-03 | Distinguish a forced page start, a system break, a preferred turn and a forbidden turn. Preserve the boundary's source identity. Consider the performing voices' rests and report infeasible requests. | In the cello fixture the cello rests under a cue at bar 16 and turns there. A forced turn conflicting with a prohibition reports the measure and page. |
| PL-04 | Define cue and ossia origin, destination, scale, written or sounding pitch, and duration. Keep their semantics separate from the performing voice. Preserve affected measures through rest compression. | A small flute cue over cello rests leaves the rests intact. An ossia over a sounding measure preserves the original notes and identifies its own source. |
| PL-05 | Derive page geometry once from the final music and text. Expose systems, margins, page ownership and overflow. Retain musical identities and text in accessible companions when glyphs become paths. | Screen SVG, exported SVG and PDF agree on physical page boxes and system positions. Open outlined pages without music fonts and retrieve the printed measure range, cue origin and part events. |

## Decisions still open

- Specify how view overrides survive inserted or deleted measures in the serialized VF6 document. VF5 accepts one-based source measure numbers and declared event IDs.
- Define turn time for partial rests, sustained notes, tempo changes, foldouts and duplex page pairs. The VF5 study uses complete written rest measures and explicit overrides.
- Define multi-measure cue and ossia ranges, alignment by rational onset, written-pitch transposition and the fate of spans that cross a part boundary.
- Select a semantic format for tagged PDF and assistive technology. The M5 print adapter preserves semantic metadata in SVG and produces outlined PDF artwork.

Update each row with its adopted format, tests, decision date and review link as VF6 design proceeds.
