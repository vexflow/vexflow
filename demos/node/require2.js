// Summary: Demonstrate different ways to require() the VexFlow module.
// Run:
//   node require2.js

const VexFlow = require('vexflow');
const { Stave, StaveNote } = require('vexflow');

const VF2 = require('../../build/cjs/vexflow-debug.js');
const VF3 = require('../../build/cjs/vexflow-debug-with-tests.js');

// This only includes the Bravura & Academico fonts.
const VF4 = require('vexflow/bravura');

console.log(VF2.StaveNote);
console.log(VF3.StaveNote);
console.log(VF4.StaveNote);

console.log(VexFlow.BUILD);
console.log(VF2.BUILD);
console.log(VF3.BUILD);
console.log(VF4.BUILD);

//////////////////////////////////////////////////////////////////////////////////////////////////
// The following statements return true:
console.log(VexFlow.StaveNote === StaveNote);
console.log(VexFlow.Stave === Stave);
console.log(VexFlow.BUILD.VERSION === VF2.BUILD.VERSION);
console.log(VexFlow.BUILD.ID === VF2.BUILD.ID);
