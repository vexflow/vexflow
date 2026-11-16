# EasyScore

EasyScore combines compact notation strings with typed helpers that return native VexFlow objects.
The first API slice covers notes, annotations, ties, voices, systems, and drawing.
Use Factory and the native API for the remaining notation families.

## First score

Load the VexFlow bundle and fonts before running this example. Create a `<div id="score"></div>` in the page.
`VF` below refers to the browser's `VexFlow` object. ESM users can import `EasyScore` and other classes from `vexflow` instead.

```js
const score = VF.EasyScore.create({
  renderer: { elementId: 'score', width: 500, height: 240 },
});
score.setStyle({ fillStyle: '#24312c', strokeStyle: '#24312c' });
const notes = score.notes('(C4 E4 G4)/h, (C4 F4 A4)');
const annotation = score.make.annotation({ text: 'dolce', vJustify: 'top' });
score.attach(notes[0], annotation, 0);
const tie = score.make.tie({ from: notes[0], to: notes[1], firstIndexes: [0], lastIndexes: [0] });
const voice = score.voice(notes, { time: '4/4', mode: 'strict' });
const system = score.system({ x: 20, y: 70, width: 460 });
system
  .addStave({ voices: [voice] })
  .addClef('treble')
  .addTimeSignature('4/4');
score.draw({ retain: true });
```

The [shared example](../tools/easyscore-example.mjs) runs in the Explorer as **EasyScore: first score**.
Tests compare it against independently constructed native notation on SVG and Canvas, with Bravura and Petaluma.

`EasyScore.create()` owns a Factory. Existing `factory.EasyScore()` calls still work.
For an existing render context, create with `renderer.elementId: null` and call `score.setContext(context)` before constructing notation.
Use the [Node setup guide](jsdom.md) for server-side rendering.

## Notes and measures

`notes()` returns native StemmableNote objects. Its existing string grammar is unchanged.

| Input                        | Meaning                                                          |
| ---------------------------- | ---------------------------------------------------------------- |
| `C4/q, D4, E4, F4`           | Quarter notes. Omitted durations inherit the preceding duration. |
| `(C4 E4 G4)/h`               | A half-note chord.                                               |
| `B4/q/r`                     | A quarter rest positioned at B4.                                 |
| `C4/q.`                      | A dotted quarter note.                                           |
| `F#4/8, Gn4`                 | Explicit sharp and natural accidentals.                          |
| `C4/q[id="start",stem="up"]` | A note ID and explicit stem direction.                           |

The initial duration is an eighth note. Defaults are treble clef, 4/4, and automatic stems.
Use `score.set({ clef: 'bass', time: '3/4' })` to change the note/voice defaults.
Staff clefs and displayed signatures are still added explicitly to the returned Stave.

`measures()` splits bars and returns an array of note arrays:

```js
const bars = score.measures('C4/h, D4 | E4, F4');
```

Durations carry across bars. Bars inside quoted options are literal text.
Empty measures are errors; write rests explicitly. A failed measure request publishes none of its new notation.
Measure parsing does not create a Sheet or validate complete voice durations.

Native note options now include `octaveShift`, `strokePx`, `line`, `alignCenter`, and `durationOverride`:

```js
const shifted = score.notes('C4/h, D4', { octaveShift: 1 });
```

String notation supplies keys, duration, dots, and type. Typed custom heads, tablature, and the remaining constructors are planned separately.

## Articulations

The string hook supports `staccato`, `tenuto`, `accent`, `fermata`, `marcato`, and `staccatissimo`.
It also accepts native articulation codes, named SMuFL glyphs, and their glyph values.
Append `.above` or `.below` to select a position:

```js
score.notes('C5/q[articulations="fermata.below"], D5[articulations="accent,tenuto"]');
```

Unknown names throw. They no longer silently become staccato.
Use glyph names for native codes containing the comma list separator when combining several marks.

## Voices and rhythm

`voice()` accepts `VoiceTime | string`, a mode, and a spacing factor:

```js
const notes = score.notes('C5/8, D5, E5, F5, G5, A5, B5');
const voice = score.voice(notes, { time: '7/8', mode: 'strict', softmaxFactor: 1 });
```

- `strict` is the default. Notes cannot exceed the meter; formatting requires a complete voice.
- `full` allows an incomplete voice but rejects overflow.
- `soft` allows incomplete and overfull voices, which is useful for experiments.
- Native `Voice.Mode` enum values also work.
- Native time objects can specify `numBeats`, `beatValue`, and `resolution`.
- The legacy `options: { softmaxFactor }` spelling also works. The top-level value takes precedence.

