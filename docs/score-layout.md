# Score layout

## Rests across voices

Join voices that share a stave before formatting them:

```js
new Formatter().joinVoices([upperVoice, lowerVoice]).formatToStave([upperVoice, lowerVoice], stave);
```

Rest placement clears the other voice's chord and stem for simultaneous notes in a shared modifier context.
It does not add collision detection across different tick positions.

## Annotations and pedal markings

Pedal text, brackets, and change notches clear bottom annotations.
Placement considers intermediate notes in the participating voices, not just pedal events.
It uses the annotations' computed positions, so drawing order does not matter.

- Format notes and assign their staves before drawing the pedal.
- `pedal.getYForStave(stave)` returns the computed baseline before drawing.
- `pedal.setLine(line)` still sets the minimum distance below the stave.
- Explicit annotation baselines and vertical shifts are respected.
- This is not a general collision solver for every modifier or unrelated voice.

## Flute fingering diagrams

Attach a six-key flute fingering to each note in the exercise. An outlined key is open. A filled key is closed. Read L1 through L3 from the top, then R1 through R3 in the offset group.

```js
const base = { L1: 'closed', L2: 'closed', R1: 'closed' };
first.addModifier(new FluteFingering(base), 0);
second.addModifier(new FluteFingering({ ...base, L3: 'closed' }), 0);
```

Omitted keys are open. The author supplies the finger positions independently of pitch. Set `{ scale: 0.8 }` in the second constructor argument for a smaller diagram. After formatting, `getBoundingBox()` measures the chart and `getKeyCenter('L3')` locates the third left-hand key. The SVG exposes the six positions in its accessible label. Canvas applications can read the same text from `getDescription()`.

## Concert harp pedals

Attach a complete setting to the note or rest where the player needs it.

```js
const pedals = { D: 'natural', C: 'sharp', B: 'flat', E: 'natural', F: 'sharp', G: 'natural', A: 'flat' };
entrance.addModifier(new HarpPedalDiagram(pedals), 0);
nextEntrance.addModifier(new HarpPedalDiagram({ ...pedals, F: 'natural' }), 0);
```

The music font supplies the joined rail, the divider between B and E, and the seven ticks.
Flat points up, natural crosses the rail, and sharp points down.
The diagram reserves space above its anchor. Use `{ scale: 1.5 }` as the second constructor argument for a larger diagram.
After formatting, `getBoundingBox()` measures its ink at the current note position.

## Bounds before drawing

`GraceNoteGroup.getBoundingBox()` works after formatting the parent note.
The parent must have a stave and tick context. No render context is required for measurement.

```js
parent.setStave(stave).addModifier(graceGroup, 0);
const voice = new Voice('4/4').addTickables(notes);
new Formatter().joinVoices([voice]).formatToStave([voice], stave);
const bounds = graceGroup.getBoundingBox();
```

- The box encloses the grace notes. It excludes the slur.
- Repeated measurements do not accumulate position offsets.
- Notehead and flag bounds use layout coordinates before drawing.
- `TextDynamics.getBoundingBox()` uses page coordinates before drawing.
- Reformat after changing note sizes or moving the score.

## Grace-tab sizes

Set the fret size before formatting:

```js
const grace = new GraceTabNote({
  positions: [{ str: 2, fret: 12 }],
  duration: '8',
}).setFontSize(6);
```

Numbers use points. CSS sizes such as `'8px'` also work.
Widths are recalculated and fret text stays centered on its string.
Ghost-note changes preserve the requested size.
Call `setFontSize()` without an argument to restore the default.

The default fret size is the tab text size multiplied by the grace scale.
With the standard metrics, that is `9pt × 2/3 = 6pt`.
For a shared default, set `MetricsDefaults.GraceTabNote.fontScale` and call
`Metrics.clear('GraceTabNote')` before creating the notes.

## Tuplet timing

Create tuplets before adding notes to a strict voice:

```js
const notes = pitches.map((key) => new StaveNote({ keys: [key], duration: '8' }));
const tuplet = new Tuplet(notes, { numNotes: 3, notesOccupied: 2 });
const voice = new Voice('1/4').addTickables(notes);
```

The constructor attaches the tuplet. Calling `attach()` again is harmless.
V5 option names are `numNotes` and `notesOccupied`.

If notes must be inserted first, use a soft voice during construction:

```js
const voice = new Voice('1/4').setStrict(false).addTickables(notes);
const tuplet = new Tuplet(notes, { numNotes: 3, notesOccupied: 2 });
voice.setStrict(true);
new Formatter().joinVoices([voice]).format([voice], 300);
```

Voice totals, shortest duration, resolution, and spacing weights refresh after duration edits.
Nested tuplets and detach operations are included.
A strict voice still rejects too many ticks at insertion time.
It cannot infer a tuplet that has not been created yet.
Reformat after editing durations.

## Moving flute trill keys

Attach a six-key fingering to the trill entrance. Mark the moving key with its starting and alternate states.

```js
const fingering = new FluteFingering({ L1: 'closed', L2: 'closed', R1: 'closed' });
entrance.addModifier(fingering, 0);
fingering.setTrillKey({ key: 'R2', start: 'open', alternate: 'closed' });
```

Two horizontal strokes inside R2 show that the key alternates. The other five keep their base symbols.
The starting state must match the base fingering. A closed key can also trill to open.
Call `clearTrillKey()` to restore the base diagram. SVG exposes the convention in the diagram’s accessible label.
Canvas applications can use the same wording from `getDescription()`.
