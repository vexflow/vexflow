# Rendering with jsdom

VexFlow 5 works with jsdom and node-canvas. Register fonts with node-canvas before measuring or drawing. The browser FontFace API is not available in jsdom.

Use Node 24 and the pinned `canvas` version from this repository. A local canvas 3.1.0 install crashed during canvas resizing on Node 24. Canvas 3.2.3 passed the full Bravura generation run and the focused export tests.

## Generate test images

```sh
npm ci
npx grunt webpack:debug
node tools/generate_images_jsdom.js build build/jsdom-images --fonts=bravura --module=Clef
```

Omit `--module` to generate the full suite. The image generator mocks QUnit assertions; image generation is not a substitute for `grunt test`.

The output contains PNG files. Font registration happens in `tools/generate_images_jsdom.js`, using the OTF files from `@vexflow-fonts` packages.

## Application setup

```javascript
const { JSDOM } = require('jsdom');
const { registerFont } = require('canvas');

const dom = new JSDOM('<div id="score"></div>');
global.window = dom.window;
global.document = dom.window.document;

registerFont('./fonts/bravura.otf', { family: 'Bravura' });
registerFont('./fonts/academico.otf', { family: 'Academico' });

const VexFlow = require('vexflow/core');
VexFlow.setFonts('Bravura', 'Academico');
// Create a Canvas or SVG Renderer and draw the score.
```

Register separate bold and italic faces when the score uses them. Keep this setup in the process that performs rendering.

SVG text measurement uses node-canvas through jsdom. A saved SVG still needs fonts on its destination machine. For standalone output, use [portable SVG export](portable-svg.md) with the same font files. The serializer uses the SVG's own DOM implementation.

Browser and node-canvas rasterization can differ slightly. Test browser output when that is the delivery surface.
