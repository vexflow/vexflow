# Portable SVG export

An ordinary VexFlow SVG uses text and music fonts from its page. A saved copy may show empty squares on another machine.

Use `SVGContext.toSVG(fonts)` to turn every text element into paths. The result needs no fonts, scripts, CSS, or external resources. The live drawing stays unchanged.

## Browser example

Install `opentype.js@1.3.4` in your application. VexFlow does not bundle it. Serve the OTF files for the fonts used by your score. WOFF2 files cannot be parsed by this version of opentype.js.

```javascript
import opentype from 'opentype.js';
import { Font, Renderer } from 'vexflow';

// Use the same font files for layout and export.
await Promise.all([
  Font.load('Bravura', '/fonts/bravura.otf'),
  Font.load('Academico', '/fonts/academico.otf'),
]);
const fonts = await Promise.all([
  ['Bravura', '/fonts/bravura.otf'],
  ['Academico', '/fonts/academico.otf'],
].map(async ([family, url]) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Cannot load ${url}`);
  return { family, font: opentype.parse(await response.arrayBuffer()) };
}));

const renderer = new Renderer(document.getElementById('output'), Renderer.Backends.SVG);
renderer.resize(600, 200);
const context = renderer.getContext();
// Draw your score with this context, then export it.
const svg = context.toSVG(fonts);
const blob = new Blob([svg], { type: 'image/svg+xml' });
// Save the Blob, or display it with URL.createObjectURL(blob).
```

In TypeScript, narrow the context to `SVGContext` before calling `toSVG`.

For an existing VexFlow SVG element, call `SVGContext.toSVG(svgElement, fonts)`. Calling either method without `fonts` preserves ordinary text output.

## Font faces and fallback

- Supply every music and text font used in the drawing. The export follows each text element's font-family order.
- Supply separate faces for bold and italic text. For example: `{ family: 'Academico', weight: 'bold', font: boldFont }`.
- For the tempo and altered chord in the [score lettering example](text-and-lyrics.md#combine-lettering-and-engraved-symbols), supply regular Bravura and both regular and bold Academico. The flat and beat unit use Bravura. The lyrics, chord letters, digits, and tempo name use Academico.
- Export throws `MissingFont` if a face or glyph is missing. It does not silently save empty squares or substitute a different face.
- Text in one font is shaped as a run. Kerning and ligatures use the supplied font library.
- Fonts remain your application's responsibility. Check their licenses before distributing outlines.

## Scope

This API exports SVGs produced by `SVGContext`. It does not convert arbitrary SVG text layouts, external CSS, or added `<tspan>` elements. Use the same fonts for layout and export; different font versions can change spacing. Complex script shaping depends on the font library supplied by the caller.

Text becomes paths and is no longer selectable or searchable. Keep an ordinary SVG for editing or accessible text.
