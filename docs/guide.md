# Interactive user guide

The guide lives in [`guide/`](../guide/) and publishes to <https://vexflow.com/guide/>.
It includes Quickstart, EasyScore, native API lessons, and an interactive playground.

## Develop

```sh
npm ci
npm run guide
```

Open <http://127.0.0.1:5174/guide/>. Use `npm run guide -- --port=8080` for another port.
Restart the command after changing source files; the preview serves a frozen build.

```sh
npm run guide:build
npm run guide:test
```

Build output is `build/guide/`. Tests build first and run headless Chrome using Puppeteer.
Set `PUPPETEER_EXECUTABLE_PATH` to an installed Chrome if needed, as described in [build setup](build.md#local-setup).

`GUIDE_SCREENSHOTS=1 npm run guide:test` also saves desktop/mobile screenshots and exported examples
in a temporary directory printed at the end. Screenshots have an opaque page background and white score surfaces.
Do not commit generated screenshots. Attach relevant ones to the issue with `gh issue comment --attach`.

## Edit lessons and examples

| File                 | Purpose                                                          |
| -------------------- | ---------------------------------------------------------------- |
| `guide/content.mjs`  | Sections, lesson prose, exercises, related lessons, source links |
| `guide/examples.mjs` | Complete teaching snippets                                       |
| `guide/app.mjs`      | Navigation, controls, editor, drafts, export                     |
| `guide/style.css`    | Responsive layout and typography                                 |
| `guide/index.html`   | Accessible page shell                                            |
| `guide/cli.mjs`      | Build, preview server, upload command                            |
| `guide/test.mjs`     | Browser and upload regressions                                   |

Lesson IDs are stable fragment links such as `#lesson/notation`. Pass example IDs to a lesson in teaching order.
The lesson opens its first example, and each step has a direct link such as `#lesson/notation/two-pitches`.
Playground links use `#playground/notes`.
Keep IDs unchanged when revising titles. These routes need no server-side rewrite rules.

Start with something the reader can find in the score. Introduce one idea per step, then give an edit and a visible result to check.
Comment the musical or layout decision in each runnable example. For worked code in lesson text, use
`sample(language, source)` with `markup`, `bash`, `typescript`, or `javascript` so the literal source is escaped and highlighted.
Lesson bodies are trusted, repository-authored HTML. Do not insert user input into this HTML.
Use `repo:docs/example.md` source links for files in the same revision as the bundled library.
The header displays the version and links to the commit recorded inside the bundled library. Uncommitted library changes are included in builds,
but the commit link cannot describe those edits; commit before publishing.

Each teaching example uses the same metadata: `id`, `title`, `group`, `description`,
`code`, `api`, `controls`, and `tips`. Snippets receive `VF`, `width`, `height`, `ink`, and `params`.
They render SVG into `div#score`. The runtime loads fonts before drawing.
Keep beginner examples in strict voice mode. Explain any deliberate soft-mode example.

Add general notation examples to [the playground catalog](../guide/catalog/). Keep tutorial-specific examples in `guide/examples.mjs`.

## Shared components and EasyScore updates

The guide builds VexFlow from source and bundles its CodeJar/Prism editor, sandbox, and font data for offline use.
It does not use an npm VexFlow release or a runtime CDN. No new runtime dependency is required.

The guide teaches the EasyScore API merged in [#354](https://github.com/vexflow/vexflow/issues/354).
Quickstart uses `EasyScore.create()`. Lessons cover typed helpers, automatic beams, references,
ownership, batch construction, tablature, and structured composition with explicit layout policies.
The native API section explains direct construction and formatting.

When EasyScore changes, update the [API reference](easyscore.md), teaching examples, and lesson prose together.
Run `npm run guide:test` against the combined source. The tests render every example in three fonts and exercise the EasyScore family controls.

## Editing and export behavior

- Drafts are stored by example ID in browser local storage. Storage failure leaves editing usable.
- Reset restores the original code and parameter values and recreates the sandbox.
- Lesson and playground navigation reuse the sandbox, loaded library, and fonts without new asset requests.
  Each run clears the previous score, inspection state, and tracked timers and listeners.
  Use Reset to clear arbitrary global changes made by edited code.
- Run as you type is opt-in. Ctrl/Command+Enter runs immediately. Escape, then Tab leaves the editor.
- Clicking a parsed note selects its notation when one exact, unescaped source literal matches the unchanged editor.
  Ambiguous, computed, or stale source is inspected without selecting guessed text.
- Copy link points to the original example. It does not upload or share a draft.
- Save JS includes parameter values and the environment variables the app must provide.
- Save HTML includes the current library, selected fonts, code, and controls in a standalone page.
- Save SVG embeds the selected music and text fonts. It does not convert glyphs to paths.
  See [portable SVG](portable-svg.md) for path-only export and font-license requirements.
- User code runs inside the guide’s `sandbox="allow-scripts"` iframe with network access disabled.
  Arbitrary synchronous infinite loops are outside the timeout's guarantees.

## Validate and publish

`npm run guide:test` covers:

- All lesson routes, related links, and repository source paths.
- Warm lesson and playground navigation with no asset requests and unchanged library/font objects.
- Every teaching and playground example with Bravura, Petaluma, and Gonville.
- Editing, literal source text, keyboard access, drafts, reset, and errors.
- Mobile layout, navigation, disabled storage, and sandbox attributes.
- Standalone HTML/SVG/JS exports and bundled-only page requests.
- Upload ordering, cache headers, destination validation, and changed-build rejection.

Upload tests use a fake `gcloud` command. They never publish remotely.

```sh
npm run guide:upload -- --dry-run
npm run guide:upload
```

The default destination is `gs://vexflow.com/guide/`. Override it with
`--destination=gs://another-bucket/guide/`. A nonempty prefix and trailing slash are required.

The shared uploader validates hashes, freezes the manifest members, uploads immutable assets first,
and uploads `index.html` last with a 60-second cache. It reads the HTML back to verify its hash.
A lesson edit preserves the URLs of unchanged fonts, styles and library code. Retired assets remain available for at least one year. The guide command does not change hosting configuration.
See [deployment setup](build.md#upload-static-sites) for authentication and public ACL requirements.

After publishing, open `/guide/`, a lesson fragment, and a playground fragment on desktop and mobile.
Edit a note, select another font, and save an SVG. Verify that the header identifies the intended source revision.

## Sources

The lessons synthesize and update these project-owned references:

- [Original VexFlow tutorial](https://vexflow.github.io/vexflow-examples/guides/tutorial/).
- [Original EasyScore wiki](https://github.com/0xfe/vexflow/wiki/Using-EasyScore).
- [Current EasyScore documentation](easyscore.md) and [coverage manifest](easyscore-coverage.json).
- [Score layout](score-layout.md), [sheets and themes](sheets-and-themes.md),
  [proportional spacing](proportional-spacing.md), [text and lyrics](text-and-lyrics.md),
  [chord symbols](chord-symbols.md), [portable SVG](portable-svg.md), and [Node setup](jsdom.md).

Each lesson links its relevant sources. Current source and executable examples take precedence over old API spellings.

## Contemporary guitar studies

The tablature lesson and the playground’s **Strings & tablature** category share three editable scores. Compare the physical rasgueado directions, the tied bossa nova anticipation and the string-specific Drop D mute. The metal study wraps at narrow widths. [Playing instructions and API contracts](vf6/m8-guitar.md)
