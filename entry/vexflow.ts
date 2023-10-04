// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// vexflow.ts is the entry point for the build output file vexflow.js.

// The webpack config inside Gruntfile.js sets the mode to 'production' to produce a minified build.

import { Flow } from '../src/flow';

Flow.setMusicFont('Bravura', 'Roboto Slab');

// Re-export all exports from index.ts.
export * from '../src/index';
// Also collect all exports into a default export for CJS projects.
export * as default from '../src/index';
