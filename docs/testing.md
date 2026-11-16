# Rendering tests

See [Build, test, release, and upload](build.md#test-locally) for local setup and test commands. The [static upload instructions](build.md#upload-static-sites) cover publishing the bundled gallery to `vexflow.com/tests/`.

The gallery includes QUnit, VexFlow, source maps, and local fonts. It runs without a repository checkout or runtime CDN requests.

## Visual comparison

```sh
npm run generate:reference
npm run generate:current
npm run diff:reference
open build/images/diff/index.html
```

The report shows before, after, and changed pixels. It includes changed-pixel counts, ratios, and maximum channel differences. JSON results are in `build/images/diff/results.json`.

Comparison uses decoded RGBA pixels, not PNG file bytes. Missing images, corrupt files, changed dimensions, empty suites, and changed pixels fail the command. Build and image-generation failures also propagate to the calling task.

Use the same OS, browser, device scale, and fonts for both runs. Antialiasing can differ across platforms. A pixel difference calls for review; it does not prove that the new engraving is worse.

To compare one group:

```sh
./tools/visual_regression.sh reference StaveNote
```

## Geometry and color checks

`tools/render-metrics.mjs` provides `analyzeLayout()` for curated fixtures. It reports:

- Non-finite or negative bounds.
- Bounds outside the viewport, with overflow distance.
- Intersections within a chosen comparison group, with overlap area.

Give each voice its own group. Use a separate group for measure or row envelopes. Leave intentionally overlapping objects ungrouped. The default tolerance is half a pixel.

Bounding boxes contain empty glyph space. These checks are useful heuristics, not a complete collision detector. Pair them with representative images and explicit spacing assertions for lyrics, accidentals, and other sensitive marks.

`tools/sheet-fixture.mjs` supplies a shared grand-staff study. Browser tests cover Bravura and Petaluma on Canvas and SVG. They check wide/narrow/wide reflow, measure and note overlap, overflow reporting, foreground colors, and preserved highlights.

Negative-control tests deliberately move boxes, clip them, corrupt images, and alter pixels. These verify that diagnostics can detect defects. Add similar controls when introducing a new metric.

Keep generated images and reports under `build/` or a temporary directory. Attach issue evidence to GitHub. Commit reusable fixtures and regression checks, not issue-specific screenshots.
