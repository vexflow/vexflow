# Proportional spacing

Use this mode when equal musical durations must occupy equal horizontal distances.
The default formatter still uses engraving spacing.

```ts
const formatter = new Formatter({
  spacing: { mode: 'proportional', pixelsPerQuarter: 120 },
});
formatter.joinVoices(voices).formatToStave(voices, stave);
```

Set each note's stave before formatting. For multiple staves, align their note-start positions, or use `System`, which does this automatically:

```ts
const system = factory.System({
  details: {
    spacing: { mode: 'proportional', pixelsPerQuarter: 120 },
  },
});
system.addStave({ voices }).addClef('treble');
factory.draw();
```

## Scale and width

At 120 px per quarter, eighth-note onsets are 60 px apart. Eighth-note triplet onsets are 40 px apart. All voices share one rational timeline. Pixel conversion happens at each onset, without accumulating rounded distances.

- Supply `pixelsPerQuarter` for an exact scale. Extra width remains after the rhythmic span.
- Omit it to fit the available width with one uniform scale.
- Omit the width, or use `System.autoWidth`, to choose a sufficient width from measured bounds.
- Clefs, initial modifiers, and outer padding add to the rhythmic span.
- `Formatter.tune()` preserves these positions.

A 7/8 measure contains 3.5 quarter-note units. Its rhythmic span is 420 px at this scale. Grouping it as 2+2+3 affects beaming, not spacing. Dotted-quarter beats in 6/8 occupy 180 px.

## Beamed tuplets

Stem direction is independent of spacing. EasyScore resolves automatic stems for the whole beam, including when pitches cross the middle line:

```ts
const notes = score.notes('C4/8, D4, E4, F4, G4, A4, B4');
score.tuplet(notes, { numNotes: 7, notesOccupied: 4 });
score.beam(notes);
```

- Explicit `stem: 'up'` / `'down'` choices, including per-note overrides and `setStemDirection()`, are preserved. Automatic notes follow a single explicit direction in the group.
- Conflicting explicit directions remain mixed for cross-staff notation.
- `beam(notes, { autoStem: false })` preserves every current direction.
- `beam(notes, { autoStem: true })` chooses a shared direction even for explicitly stemmed notes.

The low-level `Beam` constructor and `Factory.Beam` still preserve directions unless their `autoStem` option is true.

## Crowded notation

The formatter measures notes, displaced heads, modifiers, and inline objects on each stave. If a fixed scale or width is too small, it throws `InsufficientProportionalSpace`. The message gives the minimum scale and required formatting width. Increase the scale/width or use automatic sizing.

The formatter does not move individual rhythmic anchors to avoid collisions. It checks the bounds represented by note metrics; it is not a general collision detector for beams, slurs, or arbitrary text.

## Special cases

- Grace groups keep their internal layout and reserve space beside their host note.
- Inline clefs and barlines retain their order before the next rhythmic anchor. They do not advance musical time. Trailing objects sit before the measure-end anchor.
- Center-aligned measure rests retain their centering. Local notehead displacement for multiple voices is also preserved.
- Incomplete `SOFT` and `FULL` voices retain the declared measure span. For a pickup, declare its shorter duration. A `SOFT` voice longer than its meter extends the shared span to its actual duration.
- Voices must have matching declared durations and tick resolutions. Independent meters and barlines are outside this mode's scope.
- `getTickContexts().list` and `.map` contain musical anchors. In this mode, `.array` also contains the separately positioned zero-time contexts.

See [Proportional spacing](https://vexflow.com/guide/#playground/proportional-spacing) in the guide and **Strict proportional spacing** in the Formatter test gallery.
