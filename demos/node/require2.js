// Summary: Demonstrate different ways to require() the VexFlow module.
// Run:
//   node require2.js

const { VexFlow, Stave, StaveNote } = require('vexflow');
const Vex2 = require('vexflow');

const Vex3 = require('../../build/cjs/vexflow-debug.js');
const Vex4 = require('../../build/cjs/vexflow-debug-with-tests.js');

// This only includes the Bravura & Academico fonts.
const Vex5 = require('vexflow/bravura');

console.log(Vex2.StaveNote);
console.log(Vex3.StaveNote);
console.log(Vex4.StaveNote);
console.log(Vex5.StaveNote);

//////////////////////////////////////////////////////////////////////////////////////////////////
// The following statements return true:
console.log(StaveNote === VexFlow.StaveNote);
console.log(Vex2.VexFlow === VexFlow);
console.log(Vex2.StaveNote === StaveNote);
console.log(VexFlow.Stave === Stave);
