# EasyScore API contracts

This inventory maps the implemented public paths. The [API reference](easyscore.md) includes migration and native customization.
The [coverage manifest](easyscore-coverage.json) records examples and tests.

Named percussion, paired TAB and staff notes, alternating tremolos and written accidental state use the same native note descriptions as EasyScore. [Instrument recipes and support limits](vf6/m6.md)

After drawing a composition, pass it and its source staves to `ScoreNavigation` to obtain ordered events and hit regions. [Accessible reader and browser contracts](vf6/m7.md)

## Native options and customization

The [native API snapshot](easyscore-native-api.json) records every public source module, exported type, constructor, and public member.
It includes inline option objects and interface inheritance. Native objects keep their setters and render options.
New helpers use native types through `Parameters`, `ConstructorParameters`, or named native interfaces.
No option dictionary is copied into a second schema or silently dropped.

Run `node tools/easyscore-api-audit.mjs` to check the snapshot.
After reviewing a native API change, update its coverage and run `node tools/easyscore-api-audit.mjs --update`.
The snapshot detects drift; semantic and rendering tests establish support.
The coverage test requires a row and an existing executable example for every public `make.*` method.
`npm run test:easyscore-package` verifies the packed artifact and its declarations without publishing.

## Notation paths and ownership

All names below are under `score.make`, unless shown otherwise. Names remain explicit; there is no string dispatcher.

| Family                                   | Paths                                                                                                      | Owner / native options                                                                                  |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Pitched notes, chords, rests, percussion | `note`, `ghostNote`, `glyphNote`, `repeatNote`; `score.notes`, `score.sequence`                            | Voice notes. `StaveNoteStruct`, `NoteStruct`, `GlyphNoteOptions`; native head codes and per-key styles. |
| Grace notation                           | `graceNote`, `graceTabNote`, `graceNoteGroup`, `noteSubGroup`                                              | Grace notes draw only through an attached group. Native note structs and group options.                 |
| Marks and accidentals                    | `accidental`, `articulation`, `ornament`, `dot`, `parenthesis`, `tremolo`, `stroke`, `vibrato`             | Note modifiers. Native constructors, positions, cautionary marks, and render options.                   |
| Text and harmony                         | `annotation`, `chordSymbol`, `textNote`, `fingering`, `stringNumber`                                       | Modifiers except timed TextNote. Native font, alignment, kerning, block and baseline setters.           |
| Rhythm                                   | `beam`, `tuplet`; `score.autoBeam`                                                                         | Queued drawables, referencing owned notes. Native Fraction groups, tuplet and beam options.             |
| Dynamics                                 | `textDynamics`, `crescendo`, `hairpin`                                                                     | First two are timed notes. Hairpin is a span. Native render options.                                    |
| Relationships                            | `tie`, `curve`, `line`, `textBracket`, `vibratoBracket`, `pedalMarking`                                    | Queued drawables. Owned endpoints, explicit chord indexes, native options.                              |
| Tablature                                | `tabNote`, `tabStave`, `bend`, `tabTie`, `tabSlide`                                                        | Notes, staff, modifier, and spans respectively. Native string/fret structs and Tuning recipes.          |
| Inline structure                         | `barNote`, `clefNote`, `keySigNote`, `timeSigNote`                                                         | Mixed voice sequence. Native zero-time behavior and input options.                                      |
| Staff structure                          | `stave`, `tabStave`, `connector`, `multiMeasureRest`; `score.attachToStave`                                | Staff queue, connector queue, stave-bound rest, and stave modifiers.                                    |
| Staff markings                           | `clef`, `keySignature`, `timeSignature`, `barline`, `repetition`, `volta`, `section`, `tempo`, `staveText` | Attached to a stave. Native constructor arguments and stave position.                                   |
| Layout                                   | `score.voice`, `score.system`, `score.sheet`, `score.compose`                                              | Native Voice, System, Sheet, Formatter options and explicit composition policies.                       |
| Custom objects                           | `score.adopt`, `score.attach`, validation hooks                                                            | Explicit lifecycle role. Ownership never transfers between Factories.                                   |

`NoteHead`, `Stem`, and `Flag` are note internals. Configure them through typed notes and native setters.
Base classes, Fraction, Tuning, Music, KeyManager, fonts, metrics, contexts, Registry, bounds, and export utilities remain native infrastructure.
They do not need alternate notation constructors.

## Reviewed workflows

| Workflow   | Construction                                                                  | Required checks                                                                                  |
| ---------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Beginner   | Notes → modifier/tie → voice → system → draw                                  | Strict errors, complete meter, readable defaults, native return types.                           |
| Piano      | Two staves, several voices, tuplets, pedals → measure systems → sheet         | Independent voice defaults, shared meter, rational alignment, owned endpoints, resize stability. |
| Guitar/tab | Tuning → fret positions → tab notes, bend, grace group, tie/slide → tab stave | Positive string numbers, muted frets, group-only grace drawing, tab endpoint types.              |
| Percussion | Percussion clef, typed keys/head codes, explicit lines → voices/beams         | Head shape and position survive construction. Voice stems are explicit.                          |

## Limits and compatibility

- Compact pitch strings keep their current grammar and return types.
- Strict managed construction is atomic. Arbitrary hook mutations to existing objects are not reversible.
- `draw()` clears queues; references survive until `reset()`.
- Native customizations remain available. Global fonts and metrics are still global.
- Composition describes input, not a persistent editable score tree.
- Sheet has no pagination, automatic span splitting, or general collision solver.
- Key-aware accidentals, voice stem roles, signature repetition, and pickup duration must be explicit policies.