Mode is applied before adding notes. Overflow errors do not reassign the existing notes to a failed voice.
Create tuplets before inserting their notes into a strict voice.
Existing `beam()` and `tuplet()` still return the original note array.
See [tuplets and layout](score-layout.md) and [proportional spacing](proportional-spacing.md) for rational timing and automatic-stem rules.

## Attachments and relationships

`make.annotation()` accepts Factory annotation options and returns an Annotation.
`attach()` validates the chord-head index and returns the note. Repeating the same attachment is harmless.
A modifier cannot be shared between notes. Create another modifier instead.

`make.tie()` accepts Factory tie options and returns a StaveTie. It validates endpoint ownership and chord indexes before queuing the tie.
Partial ties can omit one endpoint. There must be at least one endpoint, and index lists must be nonempty and equal in length.

Notes must come from the same Factory as the facade. This includes notes created directly through `score.factory`.
A newly constructed custom Modifier can be attached. An annotation owned by another Factory is rejected.
General adoption of external notes and drawables is not part of this slice.

The returned objects retain their native setters:

```js
tie.setStyle({ strokeStyle: '#b74632' });
annotation.setTextBaseline(40);
```

Attached modifiers draw through their notes. Ties draw through the Factory queue. Do not call their `draw()` methods separately.

## Diagnostics and failed edits

`parseNotation()` parses and validates without creating elements, running commit hooks, or changing queues and registries:

```js
const result = score.parseNotation('C4/q, invalid');
if (!result.success) {
  console.log(result.diagnostics);
}
```

Success returns parsed pieces with source ranges. Failure returns an empty piece list and diagnostics.
Offsets use JavaScript string indexes (UTF-16). They are zero-based and end-exclusive. Line and column are one-based.
Measure errors also identify the one-based measure number and use offsets in the complete input.

`EasyScore.create()` defaults to `throwOnError: true` and `strictOptions: true`.
Strict calls throw `EasyScoreError`, whose `diagnostics` property contains the same error shape.
Invalid syntax and built-in options are rejected before construction.
Factory construction failures restore the prior queues and ambient registry entries.

This is a synchronous construction boundary. It does not undo application side effects or arbitrary mutations to existing objects made by hooks.
It does not rewind the global element-ID counter. Generated IDs should not be used as stable application identifiers.

Legacy `factory.EasyScore()` still defaults to non-throwing parsing and can return a valid prefix after a syntax error.
Use `{ throwOnError: true }` there for validated construction and cleanup.
The factory-less `new EasyScore().parse()` remains available for legacy syntax checks; `parseNotation()` adds semantic checks and diagnostics.

Unknown options remain available to legacy custom hooks. In strict mode, declare application-owned option names:

```js
const score = VF.EasyScore.create(rendererOptions, { extensions: ['label'] });
score.addCommitHook((options, note) => {
  if (options.label) note.addClass(options.label);
});
score.notes('C4/q[label="melody"]');
```

The application validates extension values. Built-in option names keep their built-in meaning.
Custom builders and commit hooks still run during actual construction, once per note.

## Drawing and styling

`system()` returns a native System. Existing staff, connector, and formatter options remain available.
`setStyle()` delegates foreground defaults to Factory. It does not change global metrics or fonts.

`draw()` clears the Factory's queues after rendering, as before.
`draw({ retain: true })` keeps them for redraw:

```js
score.factory.getContext().clear();
score.setStyle({ fillStyle: '#e7edf5', strokeStyle: '#e7edf5' });
score.draw({ retain: true });
```

Set the host background with CSS. Explicit element styles override the shared foreground.
`reset()` clears queues and the builder's last result. Caller-held native objects still exist.
Resizing a context alone does not reflow a score. See [sheets and themes](sheets-and-themes.md).

## Coverage and next steps

The [coverage manifest](easyscore-coverage.json) classifies every public source module and records the tested contracts in this slice.
Classification does not mean every feature is implemented. CI checks for newly unclassified modules and missing contract references.
Native option and setter additions still need review.

The [implementation plan](../easyscore-plan.md) tracks the remaining helpers, local references, source-to-element mapping, and structured composition.
The complete EasyScore feature rollout remains tracked by [#354](https://github.com/vexflow/vexflow/issues/354).
