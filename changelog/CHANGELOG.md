# 5.6.1

- TAB clefs now fit between the outer strings and center on the actual tablature stave. Four-string instruments use the four-string clef glyph. Numeric, common, and cut time signatures also center on the strings.
- The [user guide](https://vexflow.com/guide/), [Explorer](https://vexflow.com/explorer/), and [test gallery](https://vexflow.com/tests/) share the VexTab guide’s typography and colors. Their deployments reuse unchanged assets so browsers can keep them cached between releases.
- Browse the [PDF score library](https://vexflow.com/pdfs/), see the tablature changes in the [illustrated AI 2026 report](https://vexflow.com/reports/ai2026/), or inspect the [5.6.1 code quality report](https://vexflow.com/reports/5.6.1/).

# 5.6.0

- Chord roots use 14 pt Academico, lyrics use 12 pt, and tab frets use 11 pt. Grace frets, stroke arrows, and technique labels have room around two-digit frets. See both arrow conventions in [Patio al alba](https://github.com/vexflow/vexflow/blob/5.6.0/tests/scores/falseta.js).
- EasyScore can tie a fret on a specific string across a system break and carry repeat endings into an extracted guitar part. Structured notes and rhythmic tab now engrave their written augmentation dots.
- Lead sheets preserve authored barlines and time-signature visibility in print. Rest ledger lines follow explicit rest positions, and rhythm slashes use Bravura’s stem anchors.
- Explore the [user guide](https://vexflow.com/guide/), [notation Explorer](https://vexflow.com/explorer/), [test gallery](https://vexflow.com/tests/), and [PDF score library](https://vexflow.com/pdfs/).
- See the [illustrated AI 2026 report](https://vexflow.com/reports/ai2026/) and the [5.6.0 code quality report](https://vexflow.com/reports/5.6.0/).

# 5.5.0

- Preserve EasyScore note decorations in printed scores, parts, and cues with `PublicationOptions.noteHooks`. Invisible pointer targets no longer affect page breaks.
- Set the size of lyrics and other text on continuous spans with `labelFontSize`. The layout measures the label before choosing system breaks.
- Explore interactive guitar, jazz, percussion, and microtonal arrangements in the [test gallery](https://vexflow.com/tests/). The opening score features the first 24 bars of Chopin’s Ballade No. 3.
- Generate print editions of Petzold’s Minuet, Bach’s Fugue, and Chopin’s Ballade with `npm run pdf`. The generated PDF index links each score to its source.
- Read the [5.5.0 code quality report](https://vexflow.com/reports/5.5.0/).

# 5.4.0

- Lay out lyrics, curves, and markings across a system. Break continuous scores into systems, then paginate full scores and individual parts for print.
- Add instrument profiles and playable reference scores. The guitar studies show how to lay out bends, slides, and other gestures in tablature.
- Expose a renderer-independent score reader for accessible navigation. Qualify web rendering in Chromium, Firefox, and WebKit.
- Learn VexFlow through progressive, editable examples in the [user guide](https://vexflow.com/guide/). Experiment in the [Explorer](https://vexflow.com/explorer/) or browse the [visual tests and example scores](https://vexflow.com/tests/).
- Read the [illustrated history of changes since VexFlow 5.0](https://vexflow.com/reports/ai2026) and the [5.4.0 code quality report](https://vexflow.com/reports/5.4.0/).

# 5.3.0

## Engraving

- Add score-local engraving profiles for SMuFL stem anchors, beam thickness, and clearance.
- Expose positioned glyph and beam bounds through `measureEngraving()`.
- Add opt-in optical spacing and contour-aware beam slopes. Improve beam clearance in multi-voice passages.
- Separate overlapping voices and altered unison noteheads, keeping accidentals, dots, and ledger lines with their notes.
- Improve grace-note spacing and slur endpoints. EasyScore can track accidentals in the order of before-graces, host notes, and after-graces.
- Let tuplets display a ratio independently of playback timing. Improve bracket clearance around ornaments and articulations.
- Correct slur opening directions and separate simultaneous guitar bends on different strings.

## Visual test gallery

- Open the gallery on a module index with nine example scores. Each score links to its live rendering and source.
- Load previews as readers move through the carousel. Run individual test modules from the index or the full suite at `tests/all.html`.

# 5.2.0

## EasyScore

- Add the first typed composition slice: `EasyScore.create()`, annotation/tie constructors, attachment, systems, styling, and drawing.
- Add pure notation parsing with source diagnostics and rollback for failed strict construction and measure requests.
- Apply native note options and voice modes, meter objects, resolution, and softmax settings.
- Support validated articulation aliases, codes, and glyphs. Unknown names no longer silently become staccato.
- Preserve legacy non-throwing parsing, custom builders, and commit hooks.
- Add a user guide, Explorer examples, feature coverage checklist, and native-rendering parity tests.
- Add score-local ID lookup and source provenance, with duplicate checks, rename tracking, and reset/rollback cleanup.
- Adopt native notes, modifiers, and standalone drawables with explicit roles and ownership checks.
- Select parsed notation from Explorer clicks without guessing ambiguous or stale editor locations.

- Add typed note sequences, percussion heads, native modifier helpers, and single-owner grace/subnote groups.
- Add pure extension validation, Sheet access, and synchronous construction batches.
- Preserve native dot and parenthesis fonts without requiring a browser document in Node.
- Add rhythm and relationship helpers, tablature and staff constructors, and structured composition with explicit responsive layout policies.
- Preserve clef state across composed key changes and resolve automatic stems for complete beam groups.

## Notation

- Add strict proportional spacing for shared rhythmic timelines.

## Interactive guide

- Add Quickstart, EasyScore, native API lessons, and an editable playground with bundled assets.
- Reuse the loaded VexFlow runtime and fonts across lesson and playground navigation.
- Add browser coverage for navigation, editing, exports, mobile layouts, and asset reuse.

## Development

- Add EasyScore consumer-package and declaration checks.
- Consolidate build, testing, release, and upload instructions.

# 5.1.2

## Notation

- Add opt-in chord-symbol kerning for Academico/Bravura and Petaluma Script/Petaluma.
- Support custom kerning profiles with shared Canvas/SVG positioning and stable script bounds.
- Add an Explorer comparison for chord kerning.

## Testing and deployment

- Add `npm run tests:upload` to publish the complete visual test gallery to `vexflow.com/tests/`.
- Bundle QUnit, the test library, source maps, and fonts with no runtime CDN dependency.
- Share the Explorer's verified upload path, immutable assets, and short HTML cache.
- Test the standalone gallery, filtering, and deployment behavior in CI.

## Security and tooling

- Update development dependencies and remove vulnerable transitive packages.
- Use argument arrays for release commands and reject invalid version inputs.
- Render uploaded font metadata as text instead of HTML.
- Update CI actions and pin Node 26.13.1. Use read-only permissions and audit dependencies in CI.

# 5.1.1

## Fixes and performance

- Cache repeated text measurements with bounded storage and clear cached metrics when fonts change.
- Keep copied metrics and styles independent without deep-cloning unrelated state.
- Document UTF-8 encoding in the HTML setup example.

## Explorer

- Use a compact layout with an 80% preview and the inspector beside the score.
- Add locally bundled CodeJar editing and Prism syntax highlighting.
- Format all examples consistently and add explanatory comments.
- Fix the keyboard shortcut regression test and isolate browser state between tests.

# 5.1.0

## Features

- Add `Sheet` and `EasyScore.measures()` for multi-measure scores that wrap to a chosen width.
- Add retained Factory drawing and inherited score styles for reflow and theme changes.
- Add portable SVG export with text and music glyphs converted to paths.
- Add separate text-font selection and explicit lyric baselines.
- Add optional repeat brackets, more key signatures, and tuplet label suffixes.
- Support longa, maxima, and 256th, 512th, and 1024th note durations.
- Add the [VexFlow Explorer](https://vexflow.com/explorer/) with editable examples, a glyph atlas, and visual inspection tools.

## Fixes

- Fix native ESM imports and package entry points.
- Correct accidental ordering across voices and rest collisions.
- Improve grace-note spacing, pedal placement, and ties near lyrics.
- Fix nested tuplet timing and refresh voice totals when durations change.
- Improve bounding boxes and keep repeated drawing stable.
- Correct stem placement on cross noteheads.
- Reject malformed durations, meters, and fractions. Protect Registry indexes from prototype-related keys.
- Update dependencies, including critical security fixes in development tooling.

## Upgrade notes

- `setTuplet()` now replaces existing tuplets. Use `addTuplet()` to stack them.
- `getTupletStack()` returns a readonly array in TypeScript. Use the tuplet methods to change it.
- `resetTuplet()` is deprecated. Use `removeTuplet()` or `clearTuplets()`.
- Text now prefers a text font. Call `setTextFonts()` after `setFonts()` to choose a custom face.
- Invalid inputs may now throw instead of being accepted. Layout fixes can change existing renderings.

## Development

- Add geometry, overlap, color, and image-difference regression checks.
- Add rendering benchmarks and update the Node/jsdom test setup.
- Keep explorer output and generated reports out of the npm package.

# 5.0.0

- `vex.ts` and `flow.ts` modules are merged into vexflow.ts, which exports the `VexFlow` class.

# 4.0.1

Detailed changes are listed on the wiki: https://github.com/0xfe/vexflow/wiki/Changelog-ver-4.0

## Features

- VexFlow is written in **TypeScript** with a ES6 target.
- Supports ES module in addition to CommonJS environments.
- Improved automatic layout of notes.
- Improved handling of music fonts and text fonts.
- Supports lazy loading of music fonts.
- Improved `setFont(...)` method in Element class.

## Breaking

- The tsconfig.json `compilerOptions.target` has been updated to ES6 / ES2015.
- `Stave.setNumLines(n: number)` requires a number. Previously, a string would also work. See: [stave.ts](https://github.com/0xfe/vexflow/blob/master/src/stave.ts) and [#1083](https://github.com/0xfe/vexflow/issues/1083).
- `Note.addModifier(modifier: Modifier, index?: number): this` now throws a RuntimeError if the parameters are reversed.
- `TickContext.getTickableForVoice(voiceIndex: number): Tickable` was previously named `getTickablesForVoice(voiceIndex: number): Note`. We removed the `s` because the method returns a single Tickable. You will need to update calls to this function if you are upgrading from a build from between April 2020 to August 2021.
- `Element` and its subclasses have a static `CATEGORY` string property, used by VexFlow internally to differentiate objects. This string has been standardized to be singular, with UpperCamelCase capitalization.
  - Examples:
    - `Accidental.CATEGORY` is now `'Accidental'` instead of `'accidentals'`.
    - `Modifier.CATEGORY` is now `'Modifier'` instead of `'none'`.
- **ChordSymbol**
  - `ChordSymbol.NO_TEXT_FORMAT` was previously named `ChordSymbol.NOTEXTFORMAT`.
  - `ChordSymbol.metrics` was previously named `ChordSymbol.chordSymbolMetrics`.
- `StaveNote.LEDGER_LINE_OFFSET` was previously named `StaveNote.DEFAULT_LEDGER_LINE_OFFSET`.
- **Fonts**

  - `TextFontMetrics` has been merged into `FontGlyph` due to substantial overlap.
  - `Flow.NOTATION_FONT_SCALE` was previously named `Flow.DEFAULT_NOTATION_FONT_SCALE`.
  - `setFont(...)` in `CanvasContext` and `SVGContext` previously took arguments: `family`, `size`, `weight`. The `weight` argument allowed strings like `'italic bold'`. This no longer works, and `'italic'` must now be passed into the `style` argument.

- **Build Process**
  - Gruntfile environment variable `VEX_DEVTOOL` was previously named `VEX_GENMAP`. This environment variable sets the [webpack devtool configuration option](https://webpack.js.org/configuration/devtool/).

# 3.0.9 / 2020-04-21

- Support [Bravura](https://github.com/steinbergmedia/bravura), the reference font for [Standard Music Font Layout](https://w3c.github.io/smufl/latest/index.html).

# 1.2.84 / 2017-08-01

- `Accidental.ApplyAccidentals()` no longer breaks on `Notes` that ignore ticks (ie: `TimeSigNote`)
- `Accidental.applyAccidentals()` now applies accidentals to `GraceNotes`
- Fix a `BoundingBox#mergeWith` case when one box contains another
- Fix blurry canvas rendering on retina screens
- Rebuild noteheads after `StaveNote#setKeyLine` is called
- Ensure `StaveNote.extraLeftPx` and `StaveNote.extraRightPx` get recalculated in `StaveNote#reset`
- `Factory` exposes a lot more elements -- **API is subject to change**
- `Factory` constructor `options.renderer.selector` renamed to `options.renderer.elementId` to more appropriately reflect the what the string represents
- Sori and koron microtonal accidentals have been added
- Tests have been refactored to use `Factory` and `EasyScore`
- The font transformation tool (`transform.html`) has been refactored, and generates a font by combining both the `Gonville` and `Microtonal` fonts.
