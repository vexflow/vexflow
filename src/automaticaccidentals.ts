// Identify ordinary signs supplied by key-aware spelling so engraving can share them at unisons.
import type { Accidental } from './accidental';

/** Explicit and cautionary signs retain independent placement. */
export const automaticAccidentals = new WeakSet<Accidental>();
