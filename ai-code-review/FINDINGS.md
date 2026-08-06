# Code Review Findings — VexFlow `src/` and `entry/`

Complete pass over every file in `entry/` and `src/`, with the exception of
`src/glyphs.ts` (5880-line pure-data glyph table) and `src/fonts/*` (2-line
font-data exports). Both contain no reviewable logic.

Inline markers added to the source files:

- `// POSSIBLE_BUG_BELOW?` — code that may be incorrect
- `// BAD_COMMENT_BELOW?` — comment that looks outdated, wrong, or misleading
- `// SUGGESTED_FIX` — proposed replacement code/text (kept as a comment)

File:line references — open in VS Code with Cmd+P.

---

## High-priority bugs

| File:Line | Issue |
| --- | --- |
| `src/element.ts:280` | `arr.splice(arr.indexOf(className))` missing `deleteCount`. `removeClass()` drops the matched class **and every class after it**. Fix: `arr.splice(arr.indexOf(className), 1)`. |
| `src/accidental.ts:98` | `for (let n = 0; n < note.keys.length; ++n)` never references `n`; body produces same value every iteration. |
| `src/frethandfinger.ts:46` | Same dead-loop-variable pattern as above. |
| `src/gracenotegroup.ts:66` | Same dead-loop-variable pattern. |
| `src/stringnumber.ts:67` | Same dead-loop-variable pattern. |
| `src/beam.ts:78` | `unbeamable` read in `draw()` for early-return but never assigned anywhere. Dead branch. |
| `src/music.ts:145` | Mode-name typo `phyrgian` should be `phrygian` (breaking — keep both keys or alias). |
| `src/renderer.ts:130` | Error message interpolates `${maybeElement}` after `!maybeElement` check — always renders `"null"` instead of the actual ID. Use `${arg0}`. |
| `src/vexflow.ts:220-223` | `if (!fontNames)` on a rest parameter is unreachable — `fontNames` is always an array. Doc says "if undefined, load all"; correct check is `fontNames.length === 0`. |
| `src/textnote.ts:87,92` | `new Element('TexNote.subSuper')` — typo `TexNote` → `TextNote`. May break Metrics lookups that key on the type string. |

## Likely-wrong / copy-pasted docstrings

| File:Line | Issue |
| --- | --- |
| `src/flag.ts:18` | Doc says `VexFlow.NoteHead.DEBUG`, should say `VexFlow.Flag.DEBUG`. |
| `src/flag.ts:25` | `/** Draw the notehead. */` above `Flag.draw()` — should say "Draw the flag." |
| `src/util.ts:94` | `normalizeAngle` doc says "in the range [0, pi)", code normalizes to `[0, 2π)`. |
| `src/tables.ts:336` | "NOTE: There is no 256 here" — but 256 IS in `durationCodes`. Stale comment. |
| `src/stave.ts:333-336` | `getLineForY` doc says it "calls getYForLine until the right value is reaches" — actually does an algebraic inverse, no loop. |
| `src/modifiercontext.ts:112` | Docstring is truncated: `/** Get the width of the entire */`. |
| `src/stemmablenote.ts:196` | Comment "Set the stem length to a specific." — missing word ("specific length"). |

## Stylistic / typo findings

