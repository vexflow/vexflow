# VF6 requirements · web delivery

**2026-11-18 · Proposed from M7.** Keep each decision linked to a reproducible score, browser report or assistive-technology review. [M7 evidence and limits](../m7.md)

| ID | Requirement | Decision or open question |
| --- | --- | --- |
| WEB-01 | Stable authored event and span IDs survive construction, reflow, renderer changes and extraction. Source references are application data. | The VF5 snapshot returns logical events separately from current hit regions. A wrapped span has several regions. Decide head, grace, lyric and compressed-measure navigation granularity. |
| WEB-02 | Declare a reading order independent of DOM order. Exact onsets and occupied durations survive hidden timing placeholders and simultaneous voices. | M7 orders by measure, onset, staff and voice, and names percussion and TAB. Test alternative part-first reading with assistive-technology users. |
| WEB-03 | Hosts can use native controls, visible focus and an accessible Canvas companion. | Keep focus ownership in the host. Record real screen-reader and physical-device results separately from ARIA snapshots and emulation. |
| WEB-04 | Geometry names its coordinate space, logical source, fragment and visibility. Hits survive zoom and resize. | Validate axis-aligned scaling today. Document transform inversion, page-local coordinates and per-head targets before extending the contract. |
| WEB-05 | Font and input diagnostics identify the failing phase, source and recovery. Declare the supported text/export path. | Preserve original text. Match font bytes for outline comparisons. Qualify bidi and complex shaping with language reviewers and named fonts. |
| WEB-06 | Measure full, retained and incremental updates on named hardware. Gate layout optimizations on clean-result equivalence. | Fixed independent bars support local replacement. Cross-system spans, changed metrics and staff-wide state need explicit invalidation dependencies. |
| WEB-07 | Import qualification distinguishes source-model loss, projection, layout and rendering. | Preserve hidden performed time even when printed type differs. Extend to tuples, grouped parts and MEI only with an independent native control for each claim. |
| WEB-08 | CI compares candidate and reviewed builds in the same engine and retains inspectable artifacts. | Track the current main result separately from the historical release. Record platform-specific differences, approval and known exclusions before updating references. |
