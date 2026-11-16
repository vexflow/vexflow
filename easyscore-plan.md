# EasyScore as the primary VexFlow API

Plan for [#354](https://github.com/vexflow/vexflow/issues/354).

Status: the first two implementation slices are complete and validated on `easyscore-overhaul`. Work is committed and pushed to this branch. Main receives the overhaul only after all milestones are complete.

The [user guide](docs/easyscore.md) documents the implemented surface. The [coverage manifest](docs/easyscore-coverage.json) classifies public modules and tracks implemented contracts.

Implemented in this slice:

- Strict `EasyScore.create()`, `make.annotation()`, `make.tie()`, `attach()`, `system()`, style, draw, and reset helpers.
- Pure `parseNotation()` results with source diagnostics. Strict construction and measure requests clean up failed managed work.
- Native note options, voice modes/time/resolution, working softmax options, and validated articulation names/codes/glyphs.
- A guide and Explorer example, native-rendering parity checks, and compatibility/ownership regressions.

Second slice:

- Score-local `getElement()` and typed `getNote()` lookup, synchronized native ID changes, and duplicate checks.
- `getSource()` provenance for parsed notes/modifiers, including complete measure input ranges.
- Explicit `adopt()` roles for native notes, custom modifiers, and standalone drawables.
- Explorer click-to-source selection, with conservative handling of ambiguous or generated input.
- Rollback/reset coverage and a native-rendering parity example for extensions.

Validation for slice two: 105 Node checks, 1,891 QUnit tests, and 12 Explorer checks pass. Source types, emitted-declaration consumer checks, and lint pass. Native-extension rendering matches SVG/Canvas with Bravura and Petaluma, including retained redraw.

Still pending: rhythm/span helpers, automatic beaming, tablature/structure helpers, and structured composition.
Milestone 0 is complete: [contracts](docs/easyscore-contracts.md) map every notation family to a typed path and lifecycle. A checked native API snapshot records exported types, constructors, options, and public members. Beginner, piano, tab, and percussion workflows are reviewed. Milestone 1 is complete: typed pure validators complement source diagnostics and transactional construction. Native zero-valued bracket options are honored, and Factory setup leaves caller options untouched. Milestone 2 is complete: the facade includes native Sheet access and nested batch construction, alongside lookup, provenance, adoption, style, reset, and retained drawing. Milestone 3 is complete: typed sequences, percussion heads, all note-modifier constructors, and grace/subnote ownership have executable examples and semantic/rendering checks. Milestones 4–7 remain.
Reviewed against `main` at `91e753e79e1fed1ef87a669b884dab50e7dca463` on November 16, 2026.

## Recommendation

Make EasyScore the main entry point for composing VexFlow notation.
Keep its compact note strings. Add a complete, typed JavaScript API around them.
Use the existing Factory, System, Sheet, Formatter, and notation classes underneath.

Users should be able to start with one EasyScore instance, create any supported notation, and draw it without managing render queues or construction order manually.
Every helper should return native VexFlow objects. Their existing setters remain available for precise control.

Do not put every VexFlow option into the string grammar. Strings work well for pitches and rhythm. Objects work better for layout, complex modifiers, tablature positions, and relationships between notes.

Ship this in small stages. Fix unreliable behavior first. Then add feature families with examples and tests. Keep #354 open until the coverage checklist and user guide are complete.

## What “all features” means

A built-in notation feature is covered only when it has:

- A discoverable, typed EasyScore construction or attachment path.
- Access to its native options and returned object.
- Correct ownership, formatting, styling, and drawing.
- A documented example and a regression test.
- Clear limits when the underlying renderer cannot handle a case.

Separate three categories in the coverage checklist:

| Category                 | Required support                                                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Notation and composition | First-class EasyScore helpers. A generic escape hatch alone is insufficient.                                                     |
| Native customization     | Returned VexFlow objects retain their setters, styles, metrics, and subclass behavior.                                           |
| Rendering infrastructure | Document how to supply contexts, load fonts, export SVG, and use measurement utilities. Do not invent notation syntax for these. |

“Full coverage” does not mean adding playback, MusicXML import, arbitrary pagination, a notation editor, or a new engraving engine. Those are separate products or capabilities.

Do not hide existing engine limits. For example, proportional spacing requires compatible voice durations and resolutions. Sheet does not currently split spanning marks at row breaks.

## Findings from the current code

### EasyScore already has a useful foundation

[`src/easyscore.ts`](src/easyscore.ts) provides:

- Pitched notes, chords, rests, ghost notes, and several note types.
- Standard and selected microtonal accidentals.
- Dots and inherited durations.
- Clef and stem options, IDs, classes, articulations, and fingerings.
- `notes()`, `measures()`, `voice()`, `beam()`, and `tuplet()`.
- Custom builders and commit hooks.

`measures()` preserves duration across bars and handles bars inside quoted options. It returns note arrays; it does not create or validate a complete score.

The recent beam policy resolves automatic stems across a whole beam. Explicit directions remain meaningful. Preserve this behavior from [#353](https://github.com/vexflow/vexflow/issues/353).

### The surrounding high-level API already does substantial work

| Existing component                                                          | Reuse it for                                                                      |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [Factory](src/factory.ts)                                                   | Context assignment, object creation, draw ordering, themes, and retained drawing. |
| [System](src/system.ts)                                                     | Multiple voices and staves, shared formatting, aligned starts, and connectors.    |
| [Sheet](src/sheet.ts)                                                       | Arranging measure-sized systems into rows and reporting overflow.                 |
| [Formatter](src/formatter.ts)                                               | Engraving spacing, proportional spacing, minimum width, and diagnostics.          |
| [Voice](src/voice.ts), [Fraction](src/fraction.ts), [Tuplet](src/tuplet.ts) | Meter, voice modes, tick arithmetic, and tuplet timing.                           |
| [Registry](src/registry.ts)                                                 | Element lookup and attribute indexes.                                             |
| [Element](src/element.ts), render contexts                                  | Styling, fonts, bounds, rendering, and export integration.                        |

EasyScore should coordinate these components. It should not maintain a competing layout engine or duplicate musical timing calculations.

### Concrete reliability gaps

These findings come from source inspection and small probes against a freshly rebuilt ESM bundle at the reviewed commit.

| Finding                     | Current behavior                                                                                                                  | Required change                                                                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Parse side effects          | `parse('C4/q, invalid')` returns failure after creating and queuing one note.                                                     | Separate parsing from construction. Define atomic failure for the new strict path.                           |
| Measure failure             | `measures('C4/w \| invalid')` throws, but the first measure's note remains queued.                                                | Validate the whole request before publishing its objects.                                                    |
| Ignored voice option        | `voice(notes, { options: { softmaxFactor: 1 } })` accepts the option but Factory does not apply it.                               | Apply it through `Voice.setSoftmaxFactor()` and cover it with a behavioral test.                             |
| Ignored note option         | `notes('C4/q', { octaveShift: 1 })` accepts the field through `Record<string, any>` but does not pass it to StaveNote.            | Add typed native note options and explicit extension options.                                                |
| Narrow articulation mapping | The built-in hook maps only `staccato`, `tenuto`, and `accent`. `fermata` currently falls back to the Factory's staccato default. | Validate names and support the native articulation codes/glyphs. Never silently substitute a different mark. |
| Incomplete voice options    | The helper exposes a string meter, but not `VoiceTime`, resolution, or mode before note insertion.                                | Accept the native time type and set mode before adding tickables.                                            |
| Weak diagnostics            | Errors expose little source context. `notes()` defaults to non-throwing parsing.                                                  | Add source spans, useful messages, and a result API suitable for editors.                                    |
| Fragmented ownership        | Several public classes have no Factory constructor or public registration path.                                                   | Complete Factory coverage and define how custom objects enter its lifecycle.                                 |

The softmax probe used a half note and two quarter notes. The accepted option produced weights of about `0.471, 0.265, 0.265`. Calling the native setter produced the expected equal thirds.

The first slice now fixes the listed option forwarding, articulation fallback, and strict/measure failure cleanup. Broader coverage remains in progress; score-local lookup is implemented. The table records the pre-implementation behavior.

## Feature coverage and gaps

This is the initial family-level inventory. Milestone 0 expands it into a checked mapping of public exports and supported operations.

“Native” below means that VexFlow already implements the feature. It does not mean EasyScore currently exposes it directly.

| Family                      | Current EasyScore coverage                                | Work required                                                                                                                                                            |
| --------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pitched notes and chords    | String support; fixed subset of constructor fields.       | Typed note input, per-head shapes, octave shifts, custom glyphs, rest placement, centering, and duration overrides.                                                      |
| Percussion                  | Clefs and a few note types can be used.                   | Explicit staff positions and head/glyph choices. Provide a complete percussion example, including the use case in [#302](https://github.com/vexflow/vexflow/issues/302). |
| Rests and repeated measures | Rests and GhostNote strings.                              | MultiMeasureRest, RepeatNote, GlyphNote, and their stave or voice placement.                                                                                             |
| Rhythm                      | Manual beams and tuplets.                                 | Automatic beam groups, rest/stemlet policies, flat beams, secondary breaks, nested tuplets, and access to created objects.                                               |
| Accidentals                 | Explicit standard and selected microtonal tokens.         | Full native accidental vocabulary, cautionary forms, and opt-in key-aware accidental policy.                                                                             |
| Grace notation              | No direct helper.                                         | GraceNote, GraceTabNote, GraceNoteGroup, slashes, group beams, slurs, and NoteSubGroup.                                                                                  |
| Note modifiers              | Three articulation names and fingering strings.           | Full Articulation, Ornament, Tremolo, Parenthesis, StringNumber, Stroke, Bend, Vibrato, and Dot controls.                                                                |
| Text and harmony            | No built-in text or chord-symbol helper.                  | Annotation, lyrics, TextNote, ChordSymbol blocks, kerning, fonts, baselines, and alignment.                                                                              |
| Dynamics                    | No direct helper.                                         | TextDynamics and timed Crescendo notes, plus spanning StaveHairpin. Distinguish their timing semantics.                                                                  |
| Relationships               | No direct helper.                                         | StaveTie, Curve, StaveLine, TextBracket, VibratoBracket, PedalMarking, TabTie, and TabSlide.                                                                             |
| Tablature                   | No string or typed tab creation helper.                   | TabNote, TabStave, GraceTabNote, string/fret validation, tuning recipes, ties, slides, and techniques.                                                                   |
| Staff structure             | Clef is passed to notes; callers build staves separately. | Staff types, line configuration, clefs, key/time signatures, connectors, and start/end modifiers.                                                                        |
| Inline structure            | Callers create native notes manually.                     | BarNote, ClefNote, KeySigNote, TimeSigNote, and zero-time ordering within mixed sequences.                                                                               |
| Score markings              | Native stave setters only.                                | Barline/repeat brackets, Repetition, Volta, StaveSection, StaveTempo, StaveText, and measure numbers.                                                                    |
| Voices and meter            | `voice()` and meter strings.                              | Strict/soft/full modes, VoiceTime, pickups, odd meters, rational tuplets, and measure-level validation.                                                                  |
| Systems and sheets          | Callers use Factory and System directly.                  | EasyScore entry points and optional structured measure composition using existing System/Sheet objects.                                                                  |
| Layout                      | Native Formatter through System.                          | Expose engraving/proportional options, alignment, spacing, minimum sizes, and overflow diagnostics.                                                                      |
| Styles and redraw           | Native setters and Factory theme/retain APIs.             | Consistent facade access, per-head overrides, clear redraw/reset behavior, and lifecycle tests.                                                                          |
| Lookup and diagnostics      | IDs/classes through hooks; optional global Registry.      | Score-local references, source-to-element mapping, safe lookup, duplicate-ID checks, and inspection.                                                                     |
| Fonts, contexts, exports    | Separate VexFlow APIs.                                    | Document font loading, custom contexts, browser/Node use, Canvas/SVG, and portable SVG export.                                                                           |
| Custom classes              | Hooks and manual construction.                            | Typed extension points and explicit ownership of custom modifiers, tickables, and drawables.                                                                             |

Factory itself lacks named constructors for several relevant classes, including GraceTabNote, Bend, Stroke, Vibrato, Tremolo, Parenthesis, Crescendo, StaveHairpin, TabTie, and TabSlide. Some attach to a note; others need their own queued draw step. Treat those as different roles.

The export audit must also classify infrastructure such as BoundingBox, Font, Metrics, Music, KeyManager, Tuning, NoteHead, Stem, Flag, TickContext, ModifierContext, base classes, type guards, and utilities. They remain accessible through native objects or documented utilities. They do not all need an EasyScore factory method.

## Proposed API shape

This section describes the target API. Some methods are now implemented; use the [user guide](docs/easyscore.md) for runnable current examples. Methods not listed there remain proposals.

### One entry point, native objects underneath

Keep `factory.EasyScore()` for existing applications. Add a convenient `EasyScore.create()` that owns a Factory.
Do not change the existing factory-less `new EasyScore().parse()` usage used by parser tests.

Proposed surface:

| Surface                                 | Purpose and return type                                                                                           |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `notes()` / `measures()`                | Preserve existing string input and array return values. Add typed input through distinct overloads or helpers.    |
| `voice()`                               | Return a native Voice. Accept native time, mode, and supported voice options.                                     |
| `beam()` / `tuplet()`                   | Keep returning the original note array for existing compositions.                                                 |
| `make.*()`                              | Typed element constructors that return native objects, including Beam and Tuplet when callers need their handles. |
| `attach(note, modifier, index)`         | Validate attachment and return the note. Never queue an attached modifier as an independent drawable.             |
| `autoBeam(notes, options)`              | Return the generated Beam objects and register them for drawing.                                                  |
| `system()` / `sheet()`                  | Return native System and Sheet objects with their options intact.                                                 |
| `compose(spec)`                         | Optional structured measure convenience; return native objects and references in a build result.                  |
| `draw()`, `reset()`, `setStyle()`       | Delegate to the owning Factory, preserving its defaults.                                                          |
| `parseNotation()`                       | Pure parsing and validation with diagnostics. Do not create rendering objects.                                    |
| `getElement(id)` / `getSource(element)` | Score-local lookup and inspection.                                                                                |

Use explicit typed functions for `make.*`, such as `make.annotation()`, `make.tabNote()`, and `make.tie()`.
Do not use a string-based method dispatcher or reflection over every exported constructor.
Derive option types from existing interfaces where possible. Keep aliases shallow and documented.

### Example: odd meter with automatic beams

```ts
// Proposed API. Fonts have already been loaded.
const score = EasyScore.create({
  renderer: { elementId: 'score', width: 640, height: 220 },
});

const notes = score.notes('C5/8, D5, E5, F5, G5, A5, B5');
score.autoBeam(notes, {
  groups: [new Fraction(2, 8), new Fraction(2, 8), new Fraction(3, 8)],
});
score.attach(notes[0], score.make.annotation({ text: 'dolce', vJustify: 'top' }), 0);

const voice = score.voice(notes, { time: '7/8', mode: 'strict' });
score
  .system({ x: 20, y: 50, width: 600 })
  .addStave({ voices: [voice] })
  .addClef('treble')
  .addTimeSignature('7/8');
score.draw();
```

The beam grouping describes musical beats. It must not change note durations or proportional spacing.
`autoBeam` must preserve EasyScore's explicit-stem policy rather than blindly accepting the different native generator defaults.

### Example: modifiers, ties, and low-level customization

```ts
// Proposed API. The objects remain ordinary VexFlow objects.
const notes = score.notes('(C4 E4 G4)/h, (C4 F4 A4)');
const chord = score.make.chordSymbol().setKerning('auto').addText('Cmaj7');
score.attach(notes[0], chord, 0);

const tie = score.make.tie({
  from: notes[0],
  to: notes[1],
  firstIndexes: [0],
  lastIndexes: [0],
});
tie.setStyle({ strokeStyle: '#b74632' });
```

The helper handles context and draw ownership. The user can still adjust the native tie or chord symbol.
For a custom Modifier subclass, `attach()` should work without a special built-in helper.

### Typed input without a second notation language

Add structured creation for cases that the pitch string cannot express cleanly:

- StaveNoteStruct for native note options and per-key head codes.
- TabNoteStruct for string/fret positions, including muted frets.
- Explicit grace-note and glyph-note constructors.
- Mixed sequences of native tickables for inline clefs, signatures, and barlines.
- Typed modifier and span descriptors when using `compose()`.

Keep `notes(string)`'s existing `StemmableNote[]` contract. Do not widen it to unrelated Tickable types and break callers.
Use a separate sequence helper or `voice(Tickable[], options)` overload for mixed content. Reject unsupported tickable combinations before formatting.

Start tablature with structured input. Any compact tab syntax should be a separate, documented grammar, added only when examples show that it improves authoring.

## Construction and ownership

### Make parsing safe before making it larger

Introduce a small notation syntax tree containing pitches, duration tokens, dots, note type, options, and source spans.
It is a parser intermediate representation, not a persistent score model.

Use this sequence:

1. Parse the complete input into data, including all requested measures.
2. Normalize inherited duration and scoped defaults.
3. Validate built-in options, IDs, references, and rhythm constraints that can be checked without rendering.
4. Create native objects in a staged construction scope.
5. Attach modifiers and tuplets; resolve references and beam policies.
6. Create voices with the chosen mode before adding tickables.
7. Commit owned objects to the Factory and score registry.
8. Format and draw on request.

Adapt the current parser's callbacks to collect data first. Avoid rewriting the generic Parser until compatibility tests show a need.
Keep `parse()`'s existing Result shape. Add the richer result through `parseNotation()` rather than replacing it.

A diagnostic should include a stable code, message, source start/end, line/column, and measure/voice context where available.
Examples: unsupported duration, unknown articulation, duplicate ID, invalid chord index, unresolved endpoint, or incomplete strict measure.

The editor path should return diagnostics. Strict convenience calls should throw an error carrying those same diagnostics.
Never render the valid prefix as if a failed new strict request had succeeded.

### Define transaction boundaries honestly

Factory currently publishes notes as they are created. Registry can also register elements globally during construction.
A pure parser alone does not solve failures in constructors or hooks.

Add a scoped Factory construction transaction or equivalent staging mechanism. Roll back its queues and registry entries when a managed build fails. Preserve existing unrelated objects.
Use a score-local Registry for the new facade; do not enable a process-wide default registry as a hidden side effect.
Test interoperability with an explicitly enabled legacy registry, including cleanup on failure.

Custom hooks can mutate external state. Do not promise to roll that back.
Document this boundary. Run legacy hooks once, after built-in validation, in their original order.
Offer a typed validation/transform extension before construction for new integrations.

### Give each object one drawing owner

Define separate registration paths for:

- Voice tickables.
- Note-attached modifiers and grace groups.
- Stave modifiers.
- Independent drawables such as ties, hairpins, and generated beams.
- Layout containers such as System and Sheet.

Factory owns drawing. EasyScore owns the composition operation and its source/reference metadata.
Registration must be idempotent by object identity. It must not draw a modifier twice or strand a custom drawable outside retained redraws.

Add an explicit adoption API for custom objects. Require the caller to identify its role.
Do not guess from the existence of `draw()`, and do not expose the protected render queue as the public contract.
Reject cross-factory adoption and attachments. Adoption registers unowned native objects; it does not transfer ownership from another Factory.

Default `draw()` still clears the Factory's queues. `draw({ retain: true })` preserves them.
Keep EasyScore references available for inspection after a normal draw, until `reset()`. Explain that references alone do not requeue objects for drawing. Clear owned references and source mappings on `reset()`.
Avoid hidden observers, timers, or automatic rendering on every setter.

Keep font loading explicit and asynchronous before construction. Accept an existing RenderContext for advanced and Node use. Do not silently change VexFlow's global font or metric defaults when creating a score. Document the scope of those settings; per-score font isolation is not currently guaranteed by the engine.

## Musical semantics and defaults

### Voices, tuplets, and odd meters

- Accept `VoiceTime | string`, including an explicit resolution.
- Set strict/soft/full mode before inserting notes.
- Apply tuplets before checking strict voice totals.
- Support nested tuplets through existing native tick multipliers.
- Keep duration inheritance local to a sequence or voice. Carry it across `measures()` bars as today.
- Validate aligned measure counts when composing multiple voices or staves.
- Represent pickups by their actual duration. Do not silently pad them to a full bar.
- Use native Fraction operations for totals, onsets, and beam groups. Do not accumulate rounded pixel positions.

For a multi-voice 7/8 measure, each voice shares the same declared measure span. One voice may contain triplets or septuplets. Their rational onsets still feed the same Formatter timeline.
The beat grouping `2+2+3` affects beams, not the measure's total ticks or horizontal time scale.

Independent meters remain an explicit low-level layout case until the underlying formatter supports them. Explain this distinction in the guide.

### Stems and beams

Retain the policy already implemented in EasyScore:

- All-automatic notes choose a direction for the full beam.
- One explicit direction constrains automatic notes in that group.
- Conflicting explicit directions remain available for cross-staff notation.
- `autoStem: false` preserves directions.
- `autoStem: true` explicitly overrides them.

Automatic beaming must also handle rests, tuplets, compound meter, and group boundaries.
Do not infer opposing voice stems solely from array order. Offer explicit voice roles or policies; keep the existing default unchanged.

### Accidentals and key signatures

Preserve today's literal accidental behavior by default.
Offer key-aware accidental generation as an explicit composition policy.

Define the distinction between a written pitch and a displayed accidental. A key signature must not silently reinterpret existing EasyScore strings.
Process all voices on a stave together, reset state at measure boundaries, and handle inline key changes.
Preserve explicit cautionary accidentals and microtonal signs.

Reuse `Accidental.applyAccidentals()` where its semantics fit. Audit it before enabling it automatically: it removes matching modifiers and groups onsets by numeric values today. It needs careful tests for explicit marks and rational timing.
Do not run it independently per voice and expect simultaneous accidentals to be correct.

### References and spans

Support direct native note references first. Add score-local IDs for structured composition.
Allow explicit chord-head indexes on ties, slides, and lines.
Validate duplicate IDs, endpoint types, and index ranges before drawing.
Forward references should resolve after all notes exist and before objects are published.

Separate logical spans from rendered segments when automatic row-break handling is added.
Use native partial ties/curves where supported. Do not assume every span class accepts a missing endpoint.
For unsupported automatic splitting, report the limitation and allow explicit segments.

A drawn time signature, clef, or key signature is not automatically a change to subsequent note construction.
`compose()` must propagate that musical state explicitly. Imperative helpers should document when callers must update note defaults too.

## Structured composition and responsive layout

Build `compose()` after the primitive helpers are reliable.
Accept a small typed description of staves, measures, voices, staff state, and relationships.
Allow voice contents to be EasyScore strings, typed note descriptions, or adopted native objects.

Return a build result containing the native Sheet, Systems, Staves, Voices, element references, and diagnostics.
Do not create a second editable score tree or promise serialization in this issue.
Rebuilding from a changed specification is an acceptable first implementation.

The helper should:

- Apply clef and meter defaults before constructing each voice.
- Distinguish displayed meter from a pickup's actual span.
- Validate mismatched voice lengths and missing measures.
- Create one System per measure, then use Sheet for wrapping.
- Expose engraving and proportional spacing without translating away native options.
- Report minimum width and overflow instead of compressing unreadable notation.
- Preserve explicit stave assignments for cross-staff notes.

Document Sheet's current limits: no pagination, no automatic signature repetition, no general collision solver, and no automatic span splitting.
Treat repeated signatures and row-break span behavior as explicit composition policies with separate tests. Do not accidentally change existing Sheet defaults.

## Compatibility and extension policy

| Existing behavior                                        | Plan                                                                                                                                                                                   |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `factory.EasyScore()` and native Factory usage           | Preserve. New entry point is optional.                                                                                                                                                 |
| `notes()` / `measures()` array results                   | Preserve.                                                                                                                                                                              |
| `beam()` / `tuplet()` return their input array           | Preserve; `make.*` exposes element handles.                                                                                                                                            |
| Default clef, time, duration inheritance, and stem rules | Preserve. Add explicit overrides.                                                                                                                                                      |
| Legacy unknown bracket options used by custom hooks      | Preserve in the legacy path. New strict input accepts registered extension keys.                                                                                                       |
| Builder and commit-hook customization                    | Keep an adapter and test custom builders. Do not replace them without a migration path.                                                                                                |
| `throwOnError: false` and partial results                | Keep the legacy contract during additive rollout. Make the new facade strict and atomic. Document the difference. Schedule any removal of partial-result behavior for a major release. |
| `throwOnError: true` and `measures()` failures           | Improve cleanup so failed managed operations do not leave queued objects.                                                                                                              |
| Ignored options and wrong articulation fallback          | Fix with regressions and release notes. These are behavioral bug fixes, not new defaults.                                                                                              |
| Public option typing                                     | Introduce named interfaces without abruptly removing existing extension fields. Tighten legacy types only with a compatibility review.                                                 |

The new facade must expose a documented route for valid low-level customization. Generic `any` bags and silently ignored fields are not that route.
Validate built-in fields. Keep custom extension options in a separate, typed namespace for new APIs.

A new syntax feature must have a grammar rule, source diagnostics, tests, and a guide entry.
Do not silently reinterpret existing valid strings. Reserve incompatible grammar changes for a major release.

## Implementation milestones

These are ordered delivery milestones, not GitHub severity labels.

| Milestone                            | Deliverables                                                                                                                                        | Exit criteria                                                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 0. Inventory and contracts           | Check every public export and option family. Record helper names, lifecycle roles, native types, and examples. Settle the proposed API names.       | No unclassified notation family. Review complete beginner, piano, tab, and percussion workflows.                           |
| 1. Reliability                       | Typed voice options, ignored-option fixes, articulation validation, parser data stage, diagnostics, and transaction boundaries.                     | Failure leaves no owned queued objects. Legacy parser/builder contracts pass. Odd-meter and tuplet invariants pass.        |
| 2. First-class entry point           | `EasyScore.create`, `make.*` foundation, adoption/attachment rules, local lookup, draw/reset/style, System/Sheet access.                            | A simple score needs only EasyScore plus optional native setters. No duplicate drawing or cross-score leakage.             |
| 3. Notes and modifiers               | Typed notes, heads, percussion, all accidentals, grace notes, articulation/ornament vocabulary, text, chord symbols, fingering and other modifiers. | Each family has a typed path, native escape, executable example, and semantic/render test.                                 |
| 4. Rhythm and relationships          | Automatic beams, advanced tuplets, dynamics, ties, curves, hairpins, brackets, lines, pedal markings, and endpoint validation.                      | Mixed-voice and odd-meter cases work. Span lifecycle and explicit row-break behavior are tested.                           |
| 5. Tablature and remaining structure | Tab/grace-tab, tuning recipes, bends/slides/ties, all stave markings, inline changes, multi-measure rests, repeat/glyph notes.                      | Complete Factory and EasyScore coverage for remaining notation families.                                                   |
| 6. Composition                       | Structured measures, scoped defaults, key-aware accidentals, responsive layout integration, and documented row-break policies.                      | Grand staff, multiple voices, pickup, changing meter, and wide/narrow/wide cases pass.                                     |
| 7. Guide and coverage gate           | Finish the user guide, migration notes, Explorer catalog, declaration/package checks, and public-feature audit.                                     | All built-in notation rows satisfy the definition of coverage. No undocumented workaround is needed for standard examples. |

Write the relevant guide section and examples in each milestone. Milestone 7 is a completeness review, not the first documentation pass.

Milestones 3–5 can be split into small feature-family changes once ownership is stable. Keep each change independently testable.
Do not bundle an unrelated engraving rewrite or font migration into this work.

## Likely code organization

Keep `src/easyscore.ts` as the public facade and compatibility layer.
Move new responsibilities into small modules as they grow:

- `src/easyscore/notation.ts`: parsed data, source spans, and normalization.
- `src/easyscore/diagnostics.ts`: error codes and result types.
- `src/easyscore/elements.ts`: typed native construction and attachment helpers.
- `src/easyscore/composition.ts`: optional structured measure construction.
- `src/easyscore/references.ts`: local IDs and source-to-element mapping.

Put shared construction/queue behavior in Factory. Keep notation rules in their native classes.
Export public types through `src/index.ts` and verify the supported package entry points.
Avoid unnecessary new runtime dependencies and constructor registries based on dynamic property lookup.

## Testing and regression detection

### API and semantic tests

Extend [EasyScore tests](tests/easyscore_tests.ts) and add focused Node tests for:

- Existing valid strings and legacy result shapes.
- Whitespace, quotes, escaped values if introduced, bars inside options, invalid durations, and error spans.
- Valid prefix followed by an error, failed later measures, constructor errors, and hook errors.
- Queue and registry state before/after failure; unrelated objects must survive.
- Native option propagation, including `octaveShift` and `softmaxFactor`.
- Every articulation alias and unknown-name rejection.
- IDs, duplicate IDs, forward references, chord indexes, and cross-factory ownership.
- Strict/soft/full voices, pickups, 7/8 grouping, 6/8, mixed voices, nested tuplets, and duration edits.
- Repeated draw/reset, retained redraw, theme changes, custom contexts, and custom modifiers.

For parity tests, independently construct the same small score through EasyScore and the native API.
Compare object types, ticks, pitches, modifiers, relationships, and layout positions.
Do not make the expected result by calling the helper under test.

Add seeded generated cases for duration inheritance, measure splitting, rational totals, and parser failures.
Bound input length, nesting, and run time in hostile-input tests. Reuse the existing subprocess isolation approach.

### Type and package tests

- Compile positive TypeScript consumers using the published declarations.
- Add negative cases for wrong option names, wrong endpoint types, and invalid modifier inputs.
- Test CJS and ESM package imports, including the existing supported font/core entry points.
- Check that the new facade does not require DOM initialization for pure parsing.
- Keep custom builders, commit hooks, and native subclasses in the compatibility corpus.

### Visual and geometry tests

Use the existing [rendering infrastructure](docs/testing.md), not a new snapshot framework.
Run representative cases on SVG and Canvas with Bravura and Petaluma.

Prioritize combinations that reveal interaction bugs:

- Opposing voices, rests, seconds in chords, and automatic beams.
- Triplets and septuplets sharing rational endpoints on different staves.
- Grace groups with accidentals, annotations, and ties.
- Lyrics, chord symbols, pedal markings, and hairpins together.
- Tab techniques and mixed tab/standard notation.
- Wide/narrow/wide reflow, explicit span segments, and foreground themes.

Use `tools/render-metrics.mjs` for non-finite bounds, overflow, and selected overlap checks.
Add explicit stem-direction, head-displacement, endpoint, and rhythmic-alignment assertions.
Include negative controls so a deliberately clipped or displaced fixture fails.

Do not treat every intersecting bounding box as a collision. Beams, ties, chords, and kerning contain intentional overlaps.
Use curated groups and tolerances. Pair geometry checks with image review.
Keep generated images under `build/` or temporary storage. Attach white-background issue screenshots to GitHub when implementation changes visuals.

### Performance and coverage gates

Reuse [score fixtures and benchmarks](docs/benchmarks.md). Measure parsing/construction, formatting, and drawing separately.
Check repeated failed edits and redraws for queue growth, registry growth, and retained references.
Use controlled local comparisons for timing; avoid fixed wall-clock CI thresholds.

Add a small checked feature manifest with:

- Public feature and native class/option family.
- EasyScore entry point and support category.
- Guide section and Explorer example ID.
- Semantic and rendering regression IDs.
- Any intentional limitation.

Fail CI when new public notation exports are unclassified or referenced examples/tests disappear.
Review option-level additions too; export scanning alone cannot detect a newly added setter or option.
This manifest is a completeness aid, not a claim that test presence proves correctness.

## User guide and Explorer

Create `docs/easyscore.md` as the canonical user guide.
The README currently links to the [older EasyScore wiki guide](https://github.com/0xfe/vexflow/wiki/Using-EasyScore), whose examples use the older `Vex.Flow` namespace.
Link the new guide from README and add a pointer from the relevant wiki pages when the guide is ready.

Suggested guide order:

1. First score: load fonts, create EasyScore, add notes and a stave, draw.
2. Strings: pitches, chords, durations, dots, rests, accidentals, options, and measures.
3. Typed input: custom heads, percussion, tablature, and native note options.
4. Rhythm: meter, voice modes, pickups, beams, tuplets, and multiple voices.
5. Modifiers: text, lyrics, chord symbols, articulations, ornaments, and techniques.
6. Relationships: ties, slurs, dynamics, brackets, lines, and pedal markings.
7. Structure: staff changes, barlines, repeats, systems, and sheets.
8. Styling, fonts, resizing, retained redraw, Canvas/SVG, and export.
9. Diagnostics, references, extensions, native customization, and migration.
10. Complete feature reference with links to runnable examples.

Keep snippets short and executable. Build larger examples from the same source fixtures used by tests.
Explain defaults next to the first example that depends on them.
Show failure messages and recovery, not only successful rendering.

Extend the existing Explorer catalog with an EasyScore view of each notation family.
Keep native examples available for comparison. Add paired examples that use the same musical input.
Use source spans to highlight errors and connect a selected note to its code.
Do not create a second playground or make every low-level test case a beginner tutorial.

Add a consistent feature badge: available directly, available through native customization, or limited by the engine. Keep experimental APIs clearly marked until their contracts are stable.

## Main risks and mitigations

| Risk                                               | Mitigation                                                                                |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| A large DSL becomes harder than the native API.    | Keep strings focused on notes and rhythm; use typed objects for richer structure.         |
| Wrappers drift from VexFlow options.               | Reuse native types, return native objects, and check the feature manifest in review/CI.   |
| Parser refactoring breaks custom hooks.            | Preserve legacy adapters and validate hook order, invocation count, and failure behavior. |
| Automatic behavior changes existing notation.      | Keep existing defaults; make accidental, composition, and row-break policies explicit.    |
| Objects draw twice or leak across edits.           | Define lifecycle roles, stage construction, and test identity/queue/registry invariants.  |
| “All features” expands into a new notation engine. | Separate native feature parity from new engraving capabilities and record engine limits.  |
| Documentation falls behind again.                  | Test shared examples and require a guide/example entry for each public feature addition.  |

## Recommended first implementation slice

Start with Milestone 0 and the small, independently verifiable parts of Milestone 1:

1. Establish the coverage manifest and public option contracts.
2. Fix ignored voice/note options and articulation fallback with regressions.
3. Introduce pure parsing, source diagnostics, and staged construction without expanding the grammar.
4. Preserve legacy behavior while making the new facade strict and predictable.
5. Implement one complete vertical slice: notes, annotation, tie, voice, system, draw, and a tested guide example.

Review that slice before filling out every helper. It will prove the API shape and ownership rules without committing the project to a large untested abstraction.

## Review scope

The review covered the public export surface in `src/index.ts` and `src/vexflow.ts`; EasyScore's grammar, builder, hooks, and tests; Factory constructors and drawing; System/Sheet layout; Voice/Beam/Tuplet timing; Registry; accidental generation; native note and modifier interfaces; Explorer catalog families; score fixtures; rendering diagnostics; package tests; and current layout/font/export documentation.

Related context includes #247, #158, #333, #313, #353, and the percussion documentation request #302. Existing work on sheets, themes, rational spacing, and automatic stems is a foundation to reuse.

This is an API and architecture review. It is not a proof of every low-level rendering method. The export/option manifest and paired integration cases are explicit implementation deliverables.
