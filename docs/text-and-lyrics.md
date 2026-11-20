# Text, lyrics, and tie placement

## Text fonts

By default VexFlow draws score lettering in Academico and engraved symbols in Bravura. To change the character of the notation while keeping the lyrics and harmony familiar, pair Petaluma with Academico. For a handwritten lead sheet, select Petaluma Script for the lettering too.

```javascript
VexFlow.setFonts('Petaluma', 'Academico');
// To use handwritten lettering throughout the score, choose this pairing instead.
// VexFlow.setFonts('Petaluma', 'Petaluma Script');
```

`setFonts` recognizes VexFlow's built-in text faces. A music-only stack uses Academico for text. For a custom text face, select it explicitly after `setFonts`:

```javascript
VexFlow.setFonts('My Music Font');
VexFlow.setTextFonts('My Text Font', 'serif');
```

Load the chosen fonts before creating notes or measuring text. To change one direction, set its font before attaching it to the note. For example, `new VexFlow.Annotation('dolce').setFont('Academico', 11)` gives that word an 11 pt face. For a class-wide override, import `MetricsDefaults` and `Metrics` from `vexflow`, edit `MetricsDefaults.Annotation.fontFamily`, and call `Metrics.clear()` before creating annotations.

Existing elements retain the fonts they were created with. `setFonts()` resets the shared text selection, so call `setTextFonts()` afterward when using a custom face.

### Default score lettering

| Role | Default treatment |
| --- | --- |
| Chord names | 14 pt Academico. Raised and lowered extensions use 60% of the root size (8.4 pt by default). |
| Verse syllables and continuous lyric labels | 12 pt Academico. Use `system.getPhraseLayout().addVerse(stave, syllables)` for a line of lyrics. |
| Annotations, standard-staff technique letters, written bends such as “full” | 10 pt regular. |
| Tempo | 14 pt bold for the name, 14 pt regular for the beat count. The metronome note uses the music face at 25 pt. |
| Rehearsal marks, fretting-hand fingerings, string numbers | Bold. Rehearsal marks and string numbers use 10 pt. Fingerings use 9 pt. |
| Tab fret numbers | 11 pt regular, centered on each string. Grace frets use two thirds of that size. Call `note.setFontSize(9)` before formatting for a smaller fret. |
| Guitar stroke labels | 11 pt for picking-hand letters such as *p*, *i*, *m*, and *a*, including “i + golpe”. The rolled stroke’s *R* uses 11 pt bold italic. |
| Single-letter technique labels on a tab tie | 11 pt bold Arial, with Helvetica and the system sans serif as fallbacks. |

The full and Bravura builds register regular and bold Academico. In the browser, await `document.fonts.ready` after importing the bundle and before laying out the first system. With the core build, load each face yourself. This example assumes the local font directory contains the files from the VexFlow font packages.

```js
VexFlow.Font.HOST_URL = '/fonts/';
await Promise.all([
  VexFlow.loadFonts('Bravura', 'Academico'),
  VexFlow.Font.load('Academico', '/fonts/academico/academico-bold.woff2', { weight: 'bold' }),
]);
VexFlow.setFonts('Bravura', 'Academico');
```

### Combine lettering and engraved symbols

Give the tempo its name, beat unit, and speed. VexFlow draws the name and number in the text face and the beat unit in the music face. A chord works the same way. Use `addText()` for the root and `addGlyphOrText()` for an alteration such as a flat ninth. Its flat follows the music font and its digit follows the text font.

```js
// Place <div id="score"></div> in the page and load the full VexFlow bundle.
await document.fonts.ready;
const factory = new VexFlow.Factory({ renderer: { elementId: 'score', width: 500, height: 220 } });
const score = factory.EasyScore();
const notes = score.notes('G4/q, B4, D5, F5');
const system = factory.System({ x: 15, y: 65, width: 465 });
const stave = system.addStave({ voices: [score.voice(notes)] }).addClef('treble');
stave.setTempo({ name: 'Andante', duration: 'q', bpm: 76 }, -12);

// Raise the alteration as a unit and keep the chord aligned with the second note.
const chord = factory.ChordSymbol().addText('G7').addGlyphOrText('b9', {
  symbolModifier: VexFlow.ChordSymbol.symbolModifiers.SUPERSCRIPT,
});
notes[1].addModifier(chord);
system.getPhraseLayout().addVerse(stave, [
  { note: notes[0], text: 'Sing' },
  { note: notes[1], text: 'softly' },
]);
factory.draw();
```

Use `TextDynamics` for engraved dynamics such as *p* and *mf*. To share a standalone SVG, supply the music face and each text weight used on the page to the outline exporter. [Portable SVG export](portable-svg.md#font-faces-and-fallback)

## Two syllables on one note

Use `elideWith` to join two syllables on one attack. Each verse entry stays centered on its note. A single annotation measures both syllables and the music font’s undertie at the lyric size. The same entry works in `PhraseLayout.addVerse()` with a native note in place of its ID.

```js
// Two verses for a three-note measure in EasyScore.compose().
const verses = [
  [{ note: 'first', text: 'la', elideWith: 'mi' }, { note: 'second', text: 'fa' }, { note: 'third', text: 'sol' }],
  [{ note: 'first', text: 'do' }, { note: 'second', text: 're' }, { note: 'third', text: 'mi' }],
];
```

A group can use `hyphenAfter` or `extendTo`. The connector begins after the complete group. Keep the active SMuFL music face in the lyric font stack when selecting a custom text font.

## Shared lyric baselines

Annotations can use an absolute baseline in the renderer's coordinates. Give all lyrics in a row the same baseline:

```javascript
const lyric = new VexFlow.Annotation('Sing clearly')
  .setVerticalJustification(VexFlow.Annotation.VerticalJustify.BOTTOM)
  .setTextBaseline(180);

note.addModifier(lyric, 0);
```

Call `setTextBaseline()` without an argument to restore automatic positioning. The caller chooses a baseline that clears the notes, stems, and adjacent staves. Each verse can have its own baseline.

For a responsive verse, set the distance below the top staff line in staff spaces. Use the same distance in each measure. A held syllable can own the start of its extender. Give the lyric span a `syllableId` in the composition, then set that ID on the corresponding verse annotation before formatting.

```js
// In spec.continuous.spans, “hold” and “release” are note IDs on the same staff.
const extender = { id: 'hold-line', kind: 'lyric', from: 'hold', to: 'release', syllableId: 'held-word' };
```

```js
// After composing the score, attach the word to its first note.
const [word] = composition.systems[0].getPhraseLayout().addVerse(
  composition.staves[0][0],
  [{ note: composition.getNote('hold'), text: 'sing' }],
  { baselineSpaces: 7.5 }
);
word.setAttribute('id', 'held-word');
```

The annotation supplies the text and font. The line starts just past the word’s visible ink and continues at the same staff-relative height after a system break. [Complete Saints example](../tests/scores/saints.js)

## Layout before drawing

Attach notes to their staves and format the voice before requesting coordinates:

```javascript
notes.forEach((note) => note.setStave(stave));
new VexFlow.Formatter().joinVoices([voice]).formatToStave([voice], stave);

const { x, textWidth } = lyric.computeX();
const { y, textHeight } = lyric.computeY();
```

These methods do not draw or change the annotation's stored position. `draw()` uses the same methods. A subclass may override `computeY()` while retaining standard horizontal justification.

## Ties and lyrics

Annotations above or below a note still reserve space between notes. Their text width no longer shifts the tie's starting point. Dots, side string numbers, and annotations centered on the note retain their clearance.
