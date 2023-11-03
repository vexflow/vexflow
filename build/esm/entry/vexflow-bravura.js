import { VexFlow } from '../src/vexflow.js';
import { Font } from '../src/font.js';
import { Academico } from '../src/fonts/academico.js';
import { AcademicoBold } from '../src/fonts/academicobold.js';
import { Bravura } from '../src/fonts/bravura.js';
const fontBravura = Font.load('Bravura', Bravura, { display: 'block' });
const fontAcademico = Font.load('Academico', Academico, { display: 'swap' });
const fontAcademicoBold = Font.load('Academico', AcademicoBold, { display: 'swap', weight: 'bold' });
VexFlow.BUILD.INFO = 'vexflow-bravura';
VexFlow.setFonts('Bravura', 'Academico');
Promise.allSettled([fontBravura, fontAcademico, fontAcademicoBold]).then(() => {
});
export * from '../src/index.js';
export default VexFlow;
