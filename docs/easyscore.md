# EasyScore

EasyScore combines compact notation strings with typed helpers that return native VexFlow objects.
The current API covers notes, annotations, ties, voices, systems, drawing, local references, and native extensions.
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

## Typed notes and modifiers

`make.note()` accepts the complete native `StaveNoteStruct`. Score clef/stem defaults apply first; explicit fields win.
An explicit `stemDirection` disables automatic stems unless you also pass `autoStem`.
Native key suffixes choose individual head shapes. Use native setters for precise positions and per-key styling.

```js
const snare = score.make.note({ keys: ['c/5'], duration: 'q', clef: 'percussion' });
const hiHat = score.make.note({ keys: ['g/5/x'], duration: 'q', clef: 'percussion', stemDirection: VF.Stem.UP });
hiHat.setKeyLine(0, 4).setKeyStyle(0, { fillStyle: '#b74632' });
```

`sequence()` accepts strings, native note structs, and already-owned Tickables. It returns `Tickable[]` for `voice()`.
Each string is a separate notation fragment with its own duration inheritance. Typed structs require explicit durations.
A failed sequence removes its new objects. It preserves the existing objects passed in.

```js
const sequence = score.sequence([
  'C5/q',
  score.make.ghostNote('q'),
  score.make.textNote({ text: 'rit.', duration: 'q', smooth: true }),
  { keys: ['f/5'], duration: 'q' },
]);
```

These named helpers preserve their Factory/native argument types and return the corresponding native object:

| Helpers                                             | Native customization                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `make.accidental()`                                 | All native codes, including microtonal signs; `setAsCautionary()`.                   |
| `make.articulation()`, `make.ornament()`            | Articulation aliases/codes/glyphs; ornament codes, accidentals, delay, and position. |
| `make.dot()`, `make.parenthesis()`                  | Dot displacement and left/right parentheses.                                         |
| `make.tremolo()`, `make.stroke()`, `make.vibrato()` | Stroke counts, roll direction, widths, and native render options.                    |
| `make.annotation()`, `make.chordSymbol()`           | Lyrics/text, fonts, alignment, baselines, harmony blocks, and kerning.               |
| `make.fingering()`, `make.stringNumber()`           | Number, position, circle, and extension-line setters.                                |
| `make.ghostNote()`, `make.textNote()`               | Native timed-note structs and text layout options.                                   |

Attach modifiers with `score.attach(note, modifier, chordIndex)`.
`make.dot()` adds a visual dot. Set `dots` or `durationOverride` in the typed note to change its musical duration.
String dots continue to handle both duration and display automatically.

## Grace and subnote groups

```js
const grace = ['d/5', 'e/5'].map((key) => score.make.graceNote({ keys: [key], duration: '16', slash: true }));
const group = score.make.graceNoteGroup({ notes: grace, slur: true }).beamNotes();
score.attach(mainNote, group);
```

`make.graceNote()` returns a native GraceNote with score clef defaults.
`make.graceNoteGroup()` and `make.noteSubGroup()` move their children into group-only drawing.
Create the group before adding those children to any main voice.
A child cannot belong to two groups, be adopted as a standalone drawable, or be inserted into a main voice afterward.
Failed managed batches restore the prior standalone queue, voice assignment, and ignored-tick state.
Native group setters and grace-beam controls remain available. Legacy direct Factory group constructors retain their existing behavior; strict ownership is enforced by the EasyScore helpers.

The **EasyScore: notes & modifiers** Explorer example covers modifiers, accidentals, text, grace groups, percussion, and mixed sequences.
The executable studies are in [easyscore-families.mjs](../tools/easyscore-families.mjs).

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
Use `adopt()` below to register external notes and standalone drawables.

The returned objects retain their native setters:

```js
tie.setStyle({ strokeStyle: '#b74632' });
annotation.setTextBaseline(40);
```

Attached modifiers draw through their notes. Ties draw through the Factory queue. Do not call their `draw()` methods separately.

## Local references and source

`getElement()` returns a native Element, or `undefined` if the ID is missing.
`getNote()` returns a native Note. It throws if the ID is missing or belongs to a non-note.

```js
const notes = score.notes('C4/h[id="start"], C4[id="end"]');
score.make.tie({ from: score.getNote('start'), to: score.getNote('end') });
const source = score.getSource(notes[0]);
console.log(source.input.slice(source.start, source.end)); // C4/h[id="start"]
```

- IDs are local to each EasyScore. Separate scores can use the same names.
- IDs must be nonempty and unique within one score. Duplicate construction throws.
- Native `setAttribute('id', value)` updates lookup. A conflicting rename throws before changing the ID.
- Notes, their parsed modifiers, and objects returned by EasyScore helpers are indexed.
- Direct Factory objects enter the local index through `adopt()`. Layout children created through returned native objects are not indexed automatically.
- Lookup does not enable, replace, or clear the ambient Registry. An explicitly installed global Registry still has its own global ID namespace.

