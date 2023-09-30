// Run:
//   node font-load-2.js
//
// Summary:
//   Use JSDOM and node-canvas to load custom music fonts.
//   This demo does not use the VexFlow library.
//   It demonstrates the basics of drawing music glyphs from SMuFL fonts to a canvas. It saves a PNG file of the canvas's contents.

const fs = require('fs');
const { JSDOM } = require('jsdom');
const { registerFont } = require('canvas');

// JSDOM uses node-canvas internally. https://www.npmjs.com/package/canvas
// node-canvas can load custom fonts with registerFont(...).
// node-canvas doesn't seem to support WOFF2. Regular WOFF works fine.
const fontsDir = '../../node_modules/@vexflow-fonts/';
registerFont(fontsDir + 'bravura/bravura.otf', { family: 'Bravura' });
registerFont(fontsDir + 'academico/academico.otf', { family: 'Academico' });
registerFont(fontsDir + 'petaluma/petaluma.otf', { family: 'Petaluma' });
registerFont(fontsDir + 'petalumascript/petalumascript.otf', { family: 'Petaluma Script' });

const html = `<!DOCTYPE html>
<html>
<body>
  <canvas width="800" height="800"></canvas>
  <script>
    const canvas = document.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#F0F0F0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#181818';

    const musicSymbols = '\ue050 \ue062'; // treble clef and bass clef
    let x = 20;
    let y = 150;
    ctx.font = '100px Bravura';
    ctx.fillText(musicSymbols, x, y);
    y += 180;
    ctx.font = '60px Academico';
    ctx.fillText('This is Academico.', x, y);
    y += 180;
    ctx.font = '100px Petaluma';
    ctx.fillText(musicSymbols, x, y);
    y += 180;
    ctx.font = '60px Petaluma Script';
    ctx.fillText('This is Petaluma Script.', x, y);
  </script>
</body>
</html>`;

// Save the canvas contents to a PNG file.
const dom = new JSDOM(html, { runScripts: 'dangerously' });
const canvas = dom.window.document.querySelector('canvas');
const imageData = canvas.toDataURL().split(';base64,').pop();
const imageBuffer = Buffer.from(imageData, 'base64');
fs.writeFileSync('output/font-load-2.png', imageBuffer, { encoding: 'base64' });
