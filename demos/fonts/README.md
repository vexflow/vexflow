# Fonts

## all.html

The full `vexflow.js` includes the following music engraving fonts: Bravura, Petaluma, Gonville, Leland, and Custom. In this case, `Vex.Flow.setFonts('Bravura', ...);` is a synchronous function that changes the current font stack.

## bravura.html

This page uses `vexflow-bravura.js`, which statically bundles only the Bravura font. You do not need to call `Vex.Flow.setFonts(...)`.

## core.html

This page depends on `vexflow-core.js` and the individual font bundles:

```
vexflow-font-bravura.js
vexflow-font-gonville.js
vexflow-font-leland.js
vexflow-font-petaluma.js
vexflow-font-custom.js
```

`core.html` uses the <b>await</b> keyword to call an async function that returns after the requested font is loaded:

```
await Vex.Flow.setFonts('Petaluma');
```

**IMPORTANT**: The default font stack is empty, so you **must** call `Vex.Flow.setFonts(...)` before rendering your score.

## core-with-promise.html

The async `Vex.Flow.setFonts(...)` returns a Promise. This demo shows how to use a `.then(onFulfilledCallback)` to request a font stack, and initialize VexFlow once the fonts are ready.
