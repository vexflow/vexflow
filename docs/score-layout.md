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

## Mensurstriche between voices

For a polyphonic transcription, call `addMensurstriche()` on a measure-sized
`System` after adding its staves. Each right-hand barline becomes a thin stroke
in the gap between adjacent staves. The following measure uses the usual
`System` default of an open left edge.

```js
const measure = factory.System({ x: 20, y: 10, width: 240 });
measure.addStave({ voices: [trebleVoice] });
measure.addStave({ voices: [bassVoice] });
measure.addMensurstriche();
```

For separately constructed staves, set `rightBar: false` on both and draw a
`StaveConnector` of type `'mensurstrich'` between each adjacent pair.

## French lute tablature

Use a six-line `TabStave` and pass numeric `str` (course) and `fret` pairs to
`FrenchLuteNote` or `Factory.FrenchLuteNote()`. Course 1 uses the top line.
On courses 1–6, frets 0–12 read **a b c d e f g h i k l m n**.
Open bass courses 7–10 use **a**, **/a**, **//a**, and **///a** below the sixth line.
Simultaneous basses stack in course order.

```js
const stave = new TabStave(10, 10, 460).setContext(ctx).drawWithStyle();
const positions = [
  ...[0, 1, 2, 8, 9].map((fret) => ({ str: 1, fret })),
  ...[7, 8, 9].map((str) => ({ str, fret: 0 })),
];
const notes = positions.map((position) => new FrenchLuteNote({ positions: [position], duration: '8' }));
Formatter.FormatAndDraw(ctx, stave, notes);
```

## Flute fingering diagrams

Attach a six-key flute fingering to each note in the exercise. An outlined key is open. A filled key is closed. Read L1 through L3 from the top, then R1 through R3 in the offset group.

```js
const base = { L1: 'closed', L2: 'closed', R1: 'closed' };
first.addModifier(new FluteFingering(base), 0);
second.addModifier(new FluteFingering({ ...base, L3: 'closed' }), 0);
```

Omitted keys are open. The author supplies the finger positions independently of pitch. Set `{ scale: 0.8 }` in the second constructor argument for a smaller diagram. After formatting, `getBoundingBox()` measures the chart and `getKeyCenter('L3')` locates the third left-hand key. The SVG exposes the six positions in its accessible label. Canvas applications can read the same text from `getDescription()`.

### Moving trill keys

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

## Written pitches in custom key signatures

Use `setOrdered()` to supply accidental signs from left to right. A written pitch follows the stave’s clef. An explicit `line` stays at that position, counted down from zero at the top. Either kind can appear in the same signature.

```js
const signs = [{ type: 'b', pitch: 'g/4' }, { type: '#', pitch: 'e/4' }];
stave.addModifier(new KeySignature('C').setOrdered(signs));
const restatement = new KeySigNote('C').setOrdered(signs);
```

Put the restatement after a `ClefNote` in the same voice to use that clef. For a clef change written in another voice, supply the active clef in the factory call, for example `factory.KeySigNote({ key: 'C', clef: 'alto' }).setOrdered(signs)`.

### Edition-defined signatures

Create one `KeySignaturePresets` collection per edition. In this Sabâ exercise, the caller supplies a koma flat on B4 and a bakiye flat on D5. The collection keeps the written signs in order. It makes a fresh modifier each time you select the name.

```js
const edition = new KeySignaturePresets().register('Sabâ', [
  { type: Glyphs.accidentalKomaFlat, pitch: 'b/4' },
  { type: Glyphs.accidentalBakiyeFlat, pitch: 'd/5' },
]);
firstStave.addModifier(edition.select('Sabâ'));
secondStave.addModifier(edition.select('Sabâ'));
```

A second collection can register the same name with different signs. Names are exact. An unknown name raises `BadKeySignature`.

### Four-line square chant

`ChantStave` numbers lines upward from 1 at the bottom. Its C clef marks
`c/4` and its F clef marks `f/3`. Use `getYForPitch()` for a drawing
coordinate or `getLineForPitch()` for a `GlyphNote` line.

```ts
const stave = new ChantStave(10, 10, 450, { clef: 'C', line: 3 });
const punctum = (pitch: string) =>
  new GlyphNote(Glyphs.chantPunctum, { duration: 'q' }, { line: stave.getLineForPitch(pitch) });
const phrase = [punctum('c/4'), punctum('d/4'), new ChantDivision('minima')];
```

Add the phrase to a voice and format it against the chant stave. Divisions
reserve horizontal space and contribute zero beats. The minima crosses the
top line, the maior spans the interior, and the maxima and double finalis
span all four lines. Change the mark in place with `division.setKind('maior')`.
To change the anchor before placing the notes, call
`stave.setChantClef('C', 2)`.

### White mensural and Kievan notation

The mensural example pairs timed long values with four opening signs. The Kievan
example selects a half-note form from its position on the five-line staff.
[White mensural values and signs](white-mensural.md) · [Kievan notation](kievan-notation.md)

## Vertical spacing in continuous scores

A low treble note and a high bass note need extra clearance when they sound together.
When they occur on different beats, the two staves can sit closer together. Set
`continuous.verticalSpacing` to `'profile'` to compare the ink at each horizontal
position when placing staves and systems. The default `'envelope'` keeps the
traditional full-width staff bounds.

```js
const spec = {
  staves: [treble, bass],
  continuous: { verticalSpacing: 'profile' },
  system: { spaceBetweenStaves: 9 }, // Minimum distance between staff origins, in staff spaces.
  sheet: { width: 720, rowGap: 24 }, // Minimum vertical clearance between systems, in pixels.
};
const composition = factory.EasyScore().compose(spec);
```

The profile includes native noteheads, fingering, ledger lines, beam strips and registered
phrase markings. The formatter refits connecting stems and beams after it has placed both
staves. For a custom cue or symbol, supply `continuous.inkBounds(stave, measure)` and return
rectangles of the form `{ x, y, w, h }` in current score coordinates. The measure number
starts at one. Compute these bounds from the supplied stave on each call so they follow
resizes and changes of row.

Pass the same score to `Publication` to use the profile on paper. The planner measures the
drawn music and any cue or ossia above it, then applies `systemGap` in millimeters. Systems
share space only within a page. A forced or automatic page turn restores the full extent
of each system at its page margin.
