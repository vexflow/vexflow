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

## Visual checks

Before/after screenshots are attached to the issues. Each comparison covers Bravura and Petaluma.

| Change | Screenshots |
| --- | --- |
| Text spacing against a text-font reference | [#152](https://github.com/vexflow/vexflow/issues/152#issuecomment-6902575060) |
| Shared lyric baselines with stems up and down | [#177](https://github.com/vexflow/vexflow/issues/177#issuecomment-6902575788) |
| Long lyrics under tied notes, with and without a dot | [#182](https://github.com/vexflow/vexflow/issues/182#issuecomment-6902576573) |

Run `grunt test` for the numeric and browser regressions. PNGs are written to `build/p2-examples/`. Use `node tools/render-p2-examples.mjs PATH_TO_BUNDLE before` to capture the same examples against another build.
