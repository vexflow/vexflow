// Summary: Demonstrate various ways to import VexFlow classes via ES modules.
// Run:
//   node import3.mjs

// The first two lines are the "standard" way to import VexFlow and its classes.
import { VexFlow } from 'vexflow';
import { Stave, StaveNote } from 'vexflow';

import * as VF0 from 'vexflow'; // the entire module, which looks like { default: ... }. Same as Vex3 below.
import { default as VF1 } from 'vexflow'; // extract the default export. Same as Vex0.VexFlow.
import VF2 from 'vexflow'; // default export. Same as Vex1 above.
const VF3 = await import('vexflow'); // dynamic import. The imported object is the same as Vex0 above.

import { StaveNote as StaveNoteAlias } from 'vexflow'; // provide an alias for the named import.
const { Clef } = VF0;

console.log('All results below should be true.');
console.log(VF3.VexFlow.sortAndUnique === VexFlow.sortAndUnique);
console.log(VF3 === VF0);
console.log(VF2 === VF0.VexFlow);
console.log(StaveNote === VexFlow.StaveNote);
console.log(StaveNote === VF2.StaveNote);

console.log(VF3.default === VF1);
console.log(VF3.VexFlow.StaveNote == StaveNote);

console.log(VF3.VexFlow === VF3.default);

console.log(StaveNoteAlias === StaveNote);
console.log(Stave === VF3.Stave);
console.log(Clef === VexFlow.Clef);

// Verify that a modification to the VexFlow module in one place will be reflected
// everywhere we can access the VexFlow module.

VexFlow.HELLO = 123;
console.log(VF1.HELLO === 123);
console.log(VF3.VexFlow.HELLO === 123);
