// Summary: Demonstrate different ways to require() the VexFlow module.
// Run:
//   node require1.js

// This version bundles music fonts Bravura, Petaluma, Gonville, and text fonts Academico and Petaluma Script.
const ModuleA = require('vexflow');
console.log('Default Font Stack:', ModuleA.getFonts());
console.log(ModuleA.BUILD);

// This version bundles only Bravura and Academico.
const ModuleB = require('vexflow/bravura');
console.log('Default Font Stack:', ModuleB.getFonts());
console.log(ModuleB.BUILD);
