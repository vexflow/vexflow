#!/usr/bin/env node

// Run: node base64.js

// Make Base64 encoded versions of the *.woff2 files, which can be bundled into the VexFlow library.
// The Base64 encoded fonts will be saved to vexflow/src/fonts/.
//
// vexflow-core.js bundles zero fonts, so it does not rely on the Base64 fonts produced by this script.
// vexflow.js bundles Bravura, Gonville, Petaluma, Academico, AcademicoBold, and PetalumaScript.
// vexflow-bravura.js bundles Bravura, Academico, and AcademicoBold.
const fs = require('fs');
const path = require('path');
const prettier = require('prettier');
const prettierConfig = require('../../.prettierrc.js');

// Load a *.woff2 file.
const folder = path.resolve(__dirname, '../../node_modules/@vexflow-fonts/');
const outputFolder = path.resolve(__dirname, '../../src/fonts/');

// Make sure the output folder exists.
if (!fs.existsSync(outputFolder)) {
  fs.mkdirSync(outputFolder);
}

// To embed different fonts into your VexFlow bundle, uncomment the lines below corresponding to the desired fonts.
// Then, add an entry file named vexflow/entry/vexflow-xxxx.ts where xxxx is the font name. You can use vexflow-bravura.ts as a template.
// Finally, modify Gruntfile.js (search for VEX_PETALUMA or VEX_XXXXXXXX) to add your new entry file to the PRODUCTION_BUILD_TARGETS array.
const fonts = {
  Academico: 'academico/academico.woff2',
  'Academico Bold': 'academico/academico-bold.woff2',
  Bravura: 'bravura/bravura.woff2',
  // 'Bravura Text': 'bravuratext/bravuratext.woff2',
  // Edwin: 'edwin/edwin-roman.woff2',
  // 'Finale Ash': 'finaleash/finaleash.woff2',
  // 'Finale Ash Text': 'finaleashtext/finaleashtext.woff2',
  // 'Finale Broadway': 'finalebroadway/finalebroadway.woff2',
  // 'Finale Broadway Text': 'finalebroadwaytext/finalebroadwaytext.woff2',
  // 'Finale Jazz': 'finalejazz/finalejazz.woff2',
  // 'Finale Jazz Text': 'finalejazztext/finalejazztext.woff2',
  // 'Finale Maestro': 'finalemaestro/finalemaestro.woff2',
  // 'Finale Maestro Text': 'finalemaestrotext/finalemaestrotext-regular.woff2',
  Gonville: 'gonville/gonville.woff2',
  // Gootville: 'gootville/gootville.woff2',
  // 'Gootville Text': 'gootvilletext/gootvilletext.woff2',
  // Leipzig: 'leipzig/leipzig.woff2',
  // Leland: 'leland/leland.woff2',
  // 'Leland Text': 'lelandtext/lelandtext.woff2',
  // MuseJazz: 'musejazz/musejazz.woff2',
  // 'MuseJazz Text': 'musejazztext/musejazztext.woff2',
  // Nepomuk: 'nepomuk/nepomuk.woff2',
  Petaluma: 'petaluma/petaluma.woff2',
  'Petaluma Script': 'petalumascript/petalumascript.woff2',
  // 'Petaluma Text': 'petalumatext/petalumatext.woff2',
  // 'Roboto Slab': 'robotoslab/robotoslab-regular-400.woff2',
  // Sebastian: 'sebastian/sebastian.woff2',
  // 'Sebastian Text': 'sebastiantext/sebastiantext.woff2',
};

for (const fontName in fonts) {
  const woff2File = fs.readFileSync(path.join(folder, fonts[fontName]));

  const fontNameNoSpaces = fontName.replace(/ /g, '');
  const fontNameFileName = fontNameNoSpaces.toLowerCase() + '.ts';

  // Convert it to a base64 string.
  const base64 = woff2File.toString('base64');
  const numCharacters = String(base64.length).padStart(6, ' ');
  console.log(numCharacters, fontName);

  // Save the string out to a TS file in vexflow/src/fonts/
  // The JS file will export the base64 string as a const.
  const outFile = path.join(outputFolder, fontNameFileName);

  const dataURIPrefix = 'data:font/woff2;charset=utf-8;base64,';

  const output = `export const ${fontNameNoSpaces} = '${dataURIPrefix}${base64}';`;

  // Use our prettier rules to format the output JSON file. See: .prettierrc.js
  // That way, if we ever edit & save the file, the diff will be minimal.
  // We use String.slice(0, -1) to remove the final newline character.
  prettierConfig.parser = 'typescript';
  prettier.format(output, prettierConfig).then((formatted) => {
    console.log('Writing to file:', outFile);
    fs.writeFileSync(outFile, formatted);
  });
}
