// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
//
// vexflow-bravura.ts is the entry point for vexflow-bravura.js.
// This version bundles the Bravura music engraving font and the Academico text font.

import { Flow } from '../src/flow';
import { Font } from '../src/font';
import { Academico } from '../src/fonts/academico';
import { AcademicoBold } from '../src/fonts/academicobold';
import { Bravura } from '../src/fonts/bravura';

const fontBravura = Font.load('Bravura', Bravura, { display: 'block' });
const fontAcademico = Font.load('Academico', Academico, { display: 'swap' });
const fontAcademicoBold = Font.load('Academico', AcademicoBold, { display: 'swap', weight: 'bold' });

Flow.setFonts('Bravura', 'Academico');
Promise.allSettled([fontBravura, fontAcademico, fontAcademicoBold]).then(() => {
  //
});

// Re-export all exports from index.ts.
export * from '../src/index';
// Also collect all exports into a default export for CJS projects.
export * as default from '../src/index';
