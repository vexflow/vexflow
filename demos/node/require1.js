// Summary: Demonstrate different ways to require() the VexFlow module.
// Run:
//   node require1.js

// This version bundles music fonts Bravura, Petaluma, Gonville, and text fonts Academico and Petaluma Script.
const ModuleA = require('vexflow');
console.log('Default Font Stack:', ModuleA.VexFlow.getFonts());
console.log(ModuleA.VexFlow.BUILD);

// This version bundles Bravura and Academico.
const ModuleB = require('vexflow/bravura');
console.log('Default Font Stack:', ModuleB.VexFlow.getFonts());
console.log(ModuleB.VexFlow.BUILD);
