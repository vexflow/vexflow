# Chord symbol kerning

Chord symbols use the existing spacing by default. Enable font-specific spacing with `setKerning('auto')` before formatting.

```ts
VexFlow.setFonts('Bravura', 'Academico');
const chord = new ChordSymbol().setKerning('auto').addText('A').addGlyph('diminished', {
  symbolModifier: ChordSymbol.symbolModifiers.SUPERSCRIPT,
});
note.addModifier(chord, 0);
```

`setKerning('none')` restores the default layout. The guide’s [Chord kerning example](https://vexflow.com/guide/#playground/chord-kerning) compares both modes and can show each chord's bounds.

## Font profiles

Built-in profiles support these regular faces:

| Text font       | Music font |
| --------------- | ---------- |
| Academico       | Bravura    |
| Petaluma Script | Petaluma   |

The chord's font family must start with the listed text and music faces, in that order. `VexFlow.setFonts()` selects these pairs automatically. Other families, bold, and italic keep the existing layout unless a matching custom profile is supplied.

Auto mode keeps words and digit sequences together. SMuFL chord symbols and accidentals use the explicit music face. Adjacent fragments at the same script position are combined before shaping. Intentional spaces in the source text remain.

The built-in pair tables tighten superscripts after A and subscripts after F for diminished, half-diminished, and major-seventh symbols. Other boundaries use their measured advances. Script groups have a small em-based gap. Stacked superscripts and subscripts share an anchor; the next group starts after the wider advance. Ink overhangs are included in the reported width and bounds.

Load the fonts before formatting. After changing text, the chord font, size, or profile, format the score again. Font-loading events invalidate the shared measurement cache. In Node, call `Element.clearTextMeasurementCache()` after external font registration.

## Custom profiles

A profile belongs to one chord. It replaces the built-in table for that chord. The supplied faces must also lead the chord's font-family list. Provide fonts with coverage for the text and music glyphs you use.

```ts
chord.setFont('Academico,Bravura', 16).setKerningProfile({
  textFont: 'Academico',
  musicFont: 'Bravura',
  pairs: [
    {
      left: 'A',
      right: VexFlow.Glyphs.csymDiminished,
      position: 'superscript',
      adjustmentEm: -0.1,
    },
  ],
});
```

`left` and `right` are single Unicode characters. Use actual SMuFL values, not glyph names or lookalike degree signs. `position` is `baseline`, `superscript`, or `subscript`. `adjustmentEm` is multiplied by the parent chord's font size in pixels. Negative values pull the following run closer. Unlisted pairs receive no adjustment.

Use `weight` and `style` on a profile to target other font styles. Call `setKerningProfile()` without an argument to restore the built-in tables. Profiles are copied, so editing the caller's table does not alter an existing chord.

Canvas and SVG draw the same positioned runs. Bounding-box overlap can be intentional when kerning around sloping letters; inspect the ink before treating overlap as a collision.
