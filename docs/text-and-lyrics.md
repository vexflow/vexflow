# Text, lyrics, and tie placement

## Text fonts

Text elements now prefer a text font. Music glyphs keep their music-first stack.

```javascript
VexFlow.setFonts('Bravura', 'Academico');
// Annotations and other text: Academico,Bravura
// Music glyphs: Bravura,Academico

VexFlow.setFonts('Petaluma', 'Petaluma Script');
```

`setFonts` recognizes VexFlow's built-in text faces. A music-only stack uses Academico for text. For a custom text face, select it explicitly after `setFonts`:

```javascript
VexFlow.setFonts('My Music Font');
VexFlow.setTextFonts('My Text Font', 'serif');
```

Load the chosen fonts before creating notes or measuring text. A per-element `setFont()` call still takes precedence. Class-specific `MetricsDefaults.Annotation.fontFamily` overrides also work; call `Metrics.clear()` after editing metrics.

Existing elements retain the fonts they were created with. `setFonts()` resets the shared text selection, so call `setTextFonts()` afterward when using a custom face.

### Default score lettering

| Role | Default treatment |
| --- | --- |
| Chord names | 13 pt Academico. Raised and lowered chord extensions scale with the root. |
| Verse syllables and continuous lyric labels | 12 pt Academico. Use `system.getPhraseLayout().addVerse(stave, syllables)` for a line of lyrics. |
| Standard-staff technique letters and written bend instructions such as “full” | Score text face, normally Academico. |
| Single-letter technique labels on a tab tie | 10 pt bold Arial, with Helvetica and the system sans serif as fallbacks. |

The full and Bravura builds include regular and bold Academico. When using core with self-hosted fonts, load both weights before engraving bold directions. This example assumes the local font directory contains the files from the VexFlow font packages.

```js
VexFlow.Font.HOST_URL = '/fonts/';
await Promise.all([
  VexFlow.loadFonts('Bravura', 'Academico'),
  VexFlow.Font.load('Academico', '/fonts/academico/academico-bold.woff2', { weight: 'bold' }),
]);
VexFlow.setFonts('Bravura', 'Academico');
```

## Shared lyric baselines

Annotations can use an absolute baseline in the renderer's coordinates. Give all lyrics in a row the same baseline:

```javascript
const lyric = new VexFlow.Annotation('Sing clearly')
  .setVerticalJustification(VexFlow.Annotation.VerticalJustify.BOTTOM)
  .setTextBaseline(180);

note.addModifier(lyric, 0);
```

Call `setTextBaseline()` without an argument to restore automatic positioning. The caller chooses a baseline that clears the notes, stems, and adjacent staves. Each verse can have its own baseline.

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
