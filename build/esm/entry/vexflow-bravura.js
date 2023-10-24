import { Flow } from '../src/flow.js';
import { Font } from '../src/font.js';
import { Academico } from '../src/fonts/academico.js';
import { AcademicoBold } from '../src/fonts/academicobold.js';
import { Bravura } from '../src/fonts/bravura.js';
const fontBravura = Font.load('Bravura', Bravura, { display: 'block' });
const fontAcademico = Font.load('Academico', Academico, { display: 'swap' });
const fontAcademicoBold = Font.load('Academico', AcademicoBold, { display: 'swap', weight: 'bold' });
Flow.setFonts('Bravura', 'Academico');
Promise.allSettled([fontBravura, fontAcademico, fontAcademicoBold]).then(() => {
});
export * from '../src/index.js';
export * as default from '../src/index.js';
