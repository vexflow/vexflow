// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
//
// vexflow-core.ts is the entry point for the vexflow-core.js build target.
// It supports dynamic importing of fonts (woff2 / otf), and does not
// bundle or preload any music or text fonts by default.
// All music/text fonts need to be loaded at runtime during page load.
//
// The webpack config inside Gruntfile.js sets the mode to 'production' to produce a minified build.

import { VexFlow } from '../src/vexflow';

VexFlow.BUILD.INFO = 'vexflow-core';
export * from '../src/index';
export default VexFlow;