| File:Line | Issue |
| --- | --- |
| `src/accidental.ts:326` | "than is an accidental might need" — stray "is". |
| `src/beam.ts:162` | "autimatically" → "automatically". (Fixed inline.) |
| `src/beam.ts:743` | Inner `const beamCount = note.getGlyphProps().beamCount;` shadows outer destructured `beamCount`. Suggest `noteBeamCount`. |
| `src/canvascontext.ts:46` | Field name typo `curTransfrom` → `curTransform`. Public; rename = breaking. |
| `src/clef.ts:113` | `this.size = size ?? 'default'` is redundant — `size` already defaults to `'default'`. |
| `src/crescendo.ts:96` | "descresendo" → "decrescendo". |
| `src/crescendo.ts:120` | `this.line + -3` → `this.line - 3`. |
| `src/factory.ts:1-4` | Duplicate "MIT License" line in header. |
| `src/formatter.ts:1008` | "Should the cost by normalized" → "be normalized". |
| `src/gracenotegroup.ts:102` | Malformed docstring start: `//**` should be `/**`. |
| `src/keymanager.ts:140` | "Last resort -- shitshoot" — apparent typo (and informal). |
| `src/music.ts:35` | "Number of an canonical notes" → "Number of canonical notes". |
| `src/note.ts:223` | "numbr" → "number". |
| `src/notehead.ts:119` | "it's x value" → "its x value". |
| `src/ornament.ts:108` | "happens in the attach" → "happens in the attack". |
| `src/stave.ts:571` | "0 to to 3" → "0 to 3". |
| `src/stave.ts:819` | "adjustement" → "adjustment". |
| `src/stavehairpin.ts:71` | "must be provide to draw" → "must be provided to draw" (in error message). |
| `src/staveconnector.ts:267` | "paralell" → "parallel". |
| `src/stavenote.ts:491` | "sortedKeNotes" → "sortedKeyProps". |
| `src/stavenote.ts:787` | "addtional" → "additional". |
| `src/stavetie.ts:3` | "varies types of ties" → "various types of ties". |
| `src/stem.ts:132` | "The the y bounds" → "Set the y bounds". |
| `src/stem.ts:209` | "required fo satisfy" → "required to satisfy". |
| `src/strokes.ts:212` | "substracting" → "subtracting". |
| `src/tabnote.ts:91` | "store it's y position" → "store its y position". |
| `src/tabnote.ts:332` | "Draw the fal" → "Draw the flag". |
| `src/tabslide.ts:4` | "varies types" → "various types". |
| `src/tabtie.ts:5` | "varies types" → "various types". |
| `src/tabtie.ts:42` | "Tab tie's are always face up" → "Tab ties are always face up". |
| `src/textbracket.ts:105` | "text backet" → "text bracket". |
| `src/textbracket.ts:156` | "coordintates" → "coordinates". |
| `src/textdynamics.ts:95` | `this.line + -3` → `this.line - 3` (unnecessary unary minus). |
| `src/textnote.ts:159` | `this.line + -3` → `this.line - 3` (unnecessary unary minus). |
| `src/tickable.ts:32` | "a element that sit" → "an element that sits". |
| `src/timesignature.ts:130` | "line line" — duplicated word. |
| `src/tuning.ts:7` | "varies types" → "various types". |
| `src/voice.ts:198` | "expontential" → "exponential". |

## Pre-existing FIXMEs / TODOs / author notes worth tracking

- `src/articulation.ts:183-200` — long FIXME on `heightShift` formatting/render order.
- `src/beam.ts:466` — `Q(MSAC) -- what about beamed half-note measured tremolos?`
- `src/beam.ts:745-751` — preserved commented-out code with explanatory note ("This will be required if the partial beams are moved to the note side").
- `src/parser.ts:133` — author TODO: `expectOne(...)` never called with `maybe` parameter.
- `src/stavenote.ts:1152-1154` — `drawStem(stemOptions?)` author comment ("I can't find any context in which this is called…").
- `src/tickable.ts:228-239` — `resetTuplet()` marked deprecated "to be removed in v6".
- `src/util.ts:117-170` — three commented-out static helpers (`sortAndUnique`, `getCanvasContext`, `benchmark`, `stackTrace`) preserved as history.
- `src/svgcontext.ts:256-289` — TODO(GCR) on width/scale handling.

## Files reviewed

`entry/`: all 5 files (clean).

`src/`: every `.ts` file except `glyphs.ts` (pure data table) and `fonts/*`
(font-data exports). The reviewed list covers all logic.

## Files intentionally skipped

- `src/glyphs.ts` (5880 lines of Unicode glyph constants — no logic).
- `src/fonts/academico.ts`, `academicobold.ts`, `bravura.ts`, `gonville.ts`, `petaluma.ts`, `petalumascript.ts` (each 2 lines — re-exports of binary font data).
