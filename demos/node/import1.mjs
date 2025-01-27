// Run:
//   node import.mjs

// This file is an ES module that imports VexFlow.
// This file needs to have the .mjs extension, or the nearest package.json needs to specify type="module".
// Otherwise, the import statement will not work.

import { Vex } from 'vexflow';

// The above import statement is equivalent to the following:
// import { Vex } from '../../build/esm/entry/vexflow.js';
// It works because our package.json has an "exports" field that points to the correct ESM entry point:
/*
"exports": {
  ".": {
    "types": "./build/types/entry/vexflow.d.ts",
    "require": "./build/cjs/vexflow.js",
    "import": "./build/esm/entry/vexflow.js"
  },
  ...
}
*/

// If you want to use the vexflow-bravura.js distribution, which bundles the Bravura & Academico fonts you can import it like this:
// import { Vex } from 'vexflow/bravura';

// To use this ES module in a script tag, you will need to set type="module".
// Additionally, the webpage will need to be able to resolve to the correct ESM entry point.
// Normally, you would use a bundler like webpack / esbuild / rollup / etc to do this.
//   <script src="..." type="module"></script>.

console.log('VexFlow VERSION: ' + VexFlow.BUILD.VERSION);
console.log('VexFlow BUILD ID: ' + VexFlow.BUILD.ID);
console.log('VexFlow BUILD DATE: ' + VexFlow.BUILD.DATE);

// Some notes about running as an ES module.
// console.log(this);       // this === undefined
// console.log(window);     // ReferenceError: window is not defined
// console.log(self);       // ReferenceError: self is not defined
// console.log(global);     // global is the Node JS global object.
// console.log(globalThis); // globalThis is the Node JS global object.
// console.log(globalThis === global); // true
