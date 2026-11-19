# EasyScore

EasyScore combines compact notation strings with typed helpers that return native VexFlow objects.
Start with strings for pitches and rhythm. Use `make.*` for native notation, `system()` for direct layout, or `compose()` for aligned measures.
The helpers cover every built-in notation family. Returned objects retain their native setters.

This is the API reference. For editable lessons, use the [interactive user guide](https://vexflow.com/guide/).
See [guide development](guide.md) to run it locally.

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
`setContext()` supplies an existing render context. Create with `renderer.elementId: null` and call `score.setContext(context)` before constructing notation.
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
Use `set()` to change defaults, for example `score.set({ clef: 'bass', time: '3/4' })`.
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

String notation supplies keys, duration, dots, and type. Use the typed helpers below for custom heads, tablature, and other native notation.

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

Set `restLine` on a typed rest to keep its vertical position during formatting. For example, `score.make.note({ keys: ['r/4'], duration: 'hr', restLine: 0 })` puts a half rest on the first ledger below a five-line staff. Key line 5 is the top staff line. On an existing rest, `setRestLine(line)` pins the position and `setRestLine(undefined)` releases it.

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

## Automatic beams and tuplets

`autoBeam()` returns owned native Beam objects. Group lengths use exact Fractions of a whole note:

```js
score.set({ time: '7/8' });
const notes = score.notes('C5/8, D5, E5, F5, G5, A5, B5');
const beams = score.autoBeam(notes, {
  groups: [new VF.Fraction(2, 8), new VF.Fraction(2, 8), new VF.Fraction(3, 8)],
});
```

Without explicit groups, the native meter defaults apply. Use explicit groups to express asymmetric beats.
Beam grouping never changes note durations. Rests, middle-only rests, stemlets, flat beams, secondary breaks, and native stem-direction options remain available.

- Default: a sole explicit direction constrains automatic notes in that group. Conflicting explicit directions remain mixed.
- `autoStem: true`: choose the direction for the complete group, overriding explicit note stems.
- `autoStem: false`: preserve note directions.
- Native `maintainStemDirections` additionally splits groups at direction changes.
- A note cannot belong to two generated beams. Keep and customize the returned handles.

`make.beam()` returns a manual Beam handle. `make.tuplet()` returns a native Tuplet. Both accept `{ notes, options }`.
The older `beam()` and `tuplet()` methods still return their input array.

```js
const notes = score.notes('C5/8, D5, E5');
const tuplet = score.make.tuplet({ notes, options: { numNotes: 3, notesOccupied: 2, bracketed: true } });
score.autoBeam(notes);
const voice = score.voice(notes, { time: '1/4' });
```

Create tuplets before voices, so cached voice totals are correct. Positive integer ratios and nested tuplets use native rational tick multipliers.
Native y-offsets, ratios, bracket settings, locations, and suffixes remain available. Automatic beaming updates native tuplet bracket/location defaults; apply final display overrides afterward.
`durationOverride` also uses a Fraction of a whole note, such as `new VF.Fraction(1, 8)` for an eighth.

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

### Other spans and dynamics

| Helper                  | Endpoint / timing contract                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| `make.curve()`          | Native Curve options; one or two note endpoints.                                                            |
| `make.hairpin()`        | Two note endpoints, crescendo/decrescendo type, native render offsets.                                      |
| `make.line()`           | Two StaveNotes and nonempty, matched chord-index arrays.                                                    |
| `make.textBracket()`    | Two endpoints, text/superscript, position, line, font.                                                      |
| `make.vibratoBracket()` | One or two endpoints, code and line.                                                                        |
| `make.pedalMarking()`   | Explicit ordered staff-note events; text, bracket, or mixed style. Repeated points represent pedal changes. |
| `make.textDynamics()`   | A timed native TextDynamics note; full TextNoteStruct fields.                                               |
| `make.crescendo()`      | A timed native Crescendo note, with line/height/direction setters.                                          |

These objects draw through the score. Do not draw them separately.
Span endpoints must belong to the score's Factory. Missing endpoints, invalid types, and invalid chord indexes fail before queuing the new mark.

Ties, curves, and vibrato brackets support explicit partial endpoints at stave boundaries.
Hairpins, lines, and text brackets need complete endpoints. Sheet does not split these automatically; create explicit per-row segments or keep the measure group on one row.
A native hairpin constructor accepts a partial definition, but its renderer cannot draw it. EasyScore rejects that request early.

The **EasyScore: rhythm & relationships** Explorer study covers two voices in 7/8, nested tuplets, every span helper, partial spans, and timed dynamics.

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

| Role            | Object                            | Lifecycle                                                 |
| --------------- | --------------------------------- | --------------------------------------------------------- |
| `note`          | Native Note subclass              | Add to a voice; System supplies staff/layout.             |
| `modifier`      | Native Modifier subclass          | Attach to a note with `attach()`. Never drawn separately. |
| `drawable`      | Standalone Element, such as Curve | Drawn by the Factory queue after voices.                  |
| `staveModifier` | Native StaveModifier subclass     | Attach with `attachToStave()`; the stave draws it.        |

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

## Tablature and staff structure

`make.tabNote()` accepts every native TabNote field. Its optional second argument enables stems.
`make.graceTabNote()` joins `make.graceNoteGroup()` like pitched grace notes.
`make.bend()`, `make.tabTie()`, and `make.tabSlide()` return native handles.
Tab spans use native `firstNote`, `lastNote`, `firstIndexes`, and `lastIndexes` fields.
Partial slides require an explicit direction (`1` or `-1`).

```js
const notes = [3, 5].map((fret) => score.make.tabNote({ positions: [{ str: 2, fret }], duration: 'h' }));
score.attach(notes[0], score.make.bend([{ type: VF.Bend.UP, text: 'Full' }]));
score.make.tabSlide({ firstNote: notes[0], lastNote: notes[1] });
const stave = score.make.tabStave();
score.attachToStave(stave, score.make.clef('tab'));
score.system().addStave({ stave, voices: [score.voice(notes)] });
```

Tuning remains a native calculation utility. `new VF.Tuning('dropd').getNoteForFret(3, 6)` converts a position to a pitch.
The tab note itself displays the supplied fret. Custom fret text and instruments with more than six strings are supported.
Choose enough lines in `make.tabStave({ options: { numLines: 7 } })` for the instrument.

`make.stave()` and `make.tabStave()` create owned staves. `make.connector()` joins owned staves.
Use `attachToStave()` for the following modifiers. Repeating the same attachment is harmless.
An attached modifier cannot move to another stave. Create a new one instead.

| Helpers                                                      | Native notation                     |
| ------------------------------------------------------------ | ----------------------------------- |
| `make.clef()`, `make.keySignature()`, `make.timeSignature()` | Clefs and signatures                |
| `make.barline()`, `make.repetition()`, `make.volta()`        | Barlines, navigation, endings       |
| `make.section()`, `make.tempo()`, `make.staveText()`         | Rehearsal labels, tempo, staff text |

These constructors accept native constructor arguments and return native objects.
`attachToStave(stave, mark, position)` optionally overrides the native position.
Custom StaveModifier subclasses use `adopt(mark, 'staveModifier')` and the same attachment helper.
They draw through their stave, never through a second queue.

`make.barNote()`, `make.clefNote()`, `make.keySigNote()`, and `make.timeSigNote()` create inline changes for `sequence()`.
They consume no musical time. Imperative clef/key/time markings change the display only.
Supply the new clef to subsequent `notes()` calls and the actual meter to `voice()`.

`make.multiMeasureRest()` returns a standalone rest; pass `{ numberOfMeasures: 8 }`, for example. Call `.setStave(stave)` before drawing.
`make.repeatNote()` and `make.glyphNote()` create timed notes. Their native duration and alignment options remain available.

The Explorer's **EasyScore: tablature & staff structure** example covers these paths on both backends.

## Structured composition

`compose()` builds native objects from aligned staff measures. It returns a Sheet, Systems, Staves, Voices, note arrays, spans, lookup functions, and policy diagnostics.
Nothing is drawn until `draw()`. Failed construction releases new queues and references.

```js
const result = score.compose({
  sheet: { width: 640, rowGap: 50 },
  signatures: 'every-measure',
  accidentals: 'key-aware',
  staves: [
    {
      id: 'melody',
      clef: 'treble',
      key: 'G',
      time: '4/4',
      measures: [
        { span: '1/4', voices: [{ notes: 'D5/q' }] }, // Pickup; still displays 4/4.
        { time: '2/4', voices: [{ notes: 'F#5/q[id="a"], G5[id="b"]' }] },
      ],
    },
  ],
  spans: [{ kind: 'curve', from: 'a', to: 'b' }],
});
result.sheet.format();
score.factory.getContext().resize(680, result.sheet.getHeight() + 30);
score.draw({ retain: true });
```

Each staff must have the same number of measures. Every voice must fill the actual measure span exactly.
All staves in one System share that span. Independent meters need explicit native layout.
No silent rests or padding are inserted. A note cannot belong to two voices.

Voice `notes` accepts a string or an array of strings, typed note structs, and owned native tickables.
Each string starts its own duration inheritance. Use `{ note: nativeStruct, id: 'name' }` or `{ tab: nativeStruct, id: 'name', drawStem: true }` for named typed notes.
In a composition descriptor, `dots: 2` on a quarter note engraves a double-dotted quarter and sets its duration. Each pitched chord head gets two dots. A tab chord with `drawStem: true` gets two dots at its shared stem.
Adopt native notes before passing them in. They must not already belong to a voice.
When native inputs are present, apply beams, tuplets, and accidental policy beforehand. This keeps failed composition from rewriting caller-owned notation.

Voice options include explicit `stem: 'up' | 'down' | 'auto'`, native spacing options, `autoBeam`, and `tuplets`.
Tuplet ranges use `{ start, count, options }` and count timed notes only. Ranges apply in array order, so nested tuplets are supported.
Tuplets are constructed before Voice insertion. Timing comparisons use native Fractions.
Set `system.details.spacing` to the native engraving/proportional options; no separate spacing engine is used.

Staff clef, key, and time carry forward through measures. A measure can override them.
Inside a voice, `{ change: { clef: 'bass', key: 'C' } }` inserts inline notation and updates subsequent construction.
Every voice on that staff must declare the same changes at the same rational onsets. The first voice draws the shared inline markings.
An inline time change affects the displayed signature and the next measure's inherited meter; the current measure's actual span stays explicit.

Typed note wrappers can include `stave: 'other-staff-id'` for cross-staff placement in the same measure.
Supply the appropriate native note `clef` when its target differs from its voice's staff.
Assignments survive Sheet reflow. Key-aware accidentals follow the target stave.

`withDefaults()` scopes imperative defaults to a synchronous construction callback. It restores them on success or failure.

```js
const bass = score.withDefaults({ clef: 'bass', stem: 'down' }, (s) => s.notes('C3/h, G2'));
```

### Accidental policy

The default is `literal`: existing EasyScore accidental behavior stays unchanged.
`key-aware` compares literal written pitches against the staff key. `F4` is always F natural; a G signature does not turn it into F sharp.

The opt-in policy:

- Processes all voices on the target stave together, in exact rational onset order.
- Resets at measure boundaries and inline key changes.
- Suppresses redundant ordinary parser-generated signs.
- Preserves explicit native marks, cautionary signs, and microtonal signs.
- Shows both signs for conflicting simultaneous spellings. The next occurrence also gets a sign.

Grace-note accidentals retain their explicit native notation. The policy does not rewrite grace groups.
The native `Accidental.applyAccidentals()` API remains unchanged.

### Reflow and spans

Call `result.sheet.setWidth(width).format()`, resize/clear the context, then call `draw({ retain: true })`.
`getRows()` reports row bounds and overflow. An oversized measure stays readable on its own row.
Text and spanning marks may need additional `rowGap`; Sheet is not a general collision solver.

For a composition using the default Sheet layout, `signatures: 'changes'` is the default. It shows initial signatures and explicit changes, with a diagnostic that wrapped row starts do not repeat them.
`signatures: 'every-measure'` makes every measure suitable for a new row. To repeat signatures only where a row begins, opt into continuous layout.

Top-level `spans` accepts ties, curves, and hairpins with forward note IDs.
Use returned notes and `make.*` for other native relationships.
Cross-measure spans are rejected by default. `crossMeasureSpans: 'manual'` permits them and returns a diagnostic.
The caller must replace them with native partial segments if they cross a row after reflow. Sheet never splits them silently.

Pass a `continuous` object to use measured row starts, repeat barlines and automatic span continuation. Reference the IDs of the original events. Reflow the same Sheet when the viewport changes.

```js
const result = score.compose({
  sheet: { width: 450 },
  staves: [{ id: 'solo', measures: [
    { voices: [{ notes: [{ id: 'a', note: { keys: ['g/4'], duration: 'w' } }] }] },
    { voices: [{ notes: [{ id: 'b', note: { keys: ['d/5'], duration: 'w' } }] }] },
  ] }],
  continuous: {
    mode: 'balanced',
    measureNumbers: true,
    spans: [{ id: 'phrase', kind: 'slur', from: 'a', to: 'b', side: 'above' }],
  },
});
result.sheet.setWidth(300).format();
const layout = result.sheet.getContinuousLayout();
console.log(layout.rows, layout.fragments, layout.diagnostics);
```

For tab, use `{ id: 'hold', kind: 'tie', from: 'a', to: 'b', string: 2 }` to sustain a fret on the second string of the same staff. Both chords must play that fret on that string, in any position order. You can also select a position with a zero-based `fromHead` or `toHead`. With no selector, the tie starts at the first position of the opening chord.

A tab ending uses `{ id: 'ending', kind: 'volta', from: 'a', to: 'b', text: '1.' }`. The bracket and ties split at system breaks and follow the guitar into an extracted part.

See the [continuous score guide](vf6/m4.md) for break constraints, rest grouping, staff names and span conventions.

The Explorer's **EasyScore: responsive composition** example covers a grand staff, pickup, multiple voices, tuplets, changing meter, inline state, and both spacing modes.

### Print a score and its parts

Pass the same declarative composition to `new Publication(spec)`. Each call to `render(container, options)` builds a separate layout. A conductor score and a cello part can share note IDs and have different staff sizes, page breaks and turn preferences. Dimensions are in millimeters. Each returned page is a standalone SVG. The browser print adapter accepts outline fonts for portable PDF output. [Page and part examples](vf6/m5.md)

If your arrangement uses EasyScore commit hooks to add fingerings or ornaments, pass the same functions to `render(container, { noteHooks: [decorateNote] })`. The print renderer calls them as it builds the notes for each part and cue.

## Native customization and infrastructure

Helpers expose native objects directly. Keep using their setters, render options, styles, subclasses, and measurement methods.
`NoteHead`, `Stem`, and `Flag` belong to their note. Set note keys/head codes, `setKeyStyle()`, `setKeyLine()`, and native stem/flag options.
Native Fraction, Music, Tuning, KeyManager, Formatter, Registry, Metrics, and bounding boxes remain available from the same package.
No parallel versions of these utilities are introduced.

`attach()` accepts index 0 for non-pitched timed notes, such as GlyphNote. Pitched and tab notes validate their actual chord/position indexes.
Native custom modifiers still determine which kinds of note they can render on.
`StaveOptions.clef` carries clef state when a repeated glyph is omitted. Attached clefs also update that state.
`make.keySigNote({ key, cancelKey, clef })` supports cancellation and an explicit inline clef.

### Fonts, contexts, and export

Select fonts before constructing notation. Font metrics and text measurement are global native settings.
For browser ESM with local font files (serve these URLs from your app):

```js
import { EasyScore, Font, VexFlow } from 'vexflow/core';
await Promise.all([Font.load('Bravura', '/fonts/bravura.otf'), Font.load('Academico', '/fonts/academico.otf')]);
VexFlow.setFonts('Bravura', 'Academico');
const score = EasyScore.create({ renderer: { elementId: 'score', width: 600, height: 260 } });
```

Use `renderer.backend: VF.Renderer.Backends.CANVAS` or `SVG` to choose a backend explicitly.
For an existing context, use `renderer.elementId: null`, then `score.setContext(context)` before creating notes.
Native CanvasContext and SVGContext, Node canvas measurement, and [server-side setup](jsdom.md) work unchanged.

For SVG export, obtain the SVG element from the renderer's host after drawing.
`svgWithFontPaths(svg, fonts)` converts supplied fonts to portable paths. See [SVG export](portable-svg.md) for font loading and licenses.
Canvas export uses the native canvas `toDataURL()` / `toBlob()` methods.
Neither export method changes score ownership or musical state.

## Migration from Factory.EasyScore

Existing Factory/EasyScore code continues to work. Migration can be gradual.

| Existing code                               | First-class facade                                                                           |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `factory.EasyScore()`                       | `EasyScore.create(factoryOptions)` owns its Factory. Existing factories still work.          |
| `factory.StaveNote(struct)`                 | `score.make.note(struct)` returns the same native class.                                     |
| `note.addModifier(mark, index)`             | `score.attach(note, mark, index)` adds ownership and duplicate checks.                       |
| `stave.addModifier(mark)`                   | `score.attachToStave(stave, mark)` gives the modifier one staff owner.                       |
| `score.beam(notes)` / `score.tuplet(notes)` | Keep their array return. Use `make.beam()` / `make.tuplet()` when a native handle is needed. |
| Manually managed measure Systems            | `compose()` optionally builds aligned measures and a responsive Sheet.                       |

The new entry point is strict. Register custom bracket options with `extensions` and keep validators pure.
`factory.EasyScore()` retains legacy unknown-option and partial-parse behavior unless strict options are enabled.
Custom builders and commit hooks remain supported. Side effects in hooks are outside managed rollback.
Drawing clears queues by default. Use `{ retain: true }` for redraw; `reset()` clears local references too.
Ownership stays with the original Factory even after reset. Rebuild notation to move it to another score.

## Coverage and validation

The [contracts](easyscore-contracts.md) map notation families to helper names and drawing owners.
The coverage gate checks every public module, every named `make.*` helper, example IDs, guide entries, and test names.
A separate native API snapshot catches new constructor fields and public setters for review.
It is a review gate, not a claim that every possible option combination is visually identical.

Run from the checkout:

```sh
npm test
npm run explorer:test
npm run test:easyscore-package
```

The package check packs locally, checks all public ESM/CommonJS entries, and compiles an external TypeScript consumer.
It does not publish. See [build and test commands](build.md) for the broader test tooling.

Known limits stay explicit: no pagination, automatic span splitting, row-start-only signature repetition, or general collision solver.
Native input objects must be prepared before composition policies can consume them.
The facade does not add playback, MusicXML import, or a persistent editable score model.
