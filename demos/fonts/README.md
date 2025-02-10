# fonts

If you're new to VexFlow, take a look at `123.html`.

## 123.html

## async-await.html

## async-promise.html

## bravura.html

This demo examines the **Bravura** music font and the **Academico** text font. It loads the `vexflow-bravura.js` build of the VexFlow library, which bundles those two fonts.

## bravura-score.html

If you are just getting started, and don't want to worry about manually loading fonts, we recommend using the `vexflow-bravura.js` build.
This version of the library bundles the **Bravura** music font and the **Academico** text font.

## five-staves.html

This demo renders five staves, each with a different music engraving font. It loads Bravura, Gonville, Petaluma, Leland, and Sebastian from the VexFlow fonts CDN (we use cdn.jsdelivr.net).

## music.html

**This page doesn't use the VexFlow library.**

It just demonstrates how web fonts work, using CSS to load `*.woff2` fonts.

The CSS files are located in `vexflow/node_modules/@vexflow-fonts/<FONT_NAME>/`.

Note that index.css files may direct the browser to look for a local copy of the font.
If the local copy is not found, the browser falls back to loading `*.woff2` file.

Example `@vexflow-fonts/bravura/index.css`:

```
@font-face {
    font-family: "Bravura";
    font-style: normal;
    font-display: block;
    font-weight: 400;
    src: local("Bravura"), url(bravura.woff2) format("woff2");
}
```
