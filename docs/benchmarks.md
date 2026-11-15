# Score benchmarks

The repository keeps three small, original score studies. They exercise realistic combinations of notation without copying large generated scores into the source tree.

| Study | Workload at four systems |
| --- | --- |
| Chorale | 32 staves, 192 notes; multiple voices, lyrics, and ties |
| Piano | 32 staves, 256 note objects; chords and beamed eighth notes |
| Chamber | 48 staves, 576 notes; triplets, beams, and ornaments |

The fixtures live in `tools/score-fixtures.mjs`. Their smoke checks run in `grunt test`.

## Run

```sh
npx grunt webpack:debug
node tools/benchmark-scores.mjs --runs=5 --systems=4 --output=build/benchmarks
```

The runner loads fonts, warms up each score, and then records construction, layout, and drawing separately. It saves every timing sample, medians, SVGs, and full-page PNGs. Screenshot capture is outside the measured rendering interval.

`results.json` records the commit, browser, Node version, platform, score sizes, bundle path and SHA-256, and whether the working tree has changes. Compare the same score counts, browser, fonts, and build mode on the same machine. Debug and release builds have different costs.

## Compare a change

Keep the old bundle before rebuilding, then run both bundles with identical settings:

```sh
cp build/cjs/vexflow-debug.js /tmp/vexflow-before.js
# Apply the change and rebuild.
node tools/benchmark-scores.mjs --bundle=/tmp/vexflow-before.js --output=build/benchmark-before
node tools/benchmark-scores.mjs --output=build/benchmark-after
```

Compare the median timings and inspect the PNGs side by side. SVG files use fonts from the rendering page; open them with those fonts or use the PNGs for visual review.

Do not enforce a fixed millisecond threshold in shared CI. Timing depends on the host. The CI smoke check verifies that each workload renders and keeps its expected structure. Use repeated local measurements to assess #334–#336.

## Larger scores

[VexRender](https://github.com/AaronDavidNewman/VexRender) remains useful for larger, application-generated scores and historical version comparisons. The compact local studies complement that corpus. They do not replace it or claim complete engraving coverage.

## Initial measurements

November 15, 2026. macOS arm64, Node v24.22.3, Chrome/157.0.8103.50. Debug build, four systems, five measured runs after warmup. Values below are medians in milliseconds. They are a local baseline, not a performance guarantee.

| Study | Construction | Layout | Draw | Total |
| --- | ---: | ---: | ---: | ---: |
| Chorale | 7.9 | 1.3 | 10.1 | 19.6 |
| Piano | 13.5 | 1.0 | 16.1 | 31.2 |
| Chamber | 24.6 | 2.1 | 31.5 | 58.5 |
