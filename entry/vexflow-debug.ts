// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
//
// This is the entry point for the vexflow-debug.js build target.
//
// This file is based on vexflow.ts. However, the webpack config inside Gruntfile.js
// sets the webpack mode to 'development' to produce a debug / unminified build.
//
// In the future, we could do something different with this entry file, such as turn on flags for logging.
//
// It bundles the same fonts as vexflow.js.
// Other music/text fonts need to be loaded at runtime during page load. See VexFlow.loadFonts().

import { VexFlow } from '../src/vexflow';

import { Font } from '../src/font';
import { Academico } from '../src/fonts/academico';
import { AcademicoBold } from '../src/fonts/academicobold';
import { Bravura } from '../src/fonts/bravura';
import { Gonville } from '../src/fonts/gonville';
import { Petaluma } from '../src/fonts/petaluma';
import { PetalumaScript } from '../src/fonts/petalumascript';

// Our convention is to use display: 'swap' for text fonts, and 'block' for music fonts.
const block = { display: 'block' };
const swap = { display: 'swap' };
const swapBold = { display: 'swap', weight: 'bold' };

const fontBravura = Font.load('Bravura', Bravura, block);
const fontAcademico = Font.load('Academico', Academico, swap);
const fontAcademicoBold = Font.load('Academico', AcademicoBold, swapBold);
const fontGonville = Font.load('Gonville', Gonville, block);
const fontPetaluma = Font.load('Petaluma', Petaluma, block);
const fontPetalumaScript = Font.load('Petaluma Script', PetalumaScript, swap);

const fontLoadPromises = [
  fontBravura,
  fontAcademico,
  fontAcademicoBold,
  fontGonville,
  fontPetaluma,
  fontPetalumaScript,
];

VexFlow.BUILD.INFO = 'vexflow-debug';
VexFlow.setFonts('Bravura', 'Academico');

Promise.allSettled(fontLoadPromises).then(() => {
  //
});

export * from '../src/index';
export default VexFlow;
