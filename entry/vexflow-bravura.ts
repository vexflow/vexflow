// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// vexflow-bravura.ts is the entry point for vexflow-bravura.js.
// This version bundles the Bravura music engraving font and the Academico text font.

import { VexFlow } from '../src/vexflow';

import { Font } from '../src/font';
import { Academico } from '../src/fonts/academico';
import { AcademicoBold } from '../src/fonts/academicobold';
import { Bravura } from '../src/fonts/bravura';

const fontBravura = Font.load('Bravura', Bravura, { display: 'block' });
const fontAcademico = Font.load('Academico', Academico, { display: 'swap' });
const fontAcademicoBold = Font.load('Academico', AcademicoBold, { display: 'swap', weight: 'bold' });

VexFlow.BUILD.INFO = 'vexflow-bravura';
VexFlow.setFonts('Bravura', 'Academico');
Promise.allSettled([fontBravura, fontAcademico, fontAcademicoBold]).then(() => {
  //
});

export * from '../src/index';
export default VexFlow;
