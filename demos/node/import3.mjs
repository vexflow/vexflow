// Summary: Demonstrate various ways to import VexFlow classes via ES modules.
// Run:
//   node import3.mjs

import * as Vex0 from 'vexflow'; // the entire module, which looks like { default: ... }. Same as Vex3 below.
import { default as Vex1 } from 'vexflow'; // extract the default export. Same as Vex0.default.
import Vex2 from 'vexflow'; // default export. Same as Vex1 above.
const Vex3 = await import('vexflow'); // dynamic import. The imported object is the same as Vex0 above.
import { Vex } from 'vexflow'; // named export for convenience. Same as Vex0.default.Vex.
import { StaveNote as StaveNoteAlias } from 'vexflow'; // provide an alias for the named import.

console.log('All results below should be true.');

const { StaveNote } = Vex0;
console.log(StaveNoteAlias === StaveNote);
console.log(Vex3.Vex.sortAndUnique === Vex.sortAndUnique);
console.log(Vex3 === Vex0);
console.log(Vex2.Vex === Vex);
console.log(StaveNote === VexFlow.StaveNote);
console.log(StaveNote === Vex2.VexFlow.StaveNote);

console.log(Vex3.default === Vex1);
console.log(Vex3.VexFlow.StaveNote == StaveNote);
console.log(Vex3.default.VexFlow.StaveNote == StaveNote);

console.log(Vex3.VexFlow === Vex3.default.VexFlow);
console.log(Vex3.VexFlow === Vex3.default.VexFlow);

// Verify that a modification to the VexFlow module in one place will be reflected
// everywhere we can access the VexFlow module.

VexFlow.HELLO = 123;
console.log(Vex1.VexFlow.HELLO === 123);
console.log(Vex3.VexFlow.HELLO === 123);
console.log(Vex3.default.VexFlow.HELLO === 123);
