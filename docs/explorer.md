# Explorer

The explorer is a static single-page application in `tools/explorer`. It uses browser APIs and the existing VexFlow build. The editor uses locally bundled CodeJar and Prism.js. Both are pinned development dependencies; the VexFlow library has no new runtime dependencies.

## Commands

```sh
npm run explorer                   # build and serve on port 5173
npm run explorer:build             # build/explorer/
npm run explorer:test              # browser checks and offline upload tests
npm run explorer:upload -- --dry-run
npm run explorer:upload            # gs://vexflow.com/explorer/
```

Use `npm run explorer -- --port=8080` for another local port. The server listens on localhost. Node 22 or newer and the repository's installed development dependencies are required. Tests use Puppeteer; set `PUPPETEER_EXECUTABLE_PATH` to use an installed Chrome.

## Explore

- Search notation names, descriptions, or class names. Cmd/Ctrl+K focuses search. Enter opens the first result.
- Each example has a consistent score frame, code editor, controls, and API notes.
- Code updates after a short pause. Turn off live updates to run manually with Cmd/Ctrl+Enter.
- Tab and Shift+Tab indent code. Escape then Tab moves focus out of the editor. Undo/redo stays within the current example.
- Drafts and control values stay in local storage on the current browser. Reset restores one example.
- Reset runtime reloads VexFlow and clears global changes. It keeps your code and controls.
- Copy produces a complete snippet, including parameter values. Use it in a module script or async function after loading VexFlow.
- Hash routes work on static hosting, such as `#example/tuplets` and `#glyphs/gClef`.
- SVG export includes font data and excludes debug overlays.

The catalog covers notes, rests, chords, noteheads, dots, beams, tuplets, grace notes, accidentals, articulations, ornaments, tremolo, fingerings, parentheses, staves, clefs, keys, meters, bars, connectors, tempo, rehearsal text, voltas, repeat instructions, inline changes, multi-rests, annotations, chord symbols, dynamics, ties, slurs, hairpins, pedal marks, octave lines, glissandi, vibrato, tablature, bends, slides, hammer-ons, string numbers, strokes, multiple voices, sheets, styling, ghost notes, repeat notes, glyph notes, subgroups, and rhythmic crescendos.

Helpers such as Fraction, Music, and Tuning are not standalone notation. The catalog focuses on visible notation; API links lead to full source documentation. It is representative coverage, not every possible engraving combination.

## Inspect

Hover over notation to inspect it. Click to pin the selection. Use the element picker when a small or invisible element is difficult to hit. Related-element buttons drill into notes, stems, modifiers, voices, and staves. Escape releases the pin.

The inspector separates two kinds of bounds:

| Bounds   | Meaning                                                    |
| -------- | ---------------------------------------------------------- |
| Rendered | The SVG group's geometry, transformed into SVG coordinates |
| Layout   | The bounding box returned by the VexFlow element           |

Some objects have no SVG group or have bounds only after drawing. The inspector shows whichever measurements are available. Coordinates are rendering units, normally pixels. Grid lines are ten units apart. Bounds and selection overlays do not change the score.

Layout checks compare note rectangles within each voice. They flag invalid bounds, viewport overflow, and possible overlaps. Rectangles include empty space; voices may intentionally overlap. Treat these checks as prompts to inspect, not proof of a collision or proof that a score is correct.

The glyph atlas reads VexFlow's glyph names. Font coverage comes from each installed font's cmap table at build time. “In this font” filters unsupported code points. Search checks names and Unicode values. Search spans all families, even when a family filter is selected.

## Add an example

1. Add an entry to the appropriate `tools/explorer/catalog/*.mjs` file.
2. Supply a stable ID, title, group, description, API class names, editable source, and controls.
3. Use `VF`, `width`, `height`, `ink`, and `params` in the source. Render into the `score` container.
4. Add a short tip when behavior needs explanation.
5. Run `npm run explorer:test` and inspect the example in both fonts and on a narrow screen.

The build formats all assembled examples with Prettier at 80 columns. The browser receives formatted code, without loading Prettier. CodeJar, the Prism JavaScript grammar, and their licenses are included in the hashed asset directory.

The shared `staff()` helper creates a soft voice before adding tickables. This lets duration controls explore incomplete or long measures. Use a strict voice when a complete meter is part of the example.

The test suite renders every default, every select value, and numeric endpoints. It also renders each example with Petaluma. A warm-runtime pass switches through the full catalog and asserts zero resource requests and unchanged library/font objects.

Tests cover run cleanup, queued edits, timeout recovery, runtime reset, editing, error recovery, saved drafts, search, hover/pin inspection, overlays, dark paper, glyph lookup, SVG download, mobile layout, and upload failures. Screenshots stay in the system temporary directory.

## Runtime boundaries

Edited code runs in a persistent iframe with `sandbox="allow-scripts"`. VexFlow and its embedded fonts load once per runtime. Edits, controls, and example switches reuse them without new asset requests.

Each run gets a new score container and registry. Previous inspection state, tracked timers, animation callbacks, and `addEventListener` subscriptions are cleared. Async runs execute in order; queued edits collapse to the latest version. Stale results are ignored. If a run stalls for ten seconds, the frame is discarded before retrying any queued edit.

The status shows total time from Run to the received result, including startup and queueing, plus time inside the renderer. The live-edit debounce is excluded.

Cleanup does not undo arbitrary global mutations, property event handlers, observers, or detached promises. Use Reset runtime after experiments that change shared library objects or browser globals. This creates a new frame without changing your code.

The frame has an opaque origin. It cannot access the explorer's DOM, local storage, or other pages on `vexflow.com`. Its content policy blocks network connections. The parent accepts messages only from the current frame and run token. The preview runtime is inserted inline into that frame, so delayed user-code errors retain their messages without requiring bucket CORS changes.

The sandbox is an origin boundary, not a CPU or memory limit. An infinite synchronous loop can still stall a browser tab. The watchdog handles asynchronous runs that never settle. Use local examples you trust; this tool is not a hosted service for running arbitrary third-party programs.

No server evaluates code. No analytics or external runtime resources are required. Script and font assets are local to the build.

## Static deployment

```sh
npm run explorer:upload -- --destination=gs://another-bucket/explorer/
```

A destination must include a nonempty prefix. The uploader does not publish to a bucket root or delete existing objects.

The build fingerprints the entire module graph into one asset directory. The uploader freezes and validates the build, uploads immutable assets first, then publishes `index.html` with a 60-second cache lifetime. It reads the HTML back from the bucket and checks its hash. Old assets remain available to cached pages.

The default bucket path is `gs://vexflow.com/explorer/`; its public address is `https://vexflow.com/explorer/`. As with the other sites in this bucket, the host must map directory URLs to `index.html`. Both the local root and `/explorer/` mount are supported. There are no SPA path rewrites because navigation uses hash routes.

The script follows the asset-before-HTML pattern in [Lilbox's uploader](https://github.com/0xfe/lilbox/blob/main/scripts/upload.sh). Offline tests use a fake `gcloud` to check ordering, cache flags, readback, and failure containment. Running those tests does not deploy the site.

## Design references

- [Tao Te Ching](https://mo.town/tao/index.html): warm paper, dark ink, fine flowing lines, and restrained red accents.
- [Observable Plot](https://observablehq.com/plot/): example-led exploration and searchable concepts.
- [p5.js Web Editor](https://editor.p5js.org/): code beside immediate visual feedback and explicit run controls.
- [SVG Path Editor](https://yqnn.github.io/svg-path-editor/): selecting geometry to expose coordinates and editable properties.
