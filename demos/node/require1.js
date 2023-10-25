// Summary: Demonstrate different ways to require() the VexFlow module.
// Run:
//   node require1.js

// const Vex1 = require('vexflow');
// const Vex2 = require('vexflow/bravura');

const Vex1 = require('vxflw-early-access');
const Vex2 = require('vxflw-early-access/bravura');

console.log('Default Font Stack:', Vex1.VexFlow.getFonts());
console.log(Vex1.VexFlow.BUILD);

console.log('Default Font Stack:', Vex2.VexFlow.getFonts());
console.log(Vex2.VexFlow.BUILD);
