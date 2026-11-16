// Source examples. The build replaces this module with formatted, self-contained data.
import { expression } from './expression.mjs';
import { layout } from './layout.mjs';
import { notes } from './notes.mjs';
import { staves } from './staves.mjs';
import { strings } from './strings.mjs';

export const entries = [...notes, ...staves, ...expression, ...strings, ...layout];
