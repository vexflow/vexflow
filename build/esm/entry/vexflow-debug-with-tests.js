import { VexFlow } from '../src/vexflow.js';
import { VexFlowTests } from '../tests/vexflow_test_helpers.js';
import { Font } from '../src/font.js';
import { Academico } from '../src/fonts/academico.js';
import { AcademicoBold } from '../src/fonts/academicobold.js';
import { Bravura } from '../src/fonts/bravura.js';
import { Petaluma } from '../src/fonts/petaluma.js';
import { PetalumaScript } from '../src/fonts/petalumascript.js';
const block = { display: 'block' };
const swap = { display: 'swap' };
const swapBold = { display: 'swap', weight: 'bold' };
const fontBravura = Font.load('Bravura', Bravura, block);
const fontAcademico = Font.load('Academico', Academico, swap);
const fontAcademicoBold = Font.load('Academico', AcademicoBold, swapBold);
const fontPetaluma = Font.load('Petaluma', Petaluma, block);
const fontPetalumaScript = Font.load('Petaluma Script', PetalumaScript, swap);
const fontLoadPromises = [
    fontBravura,
    fontAcademico,
    fontAcademicoBold,
    fontPetaluma,
    fontPetalumaScript,
];
VexFlow.BUILD.INFO = 'vexflow-debug-with-tests';
VexFlow.setFonts('Bravura', 'Academico');
Promise.allSettled(fontLoadPromises).then(() => {
});
export * from '../src/index.js';
export * from '../tests/index.js';
VexFlow.Test = VexFlowTests;
export default VexFlow;
