import * as VexSrc from '../src/index.js';
import * as VexTests from '../tests/index.js';
import { Flow } from '../src/flow.js';
Flow.setMusicFont('Bravura', 'Roboto Slab');
export * from '../src/index.js';
export * from '../tests/index.js';
export default Object.assign(Object.assign({}, VexSrc), VexTests);
