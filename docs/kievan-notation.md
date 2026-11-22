# Kievan half notes

Use the `kievan` tse-fa-ut clef for a Synodal-style five-line stave. Its middle line is written C4. Each `KievanNote` takes one natural pitch and an undotted half-note duration (`h` or `2`). A music font such as Bravura provides the clef and the two complete note forms.

```js
const stave = factory.Stave({ x: 10, y: 15, width: 450 }).addClef('kievan');
const pitches = ['c/4', 'd/4', 'e/4', 'f/4', 'e/4', 'd/4', 'c/4'];
const notes = pitches.map((pitch) => factory.KievanNote({ pitch, duration: 'h' }));
const voice = factory.Voice({ time: '7/2' }).addTickables(notes);
factory.Formatter().joinVoices([voice]).formatToStave([voice], stave);
factory.draw();
```

To change the second D to E, call `notes[1].setPitch('e/4')` before drawing. The note switches from the space glyph to the line glyph. Its duration and attack column stay the same.
