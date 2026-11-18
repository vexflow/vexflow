# VF6 requirements · Continuous scores

**2026-11-18 · Proposed from M4 on VF5.** The M1 representation decision remains approved. These requirements describe what a portable score must preserve when the same music takes a different number of rows. [M1 decision](score-persistence.md) · [M4 evidence](../m4.md)

| ID | Requirement | Acceptance example |
| --- | --- | --- |
| CS-01 | Give measures, staves, voices, events, chord heads and logical spans durable identities. Store authored break and keep constraints against musical identities. Derive row indices, pixels and fragments for each output. | Change a choir score from one row to three and back. Every fragment resolves to the original syllable and notes. Serializing the source produces the same relationships at either width. |
| CS-02 | Resolve inherited clef, key, meter, instrument, accidental policy and repeat signs at each candidate break. Measure row-start material and explicit or courtesy changes using the active fonts. | Moving a tied arrival and a key change to the next row changes the derived signs together. A courtesy sign entered explicitly survives. |
| CS-03 | Keep legal breaks, staff visibility, minimum widths and overflow inspectable. Support automatic and hard boundaries. Give each layout result a mapping back to source measures, including compressed rests. | A compulsory keep group overflows as a unit. A three-bar rest expands back to three measures with the original IDs. A rehearsal mark or instrument change interrupts it. |
| CS-04 | Retain family, endpoints, side, optional head reference and authored controls for each span. Define which fragments carry text, hooks, opening width or continuing pitch. Separate tuplet duration from its bracket. | Round-trip the eleven M4 families. A wedge resumes at the previous aperture. A slur with the same endpoints can be refitted independently at each width. |
| CS-05 | Represent a note's rhythmic voice and display staff independently. Represent shared stems, beams, arpeggios and staff groups as relationships. Refit against the visible staff map and report unresolved joins. | Hide and restore a staff, change the staff gap, then verify the beam, shared stem and arpeggio still reach the intended heads. |
| CS-06 | Preserve instrument names and changes, navigation destinations, repeats, endings and rehearsal marks in the source. Allow display policies for row headers and numbering. | A D.S. still resolves to its named segno after reflow. An instrument which returns after silence uses the current name. |
| CS-07 | Expose fragment roles, measured bounds, overflow and conflict diagnostics to layout consumers. Bound iterative fitting and return the last finite placement with the affected source IDs. | A viewport too narrow for a required label yields an actionable result. Browser SVG and Canvas agree on source membership and fragment roles. |

## Design choices still open

- Decide whether an excerpt copies a navigation destination outside its range, preserves an external reference, or reports a missing target. Test an extracted part containing only the D.S.
- Establish how per-part and per-page overrides interact with global keeps, numbering, empty-staff policy and continuation labels. Exercise those choices in M5.
- Extend the shared-stem model to flagged chords and more than two participating staves. Evaluate independent barlines and meters in the M6 instrument profiles.
- Define portable curve-control coordinates, engraving tolerances and localized continuations. Compare the same authored override at two widths, in two fonts and in extracted parts.

Update each row with its decision, test and review date when the VF6 format adopts it. The VF5 prototype and tests provide examples for those decisions.
