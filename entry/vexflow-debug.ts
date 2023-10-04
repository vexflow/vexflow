// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// vexflow-debug.ts is the entry point for the build output file vexflow-debug.js.

// Currently, it is identical to vexflow.ts, but the webpack config inside Gruntfile.js
// sets the webpack mode to 'development' to produce an unminified build.

// In the future, we could do something different with this entry file, such as turn on flags for logging.

import { Flow } from '../src/flow';

Flow.setMusicFont('Bravura', 'Roboto Slab');

// Re-export all exports from index.ts.
export * from '../src/index';
// Also collect all exports into a default export for CJS projects.
export * as default from '../src/index';