`getSource()` returns a copy of `{ input, start, end, measure? }`.
The input is the original notation string. Offsets use UTF-16 indexes and exclude the end position.
For `measures()`, offsets refer to the complete bar-separated input; `measure` is one-based.
Parsed modifiers point to their containing notation piece. Native/adopted elements have no notation source.

`VF.EasyScore.getSource(element)` provides the same provenance to debuggers without needing the score instance.
The instance method returns source only for that score's members.
Source and lookup survive drawing. `score.reset()` releases both, including ID-change subscriptions.
Strict construction failures also remove the newly created references and provenance.

In the Explorer, click a parsed note to select its notation in the code editor.
Hover only inspects. The inspector also displays the notation source.
Selection requires one matching, unescaped string literal in the current code.
Repeated literals, escaped strings, and computed input remain inspectable without guessing an editor location.
An edited but unrendered preview cannot select stale source.

## Native extensions

`adopt()` returns the original object and requires its drawing role:

| Role       | Object                            | Lifecycle                                                 |
| ---------- | --------------------------------- | --------------------------------------------------------- |
| `note`     | Native Note subclass              | Add to a voice; System supplies staff/layout.             |
| `modifier` | Native Modifier subclass          | Attach to a note with `attach()`. Never drawn separately. |
| `drawable` | Standalone Element, such as Curve | Drawn by the Factory queue after voices.                  |

```js
const native = score.adopt(new VF.StaveNote({ keys: ['e/4'], duration: 'q' }), 'note');
const customLabel = score.adopt(new VF.Annotation('dolce'), 'modifier');
score.attach(native, customLabel);
```

Repeated adoption does not duplicate a queued object. Objects owned by another Factory are rejected.
Wrong roles throw before changing ownership or queues. Voice, Stave, StaveModifier, and System need their normal layout APIs; they cannot be adopted as generic drawables.
Custom relationships must validate their own endpoints and implement the native drawing contract.
Adoption does not infer layout, attach modifiers, or inspect arbitrary custom-object references.

`attach()` also adopts an unowned native modifier. It rejects an already attached modifier being moved to another note.
Factory ownership survives drawing and reset. To reuse a reset score's native objects, explicitly adopt them again and rebuild their voices/layout.
Reset does not transfer ownership to another Factory.

The [extension example](../tools/easyscore-references-example.mjs) runs as **EasyScore: references & extensions** in the Explorer.
It combines named notes, a tie, a custom Modifier subclass, an adopted native note, and an adopted Curve.
Tests compare its SVG/Canvas output against native construction with Bravura and Petaluma, then check retained redraw.

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

For typed pre-construction checks, provide `validate({ piece, options })` with `extensions`:

```js
const score = VF.EasyScore.create(rendererOptions, {
  extensions: ['label'],
  validate: ({ options }) => {
    if (options.label && options.label !== 'melody') throw new Error('Unknown label');
  },
});
```

Validation runs during `parseNotation()` and strict preflight. Throwing produces a source diagnostic before managed objects exist.
Validators must be pure; measure preflight can evaluate them more than once. They receive copies and cannot rewrite parsed notes.
Use commit hooks to apply validated values to native objects. Built-in option names keep their built-in meaning.
Custom builders and commit hooks still run during actual construction, once per note.

## Sheets and batch construction

`sheet()` returns a native Sheet, managed by the same Factory:

```js
const sheet = score.sheet({ width: 600, rowGap: 60 });
const system = sheet.addSystem();
system.addStave({ voices: [score.voice(score.notes('C4/w'))] }).addClef('treble');
score.draw({ retain: true });
sheet.setWidth(400); // Reflow on the next draw.
```

Sheet systems and staves use native layout options. They are not automatically added to EasyScore's local ID index.
`sheet.getRows()` reports overflow after formatting. Sheet is not an Element and has no element ID.
See [sheets and themes](sheets-and-themes.md) for row spacing and current layout limits.

Use `build()` to group synchronous managed construction:

```js
const result = score.build((builder) => {
  const notes = builder.notes('C4/h[id="first"], C4[id="last"]');
  const tie = builder.make.tie({ from: notes[0], to: notes[1] });
  return { notes, tie };
});
```

A thrown error restores the prior queues, references, and builder result, including nested successful groups.
Do not draw, reset, return a Promise, or mutate existing objects inside this construction callback.
This transaction cannot undo application side effects or native setters on existing objects.

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
`reset()` clears queues, local references, source metadata, and the builder's last result. Caller-held native objects still exist.
Resizing a context alone does not reflow a score. See [sheets and themes](sheets-and-themes.md).

## Coverage and next steps

The [coverage manifest](easyscore-coverage.json) classifies every public source module and records the tested contracts in this slice.
Classification does not mean every feature is implemented. CI checks for newly unclassified modules and missing contract references.
Native option and setter additions still need review.

The [implementation plan](../easyscore-plan.md) tracks the remaining helpers and structured composition.
The complete EasyScore feature rollout remains tracked by [#354](https://github.com/vexflow/vexflow/issues/354).
